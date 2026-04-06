# Codegraph — Git Repository Health Analyzer

CISC 594-90: Testing Principles · Version 2.0.0

Codegraph mines a Git repository's version-control history and turns it into
actionable health insights: code churn, hotspots, hidden temporal coupling,
and ownership/bus-factor risk. It is a lightweight, self-hosted alternative to
commercial tools like CodeScene, pairing the git-history analysis style of
command-line tools (code-maat, Hercules) with a modern web dashboard.

## Architecture

```
codegraph/
├── backend/     Node.js + Express API, simple-git, SQLite (node:sqlite), analysis engine
│   ├── src/
│   │   ├── git/         gitClient (clone/log/diff) + pure parser
│   │   ├── analysis/    churn, hotspot, coupling, ownership, snapshots (pure functions)
│   │   ├── db/          schema, SQLite wrapper, data-access layer
│   │   ├── services/    pipeline orchestration + result accessors
│   │   └── routes/      REST API
│   ├── scripts/         deterministic fixture-repo generator, live demo runner
│   └── tests/           unit (Jest) + integration (supertest)
├── frontend/    React + TypeScript + Vite + Tailwind + Recharts dashboard
│   ├── src/             components, pages, API client
│   ├── tests/           Vitest + React Testing Library
│   └── e2e/             Playwright end-to-end spec
├── docs/        test plan/report, risk register, configuration management, roles, ADRs
└── .github/     CI workflow (lint + test on every PR)
```

## Features

| Version | Feature | Module |
|---|---|---|
| 1 | Repository connection & analysis pipeline | `services/analysisService.js` |
| 1 | Code churn analysis (30/60/90-day windows) | `analysis/churn.js` |
| 1 | Hotspot detection (change frequency × complexity) | `analysis/hotspot.js` |
| 2 | Temporal coupling analysis (with pruning) | `analysis/coupling.js` |
| 2 | Author & ownership analytics (bus factor) | `analysis/ownership.js` |
| 2 | Comparative snapshot analysis | `analysis/snapshots.js` |

## Quick start

```bash
# Backend (http://localhost:4000)
cd backend && npm install && npm start

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

## Testing

```bash
cd backend  && npm test            # 52 unit + integration tests (Jest)
cd backend  && npm run test:coverage
cd frontend && npm test            # 19 component tests (Vitest)
cd frontend && npm run e2e         # Playwright end-to-end (needs browsers + servers)
```

See `docs/TEST_PLAN.md` and `docs/TEST_REPORT.md` for the full strategy and results.

## Live demo

`docs/DEMO_RESULTS.md` contains real output from analyzing
`https://github.com/trekhleb/javascript-algorithms` (1,102 commits, 817 files,
221 contributors) produced by `node backend/scripts/demo.js <url>`.

## Known limitations

Codegraph is an in-memory, single-threaded analyzer tuned for the
self-hosted / team-repo use case. It runs comfortably up to roughly the low tens
of thousands of commits and a few thousand files (the demo analyzed 1,102
commits / 817 files in ~1.3s). Beyond that, memory use, un-batched database
inserts, and synchronous file reads become bottlenecks; the configured repo-size
limit is not yet enforced, private-repo token input is not wired in, and the
hotspot complexity proxy is lines-of-code rather than cyclomatic complexity.

See `docs/LIMITATIONS.md` for the full list, the reasons, and planned fixes.

## Reference

Laporte, C. Y., & April, A. (2018). *Software Quality Assurance.* IEEE Computer
Society / John Wiley & Sons.
