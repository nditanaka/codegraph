'use strict';
// Hotspot detection: a file that is BOTH frequently changed and complex.
// We use change frequency (commit count) x a complexity proxy (lines of code).

const { computeChurn } = require('./churn');

/**
 * @param {Array} commits
 * @param {Array} fileChanges
 * @param {Object<string,number>} fileSizes - map filePath -> lines of code
 * @param {object} [opts] - forwarded to computeChurn (windowDays, now)
 * @returns {Array<{filePath, changeFrequency, loc, totalChurn, score, normalizedScore}>}
 */
function computeHotspots(commits, fileChanges, fileSizes = {}, opts = {}) {
  const churn = computeChurn(commits, fileChanges, opts);

  const raw = churn.map((c) => {
    const loc = fileSizes[c.filePath] || 0;
    // Risk grows with both factors; product captures the "both elevated" idea.
    const score = c.commits * loc;
    return {
      filePath: c.filePath,
      changeFrequency: c.commits,
      loc,
      totalChurn: c.totalChurn,
      score
    };
  });

  const maxScore = raw.reduce((m, r) => Math.max(m, r.score), 0);
  for (const r of raw) {
    r.normalizedScore = maxScore > 0 ? Math.round((r.score / maxScore) * 1000) / 10 : 0;
  }
  raw.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
  return raw;
}

module.exports = { computeHotspots };
