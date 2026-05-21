'use strict';
// Author / ownership analytics. Surfaces "bus factor of one" risk: files whose
// history is dominated by a single author.

const DAY = 86400;

/**
 * @param {Array<{sha:string, authorName:string, authorEmail:string, authoredAt:number}>} commits
 * @param {Array<{sha:string, filePath:string}>} fileChanges
 * @param {object} [opts]
 * @param {number} [opts.singleOwnerThreshold=0.8]
 * @param {number} [opts.abandonedDays=180]
 * @param {number} [opts.now] - default: latest commit time
 * @returns {{files:Array, authors:Array}}
 */
function computeOwnership(commits, fileChanges, opts = {}) {
  const threshold = opts.singleOwnerThreshold == null ? 0.8 : opts.singleOwnerThreshold;
  const abandonedDays = opts.abandonedDays == null ? 180 : opts.abandonedDays;
  const latest = commits.length ? Math.max(...commits.map((c) => c.authoredAt)) : 0;
  const now = opts.now || latest;
  const abandonedCutoff = now - abandonedDays * DAY;

  const shaMeta = new Map(commits.map((c) => [c.sha, c]));

  const perFile = new Map();   // path -> { authorCounts:Map, total, lastChangedAt }
  const perAuthor = new Map(); // author -> { commits:Set, files:Set }

  for (const ch of fileChanges) {
    const meta = shaMeta.get(ch.sha);
    if (!meta) continue;
    const author = meta.authorEmail || meta.authorName;

    let rec = perFile.get(ch.filePath);
    if (!rec) { rec = { authorCounts: new Map(), total: 0, lastChangedAt: 0 }; perFile.set(ch.filePath, rec); }
    rec.authorCounts.set(author, (rec.authorCounts.get(author) || 0) + 1);
    rec.total += 1;
    rec.lastChangedAt = Math.max(rec.lastChangedAt, meta.authoredAt);

    let arec = perAuthor.get(author);
    if (!arec) { arec = { author, name: meta.authorName, commits: new Set(), files: new Set() }; perAuthor.set(author, arec); }
    arec.commits.add(ch.sha);
    arec.files.add(ch.filePath);
  }

  const files = [];
  for (const [filePath, rec] of perFile.entries()) {
    let owner = null; let ownerCount = 0;
    for (const [a, c] of rec.authorCounts.entries()) {
      if (c > ownerCount) { ownerCount = c; owner = a; }
    }
    const ownerShare = rec.total > 0 ? ownerCount / rec.total : 0;
    let classification;
    if (rec.lastChangedAt < abandonedCutoff) classification = 'abandoned';
    else if (ownerShare >= threshold) classification = 'single-owner';
    else classification = 'shared';
    files.push({
      filePath,
      owner,
      ownerShare: Math.round(ownerShare * 1000) / 1000,
      totalChanges: rec.total,
      authorCount: rec.authorCounts.size,
      classification,
      lastChangedAt: rec.lastChangedAt
    });
  }
  files.sort((a, b) => b.ownerShare - a.ownerShare || b.totalChanges - a.totalChanges ||
    a.filePath.localeCompare(b.filePath));

  const authors = [...perAuthor.values()].map((a) => ({
    author: a.author,
    name: a.name,
    commits: a.commits.size,
    filesTouched: a.files.size
  })).sort((x, y) => y.commits - x.commits || x.author.localeCompare(y.author));

  return { files, authors };
}

module.exports = { computeOwnership };
