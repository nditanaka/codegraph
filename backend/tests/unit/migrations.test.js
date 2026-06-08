'use strict';
const { openDatabase } = require('../../src/db/database');
const { migrate, currentVersion, migrations } = require('../../src/db/migrations');

describe('versioned migrations (R4DBMS)', () => {
  test('openDatabase brings schema to the latest version', () => {
    const db = openDatabase(':memory:');
    expect(currentVersion(db)).toBe(migrations[migrations.length - 1].id);
  });
  test('migrations are idempotent (re-running applies nothing new)', () => {
    const db = openDatabase(':memory:');
    const v1 = migrate(db);
    const v2 = migrate(db);
    expect(v1).toBe(v2);
    const rows = db.prepare('SELECT COUNT(*) AS c FROM schema_version').get();
    expect(rows.c).toBe(migrations.length);
  });
  test('records each applied migration in schema_version', () => {
    const db = openDatabase(':memory:');
    const names = db.prepare('SELECT name FROM schema_version ORDER BY id').all().map((r) => r.name);
    expect(names).toContain('initial-schema');
  });
});
