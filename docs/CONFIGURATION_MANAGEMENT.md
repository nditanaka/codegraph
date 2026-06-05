# Configuration Management Plan

CISC 594-90 · Codegraph

Software Configuration Management (SCM) here follows the four classic
activities — identification, control, status accounting, and audit — as framed
in Laporte & April (2018), *Software Quality Assurance*.

## 1. Configuration identification
- **Single source repository** on GitHub, accessible to the instructor.
- **Semantic versioning.** `v1.0.0` tags the V1 release (pipeline + churn +
  hotspot); `v2.0.0` tags the V2 release (coupling + ownership + snapshots).
- **Configuration items:** backend source, frontend source, database schema,
  test suites, CI workflow, and the documents under `docs/`.

## 2. Configuration control (branching & change control)
- **Trunk-based development.** `main` always holds working, tested code.
- **Feature branches** named by intent: `feature/…`, `fix/…`, `test/…`.
- **Pull requests** are the only path into `main`. Every PR must pass the CI
  suite (lint + all tests) before merge — enforced by `.github/workflows/ci.yml`.
- **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) give a
  machine-readable change history and drive ownership attribution.

## 3. Ownership / authorship convention
Commits are authored under the owning team member's identity, so `git log`
itself is the status-accounting record of who built what:
- **Tanaka Chingonzo** authors V1 commits (pipeline, churn, hotspot, platform).
- **Muhammad Usama Ijaz** authors V2 commits (coupling, ownership, snapshots).

Verify with:
```bash
git shortlog -sne          # commits per author
git log --oneline --decorate
git tag                    # v1.0.0, v2.0.0
```

## 4. Status accounting & audit
- `git shortlog` and tags provide per-author and per-release accounting.
- CI status on each PR is the audit trail that the baseline stayed green.
- The test report (`TEST_REPORT.md`) is the verification record for each release.

## 5. Environment / tooling configuration
- Node 22 (built-in SQLite — no native build, see ADR-0001).
- Dependencies pinned in `package.json`; `.gitignore` excludes `node_modules`,
  build output, and local databases so only source is versioned.

## Reference
Laporte, C. Y., & April, A. (2018). *Software Quality Assurance.* Wiley/IEEE.
