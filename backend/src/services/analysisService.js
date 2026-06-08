'use strict';
// Orchestrates the analysis pipeline: validate -> clone -> size-check ->
// extract -> parse -> store (transactional) -> cleanup. The git layer is
// injectable so integration tests run against a local fixture without network.

const dao = require('../db/dao');
const realGit = require('../git/gitClient');
const config = require('../config');
const { parseGitLog } = require('../git/parser');
const { computeChurn } = require('../analysis/churn');
const { computeHotspots } = require('../analysis/hotspot');
const { computeCoupling, buildCouplingGraph } = require('../analysis/coupling');
const { computeOwnership } = require('../analysis/ownership');
const { compareHotspots } = require('../analysis/snapshots');

class ValidationError extends Error {}
class NotFoundError extends Error {}

// R7SEC: whitelist protocols and reject anything with shell metacharacters.
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'ssh:'];
const SCP_LIKE = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:[A-Za-z0-9._/-]+$/; // git@host:owner/repo.git
const SHELL_META = /[;&|`$（）()<>\\\s'"]/; // disallow injection vectors
const TOKEN_RE = /^[A-Za-z0-9_]+$/;        // GitHub PAT character set

function validateRepoUrl(url, { allowLocal = false } = {}) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new ValidationError('Repository URL is required');
  }
  const u = url.trim();
  if (SHELL_META.test(u) && !SCP_LIKE.test(u)) {
    // scp-like form legitimately contains ':' but no other meta chars
    if (!(allowLocal && (u.startsWith('/') || u.startsWith('./')))) {
      throw new ValidationError('Invalid repository URL: contains illegal characters');
    }
  }
  if (SCP_LIKE.test(u)) return u;
  if (allowLocal && (u.startsWith('/') || u.startsWith('./') || u.startsWith('file:'))) return u;
  let parsed;
  try { parsed = new URL(u); } catch { throw new ValidationError('Invalid repository URL: not a valid URL'); }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new ValidationError(`Invalid repository URL: protocol must be one of ${ALLOWED_PROTOCOLS.join(', ')}`);
  }
  if (!parsed.hostname) throw new ValidationError('Invalid repository URL: missing host');
  return u;
}

// R2AUTH: validate a GitHub PAT and inject it into an https clone URL. The
// token lives only in the ephemeral clone URL string, never persisted.
function sanitizeToken(token) {
  if (token == null || token === '') return null;
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
    throw new ValidationError('Invalid access token format');
  }
  return token;
}

function buildAuthedUrl(url, token) {
  if (!token) return url;
  if (!/^https:\/\//i.test(url)) return url; // PAT injection only meaningful for https
  return url.replace(/^https:\/\//i, `https://${token}@`);
}

function deriveName(url) {
  return url.replace(/\.git$/, '').replace(/\/$/, '').split('/').pop() || url;
}

async function analyzeRepository(db, { url, name, token }, opts = {}) {
  const git = opts.git || realGit;
  const allowLocal = opts.allowLocal || false;
  const safeUrl = validateRepoUrl(url, { allowLocal });
  const safeToken = sanitizeToken(token);
  const maxMb = opts.maxRepoSizeMb || config.maxRepoSizeMb;

  let repo = dao.getRepositoryByUrl(db, safeUrl);
  if (!repo) repo = dao.createRepository(db, { url: safeUrl, name: name || deriveName(safeUrl) });

  let dir;
  try {
    // Pre-clone disk check (R1PERF): fail fast rather than crash on a full disk.
    if (git.getFreeSpaceMb && git.getFreeSpaceMb(require('os').tmpdir()) < maxMb) {
      throw new ValidationError('Insufficient disk space to clone repository');
    }
    dao.setRepositoryStatus(db, repo.id, 'cloning');
    dir = await git.cloneRepo(buildAuthedUrl(safeUrl, safeToken), opts.cloneOptions ? { cloneOptions: opts.cloneOptions } : {});

    // Post-clone size check (R1PERF): enforce the configured limit.
    if (git.getRepoSizeMb) {
      const sizeMb = git.getRepoSizeMb(dir);
      if (sizeMb > maxMb) {
        throw new ValidationError(`Repository exceeds the configured size limit of ${maxMb} MB (was ${Math.round(sizeMb)} MB)`);
      }
    }

    dao.setRepositoryStatus(db, repo.id, 'analyzing');
    const raw = await git.getRawLog(dir, { maxCount: opts.maxCount });
    const { commits, fileChanges } = parseGitLog(raw);
    if (commits.length === 0) throw new ValidationError('Repository has no commit history to analyze');
    const sizes = await git.getFileSizes(dir);

    const snapshotId = dao.createSnapshot(db, repo.id, opts.label || null);
    dao.insertSnapshotData(db, snapshotId, { commits, fileChanges, fileSizes: sizes }); // one transaction

    const filePaths = new Set(fileChanges.map((c) => c.filePath));
    dao.finalizeSnapshot(db, snapshotId, {
      commitCount: commits.length,
      fileCount: filePaths.size,
      analyzedThrough: Math.max(...commits.map((c) => c.authoredAt))
    });
    dao.setRepositoryStatus(db, repo.id, 'completed');
    return { repositoryId: repo.id, snapshotId };
  } catch (err) {
    dao.setRepositoryStatus(db, repo.id, 'failed', err.message);
    throw err;
  } finally {
    if (dir) git.cleanup(dir);
  }
}

// ---- Result accessors -------------------------------------------------------
function loadSnapshotData(db, snapshotId) {
  const snap = dao.getSnapshot(db, snapshotId);
  if (!snap) throw new NotFoundError(`Snapshot ${snapshotId} not found`);
  return {
    snap,
    commits: dao.getCommits(db, snapshotId),
    fileChanges: dao.getFileChanges(db, snapshotId),
    fileSizes: dao.getFileSizes(db, snapshotId)
  };
}
function getChurn(db, snapshotId, opts = {}) {
  const { commits, fileChanges } = loadSnapshotData(db, snapshotId);
  return computeChurn(commits, fileChanges, opts);
}
function getHotspots(db, snapshotId, opts = {}) {
  const { commits, fileChanges, fileSizes } = loadSnapshotData(db, snapshotId);
  return computeHotspots(commits, fileChanges, fileSizes, opts);
}
function getCoupling(db, snapshotId, opts = {}) {
  const { commits, fileChanges } = loadSnapshotData(db, snapshotId);
  const pairs = computeCoupling(commits, fileChanges, opts);
  return { pairs, graph: buildCouplingGraph(pairs) };
}
function getOwnership(db, snapshotId, opts = {}) {
  const { commits, fileChanges } = loadSnapshotData(db, snapshotId);
  return computeOwnership(commits, fileChanges, opts);
}
function compareSnapshots(db, prevId, currId, opts = {}) {
  return compareHotspots(getHotspots(db, prevId, opts), getHotspots(db, currId, opts));
}

module.exports = {
  ValidationError, NotFoundError,
  validateRepoUrl, sanitizeToken, buildAuthedUrl, deriveName, analyzeRepository,
  getChurn, getHotspots, getCoupling, getOwnership, compareSnapshots
};
