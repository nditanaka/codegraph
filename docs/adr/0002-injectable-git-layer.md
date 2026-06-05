# ADR-0002: Inject the git layer for testable pipelines

**Status:** Accepted

## Context
The analysis pipeline performs real I/O (clone, `git log`). Tests must be fast
and deterministic and must not depend on the network.

## Decision
`analysisService.analyzeRepository` accepts an injectable `git` implementation
and an `allowLocal` flag. Production uses the real `gitClient`; tests run against
a local fixture repository on disk (no network).

## Consequences
- (+) Integration tests exercise the *real* parsing/storage path against a real
  git repo while staying hermetic and sub-second.
- (+) Analysis algorithms remain pure functions over arrays — trivially unit-testable.
- (−) Slightly more wiring in the service signature.
