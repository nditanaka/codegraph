'use strict';
const request = require('supertest');
const fs = require('fs');
const { openDatabase } = require('../../src/db/database');
const { createApp } = require('../../src/app');
const { makeFixtureRepo } = require('../../scripts/makeFixtureRepo');

async function pollStatus(app, id, target = ['completed', 'failed'], tries = 50) {
  for (let i = 0; i < tries; i++) {
    const res = await request(app).get(`/api/repositories/${id}`);
    if (target.includes(res.body.repository.status)) return res.body;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('timed out waiting for analysis');
}

describe('REST API', () => {
  let db; let app; let fixture;

  beforeAll(() => {
    fixture = makeFixtureRepo();
    db = openDatabase(':memory:');
    app = createApp(db, { allowLocal: true });
  });
  afterAll(() => { if (fixture && fs.existsSync(fixture)) fs.rmSync(fixture, { recursive: true, force: true }); });

  test('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('POST /api/repositories rejects an invalid URL with 400', async () => {
    const res = await request(app).post('/api/repositories').send({ url: 'garbage' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid repository URL/);
  });

  test('POST /api/repositories accepts and analyses a repo (202 -> completed)', async () => {
    const res = await request(app).post('/api/repositories').send({ url: fixture, name: 'fixture' });
    expect(res.status).toBe(202);
    const id = res.body.repository.id;
    const done = await pollStatus(app, id);
    expect(done.repository.status).toBe('completed');
    expect(done.snapshots.length).toBe(1);
  });

  test('analysis endpoints return computed results', async () => {
    const list = await request(app).get('/api/repositories');
    const repo = list.body.repositories[0];
    const snap = (await request(app).get(`/api/repositories/${repo.id}/snapshots`)).body.snapshots[0];

    const churn = await request(app).get(`/api/snapshots/${snap.id}/churn?window=all`);
    expect(churn.status).toBe(200);
    expect(churn.body.churn[0].filePath).toBe('c.js');

    const hot = await request(app).get(`/api/snapshots/${snap.id}/hotspots?window=all`);
    expect(hot.body.hotspots.length).toBeGreaterThan(0);

    const coup = await request(app).get(`/api/snapshots/${snap.id}/coupling?minShared=2`);
    expect(coup.body.pairs.map((p) => `${p.fileA}-${p.fileB}`)).toContain('a.js-b.js');
    expect(coup.body.graph.nodes.length).toBeGreaterThan(0);

    const own = await request(app).get(`/api/snapshots/${snap.id}/ownership`);
    const legacy = own.body.files.find((f) => f.filePath === 'legacy.js');
    expect(legacy.classification).toBe('abandoned');

    const summary = await request(app).get(`/api/snapshots/${snap.id}/summary`);
    expect(summary.body.metrics.commitsAnalyzed).toBe(7);
    expect(summary.body.metrics.contributors).toBe(2);
  });

  test('GET unknown snapshot returns 404', async () => {
    const res = await request(app).get('/api/snapshots/99999/churn');
    expect(res.status).toBe(404);
  });

  test('failed analysis is recorded with failed status', async () => {
    const res = await request(app).post('/api/repositories').send({ url: '/nonexistent/path/repo', name: 'bad' });
    expect(res.status).toBe(202);
    const done = await pollStatus(app, res.body.repository.id);
    expect(done.repository.status).toBe('failed');
    expect(done.repository.error_message).toBeTruthy();
  });
});
