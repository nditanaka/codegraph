'use strict';
// Comparative analysis: diff two analysis snapshots to show whether codebase
// health improved or regressed (Version 2 feature).

/**
 * Compare hotspot scores between an earlier and later snapshot.
 * @param {Array<{filePath, score}>} prev
 * @param {Array<{filePath, score}>} curr
 * @returns {{added, removed, increased, decreased, unchanged, summary}}
 */
function compareHotspots(prev, curr) {
  const prevMap = new Map(prev.map((h) => [h.filePath, h.score]));
  const currMap = new Map(curr.map((h) => [h.filePath, h.score]));

  const added = [];
  const removed = [];
  const increased = [];
  const decreased = [];
  const unchanged = [];

  for (const [filePath, score] of currMap.entries()) {
    if (!prevMap.has(filePath)) { added.push({ filePath, score }); continue; }
    const before = prevMap.get(filePath);
    const delta = score - before;
    const entry = { filePath, before, after: score, delta };
    if (delta > 0) increased.push(entry);
    else if (delta < 0) decreased.push(entry);
    else unchanged.push(entry);
  }
  for (const [filePath, score] of prevMap.entries()) {
    if (!currMap.has(filePath)) removed.push({ filePath, score });
  }

  increased.sort((a, b) => b.delta - a.delta);
  decreased.sort((a, b) => a.delta - b.delta);

  const summary = {
    newHotspots: added.length,
    resolvedHotspots: removed.length,
    worsened: increased.length,
    improved: decreased.length,
    // Net direction: positive means the codebase got riskier overall.
    netScoreDelta: curr.reduce((s, h) => s + h.score, 0) - prev.reduce((s, h) => s + h.score, 0)
  };

  return { added, removed, increased, decreased, unchanged, summary };
}

module.exports = { compareHotspots };
