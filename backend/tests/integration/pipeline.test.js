'use strict';
// End-to-end pipeline test against a REAL git repository (the deterministic
// fixture). Exercises clone -> git log -> parse -> store -> analyse.
const fs = require('fs');
const { openDatabase } = require('../../src/db/database');
const svc = require('../../src/services/analysisService');
const { makeFixtureRepo } = require('../../scripts/makeFixtureRepo');

describe('analysis pipeline (real git on fixture)', () => {
  let db; let fixture; let ids;

  beforeAll(async () => {
    fixture = makeFixtureRepo();
    db = openDatabase(':memory:');
    ids = await svc.analyzeRepository(db, { url: fixture, name: 'fixture' }, { allowLocal: true });
  });

  afterAll(() => { if (fixture && fs.existsSync(fixture)) fs.rmSync(fixture, { recursive: true, force: true }); });

  test('stores the full commit history', () => {
    expect(ids.snapshotId).toBeGreaterThan(0);
    const snap = require('../../src/db/dao').getSnapshot(db, ids.snapshotId);
    expect(snap.commit_count).toBe(7);
    expect(snap.file_count).toBe(5); // legacy, a, b, c, d
  });

  test('churn over full history ranks c.js first', () => {
    const churn = svc.getChurn(db, ids.snapshotId, { windowDays: null });
    expect(churn[0].filePath).toBe('c.js');
    const a = churn.find((x) => x.filePath === 'a.js');
    expect(a.commits).toBe(3);
  });

  test('hotspots include real lines-of-code complexity', () => {
    const hot = svc.getHotspots(db, ids.snapshotId, { windowDays: null });
    expect(hot.length).toBeGreaterThan(0);
    expect(hot.every((h) => typeof h.loc === 'number')).toBe(true);
  });

  test('temporal coupling detects a.js<->b.js and c.js<->d.js', () => {
    const { pairs } = svc.getCoupling(db, ids.snapshotId, { minSharedCommits: 2 });
    const keys = pairs.map((p) => `${p.fileA}-${p.fileB}`);
    expect(keys).toContain('a.js-b.js');
    expect(keys).toContain('c.js-d.js');
  });

  test('ownership flags legacy.js abandoned and c.js single-owner', () => {
    const own = svc.getOwnership(db, ids.snapshotId, {});
    const byPath = Object.fromEntries(own.files.map((f) => [f.filePath, f]));
    expect(byPath['legacy.js'].classification).toBe('abandoned');
    expect(byPath['c.js'].classification).toBe('single-owner');
    expect(own.authors.map((a) => a.author)).toContain('bob@example.com');
  });

  test('rejects empty/invalid repositories', async () => {
    await expect(
      svc.analyzeRepository(openDatabase(':memory:'), { url: 'not-a-url' }, {})
    ).rejects.toThrow(/Invalid repository URL/);
  });
});
