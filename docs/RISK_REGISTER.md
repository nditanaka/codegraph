# Risk Register

CISC 594-90 · Codegraph · maintained throughout the project

Risk management follows the identify → analyze → mitigate → track cycle
described in Laporte & April (2018), *Software Quality Assurance*, Ch. on
software risk management. Likelihood and impact are rated Low/Medium/High;
**Exposure** = Likelihood × Impact (qualitative).

| ID | Risk | Likelihood | Impact | Exposure | Mitigation (in this codebase) | How we *reduced* it / Status |
|---|---|---|---|---|---|---|
| R1 | Slow clone of very large repositories degrades UX | Medium | Medium | Medium | Configurable size limit (`config.maxRepoSizeMb`); background analysis with a status-polling endpoint so the UI never blocks; `maxCount` cap on log depth | **Reduced.** Async pipeline + polling implemented; demo repo (1,102 commits) analyzed in 1.3s. Residual risk Low. |
| R2 | Temporal coupling cost grows quadratically with file count | High | High | High | Prune file pairs below `minSharedCommits`; skip "sweeping" commits touching > `maxFilesPerCommit` files (mass reformats) | **Reduced.** Pruning verified by unit test; on the 817-file demo repo coupling completed in well under the total 1.3s. Residual Low. |
| R3 | Schema changes between V1 and V2 break stored data | Medium | High | High | Snapshot model isolates each run; `CREATE TABLE IF NOT EXISTS` idempotent schema; additive-only columns | **Reduced.** V2 added the `snapshots`/`file_sizes` tables additively with no migration of V1 rows required. Residual Low. |
| R4 | Inaccurate parsing of git output (renames, binaries, merges) corrupts every downstream metric | Medium | High | High | Dedicated pure `parser.js`; `--no-merges`; rename-notation normalization; binary `-` handled as zero | **Reduced.** 11 parser assertions incl. brace/simple renames and binaries; pipeline cross-checked on a real repo. Residual Low. |
| R5 | Private/inaccessible or empty repositories cause unhandled crashes | Medium | Medium | Medium | URL validation; empty-history guard throws `ValidationError`; failures recorded as `status=failed` with message | **Reduced.** Negative-path integration test asserts a failed analysis is recorded, not crashed. Residual Low. |
| R6 | Native SQLite driver fails to build in CI | Low | Medium | Low | Use Node's built-in `node:sqlite` instead of a compiled driver (see ADR-0001) | **Eliminated build risk.** Zero native dependencies; CI runs on stock Node 22. |
| R7 | Two developers editing shared files cause merge conflicts / regressions | Medium | Medium | Medium | Vertical-slice ownership split (see ROLES.md); trunk-based flow; every PR must pass CI before merge | **Reduced.** Module boundaries keep V1/V2 work in separate files; conventional-commit history. Residual Low. |

## Risks we would reduce further with more time
- **R1/R2 at extreme scale:** add incremental analysis (only new commits since the
  last snapshot) and a worker queue to parallelize large repositories.
- **Hotspot accuracy:** replace the lines-of-code complexity proxy with
  language-aware cyclomatic complexity to reduce false positives on large but
  simple files (e.g. `package-lock.json` topping the demo hotspot list).

## Reference
Laporte, C. Y., & April, A. (2018). *Software Quality Assurance.* Wiley/IEEE.
