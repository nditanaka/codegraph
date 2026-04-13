'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

/**
 * Open (or create) a SQLite database and apply the schema. Pass ':memory:' for
 * an ephemeral database, which the test suite uses for isolation.
 * @param {string} dbPath
 * @returns {import('node:sqlite').DatabaseSync}
 */
function openDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDatabase };
