# Changelog

## [Unreleased] — Focused Rebuild

### Step 2 — Delete dead routes, rewrite core libs

**Deleted**
- `app/(app)/` — all 11 old routes (new, dashboard, bob, evidence, architecture, risks, tests, plan, report, demo)
- `lib/bob-prompts.ts` — 7-prompt paste workflow (replaced by autopilot pipeline)
- `lib/prompts.ts` — legacy prompt shim
- `lib/report.ts` — report generator for deleted routes
- `components/landing3d/` — robot-scene.tsx, starfield.tsx (Three.js / @react-three/fiber)
- `components/visualizations/` — architecture-map.tsx
- `components/landing/` — demo-button.tsx, flow.tsx, marquee.tsx, mockup.tsx
- `components/shell/` — app-shell.tsx, sidebar.tsx, topbar.tsx, demo-banner.tsx, no-project.tsx

**Rewritten**
- `lib/types.ts` — new AutoPilotRun, SafeWin, EvidenceEntry, BobShellResult, DemoFixture; simplified Project
- `lib/store.ts` — v4 Zustand schema (migration wipes v1–v3 data); adds runs + AutoPilot actions
- `lib/analyzer.ts` — trimmed; removed generateSprintPlan, generateArchitecture, generateTests, score helpers
- `lib/demo-data.ts` — Northpeak Proposal Studio pre-recorded demo run (stage: done, 14 evidence entries)
- `app/page.tsx` — minimal landing: URL input → /run, how-it-works, safety rails, footer
- `package.json` — removed three/@react-three/*/jszip; added vitest, @vitest/coverage-v8, @playwright/test, husky
- `.gitignore` — added .bob-bridge.port, bob_sessions/*.local.*, secrets/, *.key, ibm-credentials.env

**Created**
- `scripts/smoke-routes.mjs` — updated ROUTES to ['/', '/run', '/evidence', '/report']
- `CHANGELOG.md` — this file
- `.bobignore` — patterns Bob Shell should skip when reading the repo

---

*Steps 3–10 pending (bob-shell bridge, autopilot orchestrator, /run UI, /evidence, /report, real Bob wiring, e2e tests, benchmarks).*
