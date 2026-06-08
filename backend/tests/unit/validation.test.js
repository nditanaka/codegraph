'use strict';
const svc = require('../../src/services/analysisService');
const { ValidationError } = svc;

describe('validateRepoUrl (R7SEC hardening)', () => {
  test('accepts https/http/ssh and scp-like URLs', () => {
    expect(svc.validateRepoUrl('https://github.com/a/b.git')).toBeTruthy();
    expect(svc.validateRepoUrl('http://example.com/a/b')).toBeTruthy();
    expect(svc.validateRepoUrl('ssh://git@github.com/a/b.git')).toBeTruthy();
    expect(svc.validateRepoUrl('git@github.com:a/b.git')).toBeTruthy();
  });
  test('rejects empty input', () => {
    expect(() => svc.validateRepoUrl('')).toThrow(ValidationError);
  });
  test('rejects disallowed protocols (e.g. file:// when not local)', () => {
    expect(() => svc.validateRepoUrl('ftp://x/y')).toThrow(/protocol/);
  });
  test('rejects shell-injection metacharacters', () => {
    expect(() => svc.validateRepoUrl('https://github.com/a/b; rm -rf /')).toThrow(/illegal characters/);
    expect(() => svc.validateRepoUrl('https://github.com/a/b`whoami`')).toThrow(/illegal characters/);
    expect(() => svc.validateRepoUrl('https://github.com/a/b$(touch x)')).toThrow(/illegal characters/);
  });
  test('allows local paths only when allowLocal is set', () => {
    expect(svc.validateRepoUrl('/tmp/repo', { allowLocal: true })).toBe('/tmp/repo');
    expect(() => svc.validateRepoUrl('/tmp/repo')).toThrow();
  });
});

describe('PAT handling (R2AUTH)', () => {
  test('sanitizeToken accepts valid tokens and rejects bad ones', () => {
    expect(svc.sanitizeToken('ghp_AbC123_def')).toBe('ghp_AbC123_def');
    expect(svc.sanitizeToken('')).toBeNull();
    expect(svc.sanitizeToken(null)).toBeNull();
    expect(() => svc.sanitizeToken('bad token!')).toThrow(/Invalid access token/);
    expect(() => svc.sanitizeToken('tok;rm')).toThrow();
  });
  test('buildAuthedUrl injects token into https only, never persisted elsewhere', () => {
    expect(svc.buildAuthedUrl('https://github.com/a/b.git', 'TOK')).toBe('https://TOK@github.com/a/b.git');
    expect(svc.buildAuthedUrl('https://github.com/a/b.git', null)).toBe('https://github.com/a/b.git');
    expect(svc.buildAuthedUrl('ssh://git@github.com/a/b.git', 'TOK')).toBe('ssh://git@github.com/a/b.git');
  });
});
