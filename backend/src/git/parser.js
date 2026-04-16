'use strict';
// Pure parsing logic for `git log` output. No I/O here, so every branch is
// unit-testable against fixed strings.

// We ask git for this exact format (see gitClient.js):
//   __COMMIT__\n<sha>\n<name>\n<email>\n<unixtime>\n<subject>
// followed by --numstat lines: "<ins>\t<del>\t<path>"
const RECORD_SEP = '__COMMIT__';

/**
 * Normalize a numstat path, resolving git's rename notation to the new path.
 *   "src/{old => new}/file.js" -> "src/new/file.js"
 *   "old.js => new.js"         -> "new.js"
 * @param {string} raw
 * @returns {string}
 */
function normalizePath(raw) {
  let p = raw.trim();
  if (p.includes('=>')) {
    const brace = p.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
    if (brace) {
      const [, pre, , post, tail] = brace;
      p = `${pre}${post}${tail}`.replace(/\/\//g, '/');
    } else {
      const simple = p.match(/^.* => (.*)$/);
      if (simple) p = simple[1];
    }
  }
  return p.trim();
}

/**
 * Parse raw `git log --numstat` output (in our custom format) into structured
 * commit and file-change records.
 * @param {string} raw
 * @returns {{commits: object[], fileChanges: object[]}}
 */
function parseGitLog(raw) {
  const commits = [];
  const fileChanges = [];
  if (!raw || !raw.trim()) return { commits, fileChanges };

  const blocks = raw.split(RECORD_SEP).map((b) => b.replace(/^\n/, '')).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split('\n');
    const [sha, authorName, authorEmail, at, ...rest] = lines;
    if (!sha) continue;
    const subject = rest.length ? rest[0] : '';
    commits.push({
      sha: sha.trim(),
      authorName: (authorName || '').trim(),
      authorEmail: (authorEmail || '').trim(),
      authoredAt: Number((at || '0').trim()) || 0,
      message: subject
    });

    // numstat lines start at rest[1..]
    for (let i = 1; i < rest.length; i++) {
      const line = rest[i];
      if (!line || !line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [insRaw, delRaw, ...pathParts] = parts;
      const filePath = normalizePath(pathParts.join('\t'));
      if (!filePath) continue;
      // Binary files are reported as "-"; treat as zero line changes.
      const insertions = insRaw === '-' ? 0 : Number(insRaw) || 0;
      const deletions = delRaw === '-' ? 0 : Number(delRaw) || 0;
      fileChanges.push({ sha: sha.trim(), filePath, insertions, deletions });
    }
  }
  return { commits, fileChanges };
}

module.exports = { parseGitLog, normalizePath, RECORD_SEP };
