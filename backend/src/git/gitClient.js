'use strict';
// I/O wrapper around git, using simple-git for clone and raw commands.
const fs = require('fs');
const os = require('os');
const path = require('path');
const simpleGit = require('simple-git');
const { RECORD_SEP } = require('./parser');

const LOG_FORMAT = `${RECORD_SEP}%n%H%n%an%n%ae%n%at%n%s`;

/**
 * Clone a repository (shallow-ish: full history is needed for churn/coupling,
 * so we clone fully but allow callers to cap via maxCount on the log instead).
 * @returns {Promise<string>} the path to the cloned repo
 */
async function cloneRepo(url, opts = {}) {
  const dest = opts.dest || fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-'));
  const git = simpleGit();
  await git.clone(url, dest, opts.cloneOptions || []);
  return dest;
}

/**
 * Run `git log --numstat` in our custom format and return the raw string.
 * @param {string} repoDir
 * @param {object} [opts] - { maxCount }
 */
async function getRawLog(repoDir, opts = {}) {
  const git = simpleGit(repoDir);
  const args = ['log', `--pretty=format:${LOG_FORMAT}`, '--numstat', '--no-merges'];
  if (opts.maxCount) args.push(`-n${opts.maxCount}`);
  return git.raw(args);
}

/**
 * Count lines of code for each currently-tracked file. This is the hotspot
 * "complexity proxy". Skips files that cannot be read (e.g. binaries removed).
 * @param {string} repoDir
 * @returns {Promise<Array<{filePath: string, loc: number}>>}
 */
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
      // Unreadable/binary file: record size 0 rather than failing the run.
      sizes.push({ filePath: f, loc: 0 });
    }
  }
  return sizes;
}

function cleanup(repoDir) {
  if (repoDir && fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
}

module.exports = { cloneRepo, getRawLog, getFileSizes, cleanup, LOG_FORMAT };
