'use strict';
const { computeChurn } = require('../../src/analysis/churn');
const { commits, fileChanges, LATEST } = require('./_dataset');

describe('computeChurn (full history)', () => {
  const r = computeChurn(commits, fileChanges, { windowDays: null });
  const byPath = Object.fromEntries(r.map((x) => [x.filePath, x]));

  test('counts commits per file correctly', () => {
    expect(byPath['a.js'].commits).toBe(3);
    expect(byPath['c.js'].commits).toBe(3);
    expect(byPath['d.js'].commits).toBe(2);
    expect(byPath['legacy.js'].commits).toBe(1);
  });

  test('sums lines added/removed and net change', () => {
    expect(byPath['a.js']).toMatchObject({ linesAdded: 14, linesRemoved: 1, netChange: 13, totalChurn: 15 });
    expect(byPath['c.js']).toMatchObject({ linesAdded: 27, linesRemoved: 2, totalChurn: 29 });
  });

  test('ranks by commit frequency then total churn', () => {
    expect(r.map((x) => x.filePath)).toEqual(['c.js', 'a.js', 'b.js', 'd.js', 'legacy.js']);
  });
});

describe('computeChurn (windowed)', () => {
  test('30-day window excludes the year-old legacy commit', () => {
    const r = computeChurn(commits, fileChanges, { windowDays: 30, now: LATEST });
    expect(r.some((x) => x.filePath === 'legacy.js')).toBe(false);
    expect(r).toHaveLength(4);
  });

  test('2-day window keeps only the most recent commits', () => {
    const r = computeChurn(commits, fileChanges, { windowDays: 2, now: LATEST });
    const byPath = Object.fromEntries(r.map((x) => [x.filePath, x.commits]));
    expect(byPath).toEqual({ 'a.js': 1, 'b.js': 1, 'c.js': 2, 'd.js': 2 });
  });
});

describe('computeChurn (edge cases)', () => {
  test('empty input yields empty result', () => {
    expect(computeChurn([], [])).toEqual([]);
  });
  test('single commit single file', () => {
    const r = computeChurn(
      [{ sha: 'x', authoredAt: 100 }],
      [{ sha: 'x', filePath: 'only.js', insertions: 7, deletions: 2 }],
      { windowDays: null }
    );
    expect(r).toEqual([{ filePath: 'only.js', commits: 1, linesAdded: 7, linesRemoved: 2, netChange: 5, totalChurn: 9 }]);
  });
  test('ignores file changes whose commit is unknown', () => {
    const r = computeChurn([{ sha: 'x', authoredAt: 100 }], [{ sha: 'orphan', filePath: 'z.js', insertions: 1, deletions: 0 }], { windowDays: null });
    expect(r).toEqual([]);
  });
});
