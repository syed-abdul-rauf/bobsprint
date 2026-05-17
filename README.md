# BobSprint

> **BobSprint turns any public GitHub repo into a sprint-ready delivery pack, powered by IBM Bob Shell.**
> Built for the **IBM Bob Hackathon · 2026**.

Live: **https://bobsprint.vercel.app**

---

## What it does

Paste a public GitHub URL. BobSprint:

1. **Recon** — fetches the full file tree + key file snippets via GitHub API, detects stack, maps architecture, finds risks.
2. **Bob Fan-out** — fires parallel IBM Bob calls (Plan + Ask + Code modes) across Architecture, Risks, Tests, Sprint Plan, and Safe Wins — each prompt is hydrated with real repo context.
3. **Safety Gate** — a second Bob call validates each proposed file change before it touches the repo.
4. **Apply** — creates a fork, branch, and draft PR on GitHub with the Bob-approved changes.
5. **Report** — aggregates all Bob evidence into an exportable sprint pack.

---

## Demo

1. Go to **https://bobsprint.vercel.app/run**
2. Paste any public GitHub URL (e.g. `https://github.com/fastapi/fastapi`)
3. Watch the 5-stage pipeline run live
4. Open `/evidence` — Bob responses logged with timestamps and Bobcoin cost
5. Open `/report` — exportable Sprint Pack

No Bob? Click **Skip — Try demo mode** on the setup screen. Demo replays pre-recorded fixture responses; nothing is faked during live runs.

---

## Architecture

```
Browser (bobsprint.vercel.app)
  │
  ├─ GET /api/bob  ──→  Vercel  ──→  { available, relay }   (fast, runtime relay discovery)
  │
  └─ POST {relay}/api/bob ──→  VPS via Cloudflare Tunnel (HTTPS)
                                  └─ IBM Bob Shell CLI (child_process.spawn)
                                       └─ IBM Bob AI  ──→  SSE Response
```

**Why VPS + tunnel?**
- Vercel hobby functions timeout at 10s. Bob runs take 2–5 minutes.
- Browser → VPS is blocked by mixed-content (HTTPS page can't fetch HTTP). Cloudflare Tunnel gives the VPS a free HTTPS URL.
- POST responses stream as SSE (Server-Sent Events) with 30s keepalive pings so the Cloudflare 100s proxy timeout never fires.

**Runtime relay discovery (no rebuild on tunnel restart).**
The browser resolves the relay URL at runtime from `GET /api/bob`'s `relay`
field (sourced from the `BOB_RELAY_URL` server env), then POSTs Bob calls
directly to the tunnel. Cloudflare quick-tunnel URLs change on every restart and
have no uptime guarantee — because the URL is read at runtime, a restart only
needs a `BOB_RELAY_URL` env update (server env, takes effect immediately, **no
rebuild**), and any already-open browser tab self-heals on its next run. The
Vercel `POST /api/bob` proxy path is intentionally disabled (it returns a fast
JSON error instead of a doomed multi-minute proxy that Vercel kills into a 504
HTML page). `NEXT_PUBLIC_BOB_RELAY_URL` remains only as a build-time fast-path
fallback for when the runtime `GET` is unreachable.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + custom design tokens |
| State | Zustand + localStorage persist |
| Bob bridge | IBM Bob Shell CLI (`bobshell@1.0.3`) via `child_process.spawn` |
| Hosting | Vercel (UI) + Ubuntu VPS (Bob runner) |
| Tunnel | Cloudflare Tunnel (`cloudflared`) — HTTPS for VPS |
| Process mgr | PM2 + systemd on VPS |
| Reverse proxy | nginx (port 80 → Next.js 3000, 300s timeout) |

---

## Pages

| Route | What it does |
|-------|--------------|
| `/` | Landing — hero, pipeline overview, demo CTA |
| `/run` | Main pipeline UI — URL entry, 5-stage progress, live log, budget meter, kill switch |
| `/evidence` | Bob evidence timeline — all responses with timestamps and Bobcoin spend |
| `/report` | Aggregated Sprint Pack — exportable Markdown |
| `/settings` | GitHub PAT and config |

---

## Local development

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000**. Without Bob Shell installed, the app shows the setup screen.

**Install Bob Shell locally (to run Bob locally):**

```bash
# Download bobshell-1.0.3.tgz from https://bob.ibm.com → Bob Shell tab
npm install -g bobshell-1.0.3.tgz
bob   # opens browser login
```

---

## VPS setup (for production relay)

The VPS at `72.61.80.140` runs Next.js + Bob Shell + Cloudflare Tunnel.

```bash
# On VPS (Ubuntu 24.04, Node 20)
git clone https://github.com/syed-abdul-rauf/bobsprint /opt/bobsprint
cd /opt/bobsprint && pnpm install && pnpm build

# Monkeypatch — strips --disable-sigusr1 flag Bob passes to child node processes
# (Node 20 removed support for this flag)
mkdir -p /opt/bobfix && cat > /opt/bobfix/strip-flag.js << 'EOF'
const cp = require('child_process');
const orig = cp.spawn;
cp.spawn = function(cmd, args, opts) {
  if (Array.isArray(args)) args = args.filter(a => a !== '--disable-sigusr1');
  return orig.call(this, cmd, args, opts);
};
EOF

# PM2 (auto-restart, survives reboots)
pm2 start "pnpm start" --name bobsprint
pm2 start "cloudflared tunnel --url http://localhost:3000" \
  --name cloudflared --output /tmp/cf.log --error /tmp/cf-err.log
pm2 startup systemd && pm2 save

# Get Cloudflare tunnel URL (update Vercel NEXT_PUBLIC_BOB_RELAY_URL to this)
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-err.log | tail -1
```

**nginx** (`/etc/nginx/sites-available/bobsprint`):

```nginx
server {
    listen 80;
    location / {
        proxy_pass http://localhost:3000;
        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
    }
}
```

---

## Vercel environment variables

| Variable | Where set | Value |
|----------|-----------|-------|
| `BOB_RELAY_URL` | Server (Vercel), all envs | Cloudflare tunnel **HTTPS** URL — returned by `GET /api/bob` and POSTed to directly by the browser at runtime |
| `NEXT_PUBLIC_BOB_RELAY_URL` | Build-time (Vercel), optional | Stale-tolerant fast-path fallback only; runtime discovery via `GET` takes precedence |

When the Cloudflare tunnel restarts (URL changes), update **only** `BOB_RELAY_URL`. It is a server runtime env — the change takes effect immediately with **no rebuild and no redeploy**:

```bash
for e in production preview development; do
  vercel env rm BOB_RELAY_URL "$e" --yes 2>/dev/null
  echo "https://<new-url>.trycloudflare.com" | vercel env add BOB_RELAY_URL "$e"
done
# No `vercel --prod` needed — server env is read at request time.
```

Get the live tunnel URL from the VPS. The log files accumulate URLs from old
sessions — take the URL from the **last** "quick Tunnel has been created"
banner, then verify it actually answers before trusting it:

```bash
ssh root@72.61.80.140 \
  "grep -hA2 'quick Tunnel has been created' /tmp/cf-err.log \
   | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1"

# Verify (must return {"available":true,...}):
curl -s https://<that-url>/api/bob
```

---

## How IBM Bob fits in

BobSprint does not simulate or mock Bob responses during live runs. Every fan-out call spawns the real `bob` CLI:

```
bob --accept-license --approval-mode yolo --hide-intermediary-output \
    --output-format json --chat-mode <plan|ask|code> "<prompt>"
```

The `--output-format json` flag appends a stats block with `sessionCost` (Bobcoins) and `budgetSpend` (cumulative). BobSprint surfaces both in the Budget Meter and Evidence Panel.

---

## Hackathon positioning

| Theme | How BobSprint addresses it |
|-------|----------------------------|
| **Originality** | Full autonomous pipeline — not a chatbot, not a prompt template. Bob actually runs. |
| **Bob usage** | Fan-out across 5 analysis steps, safety gate, budget tracking, evidence logging |
| **Business value** | Any dev can drop a GitHub URL and get a deployable sprint pack in minutes |
| **Technical execution** | SSE streaming, CORS relay, monkeypatched child_process, PM2 + systemd, draft PR creation |
| **Polish** | Dark UI, animated pipeline stages, live log, budget meter, exportable report |

---

## Author

BobSprint — IBM Bob Hackathon 2026
