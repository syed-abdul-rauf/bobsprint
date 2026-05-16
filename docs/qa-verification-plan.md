# BobSprint — Submission Verification Plan

> Status: **AWAITING APPROVAL** — no verification checks run until sign-off.
> Replaces implementation PLAN.md (implementation is complete; this is the QA gate).
> Date: 2026-05-16

---

## Codebase snapshot

What exists and is implemented:
- 4 routes: `app/page.tsx`, `app/run/page.tsx`, `app/evidence/page.tsx`, `app/report/page.tsx`
- Core lib: `autopilot.ts` (5-stage orchestrator), `safe-win-classifier.ts`, `bob-shell.ts`, `context-bundle.ts`, `github-write.ts`, `demo-data.ts`
- Components: `components/run/*` (6 components), `components/evidence/timeline.tsx`, `components/report/report-card.tsx`
- Scripts: `bob-bridge.mjs` (with `BOB_MOCK=1` mode)
- Unit tests: `lib/__tests__/` (3 files), `e2e/autopilot-demo.spec.ts`
- `bob_sessions/README.md` present; `bob_sessions/bridge.log` **does not exist yet**
- `docs/demo-script.md` exists but narrates the OLD flow (pre-rebuild) — needs rewrite

What is MISSING (implementation gaps, not just verification gaps):
1. `scripts/check-submission.mjs` — not created (blocks claims 13, 14)
2. `scripts/benchmark.mjs` — not created (blocks claim 12)
3. `benchmark.md` — not generated (blocks claim 12)
4. `bob_sessions/bridge.log` — requires at least one real/demo run (blocks claims 3, 7, 13)
5. Budget enforcement in `autopilot.ts` — `totalCost` is tracked but never checked against a limit (blocks claim 10)
6. Distinct abort vs. timeout log messages — both produce `'Run aborted by user or timeout.'` (claims 8 and 9 require separate strings: `"aborted by user"` and `"timeout reached"`)

---

## Verification order

Claims are grouped to fail fast on blockers and parallelize independent checks.

### Phase A — Static code + unit tests (no server, no Bob)

Run first; these are deterministic and require no external services.

| Order | Claim | Method | Expected result |
|-------|-------|--------|-----------------|
| A1 | **4** — Whitelist rejects bad diffs | Run `pnpm test` (vitest); safe-win-classifier tests cover 4 synthetic inputs | PASS if all classifier tests green |
| A2 | **2** — Five stage evidence entries | `pnpm test` (autopilot.test.ts); assert evidence entries for all 5 stages | PASS if test green |
| A3 | **5** — Safety gate triggers on behavior change | `pnpm test` (autopilot.test.ts); assert deferred on console.log injection | PASS if deferred assertion green |
| A4 | **10** — Budget enforces | Inspect `autopilot.ts` for `BOBCOIN_BUDGET` / `totalCost` check; run test if exists | **GAP: no budget check — will FAIL** |
| A5 | **8** — Kill switch logs "aborted by user" | Inspect abort path in `autopilot.ts:130`; confirm message text | **GAP: message is "aborted by user or timeout" — needs fix** |
| A6 | **9** — Timeout logs "timeout reached" | Same abort path — both abort types share one message | **GAP: same as A5** |

### Phase B — Build verification

| Order | Claim | Method |
|-------|-------|--------|
| B1 | **16** — Build succeeds, bundle ≤500 KB gzip | `pnpm build`; measure `.next/` output with `@next/bundle-analyzer` or gzip check |

### Phase C — Dev server + routes

| Order | Claim | Method |
|-------|-------|--------|
| C1 | **15** — All 4 routes return 200, no console errors | Boot `pnpm dev`; headless-browse `/`, `/run`, `/evidence`, `/report`; smoke check CTA keyboard-reachable |

### Phase D — Demo mode offline (no Bob, no network)

| Order | Claim | Method |
|-------|-------|--------|
| D1 | **11** — Demo mode deterministic and offline | Block network (firewall rule or DNS null-route), run demo URL twice, diff outputs — must be identical; verify `bridge.log` shows zero new entries per run |

### Phase E — Missing scripts (write + run)

These require writing the two missing scripts, then executing them.

| Order | Claim | Method |
|-------|-------|--------|
| E1 | **14** — No credentials in repo | Write `scripts/check-submission.mjs`; run it; assert exit 0 + zero findings |
| E2 | **13** — `bob_sessions/` real and clean | Same script; assert `bob_sessions/README.md` present; `bridge.log` is checked if it exists |
| E3 | **12** — Benchmark numbers match | Write `scripts/benchmark.mjs` (runs autopilot in mock mode against 3 fixture repos); generate `benchmark.md`; compare to any existing file; update if drifted |

### Phase F — Fixes before real Bob (address Phase A gaps)

| Order | What to fix | Change |
|-------|-------------|--------|
| F1 | **Claims 8/9** — distinct abort messages | Split the single "aborted by user or timeout." string into `"Run aborted by user."` (explicit `.abort()` call) and `"Run timed out after 5 minutes."` (timeout path) |
| F2 | **Claim 10** — budget enforcement | Add budget check after each `totalCost` accumulation: if `totalCost > bobcoinBudget`, throw a new `BudgetExceededError`; catch it separately and log `"budget exceeded"` to evidence |

### Phase G — Real Bob Shell (BLOCKED on Bob availability)

These require `bob` CLI installed, authenticated, and answering non-interactively. If Bob Shell is unavailable, all four are FAIL/BLOCKED.

| Order | Claim | Method |
|-------|-------|--------|
| G1 | **1** — End-to-end under 5 minutes | Run autopilot against 3 small public repos; measure wall time start→PR link |
| G2 | **3** — Three parallel Bob sessions in fan-out | Inspect `bob_sessions/bridge.log` from a real run; assert ≥3 invocations within 5s window with different mode flags |
| G3 | **6** — PR on fork only | Run e2e against a test repo; assert PR is draft, on fork, zero pushes to source |
| G4 | **7** — Bob authored diffs, commits, PR description | Inspect PR from G3; cross-check `bridge.log` shows Bob calls generating each artifact |

### Phase H — Produce deliverables

| Order | Deliverable |
|-------|-------------|
| H1 | `VERIFICATION.md` — one section per claim, PASS/FAIL/DOWNGRADED/BLOCKED |
| H2 | `docs/DEMO_SCRIPT.md` — 60–90 second script referencing only verified claims |

---

## Risk register

| Risk | Likely outcome | Mitigation |
|------|----------------|------------|
| Bob Shell not installed / not answerable non-interactively | Claims 1, 3, 6, 7 → BLOCKED | Mark BLOCKED in VERIFICATION.md; demo mode stands in |
| Budget enforcement not implemented | Claim 10 → FAIL until F2 is applied | Fix is 15 lines in `autopilot.ts` |
| Distinct abort messages missing | Claims 8, 9 → FAIL until F1 is applied | Fix is one string change + one new catch path |
| `bob_sessions/bridge.log` never written | Claims 3, 7, 13 → FAIL | At minimum run demo mode once to populate it; real log requires real Bob |
| Benchmark numbers invented (no `benchmark.mjs`) | Claim 12 → FAIL | Write script; run; generate `benchmark.md` from real mock data |
| Old `docs/demo-script.md` narrates pre-rebuild flow | Demo script deliverable needs full rewrite | Rewrite to match post-rebuild verified behavior only |

---

## Decision before starting

Do you want Phase F fixes (claims 8/9/10) applied **before** or **alongside** verification? They are small code changes (15–20 lines total) that unblock three claims from definite FAIL to testable. If you say "verified state only — no code changes," those three will be marked FAIL.

Say **approved** to begin in the order above, including Phase F fixes.
