'use strict';
const fs = require('fs');
const request = require('supertest');
const { openDatabase } = require('../../src/db/database');
const { createApp } = require('../../src/app');
const dao = require('../../src/db/dao');
const svc = require('../../src/services/analysisService');
const realGit = require('../../src/git/gitClient');
const { SerialQueue } = require('../../src/services/queue');
const { makeFixtureRepo } = require('../../scripts/makeFixtureRepo');

let fixture;
beforeAll(() => { fixture = makeFixtureRepo(); });
afterAll(() => { if (fixture && fs.existsSync(fixture)) fs.rmSync(fixture, { recursive: true, force: true }); });

describe('R1PERF size-limit enforcement', () => {
  test('analysis fails gracefully when the repo exceeds the size limit', async () => {
    const db = openDatabase(':memory:');
    const bigGit = { ...realGit, getRepoSizeMb: () => 9999 };
    await expect(
      svc.analyzeRepository(db, { url: fixture }, { allowLocal: true, git: bigGit, maxRepoSizeMb: 1 })
    ).rejects.toThrow(/size limit/);
    const repo = dao.getRepositoryByUrl(db, fixture);
    expect(repo.status).toBe('failed');
    expect(repo.error_message).toMatch(/size limit/);
  });
});

describe('R4DBMS transactional storage', () => {
  test('dao.transaction rolls back on error', () => {
    const db = openDatabase(':memory:');
    db.exec('CREATE TABLE t(x INTEGER)');
    expect(() => dao.transaction(db, () => {
      db.prepare('INSERT INTO t(x) VALUES(1)').run();
      throw new Error('fail');
    })).toThrow('fail');
    expect(db.prepare('SELECT COUNT(*) AS c FROM t').get().c).toBe(0);
  });

  test('insertSnapshotData persists commits, changes and sizes atomically', () => {
    const db = openDatabase(':memory:');
    const repo = dao.createRepository(db, { url: 'u', name: 'n' });
    const sid = dao.createSnapshot(db, repo.id);
    dao.insertSnapshotData(db, sid, {
      commits: [{ sha: 's', authorName: 'A', authorEmail: 'a@x', authoredAt: 1, message: 'm' }],
      fileChanges: [{ sha: 's', filePath: 'f.js', insertions: 2, deletions: 1 }],
      fileSizes: [{ filePath: 'f.js', loc: 10 }]
    });
    expect(dao.getCommits(db, sid)).toHaveLength(1);
    expect(dao.getFileChanges(db, sid)).toHaveLength(1);
    expect(dao.getFileSizes(db, sid)['f.js']).toBe(10);
  });
});

describe('R6CONC queue serializes API analyses', () => {
  test('concurrent POSTs are processed one at a time and all complete', async () => {
    const db = openDatabase(':memory:');
    const queue = new SerialQueue();
    const app = createApp(db, { allowLocal: true, queue });
    await Promise.all([
      request(app).post('/api/repositories').send({ url: fixture, name: 'q1' }),
      request(app).post('/api/repositories').send({ url: fixture, name: 'q2' })
    ]);
    await queue.drain();
    const repo = dao.getRepositoryByUrl(db, fixture);
    expect(repo.status).toBe('completed');
  });
});

describe('R5VIZ pagination', () => {
  let app; let db; let snapId;
  beforeAll(async () => {
    db = openDatabase(':memory:');
    const queue = new SerialQueue();
    app = createApp(db, { allowLocal: true, queue });
    await request(app).post('/api/repositories').send({ url: fixture, name: 'pg' });
    await queue.drain();
    const repo = dao.getRepositoryByUrl(db, fixture);
    snapId = dao.listSnapshots(db, repo.id)[0].id;
  });

  test('churn endpoint honors limit/offset and returns total', async () => {
    const res = await request(app).get(`/api/snapshots/${snapId}/churn?window=all&limit=2&offset=0`);
    expect(res.status).toBe(200);
    expect(res.body.churn.length).toBeLessThanOrEqual(2);
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.churn.length);
    expect(res.body).toHaveProperty('limit', 2);
  });

  test('hotspots endpoint caps results and reports total', async () => {
    const res = await request(app).get(`/api/snapshots/${snapId}/hotspots?window=all&limit=1`);
    expect(res.body.hotspots.length).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});
