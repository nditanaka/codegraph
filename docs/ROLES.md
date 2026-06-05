# Team Roles & Contributions

CISC 594-90 · Codegraph · Two-person team

Work was divided into two coherent tracks: backend/pipeline engineering and
frontend/testing. This split is reflected in the git commit authorship
(`git shortlog -sne`).

## Muhammad Usama Ijaz — Backend & Pipeline Engineering

| Area | Specific work |
|---|---|
| Server & schema | Designed the Express.js server and the SQLite database schema and data-access layer |
| Ingestion engine | Implemented repository cloning and the git-log parsing engine (`git/gitClient.js`, `git/parser.js`) |
| Analysis algorithms | Programmed the backend metrics: code churn and hotspot detection (V1), plus temporal coupling, ownership analytics and snapshot comparison (V2) |
| Pipeline & API | Built the analysis pipeline orchestration, REST API and status polling (`services/`, `routes/`) |
| DevOps | Configured the CI pipeline automation and branch-protection workflow (`.github/workflows/ci.yml`) |
| Evaluation | Live demo runner against real repositories (`scripts/demo.js`) |

## Tanaka Chingonzo — Frontend Engineering & Testing

| Area | Specific work |
|---|---|
| Dashboard | Developed the React SPA dashboard architecture and components |
| Visualizations | Implemented data visualizations with Recharts (hotspot scatter plot, ownership tree, coupling graph, churn tables) |
| Risk management | Authored the Risk Identification Register and proactive mitigations |
| Test engineering | Designed and executed the Unit, Integration, and End-to-End test suites (Jest, supertest, Vitest + React Testing Library, Playwright), including the deterministic test fixture |

## Shared
Architecture decisions (ADRs), the configuration-management strategy, the test
plan, and this presentation were produced jointly.
