'use strict';
const express = require('express');
const dao = require('../db/dao');
const svc = require('../services/analysisService');
const { analysisQueue } = require('../services/queue');

function createApiRouter(db, opts = {}) {
  const router = express.Router();
  const allowLocal = opts.allowLocal || false;
  const git = opts.git;
  const queue = opts.queue || analysisQueue;

  const intOpt = (q, name) => (q[name] !== undefined ? Number(q[name]) : undefined);
  function analysisOpts(q) {
    const o = {};
    if (q.window !== undefined) o.windowDays = q.window === 'all' ? null : Number(q.window);
    if (q.minShared !== undefined) o.minSharedCommits = Number(q.minShared);
    return o;
  }
  // R5VIZ: server-side pagination so huge repos never ship unbounded arrays.
  function paginate(arr, q, defaultLimit) {
    const total = arr.length;
    const limit = q.limit !== undefined ? Math.max(0, Number(q.limit)) : defaultLimit;
    const offset = q.offset !== undefined ? Math.max(0, Number(q.offset)) : 0;
    const items = limit ? arr.slice(offset, offset + limit) : arr.slice(offset);
    return { items, total, limit: limit || total, offset };
  }

  // --- Repositories ----------------------------------------------------------
  router.post('/repositories', (req, res) => {
    const { url, name, token } = req.body || {};
    let safeUrl;
    try {
      safeUrl = svc.validateRepoUrl(url, { allowLocal });
      svc.sanitizeToken(token); // validate format up-front (throws on bad token)
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    let repo = dao.getRepositoryByUrl(db, safeUrl);
    if (!repo) repo = dao.createRepository(db, { url: safeUrl, name: name || svc.deriveName(safeUrl) });

    // R6CONC: serialize the heavy work through the queue.
    queue.enqueue(() => svc.analyzeRepository(db, { url: safeUrl, name, token }, { allowLocal, git }))
      .catch(() => { /* status recorded as failed in the service */ });

    res.status(202).json({ repository: dao.getRepository(db, repo.id), queued: queue.pending });
  });

  router.get('/repositories', (req, res) => res.json({ repositories: dao.listRepositories(db) }));
  router.get('/repositories/:id', (req, res) => {
    const repo = dao.getRepository(db, Number(req.params.id));
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    res.json({ repository: repo, snapshots: dao.listSnapshots(db, repo.id) });
  });
  router.get('/repositories/:id/snapshots', (req, res) => {
    const repo = dao.getRepository(db, Number(req.params.id));
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    res.json({ snapshots: dao.listSnapshots(db, repo.id) });
  });

  // --- Snapshot analyses -----------------------------------------------------
  const guard = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof svc.NotFoundError) return res.status(404).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  };

  router.get('/snapshots/:id/churn', guard((req, res) => {
    const all = svc.getChurn(db, Number(req.params.id), analysisOpts(req.query));
    const p = paginate(all, req.query, 100);
    res.json({ churn: p.items, total: p.total, limit: p.limit, offset: p.offset });
  }));

  router.get('/snapshots/:id/hotspots', guard((req, res) => {
    const all = svc.getHotspots(db, Number(req.params.id), analysisOpts(req.query));
    const p = paginate(all, req.query, 250); // top-250 cap by default
    res.json({ hotspots: p.items, total: p.total, limit: p.limit, offset: p.offset });
  }));

  router.get('/snapshots/:id/coupling', guard((req, res) => {
    res.json(svc.getCoupling(db, Number(req.params.id), analysisOpts(req.query)));
  }));

  router.get('/snapshots/:id/ownership', guard((req, res) => {
    const own = svc.getOwnership(db, Number(req.params.id), analysisOpts(req.query));
    const p = paginate(own.files, req.query, 250);
    res.json({ files: p.items, total: p.total, limit: p.limit, offset: p.offset, authors: own.authors });
  }));

  router.get('/snapshots/:id/summary', guard((req, res) => {
    const snap = dao.getSnapshot(db, Number(req.params.id));
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
    const hotspots = svc.getHotspots(db, snap.id, {});
    const { pairs } = svc.getCoupling(db, snap.id, {});
    const ownership = svc.getOwnership(db, snap.id, {});
    res.json({
      snapshot: snap,
      metrics: {
        filesAnalyzed: snap.file_count,
        commitsAnalyzed: snap.commit_count,
        hotspots: hotspots.length,
        strongestCoupling: pairs[0] || null,
        singleOwnerFiles: ownership.files.filter((f) => f.classification === 'single-owner').length,
        abandonedFiles: ownership.files.filter((f) => f.classification === 'abandoned').length,
        contributors: ownership.authors.length
      }
    });
  }));

  router.get('/compare', guard((req, res) => {
    const prev = intOpt(req.query, 'prev');
    const curr = intOpt(req.query, 'curr');
    if (!prev || !curr) return res.status(400).json({ error: 'prev and curr snapshot ids are required' });
    res.json({ diff: svc.compareSnapshots(db, prev, curr, analysisOpts(req.query)) });
  }));

  return router;
}

module.exports = { createApiRouter };
