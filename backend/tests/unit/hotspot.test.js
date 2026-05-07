'use strict';
const { computeHotspots } = require('../../src/analysis/hotspot');
const { commits, fileChanges } = require('./_dataset');

const sizes = { 'a.js': 100, 'b.js': 10, 'c.js': 50, 'd.js': 5, 'legacy.js': 30 };

describe('computeHotspots', () => {
  const r = computeHotspots(commits, fileChanges, sizes, { windowDays: null });
  const byPath = Object.fromEntries(r.map((x) => [x.filePath, x]));

  test('score = change frequency x lines of code', () => {
    expect(byPath['a.js'].score).toBe(300); // 3 commits * 100 loc
    expect(byPath['c.js'].score).toBe(150); // 3 * 50
    expect(byPath['d.js'].score).toBe(10);  // 2 * 5
  });

  test('ranks highest-risk file first', () => {
    expect(r[0].filePath).toBe('a.js');
  });

  test('normalizes top score to 100', () => {
    expect(byPath['a.js'].normalizedScore).toBe(100);
    expect(byPath['c.js'].normalizedScore).toBe(50);
  });

  test('missing size is treated as zero complexity', () => {
    const r2 = computeHotspots(commits, fileChanges, {}, { windowDays: null });
    expect(r2.every((x) => x.score === 0)).toBe(true);
    expect(r2.every((x) => x.normalizedScore === 0)).toBe(true);
  });
});
