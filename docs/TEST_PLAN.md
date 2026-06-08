# Test Plan

CISC 594-90 · Codegraph

## 1. Strategy (the test pyramid)
Following Laporte & April (2018), testing is layered so most checks are fast and
low-level, with fewer, broader tests above:

1. **Unit tests (Jest, backend).** Every analysis algorithm is a *pure function*,
   tested in isolation against a deterministic dataset with hand-calculated
   expected values, plus boundary/edge cases.
2. **Integration tests (Jest + supertest, backend).** The real pipeline runs
   against a real (fixture) git repository; the REST API is exercised over HTTP.
3. **Component tests (Vitest + React Testing Library, frontend).** Each React
   component is rendered and asserted against the DOM.
4. **End-to-end (Playwright).** The full connect → analyze → explore journey.

## 2. The deterministic fixture (oracle for assertions)
`backend/scripts/makeFixtureRepo.js` scripts seven commits with fixed authors
and dates so every metric has a *known* correct answer (a test oracle):

| Commit | Date | Author | Files (lines) |
|---|---|---|---|
| C0 | 2023-01-01 | Alice | legacy.js (+30) |
| C1 | 2024-01-01 | Alice | a.js (+10), b.js (+5) |
| C2 | 2024-01-02 | Alice | a.js (+3,−1), b.js (+2) |
| C3 | 2024-01-03 | Bob | c.js (+20) |
| C4 | 2024-01-04 | Bob | a.js (+1), b.js (+1) |
| C5 | 2024-01-05 | Bob | c.js (+5,−2), d.js (+8) |
| C6 | 2024-01-06 | Bob | c.js (+2), d.js (+1) |

## 3. Worked calculations (CRIT 1.3 — calculate for solution)

**Churn (full history).** Commits-per-file and line totals:
- `a.js`: commits = 3 (C1,C2,C4); +14 / −1; net 13; total churn 15
- `c.js`: commits = 3 (C3,C5,C6); +27 / −2; total churn 29
- `d.js`: commits = 2 (C5,C6); +9 / −0; total churn 9
Ranking (commits desc, then total churn): **c.js, a.js, b.js, d.js, legacy.js**.

**Hotspot score = change frequency × LOC.** With sizes a=100, b=10, c=50, d=5:
- a.js = 3 × 100 = **300** → normalized 100
- c.js = 3 × 50 = **150** → normalized 50
- d.js = 2 × 5 = **10**
Highest-risk file = **a.js**.

**Temporal coupling, strength = shared / min(countA, countB):**
- (a.js, b.js): shared = 3, min(3,3) = 3 → strength **1.00**
- (c.js, d.js): shared = 2, min(3,2) = 2 → strength **1.00**
Pairs below `minSharedCommits=2` are pruned (e.g. a.js–c.js share 0).

**Ownership, owner share = max author changes / total changes:**
- `c.js`: Bob 3/3 = 1.00 ≥ 0.8 → **single-owner** (bus factor 1)
- `a.js`: Alice 2/3 = 0.667 < 0.8 → **shared**
- `legacy.js`: last change 2023-01-01, > 180 days before latest commit → **abandoned**

These expected values are encoded directly in the unit tests, so a regression in
any formula fails the build.

## 4. Edge cases covered
Empty repository; single commit/file; unknown-commit file changes; rename
notation (`{old => new}` and `old => new`); binary files (`-` line counts);
exact threshold boundary for single-owner (share = 0.80); pruning of sweeping
commits; empty previous snapshot in comparison.


## 6.1 v2.1 security & resilience tests
The hardening pass added dedicated tests for each risk mitigation: URL
validation and PAT handling (`validation.test.js`), the serial job queue
(`queue.test.js`), transactional versioned migrations (`migrations.test.js`),
and size-limit/transaction-rollback/pagination/concurrency behavior
(`integration/hardening.test.js`). Total automated tests: 91.

## 5. Scope / out of scope
In scope: analysis correctness, API contract, component rendering, primary user
flow. Out of scope (documented future work): load/performance testing at
GitHub-scale, language-aware complexity, authentication hardening.

## Reference
Laporte, C. Y., & April, A. (2018). *Software Quality Assurance.* Wiley/IEEE.
