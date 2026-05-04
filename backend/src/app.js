'use strict';
const express = require('express');
const cors = require('cors');
const { createApiRouter } = require('./routes/api');

/**
 * Build the Express app. db and options are injected so tests can supply an
 * in-memory database, a local-path allowance, and a mock git layer.
 */
function createApp(db, opts = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));
  app.use('/api', createApiRouter(db, opts));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  return app;
}

module.exports = { createApp };
