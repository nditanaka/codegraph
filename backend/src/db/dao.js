'use strict';
// Data-access layer. Thin, synchronous wrappers around prepared statements.
// Keeping persistence here means the analysis modules can stay pure functions
// that operate on plain arrays, which makes them trivial to unit test.

function now() { return Math.floor(Date.now() / 1000); }

function createRepository(db, { url, name }) {
  const ts = now();
  const stmt = db.prepare(
    `INSERT INTO repositories (url, name, status, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?)`
  );
  const info = stmt.run(url, name, ts, ts);
  return getRepository(db, Number(info.lastInsertRowid));
}

function getRepository(db, id) {
  return db.prepare('SELECT * FROM repositories WHERE id = ?').get(id) || null;
}

function getRepositoryByUrl(db, url) {
  return db.prepare('SELECT * FROM repositories WHERE url = ?').get(url) || null;
}

function listRepositories(db) {
  return db.prepare('SELECT * FROM repositories ORDER BY created_at DESC').all();
}

function setRepositoryStatus(db, id, status, errorMessage = null) {
  db.prepare(
    'UPDATE repositories SET status = ?, error_message = ?, updated_at = ? WHERE id = ?'
  ).run(status, errorMessage, now(), id);
  return getRepository(db, id);
}

function createSnapshot(db, repositoryId, label = null) {
  const info = db.prepare(
    'INSERT INTO snapshots (repository_id, label, created_at) VALUES (?, ?, ?)'
  ).run(repositoryId, label, now());
  return Number(info.lastInsertRowid);
}

function finalizeSnapshot(db, snapshotId, { commitCount, fileCount, analyzedThrough }) {
  db.prepare(
    'UPDATE snapshots SET commit_count = ?, file_count = ?, analyzed_through = ? WHERE id = ?'
  ).run(commitCount, fileCount, analyzedThrough, snapshotId);
}

function listSnapshots(db, repositoryId) {
  return db.prepare(
    'SELECT * FROM snapshots WHERE repository_id = ? ORDER BY created_at DESC'
  ).all(repositoryId);
}

function getSnapshot(db, snapshotId) {
  return db.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId) || null;
}

function insertCommits(db, snapshotId, commits) {
  const stmt = db.prepare(
    `INSERT INTO commits (snapshot_id, sha, author_name, author_email, authored_at, message)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const c of commits) {
    stmt.run(snapshotId, c.sha, c.authorName, c.authorEmail, c.authoredAt, c.message);
  }
}

function insertFileChanges(db, snapshotId, changes) {
  const stmt = db.prepare(
    `INSERT INTO file_changes (snapshot_id, sha, file_path, insertions, deletions)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const ch of changes) {
    stmt.run(snapshotId, ch.sha, ch.filePath, ch.insertions, ch.deletions);
  }
}

function insertFileSizes(db, snapshotId, sizes) {
  const stmt = db.prepare(
    'INSERT INTO file_sizes (snapshot_id, file_path, loc) VALUES (?, ?, ?)'
  );
  for (const s of sizes) stmt.run(snapshotId, s.filePath, s.loc);
}

function getCommits(db, snapshotId) {
  return db.prepare(
    'SELECT sha, author_name AS authorName, author_email AS authorEmail, authored_at AS authoredAt, message FROM commits WHERE snapshot_id = ? ORDER BY authored_at ASC'
  ).all(snapshotId);
}

function getFileChanges(db, snapshotId) {
  return db.prepare(
    'SELECT sha, file_path AS filePath, insertions, deletions FROM file_changes WHERE snapshot_id = ?'
  ).all(snapshotId);
}

function getFileSizes(db, snapshotId) {
  const rows = db.prepare(
    'SELECT file_path AS filePath, loc FROM file_sizes WHERE snapshot_id = ?'
  ).all(snapshotId);
  const map = {};
  for (const r of rows) map[r.filePath] = r.loc;
  return map;
}

module.exports = {
  now,
  createRepository, getRepository, getRepositoryByUrl, listRepositories, setRepositoryStatus,
  createSnapshot, finalizeSnapshot, listSnapshots, getSnapshot,
  insertCommits, insertFileChanges, insertFileSizes,
  getCommits, getFileChanges, getFileSizes
};
