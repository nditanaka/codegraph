'use strict';
const express = require('express');
const dao = require('../db/dao');
const svc = require('../services/analysisService');

// Background analysis tracking so the frontend can poll status.
function createApiRouter(db, opts = {}) {
  const router = express.Router();
  const allowLocal = opts.allowLocal || false;
  const git = opts.git;

  const intOpt = (q, name) => (q[name] !== undefined ? Number(q[name]) : undefined);
  function analysisOpts(q) {
    const o = {};
    if (q.window !== undefined) o.windowDays = q.window === 'all' ? null : Number(q.window);
    if (q.minShared !== undefined) o.minSharedCommits = Number(q.minShared);
    return o;
  }

  // --- Repositories -----------------------------------------------------------
  router.post('/repositories', (req, res) => {
    const { url, name } = req.body || {};
    let safeUrl;
    try {
      safeUrl = svc.validateRepoUrl(url, { allowLocal });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    let repo = dao.getRepositoryByUrl(db, safeUrl);
    if (!repo) repo = dao.createRepository(db, { url: safeUrl, name: name || svc.deriveName(safeUrl) });

    // Kick off analysis in the background; client polls GET /repositories/:id.
    svc.analyzeRepository(db, { url: safeUrl, name }, { allowLocal, git })
      .catch(() => { /* status already recorded as failed in the service */ });

    res.status(202).json({ repository: dao.getRepository(db, repo.id) });
  });

  router.get('/repositories', (req, res) => {
    res.json({ repositories: dao.listRepositories(db) });
  });

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

  // --- Snapshot analyses ------------------------------------------------------
  const guard = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof svc.NotFoundError) return res.status(404).json({ error: e.message });
      return res.status(500).json({ error: e.message });
    }
  };

  router.get('/snapshots/:id/churn', guard((req, res) => {
    res.json({ churn: svc.getChurn(db, Number(req.params.id), analysisOpts(req.query)) });
  }));

  router.get('/snapshots/:id/hotspots', guard((req, res) => {
    res.json({ hotspots: svc.getHotspots(db, Number(req.params.id), analysisOpts(req.query)) });
  }));

  router.get('/snapshots/:id/coupling', guard((req, res) => {
    res.json(svc.getCoupling(db, Number(req.params.id), analysisOpts(req.query)));
  }));

  router.get('/snapshots/:id/ownership', guard((req, res) => {
    res.json(svc.getOwnership(db, Number(req.params.id), analysisOpts(req.query)));
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

  // --- Comparative analysis (V2) ---------------------------------------------
  router.get('/compare', guard((req, res) => {
    const prev = intOpt(req.query, 'prev');
    const curr = intOpt(req.query, 'curr');
    if (!prev || !curr) return res.status(400).json({ error: 'prev and curr snapshot ids are required' });
    res.json({ diff: svc.compareSnapshots(db, prev, curr, analysisOpts(req.query)) });
  }));

  return router;
}

module.exports = { createApiRouter };
