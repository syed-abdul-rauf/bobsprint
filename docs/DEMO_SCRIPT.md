# BobSprint — Demo Script

> Total runtime: 75 seconds. No filler. Every beat backed by a verified claim.
> Live URL: http://localhost:3000
> Pre-requisite: `BOB_MOCK=1 node scripts/bob-bridge.mjs` running in a terminal.

---

## 0:00 — Landing page (`/`)

**Screen:** `/` — headline, one CTA, no clutter.  
**Narration:** "BobSprint turns any unfamiliar GitHub repo into a sprint-ready
fork with real tests and docs added — in under 5 minutes, powered by IBM Bob."  
*(Backed by: claim 15 — route returns 200, no console errors)*

---

## 0:10 — Start rescue (`/run`)

**Action:** Click the "Start rescue" CTA. Route navigates to `/run`.  
**Screen:** URL input field visible. "DEMO MODE" badge not yet shown.  
*(Backed by: claim 15 — /run route 200)*

---

## 0:13 — Paste the demo URL

**Action:** Type `demo` into the GitHub URL field.  
**Screen:** "DEMO MODE" badge appears. Setup-required panel is hidden (bridge is running).  
**Narration:** "I'll use the built-in demo repo — same pipeline, fully offline."  
*(Backed by: claim 11 — demo mode is offline and deterministic)*

---

## 0:16 — Click Start

**Action:** Click "Start rescue".  
**Screen:** Stage 1 (Recon) lights up — pulsing indicator. Progress node visible.

---

## 0:18 — Recon stage

**Screen:** Recon node active. Budget meter at 0 Bobcoins.  
**Narration:** "Bob reads the entire repo — structure, stack, missing artifacts — in parallel."  
*(Backed by: claim 2 — recon-complete evidence entry logged)*

---

## 0:21 — Fan-out: three Bob sessions

**Screen:** Fan-out node pulses. Three progress items appear simultaneously:
Plan mode · Ask mode · Code mode.  
**Narration:** "Three IBM Bob sessions run at once: Plan mode identifies gaps, Ask mode
writes the executive summary, Code mode drafts the actual files."  
*(Backed by: claim 3 — bridge.log shows ≥3 invocations within a 5-second window)*

---

## 0:40 — Safety gate

**Screen:** Safety gate node activates. Each proposed file shows a "SAFE ✓" or "DEFERRED" badge.  
**Narration:** "A second Bob session in Ask mode reviews each diff. If it detects any
behavior change to existing code, the change is deferred — never applied automatically."  
*(Backed by: claim 5 — safety gate defers behavior-changing diffs)*

---

## 0:55 — Apply and PR

**Screen:** Apply node lights up. Commit messages appear as files are written to the fork.
Then the PR link appears — `github.com/[fork]/[repo]/pull/N`.  
**Narration:** "Bob writes the commit messages and PR description. The diff lands on your
fork as a draft PR — zero pushes to the source repo."  
*(Backed by: claims 6 — PR on fork, draft flag, no source-repo push; claim 7 — Bob authored commits)*

---

## 1:05 — Report card (`/report`)

**Action:** Pipeline completes, auto-redirects to `/report`.  
**Screen:** Report card shows: files analyzed, tests added, docs added, Bobcoins spent,
time elapsed, PR link.  
**Narration:** "The full rescue in under 90 seconds in demo mode. With real Bob Shell and
a live GitHub repo, the pipeline targets under 5 minutes end to end."  
*(Backed by: claim 11 — deterministic; claim 1 — target under 300s)*

---

## 1:10 — Evidence trail (`/evidence`)

**Action:** Click "Evidence" in the header nav. Route to `/evidence`.  
**Screen:** Timeline showing all 5 stage entries: recon, fan\_out, safety\_gate, apply, report.
Each entry has stage badge, mode chip (Plan/Ask/Code), duration, and summary.  
**Narration:** "Every Bob call is audited — the full evidence trail is here for the judges."  
*(Backed by: claim 2 — five stage entries, all non-zero duration, all source-tagged)*

---

## 1:15 — Kill switch (optional live demo)

**Action:** *(If demoing kill switch)* Start a second run, hit the red stop button mid-stage.  
**Screen:** All progress halts. Evidence log shows "aborted by user". No PR opened.  
*(Backed by: claim 8 — kill switch aborts cleanly, logs "aborted by user")*

---

## 1:20 — Close

**Narration:** "BobSprint: IBM Bob as the engine, not the footnote. Paste a URL, get a PR."

---

## Pre-demo checklist

- [ ] `pnpm dev` running on port 3000
- [ ] `BOB_MOCK=1 node scripts/bob-bridge.mjs` running in a second terminal
- [ ] Browser at `http://localhost:3000`, DevTools open to Console — confirm zero errors
- [ ] Network tab cleared
- [ ] Previous run state cleared (or use incognito tab for clean Zustand state)

## Verified claims referenced

| Beat | Claims |
|------|--------|
| Landing | 15 |
| `/run` route | 15 |
| Demo mode active | 11 |
| Recon evidence | 2 |
| Fan-out parallel | 3 |
| Safety gate defers | 5 |
| Apply + PR | 6, 7 |
| Report card | 11, 1 |
| Evidence trail | 2 |
| Kill switch | 8 |
