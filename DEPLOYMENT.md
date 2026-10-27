# Deployment guide — Free Fire Esports HQ

This is a **monorepo** with two deployable pieces plus a managed database:

| Piece | Location | Host | Why |
| --- | --- | --- | --- |
| Frontend (Vite + React SPA) | repo root (`/`, `src/`, `index.html`) | **Vercel** | Static/SPA hosting + CDN; Vercel's sweet spot |
| Backend (Fastify API + workers + bot) | `backend/` | **Render** | Long-lived processes + a persistent polling worker |
| Database / Auth / Storage | — | **Supabase** | Already provisioned (`pivamlbexbpnlqbhqljm`) |

> Vercel can host the frontend only. The backend has an always-on reminder
> worker (and later a Discord gateway bot) that cannot run on Vercel's
> serverless model — those belong on Render (or Railway/Fly.io/a VPS).

Config files in this repo:
- `render.yaml` — Render Blueprint for the backend (API + reminder worker).
- `vercel.json` — Vercel config for the frontend SPA.
- `backend/.github/workflows/keep-alive.yml` — pings the API so a free Render
  web service doesn't sleep (and keeps Supabase active).

---

## Part 1 — Backend on Render

### Option A: Blueprint (recommended, uses `render.yaml`)

1. Push the repo to GitHub (done: `DebadritNag/Esports-HQ`, branch `master`).
2. Render dashboard → **New → Blueprint** → connect and pick `DebadritNag/Esports-HQ`.
3. Render reads `render.yaml` and proposes two services:
   - `ffhq-api` (web service, `rootDir: backend`, start `npm start`, health `/health`)
   - `ffhq-reminder` (background worker, runs `dist/workers/reminder-worker.js`)
4. Click **Apply**. Render builds each with `npm ci && npm run build`.
5. Fill in the secret env vars (everything marked `sync: false`) in each
   service's **Environment** tab — see the table below. The worker will not
   deliver anything until `SUPABASE_SERVICE_ROLE_KEY` is set.

### Option B: Manual (no Blueprint)

Create a **Web Service** from the repo with:
- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

Then a separate **Background Worker** with the same root/build and start
command `node --env-file-if-exists=.env dist/workers/reminder-worker.js`.

### Backend environment variables

Set these in Render (dashboard), **not** via a committed `.env`:

| Variable | API | Worker | Value / source |
| --- | :---: | :---: | --- |
| `NODE_ENV` | ✓ | ✓ | `production` |
| `SUPABASE_URL` | ✓ | ✓ | `https://pivamlbexbpnlqbhqljm.supabase.co` |
| `SUPABASE_ANON_KEY` | ✓ | ✓ | anon/publishable key (Supabase → Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | **required** | service-role key (keep secret) |
| `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` | ✓ | ✓ | from `npm run generate-vapid` |
| `WEB_PUSH_SUBJECT` | ✓ | ✓ | `mailto:you@yourdomain` |
| `EMAIL_PROVIDER` | — | ✓ | `smtp` |
| `EMAIL_FROM` | — | ✓ | from-address on a **Resend-verified** domain |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` | — | ✓ | `smtp.resend.com` / `587` / `resend` |
| `SMTP_PASSWORD` | — | ✓ | your Resend API key (`re_...`) |
| `USE_FAKE_NOTIFICATIONS` | ✓ | ✓ | `false` in production |
| `DISCORD_BOT_TOKEN` | — | bot only | only when you add the Discord worker |

### Recurrence: use Supabase Cron (so you don't need a 3rd Render service)

The reminder worker handles delivery; recurrence generation can run inside
Supabase. In the Supabase dashboard → **Database → Cron** (or SQL editor),
schedule the recurrence RPC, e.g. hourly:

```sql
select cron.schedule(
  'ffhq-generate-recurrence',
  '0 * * * *',
  $$ select public.generate_recurrence_occurrences(30); $$
);
-- Housekeeping every 15 min:
select cron.schedule(
  'ffhq-reminder-maintenance',
  '*/15 * * * *',
  $$ select public.expire_stale_reminder_jobs(); select public.requeue_stuck_reminder_jobs(10); $$
);
```

> Pick ONE owner for recurrence: either Supabase Cron (above) OR the Render
> recurrence worker (commented out in `render.yaml`) — never both.

### Keep-alive (free tier only)

Render's free **web service** sleeps after ~15 min idle. The included GitHub
Action pings it:
1. Deploy the API; copy its URL (e.g. `https://ffhq-api.onrender.com`).
2. GitHub repo → **Settings → Secrets and variables → Actions → Variables** →
   add `KEEP_ALIVE_URL` = `https://ffhq-api.onrender.com/ready`.
3. The workflow (`.github/workflows/keep-alive.yml`) runs every 10 min.

> This keeps the **web service** awake only. The reminder **worker** cannot be
> kept alive by a ping — Render has no always-on free workers, so the worker
> needs a paid (`starter`) plan to run reliably. For production, put the API on
> `starter` too and the keep-alive becomes optional.

---

## Part 2 — Frontend on Vercel

The frontend is a Vite SPA at the repo root; `vercel.json` sets the framework,
build, and the SPA rewrite (so client-side routes don't 404).

1. Vercel dashboard → **Add New → Project** → import `DebadritNag/Esports-HQ`.
2. **Root Directory: leave as the repo root** (`.`), NOT `backend`. Vercel
   auto-detects Vite via `vercel.json`.
   - Build Command: `npm run build` (from `vercel.json`)
   - Output Directory: `dist` (from `vercel.json`)
3. Add environment variables (Project → Settings → Environment Variables).
   Vite only exposes vars prefixed `VITE_`:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | your Render API base, e.g. `https://ffhq-api.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | `https://pivamlbexbpnlqbhqljm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the anon/publishable key |

4. Deploy. Vercel gives you a URL like `https://esports-hq.vercel.app`.

### Wire the two together (CORS)

The backend currently allows all origins (`cors { origin: true }`). That's fine
for launch. To lock it down to just your Vercel domain, update
`backend/src/app.ts`'s cors registration to your Vercel URL(s) and redeploy the
API. Ask and I'll make that change.

---

## Part 3 — Order of operations

1. **Supabase** — already live; just add the Cron schedules above.
2. **Render backend** — deploy via Blueprint, set env vars, confirm
   `https://<api>/health` returns `{ "status": "ok" }` and `/ready` returns
   `200` with DB reachable.
3. **GitHub keep-alive** — set `KEEP_ALIVE_URL` variable (free tier).
4. **Vercel frontend** — deploy, set `VITE_*` vars pointing at the Render API.
5. **Smoke test** — load the Vercel site; confirm it reads data through the API.

---

## Verifying a deploy

```bash
# API liveness + readiness (replace host)
curl https://ffhq-api.onrender.com/health      # -> {"status":"ok"}
curl https://ffhq-api.onrender.com/ready        # -> 200 + {database:{reachable:true},...}
curl https://ffhq-api.onrender.com/docs/json    # -> OpenAPI document
```

Render → the worker's **Logs** should show it claiming/skipping jobs on its
poll interval (not exiting). If it logs "requires … key" and exits, the
service-role key isn't set.

---

## Security reminders

- Never commit `.env` (git-ignored). Secrets live in Render/Vercel dashboards.
- The **service-role key** and **DB password** grant full database access.
  Rotate any secret that was shared over chat/email (Supabase → Settings → API
  → "Reset" for keys; Settings → Database for the password).
- `SUPABASE_SERVICE_ROLE_KEY` goes **only** on backend workers — never in Vercel
  or any frontend env (frontend uses the anon key only).
