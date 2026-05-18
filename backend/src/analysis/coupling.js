'use strict';
// Temporal coupling: files that repeatedly change together in the same commit,
// revealing hidden architectural dependencies invisible from imports alone.

/**
 * @param {Array<{sha:string}>} commits
 * @param {Array<{sha:string, filePath:string}>} fileChanges
 * @param {object} [opts]
 * @param {number} [opts.minSharedCommits=2] - prune pairs below this co-change count
 * @param {number} [opts.maxFilesPerCommit=50] - skip sweeping/bulk commits (pruning heuristic)
 * @returns {Array<{fileA, fileB, sharedCommits, strength}>}
 */
function computeCoupling(commits, fileChanges, opts = {}) {
  const minShared = opts.minSharedCommits == null ? 2 : opts.minSharedCommits;
  const maxFiles = opts.maxFilesPerCommit || 50;

  const byCommit = new Map();
  for (const ch of fileChanges) {
    let s = byCommit.get(ch.sha);
    if (!s) { s = new Set(); byCommit.set(ch.sha, s); }
    s.add(ch.filePath);
  }

  const fileCommitCount = new Map();
  const pairShared = new Map();

  for (const files of byCommit.values()) {
    const list = [...files];
    for (const f of list) fileCommitCount.set(f, (fileCommitCount.get(f) || 0) + 1);
    if (list.length > maxFiles) continue;
    list.sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]} ${list[j]}`;
        pairShared.set(key, (pairShared.get(key) || 0) + 1);
      }
    }
  }

  const result = [];
  for (const [key, shared] of pairShared.entries()) {
    if (shared < minShared) continue;
    const [a, b] = key.split(' ');
    const denom = Math.min(fileCommitCount.get(a), fileCommitCount.get(b));
    const strength = denom > 0 ? Math.round((shared / denom) * 1000) / 1000 : 0;
    result.push({ fileA: a, fileB: b, sharedCommits: shared, strength });
  }
  result.sort((x, y) => y.strength - x.strength || y.sharedCommits - x.sharedCommits ||
    x.fileA.localeCompare(y.fileA));
  return result;
}

function buildCouplingGraph(pairs) {
  const nodes = new Map();
  const edges = pairs.map((p) => {
    nodes.set(p.fileA, true);
    nodes.set(p.fileB, true);
    return { source: p.fileA, target: p.fileB, weight: p.strength, shared: p.sharedCommits };
  });
  return { nodes: [...nodes.keys()].map((id) => ({ id })), edges };
}

module.exports = { computeCoupling, buildCouplingGraph };
