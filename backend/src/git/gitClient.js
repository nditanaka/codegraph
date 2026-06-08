'use strict';
// I/O wrapper around git, using simple-git for clone and raw commands.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const simpleGit = require('simple-git');
const { RECORD_SEP } = require('./parser');

const LOG_FORMAT = `${RECORD_SEP}%n%H%n%an%n%ae%n%at%n%s`;

/**
 * Clone a repository. We deliberately perform a FULL clone (not --depth):
 * line-level churn, temporal coupling and ownership all require the complete
 * commit history, so depth-limiting would corrupt those metrics. Resource use
 * is instead bounded by an explicit size check (see analysisService) and a
 * serial job queue. `shell: false` is implied by simple-git, which passes
 * arguments to git via execFile (no shell), preventing command injection.
 * @returns {Promise<string>} path to the cloned repo
 */
async function cloneRepo(url, opts = {}) {
  const dest = opts.dest || fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-'));
  const git = simpleGit();
  await git.clone(url, dest, opts.cloneOptions || []);
  return dest;
}

async function getRawLog(repoDir, opts = {}) {
  const git = simpleGit(repoDir);
  const args = ['log', `--pretty=format:${LOG_FORMAT}`, '--numstat', '--no-merges'];
  if (opts.maxCount) args.push(`-n${opts.maxCount}`);
  return git.raw(args);
}

async function getFileSizes(repoDir) {
  const git = simpleGit(repoDir);
  const out = await git.raw(['ls-files']);
  const files = out.split('\n').map((f) => f.trim()).filter(Boolean);
  const sizes = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(repoDir, f), 'utf8');
      const loc = content.length ? content.split('\n').length : 0;
      sizes.push({ filePath: f, loc });
    } catch {
      sizes.push({ filePath: f, loc: 0 });
    }
  }
  return sizes;
}

/** On-disk size of a directory in MB (R1PERF size-limit enforcement). */
function getRepoSizeMb(dir) {
  try {
    const out = execFileSync('du', ['-sk', dir], { encoding: 'utf8' });
    const kb = parseInt(out.split('\t')[0], 10) || 0;
    return kb / 1024;
  } catch {
    // Fallback: walk the tree.
    let bytes = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else try { bytes += fs.statSync(p).size; } catch { /* skip */ }
      }
    };
    walk(dir);
    return bytes / (1024 * 1024);
  }
}

/** Free space in MB on the filesystem holding `dir` (pre-clone disk check). */
function getFreeSpaceMb(dir) {
  try {
    const s = fs.statfsSync(dir);
    return (s.bavail * s.bsize) / (1024 * 1024);
  } catch {
    return Infinity; // statfs unsupported: don't block.
  }
}

function cleanup(repoDir) {
  if (repoDir && fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
}

module.exports = { cloneRepo, getRawLog, getFileSizes, getRepoSizeMb, getFreeSpaceMb, cleanup, LOG_FORMAT };
