'use strict';
// Central configuration. Values are intentionally simple so they can be
// overridden in tests via environment variables.
const path = require('path');

module.exports = {
  // Maximum repository size (in MB) we will attempt to clone. Mitigation for
  // the "slow clone on very large repositories" risk in the risk register.
  maxRepoSizeMb: Number(process.env.CODEGRAPH_MAX_REPO_MB || 500),

  // Default churn analysis windows, in days.
  churnWindows: [30, 60, 90],

  // Temporal coupling: ignore file pairs that co-change fewer than this many
  // times. This pruning keeps the quadratic pair computation tractable.
  couplingMinSharedCommits: Number(process.env.CODEGRAPH_COUPLING_MIN || 2),

  // Ownership: an author owning more than this fraction of a file's changes is
  // considered the single owner (bus-factor-of-one risk).
  ownershipSingleOwnerThreshold: 0.8,

  // Where SQLite databases live. ':memory:' is used by the test suite.
  dbPath: process.env.CODEGRAPH_DB || path.join(__dirname, '..', 'codegraph.db'),

  // Directory for temporary clones.
  tmpDir: process.env.CODEGRAPH_TMP || require('os').tmpdir()
};
