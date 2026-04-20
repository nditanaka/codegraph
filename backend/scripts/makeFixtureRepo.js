'use strict';
// Builds a DETERMINISTIC git repository so analysis outputs are exactly known
// and can be asserted in tests. See docs/TEST_PLAN.md for the expected-value
// table derived from these scripted commits.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ALICE = { name: 'Alice Dev', email: 'alice@example.com' };
const BOB = { name: 'Bob Dev', email: 'bob@example.com' };

function git(cwd, args, env = {}) {
  execFileSync('git', args, { cwd, env: { ...process.env, ...env }, stdio: 'pipe' });
}

function appendLines(repo, file, n) {
  const p = path.join(repo, file);
  const existing = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  const lines = Array.from({ length: n }, (_, i) => `// ${file} line ${Date.now()}-${i}`);
  fs.writeFileSync(p, existing + lines.join('\n') + '\n');
}

function commit(repo, { author, date, message, edits }) {
  for (const e of edits) appendLines(repo, e.file, e.lines);
  git(repo, ['add', '-A']);
  const iso = `${date}T12:00:00`;
  git(repo, ['commit', '-m', message], {
    GIT_AUTHOR_NAME: author.name, GIT_AUTHOR_EMAIL: author.email,
    GIT_COMMITTER_NAME: author.name, GIT_COMMITTER_EMAIL: author.email,
    GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso
  });
}

/**
 * @param {string} [dir] - destination; a temp dir is created if omitted
 * @returns {string} repo path
 */
function makeFixtureRepo(dir) {
  const repo = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-fixture-'));
  fs.mkdirSync(repo, { recursive: true });
  git(repo, ['init', '-q', '-b', 'main']);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['config', 'user.email', 'fixture@example.com']);

  // C0: legacy.js created long ago, never touched again -> abandoned.
  commit(repo, { author: ALICE, date: '2023-01-01', message: 'feat: add legacy module', edits: [{ file: 'legacy.js', lines: 30 }] });
  // C1: a.js + b.js together (co-change #1)
  commit(repo, { author: ALICE, date: '2024-01-01', message: 'feat: add a and b', edits: [{ file: 'a.js', lines: 10 }, { file: 'b.js', lines: 5 }] });
  // C2: a.js + b.js together (co-change #2)
  commit(repo, { author: ALICE, date: '2024-01-02', message: 'fix: tweak a and b', edits: [{ file: 'a.js', lines: 3 }, { file: 'b.js', lines: 2 }] });
  // C3: c.js alone
  commit(repo, { author: BOB, date: '2024-01-03', message: 'feat: add c', edits: [{ file: 'c.js', lines: 20 }] });
  // C4: a.js + b.js by BOB -> makes a & b shared-owned (co-change #3)
  commit(repo, { author: BOB, date: '2024-01-04', message: 'fix: bob touches a and b', edits: [{ file: 'a.js', lines: 1 }, { file: 'b.js', lines: 1 }] });
  // C5: c.js + d.js together (co-change #1)
  commit(repo, { author: BOB, date: '2024-01-05', message: 'feat: add d, change c', edits: [{ file: 'c.js', lines: 5 }, { file: 'd.js', lines: 8 }] });
  // C6: c.js + d.js together (co-change #2)
  commit(repo, { author: BOB, date: '2024-01-06', message: 'fix: c and d', edits: [{ file: 'c.js', lines: 2 }, { file: 'd.js', lines: 1 }] });

  return repo;
}

if (require.main === module) {
  const out = process.argv[2];
  const repo = makeFixtureRepo(out);
  // eslint-disable-next-line no-console
  console.log(repo);
}

module.exports = { makeFixtureRepo, ALICE, BOB };
