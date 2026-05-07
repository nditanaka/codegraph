'use strict';
const { parseGitLog, normalizePath, RECORD_SEP } = require('../../src/git/parser');

const raw = [
  RECORD_SEP, 'sha1', 'Alice', 'alice@example.com', '1704110400', 'feat: add a and b',
  '10\t0\ta.js', '5\t0\tb.js',
  RECORD_SEP, 'sha2', 'Bob', 'bob@example.com', '1704196800', 'refactor: move + binary',
  '3\t1\tsrc/{old => new}/file.js', '-\t-\timage.png', '2\t0\told.js => renamed.js'
].join('\n');

describe('parseGitLog', () => {
  test('parses commit metadata', () => {
    const { commits } = parseGitLog(raw);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({ sha: 'sha1', authorName: 'Alice', authorEmail: 'alice@example.com', authoredAt: 1704110400, message: 'feat: add a and b' });
  });

  test('parses file changes with insertions/deletions', () => {
    const { fileChanges } = parseGitLog(raw);
    const a = fileChanges.find((f) => f.filePath === 'a.js');
    expect(a).toMatchObject({ sha: 'sha1', insertions: 10, deletions: 0 });
  });

  test('resolves brace rename notation to new path', () => {
    const { fileChanges } = parseGitLog(raw);
    expect(fileChanges.some((f) => f.filePath === 'src/new/file.js')).toBe(true);
  });

  test('resolves simple rename notation', () => {
    const { fileChanges } = parseGitLog(raw);
    expect(fileChanges.some((f) => f.filePath === 'renamed.js')).toBe(true);
  });

  test('treats binary "-" changes as zero lines', () => {
    const { fileChanges } = parseGitLog(raw);
    const img = fileChanges.find((f) => f.filePath === 'image.png');
    expect(img).toMatchObject({ insertions: 0, deletions: 0 });
  });

  test('returns empty for empty input', () => {
    expect(parseGitLog('')).toEqual({ commits: [], fileChanges: [] });
    expect(parseGitLog('   ')).toEqual({ commits: [], fileChanges: [] });
  });
});

describe('normalizePath', () => {
  test.each([
    ['a.js', 'a.js'],
    ['old.js => new.js', 'new.js'],
    ['src/{old => new}/f.js', 'src/new/f.js'],
    ['{ => sub}/f.js', 'sub/f.js']
  ])('normalizes %s -> %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});
