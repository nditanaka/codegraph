'use strict';
const { computeCoupling, buildCouplingGraph } = require('../../src/analysis/coupling');
const { commits, fileChanges } = require('./_dataset');

describe('computeCoupling', () => {
  const r = computeCoupling(commits, fileChanges, { minSharedCommits: 2 });

  test('detects the two co-change pairs above threshold', () => {
    const pairs = r.map((p) => `${p.fileA}-${p.fileB}`);
    expect(pairs).toContain('a.js-b.js');
    expect(pairs).toContain('c.js-d.js');
    expect(r).toHaveLength(2);
  });

  test('computes shared commit counts', () => {
    const ab = r.find((p) => p.fileA === 'a.js' && p.fileB === 'b.js');
    const cd = r.find((p) => p.fileA === 'c.js' && p.fileB === 'd.js');
    expect(ab.sharedCommits).toBe(3);
    expect(cd.sharedCommits).toBe(2);
  });

  test('strength = shared / min(individual change counts)', () => {
    const ab = r.find((p) => p.fileA === 'a.js' && p.fileB === 'b.js');
    expect(ab.strength).toBe(1); // 3 / min(3,3)
  });

  test('ranks stronger/ more-shared pair first', () => {
    expect(`${r[0].fileA}-${r[0].fileB}`).toBe('a.js-b.js'); // shared 3 > shared 2
  });

  test('minSharedCommits prunes weak pairs', () => {
    const r1 = computeCoupling(commits, fileChanges, { minSharedCommits: 3 });
    expect(r1).toHaveLength(1);
    expect(r1[0].fileA).toBe('a.js');
  });

  test('maxFilesPerCommit skips sweeping commits', () => {
    const big = { sha: 'BIG', filePath: '', insertions: 1, deletions: 0 };
    const sweeping = Array.from({ length: 5 }, (_, i) => ({ ...big, filePath: `x${i}.js` }));
    const r2 = computeCoupling([{ sha: 'BIG', authoredAt: 1 }], sweeping, { minSharedCommits: 1, maxFilesPerCommit: 3 });
    expect(r2).toEqual([]);
  });
});

describe('buildCouplingGraph', () => {
  test('produces nodes and weighted edges', () => {
    const r = computeCoupling(commits, fileChanges, { minSharedCommits: 2 });
    const g = buildCouplingGraph(r);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a.js', 'b.js', 'c.js', 'd.js']);
    expect(g.edges).toHaveLength(2);
    expect(g.edges[0]).toHaveProperty('weight');
  });
});
