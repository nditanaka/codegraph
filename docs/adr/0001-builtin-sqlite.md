# ADR-0001: Use Node's built-in `node:sqlite` instead of a compiled driver

**Status:** Accepted · **Deciders:** Tanaka, Muhammad

## Context
The proposal specifies SQLite (zero-config, file-based). The common Node driver
`better-sqlite3` is a native module that must compile against the platform,
which is a known CI/portability risk (R6 in the risk register).

## Decision
Use the SQLite engine built into Node 22 (`node:sqlite`, `DatabaseSync`). Same
SQLite engine and SQL, but no native build step.

## Consequences
- (+) Zero native dependencies; CI runs on stock Node; risk R6 eliminated.
- (+) Synchronous API keeps the data-access layer simple and easy to test.
- (−) The module is flagged experimental in Node 22 (emits a warning, silenced
  via `NODE_NO_WARNINGS`). Acceptable for a course project; revisit when stable.
