# Known Limitations & Scaling Characteristics

This document records the current limits of Codegraph v2.0.0, why they exist,
and how they map to the project risk register. It is intentionally candid: most
of these are acceptable trade-offs for a self-hosted analysis tool but matter at
scale or in production.

## Reference datapoint
The only measured run is the demo: **1,102 commits / 817 files analyzed in
~1.3 s** against `trekhleb/javascript-algorithms`. All thresholds below are
engineering estimates derived from the implementation, not separately
benchmarked.

## 1. In-memory, single-threaded pipeline
The entire analysis runs in one Node process on the main thread:
- `git log --numstat` output is loaded into a single string and parsed into
  arrays holding **every commit and every file change at once**.
- At ~100k+ commits these structures can reach hundreds of MB and pressure
  Node's heap.
- Because analysis is not offloaded to a worker, the server is effectively busy
  for the duration of a run; many concurrent analyses would contend.

**Comfortable range:** up to roughly the low tens of thousands of commits and a
few thousand files. (Risk register: R1, R2.)

## 2. Database inserts are not batched in a transaction
`dao.insertCommits / insertFileChanges / insertFileSizes` execute one prepared
statement per row. Storage time grows linearly and becomes the dominant cost
well before the analysis algorithms do.

**Impact:** the first bottleneck on large repositories.
**Planned fix:** wrap each bulk insert in a single transaction
(`BEGIN … COMMIT`) — typically a 5x–50x write speedup.

## 3. `getFileSizes` reads every tracked file synchronously
The hotspot complexity proxy counts lines by reading each tracked file from disk
synchronously. Repos with tens of thousands of files, or with large/binary
files, slow this step significantly and block the event loop. Binary files are
handled (recorded as size 0) but are still opened.

## 4. Temporal coupling is shape-sensitive
Coupling is O(files²) **per commit**. It is mitigated by:
- skipping commits that touch more than `maxFilesPerCommit` (default 50), and
- pruning pairs below `minSharedCommits` (default 2).

Repositories with many medium-sized commits (lots of 20–50-file commits)
generate the most candidate pairs and the most memory use. (Risk register: R2.)

## 5. Repository size limit is configured but NOT enforced
`config.maxRepoSizeMb` (default 500) exists as a setting, but the pipeline does
**not** currently check it before cloning. There is no hard cutoff stopping a
very large clone; the practical limit is your machine's disk and memory.

**Planned fix:** enforce the size check after clone (or via
`git rev-list --disk-usage`) and fail fast with a clear error.

## 6. Private repositories: no token input
The REST API does not accept a GitHub Personal Access Token. Cloning relies on
whatever git credentials the host environment already has (SSH key, credential
helper, or a cached token). The original proposal described PAT input, which is
not yet wired into the clone step.

## 7. No server-side pagination
Analysis endpoints (churn, hotspots, ownership) return the full result arrays.
For very large repositories this produces large JSON payloads and large client
renders. The UI tables/lists cap display counts, but the API responses are not
paginated.

## 8. Platform / runtime
- **Node 22+ required** — the backend uses Node's built-in `node:sqlite`, which
  is still flagged *experimental* (a warning is emitted, silenced in test
  scripts via `NODE_NO_WARNINGS`). API stability is not guaranteed across Node
  versions until it is marked stable.
- **`--no-merges`** — merge commits are excluded from analysis. This keeps churn
  and coupling focused on direct edits, but squash/merge-heavy workflows will
  show different numbers than rebase/linear workflows.

## 9. Metric modelling caveats
- **Complexity proxy = lines of code.** Large-but-simple files (e.g.
  `package-lock.json`, which topped the demo hotspot list) can rank as hotspots.
  A language-aware cyclomatic-complexity measure would reduce false positives.
- **Author identity = email (fallback name).** A contributor who commits under
  multiple emails is counted as multiple authors; no `.mailmap` resolution.
- **"Abandoned"** is relative to the repository's most recent commit, not
  wall-clock today, so a repo whose latest commits are old dependency bumps can
  flag most files as abandoned.

## Summary: what won't work well
| Scenario | Effect |
|---|---|
| 100k+ commits | High memory + slow inserts; may exhaust heap |
| Tens of thousands of files | Slow `getFileSizes`; large clones |
| Many concurrent analyses | Main-thread contention; degraded responsiveness |
| Repos requiring a PAT to clone | Not supported via the API |
| Very large repos relying on the size limit | Limit is not enforced (no cutoff) |

Items 2, 5, and 6 are the highest-value follow-ups and would bring the
implementation fully in line with the proposal.
