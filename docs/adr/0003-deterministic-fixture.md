# ADR-0003: Deterministic fixture repository as the test oracle

**Status:** Accepted

## Context
Churn, coupling, and ownership numbers are only verifiable if the input history
is known exactly. Asserting against an arbitrary real repo would be brittle.

## Decision
Generate a fixed seven-commit repository with scripted authors, dates, and line
changes (`scripts/makeFixtureRepo.js`). Expected metric values are hand-computed
in `TEST_PLAN.md` and encoded in the unit tests.

## Consequences
- (+) Every formula has a provable expected value; regressions fail the build.
- (+) The fixture doubles as living documentation of how each metric behaves.
- (−) The fixture must be updated deliberately if metric definitions change.
