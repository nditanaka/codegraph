# Test Report

CISC 594-90 · Codegraph · generated 2026-06-08

## Summary of outcomes

| Suite | Tool | Tests | Result |
|---|---|---|---|
| Backend unit | Jest | 40 | **40 passed** |
| Backend integration | Jest + supertest | 12 | **12 passed** |
| Frontend component | Vitest + RTL | 19 | **19 passed** |
| **Total automated** | | **71** | **71 passed, 0 failed** |
| End-to-end | Playwright | 1 spec | Written; runs with browsers + servers |

## Backend coverage (Jest --coverage)

```
All files            |   93.25 |    69.16 |   91.66 |   96.08
 analysis (churn/hotspot/coupling/ownership/snapshots) | 97.63 stmts
 churn.js / hotspot.js / coupling.js                   | 100 stmts
 db (database/dao)                                      | 100 stmts
```
Statement coverage **93.25%**, line coverage **96.08%**. The analysis engine —
the highest-risk code — is at ~98–100%.

## What the tests caught during development
- Rename notation (`{old => new}`) initially mis-attributed churn to the old
  path; the parser test drove the normalization fix.
- The single-owner threshold needed a boundary test (share = 0.80 exactly) to
  pin down inclusive vs. exclusive comparison.
- Negative-path test confirmed a bad repository URL produces a recorded
  `status=failed` rather than an unhandled rejection.

## Live validation (real repository)
Running the actual pipeline against
`https://github.com/trekhleb/javascript-algorithms`:

| Metric | Value |
|---|---|
| Commits analyzed | 1,102 |
| Files | 817 |
| Contributors | 221 |
| Wall-clock analysis time | 1.3 s |
| #1 hotspot | package-lock.json |
| Significant couplings (≥5 shared) | 174 |
| Single-owner (bus-factor-1) files | 6 |

Full output: `DEMO_RESULTS.md`.

## How to reproduce
```bash
cd backend  && npm install && npm run test:coverage
cd frontend && npm install && npm test
node backend/scripts/demo.js https://github.com/trekhleb/javascript-algorithms.git
```
