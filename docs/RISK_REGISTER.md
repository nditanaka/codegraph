# Risk Register

CISC 594-90 · Codegraph · maintained weekly throughout the 10-week cycle

This register uses the same model as the Codegraph Risk Management Report:
a quantitative **Risk Priority Number (RPN) = Probability (P) × Impact (I)**,
each on a 1–5 scale. It is grounded in the "System Safety" lessons of the
Therac-25 accidents (defensive input handling, observability, peer review) and
the V&V principles in Laporte & April (2018), *Software Quality Assurance*.

Bands: **High RPN 15–25**, **Medium RPN 8–12**, **Low RPN 1–6**.

## Status summary (Week 10)
Of 8 identified risks, **6 are retired** and **2 remain active** with safeguards.
Each retirement is backed by code and tests in this repository.

| ID | Risk | Peak RPN | Status | Where it lives in the code |
|---|---|---|---|---|
| R1PERF | Resource exhaustion during repository ingestion | 12 | **Retired** | `analysisService` size check + `gitClient.getRepoSizeMb/getFreeSpaceMb`; `services/queue.js` |
| R2AUTH | Private-repo auth / token handling | 16 | **Retired** | `sanitizeToken` + `buildAuthedUrl`; PAT field in `RepoConnect.tsx` |
| R3PARS | Git-log parsing correctness & format complexity | 9 | **Retired** | `git/parser.js` (custom `__COMMIT__` delimiter, rename/binary/merge handling) |
| R4DBMS | SQLite schema migration & data corruption | 6 | **Retired** | `db/migrations.js` (versioned, transactional) + `dao.insertSnapshotData` |
| R5VIZ | Frontend visualization performance | 9 | **Active** | Server-side pagination + top-250 cap in `routes/api.js`; UI display caps |
| R6CONC | Concurrent execution / DB lock contention | 12 | **Retired** | WAL mode in schema + `SerialQueue` job serialization |
| R7SEC | Command injection via repository URLs | 15 | **Active** | `validateRepoUrl` protocol whitelist + metachar rejection; simple-git runs git without a shell |
| R8DEPN | Dependency deprecation / vulnerability drift | 6 | **Active** | Pinned `package-lock.json`; `npm audit` planned in CI |

## Mitigation detail and "how we reduced it"

**R1PERF — Resource exhaustion (RPN 12 → retired).** Large clones can exhaust
memory/disk. *Reduced by:* a pre-clone free-space check and a post-clone size
check against `config.maxRepoSizeMb`, failing gracefully with a clear error
instead of crashing, plus serialized processing (R6CONC). Verified by
`tests/integration/hardening.test.js`. **Design note:** we deliberately keep a
*full* clone rather than `--depth`-limiting, because line-level churn, temporal
coupling and ownership require complete history; depth-limiting would silently
corrupt those metrics. Resource use is bounded by the size cap, not by truncating
history.

**R2AUTH — Auth / token handling (RPN 16 → retired).** Private repos failed
without credentials. *Reduced by:* an optional GitHub PAT input on the frontend;
the token is format-validated (`sanitizeToken`), injected only into the ephemeral
https clone URL (`buildAuthedUrl`), and never persisted. Verified by
`tests/unit/validation.test.js`.

**R3PARS — Parsing correctness (RPN 9 → retired).** *Reduced by:* a dedicated,
pure parser using an explicit `__COMMIT__` record delimiter (not fragile
whitespace splitting), `--no-merges`, rename-notation normalization, and binary
(`-`) handling; unparseable lines are skipped rather than throwing. Verified by
the parser unit tests.

**R4DBMS — Schema migration & corruption (RPN 6 → retired).** *Reduced by:* a
versioned migration runner (`db/migrations.js`) that applies each migration once
inside a transaction with automatic rollback, recorded in a `schema_version`
table; all snapshot writes go through `insertSnapshotData`, a single transaction.
**Design note:** this is a custom, dependency-free transactional runner rather
than the Knex/db-migrate library named in the original report. Verified by
`tests/unit/migrations.test.js` and `tests/integration/hardening.test.js`.

**R5VIZ — Visualization performance (RPN 9 → active).** Rendering tens of
thousands of rows can lag the browser. *Reduced by:* server-side pagination
(`limit`/`offset`) and a top-250 hotspot cap in the API, plus display caps in the
UI components. Residual risk is kept low; remains *active* pending virtualized
tables. Verified by `tests/integration/hardening.test.js`.

**R6CONC — Concurrency / lock contention (RPN 12 → retired).** *Reduced by:*
SQLite WAL mode (concurrent reads during writes) and an in-process `SerialQueue`
that serializes resource-heavy clone/parse jobs so the single writer is never
contended. **Design note:** this is the in-memory equivalent of the Bull/Redis
design — no external broker is required. Verified by the queue unit test and the
concurrent-POST integration test.

**R7SEC — Command injection via URLs (RPN 15 → active).** *Reduced by:* strict
`validateRepoUrl` — protocol whitelist (http/https/ssh + scp-like), hostname
required, and rejection of shell metacharacters (`; & | ` $ ( ) < >` quotes,
whitespace). simple-git invokes git via `execFile` (no shell), so no shell
expansion occurs. Kept *active* as a standing security concern under continuous
review. Verified by `tests/unit/validation.test.js`.

**R8DEPN — Dependency drift (RPN 6 → active).** *Reduced by:* version pinning via
`package-lock.json` and a CI step intended to run `npm audit` on every PR.
Remains *active* (ongoing monitoring; Dependabot recommended).

## Further reductions with more time
- Incremental analysis (only new commits since the last snapshot) and a
  distributed broker (e.g. Redis) for true multi-node throughput.
- Language-aware cyclomatic complexity to replace the LOC proxy.
- Sandboxed clone execution (containers) to fully isolate untrusted repositories.

## References
Laporte, C. Y., & April, A. (2018). *Software Quality Assurance.* Wiley/IEEE.
Leveson, N. & Turner, C. (1993). *An Investigation of the Therac-25 Accidents.*
