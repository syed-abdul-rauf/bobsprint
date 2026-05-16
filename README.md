# BobSprint

> **BobSprint turns any GitHub repository into an IBM Bob-powered sprint pack.**
> Built for the **IBM Bob Hackathon · 2026**.

---

## Problem

Developers waste time understanding unfamiliar repos before they can safely plan changes.
Onboarding, audits, hackathons, and AI-assisted delivery all hit the same wall: *I don't
understand this codebase enough to ship.*

## Solution

BobSprint loads repo context from a public GitHub URL, generates structured IBM Bob prompts,
stores Bob's outputs as evidence, and produces a sprint-ready delivery report covering
architecture, risks, tests, documentation, and next steps.

## How IBM Bob fits in

BobSprint **does not replace IBM Bob**. It prepares structured prompts using the real repo
context (file structure, detected stack, missing artifacts, risks, and key file snippets),
then **IBM Bob performs the deeper AI review**. You paste Bob's response back into BobSprint
and it appears in the Evidence Panel and the final Report — auditable, not magical.

## Demo flow (judge-ready, ~3 minutes)

1. Open **http://localhost:3000/new**
2. Paste a public GitHub URL (e.g. `https://github.com/fastapi/fastapi`)
3. Click **Load Repo** — BobSprint loads the repo and reads important files
4. Click **Create Sprint Pack** → routes to **/dashboard**
5. Open **/bob** — copy any of the seven prompts into IBM Bob
6. Paste Bob's answer back into BobSprint, click **Save & log evidence**
7. Open **/evidence** — see the Bob conversation logged with timestamps
8. Open **/report** — exportable Sprint Pack with the executive summary, architecture, risks, tests, sprint plan, and Bob evidence

If GitHub rate-limits, click **Open Demo Sample** in the sidebar — it loads the
*Northpeak Proposal Studio* fixture so judges can see the full flow without network.

---

## The original pitch

Developers waste hours — sometimes days — making sense of unfamiliar repos before they
can plan a safe change. Onboarding, audits, hackathons, agency handoffs and AI-assisted
delivery all hit the same wall: *I don't understand this codebase enough to ship*.

**BobSprint** turns codebase context into a sprint-ready plan. You drop in a file tree
or ZIP, and BobSprint produces:

- **Repository Intelligence** — deterministic stack detection, folder mapping, missing-artifact analysis.
- **Architecture Map** — layered visualization across frontend, API, services, data, devops, integrations.
- **Risk & Security Review** — severity-ranked risk cards with concrete fixes.
- **Test Plan Generator** — first tests to write, by category, tailored to the detected stack.
- **Sprint Plan** — file-by-file implementation plan with tasks, rollback, and QA checklist.
- **Final Report** — polished, exportable Sprint Pack (Markdown or PDF).

**Where IBM Bob fits in:** BobSprint isn't a chatbot. It's a structured AI workflow.
For each of seven analysis steps, BobSprint generates a *ready-to-copy IBM Bob prompt*
hydrated with your project's context. You paste Bob's response back in, and the
**Evidence Panel** records the timestamp, the response excerpt, and where it landed in
the Sprint Pack. Judges see receipts, not vibes.

---

## What's in this MVP

| Page | What it does |
|------|--------------|
| `/` | Landing page with hero, features, flow, evidence preview, and CTAs. |
| `/new` | Create a project — paste file tree, upload ZIP, or load the sample. |
| `/dashboard` | Project hub with health score, sprint readiness, IBM Bob progress, and Sprint Pack cards. |
| `/bob` | Seven IBM Bob prompts, hydrated with project context. Copy → paste → log evidence. |
| `/evidence` | Time-stamped Bob evidence timeline + earned badges + manual entry. |
| `/architecture` | Layered architecture map with refine-with-Bob workflow. |
| `/risks` | Filterable risk cards with severity, why-it-matters, fix, and Bob recommendation slot. |
| `/tests` | Categorized test suggestions (unit / API / UI / smoke / regression). |
| `/plan` | Sprint plan generator: file-by-file changes, tasks, rollback, QA. |
| `/report` | Final aggregated report — Markdown export, copy, print-to-PDF. |
| `/demo` | Loads the preloaded Northpeak Proposal Studio sample. |

All persistence is local (`localStorage` via Zustand). **Your code never leaves the
browser.**

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** with custom design tokens
- **Geist Sans / Geist Mono** + **Instrument Serif** for editorial display moments
- **lucide-react** icons
- **framer-motion** for subtle reveals
- **Zustand** with `persist` for in-browser state
- **JSZip** for ZIP repo parsing (lazy-loaded only when needed)

No backend services. No external API calls. Everything runs in the browser.

---

## Getting started

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — landing page renders immediately.

> ⚠ **Always use `localhost:3000`.** Both `npm run dev` and `npm run start` are pinned
> to port 3000 in `package.json`. If you ever see a stale tab on `localhost:3017`
> (or any other port), close it — that was an earlier scaffolding session and is no
> longer served. If port 3000 is already in use:
>
> ```bash
> # Windows
> taskkill /F /IM node.exe
> Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
> npm run dev
> ```

To verify a production build:

```bash
npm run build
npm run start
```

To smoke-test every route (server must be running):

```bash
npm run smoke
```

This hits every route on `http://localhost:3000` and asserts each returns HTTP 200.
Override with `BASE_URL=http://your-host:port npm run smoke`.

---

## Manual test flow

Use this any time you want to confirm the create-pack → dashboard flow end-to-end.

1. Open **http://localhost:3000/new**.
2. **Project name:** `Northpeak Proposal Studio`
3. **Main goal:** `Fix contaminated AI proposal cache and add customer typeahead dropdown.`
4. **File tree** — paste this block into the file-tree textarea:

   ```
   package.json
   next.config.ts
   tailwind.config.ts
   tsconfig.json
   app/layout.tsx
   app/page.tsx
   app/dashboard/page.tsx
   app/proposals/page.tsx
   app/customers/page.tsx
   components/ui/button.tsx
   components/ui/card.tsx
   components/customer-typeahead.tsx
   components/proposal-form.tsx
   lib/api.ts
   lib/proposal-cache.ts
   backend/main.py
   backend/requirements.txt
   backend/app/api/proposals.py
   backend/app/api/customers.py
   backend/app/services/proposal_service.py
   backend/app/services/cache_service.py
   backend/app/services/pdf_renderer.py
   backend/app/services/llm.py
   backend/app/models/customer.py
   backend/app/models/proposal.py
   tests/proposal-cache.test.ts
   tests/customer-typeahead.test.ts
   README.md
   .env.example
   Dockerfile
   docker-compose.yml
   ```

5. Click **Create Sprint Pack**.
6. Confirm the browser navigates to **`/dashboard`**.
7. Confirm the dashboard shows:
   - Project name and goal in the header
   - Detected stack chips (Next.js, React, TypeScript, Python, Tailwind, Docker, …)
   - File / folder / LOC stats
   - "Next best action" card
   - Risks count, sprint readiness, and links to **Bob, Evidence, Architecture, Risks, Tests, Plan, Report**

If `/dashboard` ever loads with no active project (e.g. fresh browser, cleared
storage), it shows the **No project selected** fallback with "Create New Sprint Pack"
and "Open Demo Sample" buttons — never a 404.

---

## Demo script (3 minutes for judges)

1. **Open `/`** — read the hero. Click **Open Demo**.
2. **Dashboard appears** with the *Northpeak Proposal Studio* sample preloaded.
   Point out: 71% Bob completion, 5 Bob badges earned, two high-severity risks, sprint
   plan estimated at 11.5h.
3. **Open `/bob`** — show the seven prompts. Expand *Repo Understanding*; copy the
   prompt to demonstrate it's hydrated with the real project context (file tree, stack,
   goal). Point out: each step has *Sent / Received / Added to Pack* checkboxes plus an
   evidence-log button.
4. **Open `/architecture`** — show the layered map (frontend → API → services → data →
   devops). Mention the *Ask IBM Bob to refine architecture* prompt.
5. **Open `/risks`** — point out the severity-ranked cards. Show the inline
   *Bob recommendation* slot on a risk that already has one attached.
6. **Open `/plan`** — show the prefilled sprint plan: goal, assumptions, file-by-file
   changes, tasks, risks, acceptance, rollback, QA. Point at the *Generate sprint plan*
   button — it's deterministic, not faked.
7. **Open `/evidence`** — show the timeline of Bob steps with timestamps and the badge
   strip. This is the judging artifact.
8. **Open `/report`** — scroll the polished aggregated report. Click **Download .md**
   to demonstrate export. Click **Print to PDF** to show the print stylesheet.

---

## How "Bob workflow" works (for honest judging)

BobSprint **never fakes** an IBM Bob API call. Where IBM Bob does not expose a public
API, BobSprint provides:

1. **Prompt generation** — every analysis step emits a structured, ready-to-copy prompt
   hydrated with your project's name, goal, detected stack, important folders, and
   file tree.
2. **Output capture** — paste Bob's actual response back into the corresponding paste
   box. Each step tracks *Sent / Received / Added to Pack* status.
3. **Evidence logging** — saving a step appends to the Evidence Panel with timestamp,
   step, and response excerpt. Optional screenshot attachment.
4. **Sprint Pack assembly** — Bob recommendations attach inline to risks; refined
   architecture saves to the project; everything rolls up into the final report.
5. **Demo mode** — preloads sample Bob outputs on the Northpeak project so judges can
   see the full workflow without needing a Bob session.

---

## Architecture

```
app/
├── layout.tsx              # Root layout, fonts, theme, toast provider
├── globals.css             # Design tokens + component primitives
├── page.tsx                # Landing
└── (app)/                  # Authenticated app shell
    ├── layout.tsx          # Sidebar + topbar shell
    ├── new/                # Create project
    ├── dashboard/          # Project hub
    ├── bob/                # IBM Bob prompts
    ├── evidence/           # Bob evidence panel
    ├── architecture/       # Architecture map + refinement
    ├── risks/              # Risk review
    ├── tests/              # Test plan
    ├── plan/               # Sprint plan generator
    ├── report/             # Final aggregated report
    └── demo/               # Loads demo sample

components/
├── ui/                     # Button, Card, Badge, Input, ScoreRing, etc.
├── shell/                  # Sidebar, Topbar, ThemeToggle, Brand
├── landing/                # Hero mockup, demo CTA, flow steps
└── visualizations/         # ArchitectureMap

lib/
├── analyzer.ts             # File tree → stack, missing items, risks, tests, architecture
├── prompts.ts              # 7 hydrated IBM Bob prompt templates
├── store.ts                # Zustand + localStorage persistence
├── demo-data.ts            # Northpeak demo project
├── report.ts               # Markdown report builder
├── types.ts                # Shared types
└── utils.ts                # cn, formatRelativeTime, generateId, etc.
```

---

## Performance notes

- **No heavy backend.** Everything runs client-side.
- **Lazy ZIP parsing** — JSZip only loads when a file is selected.
- **Deterministic analysis** — no API calls during repo analysis.
- **No `useEffect` thrash on hot paths** — Zustand selectors avoid full re-renders.
- **Print stylesheet** — `/report` prints cleanly to PDF.

---

## What we did not build (and why)

- **GitHub clone.** MVP scope: ZIP upload + manual file tree paste are deterministic
  and reliable in-browser. Cloning a private repo would need either an OAuth flow or
  the user pasting a token — risky for a hackathon judge.
- **Live IBM Bob API integration.** If IBM Bob does not expose a public API at the
  time of judging, faking calls would mislead. Instead, we built a structured paste
  workflow with first-class evidence tracking.
- **Heavy diagram libraries.** Mermaid would have added ~200 KB to the bundle for
  little gain. The custom layered architecture map is responsive, themable, and
  prints well.

---

## Hackathon positioning

| Theme | How BobSprint addresses it |
|-------|----------------------------|
| **Originality** | Not a chatbot. A structured *AI-assisted software delivery workflow* with built-in evidence capture. |
| **Bob usage** | 7 hydrated prompts, paste-back + evidence logging, badges, refinement workflow. |
| **Business value** | Faster onboarding, safer changes, better docs, auditable AI involvement. |
| **Polish** | Premium SaaS aesthetic. Dark + light themes. Motion. Print-ready report. |
| **Technical execution** | Next.js 15 + TS, type-safe, no console errors, builds clean. |

---

## 2-minute demo script

A short, talkable script lives at [`docs/demo-script.md`](./docs/demo-script.md). Print or
read it before the live demo.

---

## Author / submission

BobSprint MVP — IBM Bob Hackathon 2026
