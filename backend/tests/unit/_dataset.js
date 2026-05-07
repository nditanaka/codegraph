'use strict';
const DAY = 86400;
const t = (d) => d * DAY;
const commits = [
  { sha: 'C0', authorName: 'Alice Dev', authorEmail: 'alice@example.com', authoredAt: t(0) },
  { sha: 'C1', authorName: 'Alice Dev', authorEmail: 'alice@example.com', authoredAt: t(400) },
  { sha: 'C2', authorName: 'Alice Dev', authorEmail: 'alice@example.com', authoredAt: t(401) },
  { sha: 'C3', authorName: 'Bob Dev', authorEmail: 'bob@example.com', authoredAt: t(402) },
  { sha: 'C4', authorName: 'Bob Dev', authorEmail: 'bob@example.com', authoredAt: t(403) },
  { sha: 'C5', authorName: 'Bob Dev', authorEmail: 'bob@example.com', authoredAt: t(404) },
  { sha: 'C6', authorName: 'Bob Dev', authorEmail: 'bob@example.com', authoredAt: t(405) }
];
const fileChanges = [
  { sha: 'C0', filePath: 'legacy.js', insertions: 30, deletions: 0 },
  { sha: 'C1', filePath: 'a.js', insertions: 10, deletions: 0 },
  { sha: 'C1', filePath: 'b.js', insertions: 5, deletions: 0 },
  { sha: 'C2', filePath: 'a.js', insertions: 3, deletions: 1 },
  { sha: 'C2', filePath: 'b.js', insertions: 2, deletions: 0 },
  { sha: 'C3', filePath: 'c.js', insertions: 20, deletions: 0 },
  { sha: 'C4', filePath: 'a.js', insertions: 1, deletions: 0 },
  { sha: 'C4', filePath: 'b.js', insertions: 1, deletions: 0 },
  { sha: 'C5', filePath: 'c.js', insertions: 5, deletions: 2 },
  { sha: 'C5', filePath: 'd.js', insertions: 8, deletions: 0 },
  { sha: 'C6', filePath: 'c.js', insertions: 2, deletions: 0 },
  { sha: 'C6', filePath: 'd.js', insertions: 1, deletions: 0 }
];
module.exports = { DAY, t, commits, fileChanges, LATEST: t(405) };
