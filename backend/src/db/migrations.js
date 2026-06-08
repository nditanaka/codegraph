'use strict';
// Versioned, transaction-safe schema migrations (R4DBMS mitigation).
// Each migration runs exactly once, inside a transaction, with automatic
// rollback on failure. A schema_version table records what has been applied,
// so upgrading from V1 to V2 never corrupts or loses existing snapshot data.
const fs = require('fs');
const path = require('path');

const baseSchema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

/** @type {{id:number, name:string, up:(db:any)=>void}[]} */
const migrations = [
  {
    id: 1,
    name: 'initial-schema',
    up: (db) => db.exec(baseSchema)
  },
  {
    id: 2,
    name: 'add-author-and-path-indexes',
    up: (db) => {
      db.exec('CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(snapshot_id, author_email)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sizes_path ON file_sizes(snapshot_id, file_path)');
    }
  }
];

function currentVersion(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY, name TEXT, applied_at INTEGER)');
  const row = db.prepare('SELECT MAX(id) AS v FROM schema_version').get();
  return row && row.v ? row.v : 0;
}

/**
 * Apply all pending migrations transactionally. Returns the resulting version.
 */
function migrate(db) {
  const from = currentVersion(db);
  for (const m of migrations) {
    if (m.id <= from) continue;
    try {
      db.exec('BEGIN');
      m.up(db);
      db.prepare('INSERT INTO schema_version (id, name, applied_at) VALUES (?, ?, ?)')
        .run(m.id, m.name, Math.floor(Date.now() / 1000));
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* already rolled back */ }
      throw new Error(`Migration ${m.id} (${m.name}) failed and was rolled back: ${err.message}`);
    }
  }
  return currentVersion(db);
}

module.exports = { migrate, migrations, currentVersion };
