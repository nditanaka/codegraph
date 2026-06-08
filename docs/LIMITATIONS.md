# Known Limitations & Scaling Characteristics

Codegraph v2.1.0. This document is kept honest and current: it lists what the
system does *not* do, after the v2.1 hardening pass that closed several earlier
gaps. It complements the risk register (`RISK_REGISTER.md`).

## Reference datapoint
Measured run: **1,102 commits / 817 files in ~1.3 s** against
`trekhleb/javascript-algorithms`. Thresholds below are engineering estimates.

## Resolved in v2.1 (previously listed as limitations)
- **Bulk inserts are now transactional** (`dao.insertSnapshotData`) — no longer
  one fsync per row.
- **Repository size limit is now enforced** — pre-clone free-space check and
  post-clone size check against `config.maxRepoSizeMb`, with graceful failure.
- **Private-repo PAT input** is supported (validated, ephemeral, https-only).
- **Server-side pagination + top-250 hotspot cap** bound API payloads.
- **Concurrency** is handled by an in-process serial queue plus SQLite WAL mode.
- **URL validation** whitelists protocols and rejects shell metacharacters.
- **Schema changes** go through versioned, transactional migrations.

## Remaining limitations

### 1. Single-node, in-memory job queue
The `SerialQueue` serializes work within one process. It is **not** a distributed
broker — multiple backend instances would each have their own queue. True
multi-node throughput would require an external broker (e.g. Redis/Bull).

### 2. Full clone is required (by design)
Line-level churn, temporal coupling, and ownership need complete history, so we
do **not** use `--depth` shallow clones (which would corrupt those metrics).
Very large histories are bounded by the size cap, not by truncation; an
extremely large in-scope repo will still be limited by disk/memory for the clone.

### 3. In-memory analysis
The git log is parsed into in-memory arrays. Comfortable up to roughly the low
tens of thousands of commits; 100k+ commits will pressure Node's heap. Streaming
/ incremental analysis is future work.

### 4. `getFileSizes` reads files synchronously
The hotspot complexity proxy reads each tracked file to count lines. Tens of
thousands of files, or large binaries, slow this step.

### 5. Metric modelling
- Complexity proxy is **lines of code**, not language-aware cyclomatic
  complexity, so large-but-simple files (e.g. `package-lock.json`) can rank high.
- Author identity is by email; no `.mailmap` aliasing.
- "Abandoned" is relative to the repo's latest commit, not wall-clock today.

### 6. Platform
- **Node 22+** required; `node:sqlite` is still flagged experimental.
- Merge commits are excluded (`--no-merges`).
- Playwright E2E specs require browser binaries (`npx playwright install`) and
  both servers running.

## Summary
| Scenario | Effect |
|---|---|
| 100k+ commits | Heap pressure (in-memory parse) |
| Tens of thousands of files | Slow `getFileSizes` |
| Multi-node deployment | Per-process queues (no shared broker) |
| Repo larger than size cap | Rejected with a clear error (by design) |
