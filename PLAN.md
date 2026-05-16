# BobSprint — Anthropic-to-Bob Migration Plan

Generated: 2026-05-16
Status: PHASE 1 BLOCKED — `bob` CLI not found on this machine (see §0)

---

## § 0 — Ground-truth findings from `bob --help`

```
❌  bob: command not found
```

Searched exhaustively:
- `where.exe bob` / `where.exe bob.exe` → not found
- `%LOCALAPPDATA%`, `%APPDATA%`, `%USERPROFILE%` recursive *.exe scan → nothing
- npm global modules (`C:\Users\sarau\AppData\Roaming\npm\node_modules`) → empty directory
- pip packages: `bob`, `ibm-generative-ai` → not installed
- `ibmcloud` CLI → not installed
- winget list → no IBM Bob entry

**Bob Shell is not installed on this machine.**

### What must happen before Phase 1

```
! bob --help          ← paste output here to unblock
! bob run --help      ← needed for mode/non-interactive flags
! bob login           ← authenticate once Bob is installed
```

Install method (confirm from hackathon portal — pick whichever applies):
```
npm install -g @ibm/bob-shell
```
or download the binary from the IBM Bob Hackathon portal.

Once the user pastes `bob --help` output, Phase 1 can be completed in ~2 hours.

---

## § 1 — Phase 1: Wire real Bob Shell

### Files changed (in order)

#### 1a. `scripts/bob-bridge.mjs`
**What changes:** Fill in the two empty `args` arrays (lines ~210 and ~265) with real CLI flags confirmed from `bob --help`.

```js
// BEFORE:
const args = [
  // TODO(bob-shell-flags): add --mode, --non-interactive, output flags here
];

// AFTER (example — exact flags TBD from bob --help):
const args = [
  '--print',                                    // non-interactive output flag (example)
  ...(mode ? ['--mode', mode.toLowerCase()] : []),
];
```

Same replacement in `runBobStream` args.

The rest of the bridge (HTTP server, CORS, request routing, logging, mock mode) stays 100% unchanged.

#### 1b. `app/api/bob/route.ts`
**What changes:** Replace `@anthropic-ai/sdk` call with a Node.js `child_process.spawn('bob', args)` call — exactly the same logic as `scripts/bob-bridge.mjs`'s `runBob()` function, just inline in the route.

This eliminates the need to run the bridge as a separate process during development. The bridge remains available for production environments where a separate process is preferred.

GET handler: replace `hasKey` check with `spawn('bob', ['--version'])` returning `{ ok: true/false, installed: bool }`.

#### 1c. `lib/bob-shell.ts`
**No changes.** Already calls `GET /api/bob` for health check and `POST /api/bob` for runs. The API route is the only thing changing internally.

#### 1d. `lib/autopilot.ts`
**No changes to logic.** After wiring, verify that the `mode` values (`'Plan'`, `'Ask'`, `'Code'`) map correctly to Bob's actual mode flag values. If Bob uses different names (e.g. `plan`, `PLAN`, `--plan-mode`), add a mapping in the API route:

```ts
const BOB_MODE_MAP: Record<string, string> = {
  Plan: 'plan',   // ← fill from bob --help
  Ask:  'ask',
  Code: 'code',
};
```

#### 1e. `components/run/setup-required.tsx`
**What changes:** Replace Anthropic API key instructions with Bob Shell install + login instructions.

```tsx
// Show: npm install -g @ibm/bob-shell (or correct install cmd)
// Show: bob login
// Show: restart dev server
```

#### 1f. `.env.local.example`
**What changes:**
- Remove `ANTHROPIC_API_KEY=sk-ant-...`
- Add `BOB_COMMAND=bob` (override if binary name differs from `bob`)
- Add `# BOB_CWD=/path/to/working/dir  # optional`

#### 1g. `package.json`
**What changes:** `npm uninstall @anthropic-ai/sdk` — remove from dependencies.

---

## § 2 — Phase 2: GitHub PAT settings page

### New file: `app/settings/page.tsx`
Single-page settings form:
- GitHub PAT: `<input type="password">`, saved to `useApp(s => s.setGithubPat)`
- Bobcoin budget: range slider 1–40, saved to `useApp(s => s.setBobcoinBudget)`
- Save → validate PAT via `GET https://api.github.com/user`
  - 200: show `✓ Authenticated as @{login}`
  - 401: show `✗ Invalid token`
- Show total Bobcoins spent across all runs

### `components/app-header.tsx`
Add `<Link href="/settings">` with `Settings2` Lucide icon, positioned between nav links and ThemeToggle.

### `app/run/page.tsx`
When `url` is set but `githubPat` is empty, show dismissible banner:
> "Apply stage will be skipped — no GitHub PAT. [Add in Settings →]"

### `lib/store.ts`
Add computed selector `totalBobcoinsSpent`: sum of `totalCost` across all `runs[]`.

---

## § 3 — Phase 3: Dev-mode budget cap

### `.env.local.example`
Add `BOBSPRINT_DEV_MODE=1`.

### `app/api/bob/route.ts`
Add `X-Dev-Mode: true` response header when `BOBSPRINT_DEV_MODE=1`.

### `lib/autopilot.ts`
Add `devMode` field to `AutoPilotParams`. When true:
- `rawWins.slice(0, 5)` → `rawWins.slice(0, 1)` (one file only)
- Auto-approve the single item if path-classifier passes; skip the safety-gate Bob call
- Caps a dev run at ~2 Bob calls (Plan + Ask + 1 Code) ≈ 0.3–0.5 Bobcoins

### `lib/store.ts`
Add `totalBobcoinsSpent` (see Phase 2).

---

## § 4 — Phase 4: Honest claims audit

After Phase 1 completes and a real run finishes:

1. Open `bob_sessions/bridge.log` — confirm entries show `mock: false`, `exitCode: 0`, real `durationMs` values
2. Verify mode names match what Bob accepted (no errors in stderr)
3. Verify `costEstimate` comes from Bob's output (not our estimate) — or document clearly if it's still estimated
4. Run `scripts/benchmark.mjs` against 2–3 small public repos with real Bob
5. Regenerate `benchmark.md` with actual numbers
6. Update `VERIFICATION.md` — mark each claim as ✓ verified or ✗ flagged

---

## § 5 — Dependency graph

```
[Bob installed] → [bob --help pasted] → [flags confirmed]
                                              ↓
                              Phase 1: wire bridge + API route   ~2h
                                              ↓
                              Manual test: real repo, bridge.log
                                              ↓
                              Phase 2: Settings + PAT UI         ~1.5h
                                              ↓
                              Phase 3: Dev-mode budget cap       ~0.5h
                                              ↓
                              Phase 4: Benchmark regeneration    ~1h + coins
```

---

## § 6 — Bobcoin budget plan

| Activity | Estimated cost |
|---|---|
| Phase 1 test runs (3 small repos) | 3–6 coins |
| Phase 4 benchmark (3 repos × 2 runs) | 6–12 coins |
| Live hackathon demo (1 run) | 2–4 coins |
| **Reserve** | ≥10 coins |
| **Total budget** | 40 coins |

Use `BOBSPRINT_DEV_MODE=1` for all development. Never run without it outside benchmark and final demo.

---

## § 7 — Risk register

| Risk | Likely? | Impact | Mitigation |
|---|---|---|---|
| Bob has no `--non-interactive` flag | Medium | High | Pipe-only invocation; check if Bob auto-detects non-TTY |
| Bob re-prompts auth during run | Medium | Critical | `bob login` before bridge start; catch stderr re-prompt, fail fast |
| Mode names differ (Plan/Ask/Code) | Medium | Medium | Map in API route after confirming from `bob --help` |
| Cost not in Bob stdout | Medium | Low | Fall back to our estimate; document in VERIFICATION.md |
| 40-coin limit hit during dev | High | High | `BOBSPRINT_DEV_MODE=1` mandatory for all dev runs |

---

**STOP: Phase 1 cannot begin until `bob --help` output is provided.**
Run `! bob --help` in the Claude Code chat to capture it live.
