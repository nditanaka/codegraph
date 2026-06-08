# Test Report

CISC 594-90 · Codegraph v2.1.0 · generated 2026-06-08

## Summary of outcomes

| Suite | Tool | Tests | Result |
|---|---|---|---|
| Backend unit | Jest | 53 | **53 passed** |
| Backend integration | Jest + supertest | 17 | **17 passed** |
| Frontend component | Vitest + RTL | 21 | **21 passed** |
| **Total automated** | | **91** | **91 passed, 0 failed** |
| End-to-end | Playwright | 1 spec | Written; runs with browsers + servers |

## Backend coverage (Jest --coverage)

```
All files            |   92.92 |    76.95 |   93.26 |   95.78
 analysis (churn/hotspot/coupling/ownership/snapshots) | ~98 stmts
 db (database/dao/migrations)                           | high
 services (analysisService/queue)                       | high
```
Statement coverage **92.92%**, line coverage **95.78%**.

## Test coverage by risk mitigation (v2.1 hardening)
Each retired/active risk in `RISK_REGISTER.md` is backed by tests:

| Area | Tests |
|---|---|
| R1PERF size-limit enforcement | `hardening.test.js` (size cap → graceful failure) |
| R2AUTH PAT validation/injection | `validation.test.js`, `RepoConnect.test.tsx` |
| R3PARS parser correctness | `parser.test.js` (renames, binaries, edge cases) |
| R4DBMS migrations + transactions | `migrations.test.js`, `hardening.test.js` (rollback) |
| R5VIZ pagination + caps | `hardening.test.js` (limit/offset/total) |
| R6CONC serial queue | `queue.test.js`, `hardening.test.js` (concurrent POSTs) |
| R7SEC URL hardening | `validation.test.js` (metachar/protocol rejection) |

## Live validation (real repository)
Running the actual pipeline against
`https://github.com/trekhleb/javascript-algorithms`:

| Metric | Value |
|---|---|
| Commits analyzed | 1,102 |
| Files | 817 |
| Contributors | 221 |
| Wall-clock analysis time | 1.3 s |

Full output: `DEMO_RESULTS.md`.

## How to reproduce
```bash
cd backend  && npm install && npm run test:coverage   # 70 tests
cd frontend && npm install && npm test                 # 21 tests
node backend/scripts/demo.js https://github.com/trekhleb/javascript-algorithms.git
```
