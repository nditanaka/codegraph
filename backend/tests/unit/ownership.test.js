'use strict';
const { computeOwnership } = require('../../src/analysis/ownership');
const { commits, fileChanges, LATEST } = require('./_dataset');

describe('computeOwnership', () => {
  const r = computeOwnership(commits, fileChanges, { singleOwnerThreshold: 0.8, abandonedDays: 180, now: LATEST });
  const byPath = Object.fromEntries(r.files.map((f) => [f.filePath, f]));

  test('classifies single-owner files (bus factor of one)', () => {
    expect(byPath['c.js'].classification).toBe('single-owner');
    expect(byPath['c.js'].owner).toBe('bob@example.com');
    expect(byPath['c.js'].ownerShare).toBe(1);
  });

  test('classifies shared-ownership files', () => {
    expect(byPath['a.js'].classification).toBe('shared');
    expect(byPath['a.js'].ownerShare).toBe(0.667); // 2 of 3 by Alice
    expect(byPath['a.js'].authorCount).toBe(2);
  });

  test('flags long-untouched files as abandoned', () => {
    expect(byPath['legacy.js'].classification).toBe('abandoned');
  });

  test('builds per-author summary sorted by commits', () => {
    expect(r.authors[0]).toMatchObject({ author: 'bob@example.com', commits: 4, filesTouched: 4 });
    expect(r.authors[1]).toMatchObject({ author: 'alice@example.com', commits: 3, filesTouched: 3 });
  });

  test('threshold boundary: exactly at threshold counts as single-owner', () => {
    const cm = [
      { sha: 's1', authorName: 'A', authorEmail: 'a@x', authoredAt: 1000 },
      { sha: 's2', authorName: 'A', authorEmail: 'a@x', authoredAt: 1001 },
      { sha: 's3', authorName: 'A', authorEmail: 'a@x', authoredAt: 1002 },
      { sha: 's4', authorName: 'A', authorEmail: 'a@x', authoredAt: 1003 },
      { sha: 's5', authorName: 'B', authorEmail: 'b@x', authoredAt: 1004 }
    ];
    const fc = cm.map((c) => ({ sha: c.sha, filePath: 'f.js', insertions: 1, deletions: 0 }));
    const res = computeOwnership(cm, fc, { singleOwnerThreshold: 0.8, now: 1004, abandonedDays: 9999 });
    expect(res.files[0].ownerShare).toBe(0.8);
    expect(res.files[0].classification).toBe('single-owner');
  });
});
