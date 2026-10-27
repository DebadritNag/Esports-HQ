# Free Fire Esports HQ — Backend

A Node.js + TypeScript (strict, ESM) backend for **Free Fire Esports HQ**. It is
composed of four independent processes that share one code base and one
Supabase project:

1. **HTTP API** (Fastify v4) — the versioned `/api/v1` REST surface.
2. **Reminder worker** — a standalone process that delivers due reminders.
3. **Recurrence worker** — a standalone process that rolls the recurring-event
   horizon forward.
4. **Discord bot** — a standalone process that ingests announcements from
   authorized Discord channels.

The API runs on its own; none of the workers or the bot run inside it. Each is a
separate npm script (`start`, `worker:reminder`, `worker:recurrence`,
`bot:discord`) and can be deployed and scaled independently.

> This is a **backend-only** project. There is no frontend/UI in this repo.

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [Supabase project](#supabase-project)
- [Database schema & migrations](#database-schema--migrations)
- [Authentication & RLS](#authentication--rls)
- [Environment setup](#environment-setup)
- [Local development](#local-development)
- [API endpoints](#api-endpoints)
- [Recurrence & reminder behavior](#recurrence--reminder-behavior)
- [Discord bot](#discord-bot)
- [Source integrations: honest status](#source-integrations-honest-status)
- [Scheduled jobs & worker deployment](#scheduled-jobs--worker-deployment)
- [Storage buckets](#storage-buckets)
- [Running tests](#running-tests)
- [Deployment](#deployment)
- [Troubleshooting & limitations](#troubleshooting--limitations)

---

## Architecture overview

```
                         ┌──────────────────────────────────────────┐
                         │          Supabase (hosted project)         │
                         │  Postgres 17 · Auth · Storage · RPCs · RLS │
                         └──────────────────────────────────────────┘
                              ▲          ▲            ▲           ▲
          per-request JWT     │          │ service    │ service   │ service
          (RLS applies)       │          │ role       │ role      │ role
                              │          │            │           │
   ┌───────────────┐   ┌──────┴─────┐  ┌─┴──────────┐ ┌┴──────────┐ ┌┴──────────┐
   │   Clients     │──▶│  HTTP API  │  │  Reminder  │ │ Recurrence│ │  Discord  │
   │ (web/mobile)  │   │  Fastify   │  │  worker    │ │  worker   │ │   bot     │
   └───────────────┘   │  /api/v1   │  │ (delivery) │ │ (horizon) │ │ (ingest)  │
                       └────────────┘  └────────────┘ └───────────┘ └───────────┘
```

Key design points:

- **Two Supabase clients.** A **per-request** client built from the caller's JWT
  (so Row Level Security applies to every user action) and a **service-role**
  client reserved for privileged/worker operations. See
  [Authentication & RLS](#authentication--rls).
- **Each module is `routes + service + schema`** under `src/modules/<name>/`,
  registered inside the encapsulated `/api/v1` plugin in `src/app.ts`.
- **Domain logic has no HTTP surface.** The announcement parser, reminder
  service (RPC wrappers), notification dispatch, and source adapters live under
  `src/services/` and `src/modules/integrations/sources/` and are consumed by
  both the API and the workers.
- **Workers are separate entrypoints** in `src/workers/`. The API builds and
  starts without any of them; they fail safe (log + clean exit) when their
  required secret is absent.
- **OpenAPI** is generated from Zod schemas via `@fastify/swagger` +
  `fastify-type-provider-zod`, served at `/docs` (JSON at `/docs/json`).

### Directory layout

```
backend/
├─ src/
│  ├─ app.ts                 # buildApp() factory (registers plugins + routes)
│  ├─ server.ts              # HTTP entrypoint (listen + graceful shutdown)
│  ├─ config/                # Zod-validated env config
│  ├─ plugins/               # supabase, auth, error-handler, swagger, rate-limit
│  ├─ middleware/
│  ├─ modules/               # one folder per domain (routes+service+schema)
│  │  └─ integrations/sources/  # adapters + announcement parser
│  ├─ services/              # reminder-service, schedule, notification-dispatch, providers/
│  ├─ repositories/
│  ├─ schemas/               # shared Zod (common, list)
│  ├─ utils/                 # errors, api-error, timezone, backoff, pagination
│  ├─ types/database.types.ts   # generated Supabase types (hand-committed)
│  └─ workers/               # reminder-worker.ts, recurrence-worker.ts, discord-bot.ts
├─ scripts/generate-vapid.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/            # 15 placeholder files mirroring the hosted DB
│  └─ functions/scheduled-reminders/   # optional Deno edge-function stub + README
├─ tests/                    # unit / integration / security
├─ package.json
├─ tsconfig.json
└─ vitest.config.ts
```

---

## Supabase project

This backend connects to a **single, dedicated hosted Supabase project** as a
normal `@supabase/supabase-js` client. It does **not** provision or migrate the
hosted project — the hosted database is the canonical source of truth.

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| Project ref         | `pivamlbexbpnlqbhqljm`                                |
| API URL             | `https://pivamlbexbpnlqbhqljm.supabase.co`           |
| Region              | `ap-southeast-1`                                     |
| Postgres major      | `17`                                                 |

### How the app connects

Connections are created in `src/plugins/supabase-clients.ts`:

- `createServiceClient(config)` — uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
  Privileged; used by the workers and privileged server paths only.
- `createUserClient(token, config)` — uses `SUPABASE_URL` + `SUPABASE_ANON_KEY`
  with a per-request `Authorization: Bearer <jwt>` header so **RLS applies**.
- `createAnonClient(config)` — anonymous client, used only for the readiness
  probe's lightweight connectivity check.

All clients disable session persistence (`autoRefreshToken`, `persistSession`,
`detectSessionInUrl` are all `false`) because this is a server, not a browser.

The `src/plugins/supabase.ts` Fastify plugin decorates the app with
`app.supabase` (lazy service-role getter), `app.hasServiceRole` (boolean), and
`app.userClient(token)`.

---

## Database schema & migrations

The schema was authored and applied directly on the hosted project. The
generated TypeScript types in `src/types/database.types.ts` are the in-repo
source of truth for table/column/enum/RPC names — **import `Database` from
there; never hand-redefine those types, and never regenerate the file by hand.**

### Schema summary (tables)

- **Identity / organizers:** `profiles`, `organizers`, `organizer_follows`.
- **Sources / recurrence:** `source_connections`, `event_sources`,
  `recurrence_rules`, `integration_health`.
- **Events (the Radar):** `events`.
- **Tracking / preferences:** `user_event_tracking`, `reminder_preferences`.
- **Reminders / notifications:** `reminder_jobs`, `notification_subscriptions`,
  `notification_deliveries`.
- **Teams / strategies:** `teams`, `team_members`, `team_invitations`,
  `team_announcements`, `strategy_rooms`, `strategy_attachments`.
- **Matches / stats / achievements / audit:** `matches`, `match_participants`,
  `match_statistics`, `achievements`, `achievement_evidence`, `audit_logs`.

### The 15 migrations

`supabase/migrations/` contains **placeholder** files only. Each file holds a
single header comment (no DDL) because the canonical schema lives on the hosted
project. They exist so the migration history has the right names and order:

```
20261027133540_001_foundation.sql
20261027133736_002_profiles_organizers.sql
20261027134133_003_sources_recurrence.sql
20261027134212_004_events.sql
20261027134245_005_tracking_preferences.sql
20261027134315_006_reminders_notifications.sql
20261027134415_007_teams_strategies.sql
20261027134447_008_matches_stats_achievements_audit.sql
20261027134909_009_rls_policies.sql
20261027135021_010_security_hardening.sql
20261027135248_011_storage_buckets.sql
20261027135344_012_reminder_engine_functions.sql
20261027135521_013_recurrence_generation.sql
20261027135645_014_fix_citext_qualification.sql
20261027135737_015_fix_regenerate_temp_table.sql
```

To materialize the real DDL locally (optional, for inspection/offline dev), pull
it from the hosted project rather than reconstructing it:

```bash
supabase login
supabase link --project-ref pivamlbexbpnlqbhqljm
supabase db pull          # fetch the applied schema into local migrations
```

### Enums (selected)

`source_type`, `connection_status`, `event_type`, `event_status`,
`confirmation_status`, `tracking_status`, `registration_status`,
`reminder_type`, `reminder_job_status`, `notification_channel`,
`delivery_status`, `team_role`, `invitation_status`, `achievement_scope`. The
Zod mirrors live in `src/schemas/common.ts`.

### RPC functions (called from the service-role client)

`claim_due_reminder_jobs`, `expire_stale_reminder_jobs`,
`requeue_stuck_reminder_jobs`, `generate_recurrence_occurrences`,
`regenerate_event_reminders`, `regenerate_reminder_jobs`,
`resolve_reminder_preference` (returns an array → take `[0]`). RLS helper RPCs:
`is_team_member`, `has_team_role`.

---

## Authentication & RLS

- **Clients authenticate with a Supabase Auth JWT** sent as
  `Authorization: Bearer <token>`.
- The `auth` plugin (`src/plugins/auth.ts`) validates the token via
  `supabase.auth.getUser(token)`, attaches `request.user`, `request.accessToken`,
  and a **per-request RLS-scoped client** `request.userClient`. Missing/invalid
  tokens get a `401` error envelope.
- **Every user-initiated DB action uses `request.userClient`**, so Row Level
  Security policies deployed on the hosted project are enforced per user. Team
  visibility uses the `is_team_member` / `has_team_role` RLS helper RPCs.
- **The service-role client bypasses RLS** and is used only by workers and
  privileged server operations (reminder regeneration, delivery logging, audit).
  It is never built from a request.

### Error envelope

All errors are serialized to a stable envelope by the global error handler:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "requestId": "…", "details": {} } }
```

In production (`NODE_ENV=production`) internal messages, stack traces, and SQL
are hidden. `code` is a stable machine-readable value (see
`src/utils/errors.ts`).

### Security invariants

- `notification_subscriptions.keys` is **never** selected or returned by any API
  response (verified by tests). It is read only inside the dispatch internals.
- `team_invitations.token` and `source_connections.vault_secret_id` values are
  never returned (the integrations endpoint exposes only a `has_vault_secret`
  boolean).

---

## Environment setup

Copy `.env.example` to `.env` and fill in values. **Never commit real secrets.**
Variable names (see `src/config/index.ts` for validation):

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | **always** | Supabase API URL |
| `SUPABASE_ANON_KEY` | **always** | Publishable/anon key for per-request clients |
| `SUPABASE_SERVICE_ROLE_KEY` | workers/privileged | Service-role key (server only) |
| `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL` | optional | Runtime (defaults: development / 3000 / 0.0.0.0 / info) |
| `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` | for web-push | VAPID credentials |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | for email | SMTP delivery |
| `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | for the bot | Discord app credentials |
| `RECURRENCE_HORIZON_DAYS` | optional (30) | Rolling recurrence horizon |
| `REMINDER_POLL_INTERVAL_MS` | optional (30000) | Reminder worker poll interval |
| `REMINDER_BATCH_SIZE` | optional (50) | Jobs claimed per cycle |
| `INTERNAL_WORKER_SECRET` | optional | Shared secret for internal worker calls |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` | optional (100 / `1 minute`) | API rate limiting |
| `USE_FAKE_NOTIFICATIONS` | optional (false) | Use an in-memory fake notification provider (tests/dev) |
| `DEFAULT_TIMEZONE` | optional (`Asia/Kolkata`) | Default IANA timezone |

On validation failure the config loader throws a **non-secret** error that lists
only the offending variable **names** (never their values).

Generate VAPID keys for web-push with:

```bash
npm run generate-vapid
```

It prints `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` to stdout for you to
paste into your secret store. It never writes anything to disk.

---

## Local development

```bash
cd backend
npm install

# HTTP API (hot reload via tsx)
npm run dev

# or build + run the compiled API
npm run build
npm start

# standalone processes (each needs the relevant secret, else exits cleanly)
npm run worker:reminder
npm run worker:recurrence
npm run bot:discord

# checks
npm run typecheck
npm test
```

> The repo path contains a space (`Esports HQ`). Quote paths in shell commands.

---

## API endpoints

All endpoints are versioned under **`/api/v1`**. Health is also mounted at the
root for simple liveness checks. Interactive docs: **`/docs`** · raw OpenAPI:
**`/docs/json`**. Unless noted, authenticated routes require
`Authorization: Bearer <jwt>` and list routes accept `?limit=&offset=` and
return `{ data, meta }`.

### Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` (and `/api/v1/health`) | Liveness → `200 {status:"ok"}` |
| GET | `/api/v1/ready` | Readiness: DB ping + reminder counters (`503` when degraded) |

### Profiles / me

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/me` | Current user's profile |
| PATCH | `/api/v1/me` | Update profile |
| GET | `/api/v1/me/preferences` | User-default reminder preferences |
| PATCH | `/api/v1/me/preferences` | Upsert user-default reminder preferences |

### Organizers

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/organizers` | Filter by `game` / `slug` / `is_verified` + pagination |
| POST | `/api/v1/organizers` | Create (stamps `created_by`) |
| GET | `/api/v1/organizers/:id` | Fetch one |
| PATCH | `/api/v1/organizers/:id` | Update |
| POST | `/api/v1/organizers/:id/follow` | Follow (upsert active) |
| DELETE | `/api/v1/organizers/:id/follow` | Unfollow |

### Recurrence schedules

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/organizers/:id/schedules` | List rules |
| POST | `/api/v1/organizers/:id/schedules` | Create rule → triggers reminder regeneration |
| PATCH | `/api/v1/schedules/:id` | Update rule → triggers regeneration |
| DELETE | `/api/v1/schedules/:id` | Delete rule → regenerates before removal |

### Events (the Radar)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/events` | Filters: organizer, status, confirmation, type, date range, tracked, upcoming + pagination |
| POST | `/api/v1/events` | Create |
| GET | `/api/v1/events/:id` | Fetch one |
| PATCH | `/api/v1/events/:id` | Update |
| POST | `/api/v1/events/:id/cancel` | Set `event_status=cancelled` |
| POST | `/api/v1/events/:id/confirm` | Set `confirmation_status=confirmed` → regenerate reminders (incl. match) |
| POST | `/api/v1/events/:id/track` | Track → regenerate that user's jobs |
| DELETE | `/api/v1/events/:id/track` | Untrack |

### Reminders

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/reminders` | Own `reminder_jobs` (filter by status/event) |
| GET | `/api/v1/reminders/preferences` | Reminder preferences |
| PATCH | `/api/v1/reminders/preferences` | Update preferences |
| POST | `/api/v1/reminders/subscriptions` | Register a push/email subscription (**response never includes `keys`**) |
| DELETE | `/api/v1/reminders/subscriptions/:id` | Soft-delete a subscription |
| GET | `/api/v1/reminders/deliveries` | Delivery history |

### Integrations & imports

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/integrations` | Source connections for the caller's organizers |
| POST | `/api/v1/integrations/discord` | Register an authorized guild/channel. Returns **`501`** with a clear message when the token/Vault is not wired (no fake success) |
| DELETE | `/api/v1/integrations/:id` | Remove a connection |
| POST | `/api/v1/imports/announcement` | Parse pasted text → candidate + `needs_review` (never auto-confirms) |
| POST | `/api/v1/imports/ical` | Parse an ICS feed via the iCal adapter |

### Teams / strategies / statistics / achievements

| Method | Path |
| --- | --- |
| GET/POST | `/api/v1/teams` · GET/PATCH/DELETE `/api/v1/teams/:id` |
| GET/POST | `/api/v1/teams/:teamId/members` · PATCH/DELETE `/api/v1/teams/:teamId/members/:memberId` |
| GET/POST | `/api/v1/teams/:teamId/invitations` (`token` never returned) |
| GET/POST | `/api/v1/teams/:teamId/announcements` |
| GET/POST | `/api/v1/teams/:teamId/strategy-rooms` · PATCH/DELETE `/api/v1/strategy-rooms/:roomId` |
| GET/POST | `/api/v1/strategy-rooms/:roomId/attachments` (metadata only) |
| GET/POST | `/api/v1/matches` · GET/PATCH `/api/v1/matches/:id` |
| GET/POST | `/api/v1/matches/:matchId/participants` |
| GET/POST | `/api/v1/matches/:matchId/statistics` (kills/knocks/damage/placement/survival/extra) |
| GET/POST | `/api/v1/achievements` · GET/PATCH `/api/v1/achievements/:id` |
| GET/POST | `/api/v1/achievements/:achievementId/evidence` (metadata only) |

---

## Recurrence & reminder behavior

### Recurrence

`recurrence_rules` describe repeating events (e.g. a weekly scrim). The
`generate_recurrence_occurrences(p_horizon_days)` RPC materializes occurrence
events for the next `RECURRENCE_HORIZON_DAYS` (default **30**). `days_of_week` is
a `smallint[]` using ISO weekdays (1 = Monday … 7 = Sunday). The default
timezone is `Asia/Kolkata`.

Changing a schedule (create/update/delete) triggers reminder regeneration for
the affected events via the service-role wrappers.

### Reminder lead-time defaults

Reminder preferences resolve with precedence **event > organizer > user-default
> system defaults**. The system defaults (minutes before the relevant moment):

| Reminder type | Default lead time |
| --- | --- |
| Registration (open/close) | **30 min** |
| Check-in | **15 min** |
| Stream start | **15 min** |
| Match start | **30 min** |

> **Match reminders are only generated for `confirmed` events.** An unconfirmed
> or `needs_review` event does not produce match reminders until it is
> confirmed — the app never invents a match time.

### Reminder delivery lifecycle (reminder worker)

1. `claim_due_reminder_jobs(p_worker, p_limit)` atomically locks a batch of due
   jobs to the worker.
2. Each job is dispatched through `notification-dispatch` to the user's active
   subscriptions (web-push / email, or the fake provider in tests).
3. On success the job is marked `delivered`; on failure it is retried with
   exponential backoff + jitter (`utils/backoff`) via `next_attempt_at`, up to a
   max attempt count, after which it is marked `failed`.
4. Periodically `expire_stale_reminder_jobs()` and
   `requeue_stuck_reminder_jobs()` run as housekeeping.

A user with no active subscriptions (or where all providers are unavailable) is
treated as delivered so the worker does not retry forever.

---

## Discord bot

The Discord bot (`npm run bot:discord`) ingests announcements from channels that
organizers have **explicitly authorized**.

### Required privileged intent

The bot requires the **Message Content** privileged gateway intent
(`GatewayIntentBits.MessageContent`). You **must** enable it in the Discord
Developer Portal:

> **Developer Portal → your application → Bot → Privileged Gateway Intents →
> enable "Message Content Intent".**

Without it, message bodies arrive empty and nothing can be parsed. The bot also
requests the `Guilds` and `GuildMessages` intents.

### Required bot permissions (per channel)

- **View Channel**
- **Read Message History**

### How it works

- Authorized guild/channel pairs are read from `source_connections.config`
  (where `source_type = 'discord'` and the connection is `active`/`degraded`).
  Config shape: `{ "guildId": "...", "channelId": "..." }` (or `channelIds: []`),
  plus an optional `timezone`.
- For each new message in an authorized channel it **dedups by message id +
  content hash** into `event_sources`, runs the pure announcement parser, and
  creates an **`unconfirmed`** event — or a **`needs_review`** event when the
  parser flags ambiguity. It never invents times and never auto-confirms.
- It records per-connection `integration_health` (including permission failures)
  so operators can see status, and it logs — but never stores or logs full
  message bodies beyond the fields the parser extracts, and never logs the bot
  token.
- Reconnects are handled by discord.js (resume/backoff); disconnects are logged.
  `SIGTERM`/`SIGINT` destroy the client and exit `0`. If `DISCORD_BOT_TOKEN` is
  absent the process logs clearly and exits cleanly.

> The bot is its own process and never runs inside the HTTP API.

---

## Source integrations: honest status

Be clear-eyed about what is actually implemented versus what needs credentials
versus what is intentionally unsupported.

| Source | Status | Notes |
| --- | --- | --- |
| **iCal / RSS** | ✅ **Supported** | Real adapter using `node-ical`; `POST /imports/ical` works out of the box. |
| **Manual paste** | ✅ **Supported** | `POST /imports/announcement` runs the pure parser; returns candidate + `needs_review`. |
| **Discord** | ⚙️ **Requires credentials** | Fully implemented bot, but needs `DISCORD_BOT_TOKEN`, the Message Content intent, and an authorized connection. `POST /integrations/discord` returns **`501`** (clear message) until the token/Vault is wired — never a fake success. |
| **Web scraping** | ❌ **Unsupported** | The `website` adapter returns a typed `unsupported` result. There is no universal scraper; respecting robots.txt / Terms of Service is intentional. |
| **Generic API** | ❌ **Unsupported** | The `api` adapter returns a typed `unsupported` result (requires authorized, source-specific access). |

The adapter contract (`src/modules/integrations/sources/adapter.ts`) returns a
discriminated result: `ok`, `unsupported`, or `error`. Unsupported is **not** an
error and **not** a fake success — callers surface it explicitly.

---

## Scheduled jobs & worker deployment

There are two ways to run the scheduling/delivery engine. Pick **one** owner for
recurrence generation and job claiming so they don't double-run.

### Primary: Supabase Cron + the edge-function stub

`supabase/functions/scheduled-reminders/` contains an optional Deno edge-function
stub that calls the recurrence/reminder RPCs via the service role. In production
this is the **primary** scheduler: a Supabase Cron schedule invokes it on an
interval. See that folder's `README.md` for deploy + cron setup.

> The edge function moves jobs through the reminder-engine state machine. Actual
> web-push / email **delivery** still needs the Node reminder worker (or a push
> provider wired into the edge runtime).

### Alternative: standalone Node workers

- `npm run worker:reminder` — polls every `REMINDER_POLL_INTERVAL_MS`, claims +
  delivers due jobs, retries with backoff, and runs expire/requeue housekeeping.
- `npm run worker:recurrence` — periodically rolls the recurrence horizon
  forward (runs once on start, then hourly).

Both require `SUPABASE_SERVICE_ROLE_KEY`; without it they log a clear message and
exit `0`. Both install `SIGTERM`/`SIGINT` graceful shutdown (finish in-flight
work, stop the interval, exit `0`).

---

## Storage buckets

Two **private** Supabase Storage buckets hold binary attachments; the API stores
and returns **metadata only** and never streams secret bytes:

| Bucket | Path convention | Used by |
| --- | --- | --- |
| `strategy-attachments` | `team_id/room_id/file` | Strategy room attachments |
| `achievement-evidence` | `achievement_id/file` | Achievement evidence |

Access is governed by Storage RLS policies on the hosted project (team-scoped
for strategy attachments; achievement-scoped for evidence). Clients upload/
download directly against Storage using their JWT; the API only records the
`storage_path`, `file_name`, `content_type`, and `size_bytes`.

---

## Running tests

```bash
npm test          # vitest run (single-run; never watch)
```

- Tests are **secret-free by default** and use `buildApp()` + `app.inject()` plus
  a fake in-memory notification provider (`USE_FAKE_NOTIFICATIONS=true`).
- **DB-requiring tests skip (not fail)** when `SUPABASE_SERVICE_ROLE_KEY` is
  absent, via `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)`. Provide
  the key in your environment to exercise the live-DB paths.
- Coverage: `npx vitest run --coverage`.

Test areas: config/env, timezone, backoff, pagination, the announcement parser,
preference precedence, notification dispatch (keys never surfaced), source
adapters, the three workers (mocked service client), API route behavior (401,
Zod 400, pagination shape, `501` Discord guard, `keys` absent from the OpenAPI
schema), and the production error-envelope security test.

---

## Deployment

The API, reminder worker, recurrence worker, and Discord bot are **separate
long-lived processes**. A typical production topology:

1. **API** — build (`npm run build`) and run `npm start` behind your load
   balancer / reverse proxy. Horizontally scalable (stateless).
2. **Scheduling** — either deploy the Supabase edge function + Cron (primary) or
   run `npm run worker:recurrence` on a persistent host.
3. **Delivery** — run `npm run worker:reminder` on a persistent Node host (needed
   for web-push/email regardless of the scheduler choice).
4. **Discord bot** — run `npm run bot:discord` on a persistent host (**single
   instance** to avoid duplicate ingestion).

Provide each process the env it needs: the API needs `SUPABASE_URL` +
`SUPABASE_ANON_KEY` (service-role optional); the workers need
`SUPABASE_SERVICE_ROLE_KEY`; the bot additionally needs `DISCORD_BOT_TOKEN` (and
the Message Content intent enabled). Build artifacts land in `dist/` (gitignored).

---

## Troubleshooting & limitations

- **Workers exit immediately with a "requires … key" log.** Expected when the
  required secret is missing. Set `SUPABASE_SERVICE_ROLE_KEY` (workers) or
  `DISCORD_BOT_TOKEN` (bot).
- **`POST /integrations/discord` returns `501`.** Expected until the Discord
  token and Vault wiring are in place — this is a deliberate honest response, not
  a bug.
- **Discord messages aren't ingested.** Confirm the Message Content intent is
  enabled in the Developer Portal, the bot has View Channel + Read Message
  History in the channel, and a matching `source_connections` row exists with the
  correct `guildId`/`channelId` and an `active` status.
- **No reminders are delivered.** Ensure the reminder worker is running with a
  service-role key, that web-push (VAPID) or SMTP is configured (or
  `USE_FAKE_NOTIFICATIONS=true` in dev), and that users have active
  subscriptions. Match reminders require the event to be `confirmed`.
- **OpenAPI/swagger fails to generate.** Keep the `zod-to-json-schema@3.23.5`
  pin in `package.json` `overrides` — newer lines import a `zod/v3` subpath that
  doesn't exist under the pinned `zod@3.23.8`.
- **Running tests against the live DB.** Set `SUPABASE_SERVICE_ROLE_KEY`; the
  skipped `skipIf` suites will then run. Never commit that key.
- **Scheduler double-run.** Don't run both Supabase Cron (edge function) and the
  standalone recurrence/reminder workers for the same responsibility — pick one
  owner per job.

### Known limitations

- Website/generic-API ingestion is intentionally unsupported (no universal
  scraper).
- The edge-function stub advances job state but does not itself send web-push /
  email; delivery requires the Node reminder worker or a wired provider.
- Local `supabase/migrations/` are placeholders; the hosted DB is the source of
  truth (`supabase db pull` to materialize).
