-- Codegraph SQLite schema (v2).
-- A "snapshot" is one analysis run of a repository at a point in time. Storing
-- snapshots is what makes the Version 2 comparative/trend feature possible:
-- two snapshots of the same repository can be diffed.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS repositories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  url           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending|cloning|analyzing|completed|failed
  error_message TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id   INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  label           TEXT,
  created_at      INTEGER NOT NULL,
  commit_count    INTEGER NOT NULL DEFAULT 0,
  file_count      INTEGER NOT NULL DEFAULT 0,
  analyzed_through INTEGER -- unix timestamp of most recent commit analyzed
);

CREATE TABLE IF NOT EXISTS commits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id  INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  sha          TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  author_email TEXT NOT NULL,
  authored_at  INTEGER NOT NULL, -- unix seconds
  message      TEXT
);

CREATE TABLE IF NOT EXISTS file_changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  sha         TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  insertions  INTEGER NOT NULL DEFAULT 0,
  deletions   INTEGER NOT NULL DEFAULT 0
);

-- Size (lines of code) per file at analysis time; the hotspot complexity proxy.
CREATE TABLE IF NOT EXISTS file_sizes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  loc         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_commits_snapshot   ON commits(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changes_snapshot   ON file_changes(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changes_path       ON file_changes(snapshot_id, file_path);
CREATE INDEX IF NOT EXISTS idx_sizes_snapshot     ON file_sizes(snapshot_id);
