'use strict';
// Code churn: how frequently each file changes over a time window.
// Pure function -> trivially unit-testable.

const DAY = 86400;

/**
 * @param {Array<{sha:string, authoredAt:number}>} commits
 * @param {Array<{sha:string, filePath:string, insertions:number, deletions:number}>} fileChanges
 * @param {object} [opts]
 * @param {number|null} [opts.windowDays=90] - null = all history
 * @param {number} [opts.now] - unix seconds reference point (default: latest commit)
 * @returns {Array<{filePath:string, commits:number, linesAdded:number, linesRemoved:number, netChange:number, totalChurn:number}>}
 */
function computeChurn(commits, fileChanges, opts = {}) {
  const windowDays = opts.windowDays === undefined ? 90 : opts.windowDays;
  const shaTime = new Map(commits.map((c) => [c.sha, c.authoredAt]));
  const latest = commits.length ? Math.max(...commits.map((c) => c.authoredAt)) : 0;
  const now = opts.now || latest;
  const cutoff = windowDays == null ? -Infinity : now - windowDays * DAY;

  const perFile = new Map();
  for (const ch of fileChanges) {
    const t = shaTime.get(ch.sha);
    if (t === undefined || t < cutoff) continue;
    let rec = perFile.get(ch.filePath);
    if (!rec) {
      rec = { filePath: ch.filePath, commitShas: new Set(), linesAdded: 0, linesRemoved: 0 };
      perFile.set(ch.filePath, rec);
    }
    rec.commitShas.add(ch.sha);
    rec.linesAdded += ch.insertions;
    rec.linesRemoved += ch.deletions;
  }

  const result = [];
  for (const rec of perFile.values()) {
    const commitsCount = rec.commitShas.size;
    result.push({
      filePath: rec.filePath,
      commits: commitsCount,
      linesAdded: rec.linesAdded,
      linesRemoved: rec.linesRemoved,
      netChange: rec.linesAdded - rec.linesRemoved,
      totalChurn: rec.linesAdded + rec.linesRemoved
    });
  }
  // Rank by commit frequency, then by total churn as a tie-breaker.
  result.sort((a, b) => b.commits - a.commits || b.totalChurn - a.totalChurn || a.filePath.localeCompare(b.filePath));
  return result;
}

module.exports = { computeChurn };
