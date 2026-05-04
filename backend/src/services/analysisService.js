'use strict';
// Orchestrates the analysis pipeline: validate -> clone -> extract -> parse ->
// store -> finalize -> cleanup. The git layer is injectable so integration
// tests can run against a local fixture without network access.

const dao = require('../db/dao');
const realGit = require('../git/gitClient');
const { parseGitLog } = require('../git/parser');
const { computeChurn } = require('../analysis/churn');
const { computeHotspots } = require('../analysis/hotspot');
const { computeCoupling, buildCouplingGraph } = require('../analysis/coupling');
const { computeOwnership } = require('../analysis/ownership');
const { compareHotspots } = require('../analysis/snapshots');

const GIT_URL = /^(https?:\/\/|git@)/i;

class ValidationError extends Error {}
class NotFoundError extends Error {}

function validateRepoUrl(url, { allowLocal = false } = {}) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new ValidationError('Repository URL is required');
  }
  const u = url.trim();
  if (GIT_URL.test(u)) return u;
  if (allowLocal && (u.startsWith('/') || u.startsWith('./') || u.startsWith('file:'))) return u;
  throw new ValidationError('Invalid repository URL: must be an http(s) or git URL');
}

function deriveName(url) {
  return url.replace(/\.git$/, '').replace(/\/$/, '').split('/').pop() || url;
}

/**
 * Run the full pipeline for a repository URL. Resolves to { repositoryId, snapshotId }.
 */
async function analyzeRepository(db, { url, name }, opts = {}) {
  const git = opts.git || realGit;
  const allowLocal = opts.allowLocal || false;
  const safeUrl = validateRepoUrl(url, { allowLocal });

  let repo = dao.getRepositoryByUrl(db, safeUrl);
  if (!repo) repo = dao.createRepository(db, { url: safeUrl, name: name || deriveName(safeUrl) });

  let dir;
  try {
    dao.setRepositoryStatus(db, repo.id, 'cloning');
    dir = await git.cloneRepo(safeUrl, opts.cloneOptions ? { cloneOptions: opts.cloneOptions } : {});

    dao.setRepositoryStatus(db, repo.id, 'analyzing');
    const raw = await git.getRawLog(dir, { maxCount: opts.maxCount });
    const { commits, fileChanges } = parseGitLog(raw);
    if (commits.length === 0) {
      throw new ValidationError('Repository has no commit history to analyze');
    }
    const sizes = await git.getFileSizes(dir);

    const snapshotId = dao.createSnapshot(db, repo.id, opts.label || null);
    dao.insertCommits(db, snapshotId, commits);
    dao.insertFileChanges(db, snapshotId, fileChanges);
    dao.insertFileSizes(db, snapshotId, sizes);

    const filePaths = new Set(fileChanges.map((c) => c.filePath));
    const analyzedThrough = Math.max(...commits.map((c) => c.authoredAt));
    dao.finalizeSnapshot(db, snapshotId, {
      commitCount: commits.length,
      fileCount: filePaths.size,
      analyzedThrough
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

// ---- Result accessors (read stored snapshot, run pure analysis) -------------

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
  const prev = getHotspots(db, prevId, opts);
  const curr = getHotspots(db, currId, opts);
  return compareHotspots(prev, curr);
}

module.exports = {
  ValidationError, NotFoundError,
  validateRepoUrl, deriveName, analyzeRepository,
  getChurn, getHotspots, getCoupling, getOwnership, compareSnapshots
};
