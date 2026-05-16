# BobSprint — 2-minute demo script

Read this start-to-finish in roughly 2 minutes. Pauses are marked **·**.
Live demo URL: **http://localhost:3000**.

---

## 0:00 — Problem (15s)

> Every developer has joined a project they don't understand. Reading the repo, finding
> the risks, planning the work — that takes hours before you can safely ship a single
> change. AI helps, but most AI tools just guess at the code. Judges want **proof** of
> AI involvement, not vibes.

## 0:15 — Product (15s)

> **BobSprint** turns any GitHub repo into an **IBM Bob-powered sprint pack**. We
> don't replace Bob — we prepare structured prompts from real repo context, you run
> them in IBM Bob, and we capture Bob's responses as evidence in a final delivery
> report.

## 0:30 — GitHub repo loading (25s)

> *(Open http://localhost:3000/new)*
>
> Paste a public GitHub URL — I'll use **fastapi/fastapi**. Click **Load Repo**.
>
> BobSprint pulls the real repo structure straight from GitHub — no clone, no token —
> and then reads the most important files: configs, entry points, key services. You
> can see the live count: *Reading important files (12 / 25)…*
>
> Click **Create Sprint Pack** — that takes us to the dashboard.

## 0:55 — Dashboard (15s)

> *(Dashboard appears)*
>
> Detected stack, file count, risk count, sprint readiness score. The **Code Signals**
> card shows we loaded from GitHub on the `master` branch and read 24 important files.
> The **Next best action** card guides you to the next move — start the Bob workflow.

## 1:10 — IBM Bob prompts (25s)

> *(Open /bob)*
>
> Seven structured prompts, all hydrated with this repo's stack, missing artifacts,
> risks, and code snippets. Open *Risk Review* — notice it cites real folder paths
> from the repo and includes actual code from the cache module.
>
> I copy this into IBM Bob, get a response, paste it back into the box. Click
> **Save & log evidence**.

## 1:35 — Evidence panel (15s)

> *(Open /evidence — "How did you use IBM Bob?")*
>
> Every Bob interaction logged: prompt, response, timestamp, which Sprint Pack
> artifact it supports. Judges click here for the receipts.

## 1:50 — Final report (10s)

> *(Open /report)*
>
> Executive summary, architecture, risks, tests, sprint plan, IBM Bob evidence —
> exportable as Markdown or printed to PDF. This is what the team takes back to work.

## 2:00 — Why it matters (10s)

> Faster onboarding. Safer changes. Better documentation. **Auditable AI involvement**
> — not magic, not guessing. That's why BobSprint earns a Bob hackathon submission.

---

## Quick demo backup

If GitHub rate-limits live, the sidebar has **Open Demo Sample** — it instantly loads
the *Northpeak Proposal Studio* fixture (preloaded Bob outputs, evidence, and a sample
sprint plan). Use that for any live demo where network is dicey.

## Setup before demo

1. `npm install` (if first time)
2. `npm run dev` — opens **http://localhost:3000**
3. Hard-reload the browser tab once before going live so the first compile doesn't
   slow down the opening click.
4. Open in incognito to avoid stale localStorage from previous demos.
