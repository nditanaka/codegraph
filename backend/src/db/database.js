'use strict';
const { DatabaseSync } = require('node:sqlite');
const { migrate } = require('./migrations');

/**
 * Open (or create) a SQLite database and bring it to the latest schema version
 * via transaction-safe migrations. Pass ':memory:' for an ephemeral database.
 * @param {string} dbPath
 * @returns {import('node:sqlite').DatabaseSync}
 */
function openDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  migrate(db);
  return db;
}

module.exports = { openDatabase };
