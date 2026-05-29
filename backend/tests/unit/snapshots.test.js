'use strict';
const { compareHotspots } = require('../../src/analysis/snapshots');

const prev = [{ filePath: 'a.js', score: 300 }, { filePath: 'c.js', score: 150 }, { filePath: 'b.js', score: 30 }];
const curr = [{ filePath: 'a.js', score: 350 }, { filePath: 'c.js', score: 150 }, { filePath: 'd.js', score: 20 }];

describe('compareHotspots', () => {
  const d = compareHotspots(prev, curr);

  test('detects new hotspots', () => {
    expect(d.added).toEqual([{ filePath: 'd.js', score: 20 }]);
  });
  test('detects resolved hotspots', () => {
    expect(d.removed).toEqual([{ filePath: 'b.js', score: 30 }]);
  });
  test('detects worsened files with deltas', () => {
    expect(d.increased).toEqual([{ filePath: 'a.js', before: 300, after: 350, delta: 50 }]);
  });
  test('detects unchanged files', () => {
    expect(d.unchanged).toEqual([{ filePath: 'c.js', before: 150, after: 150, delta: 0 }]);
  });
  test('summarizes net direction', () => {
    expect(d.summary).toMatchObject({ newHotspots: 1, resolvedHotspots: 1, worsened: 1, improved: 0, netScoreDelta: 40 });
  });
  test('handles empty previous snapshot (all new)', () => {
    const d2 = compareHotspots([], curr);
    expect(d2.added).toHaveLength(3);
    expect(d2.summary.newHotspots).toBe(3);
  });
});
