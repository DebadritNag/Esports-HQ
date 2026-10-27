# Esports HQ — Frontend / Backend Integration Specification

## 1. Backend Architecture Summary

The backend for **Esports HQ** is built with **Node.js (>=22)**, **Fastify v4**, **TypeScript (strict ESM)**, and connects to a hosted **Supabase** project (`pivamlbexbpnlqbhqljm` in `ap-southeast-1` on PostgreSQL 17).

The backend system is designed around decoupled processes:
1. **HTTP REST API (Fastify v4)**: Versioned `/api/v1` REST surface, with request validation and response serialization powered by `zod` and `fastify-type-provider-zod`. Interactive OpenAPI / Swagger UI is available at `/docs` (JSON at `/docs/json`).
2. **Reminder Worker**: Standalone background worker delivering due reminders over web push (VAPID) or email (SMTP / Resend), claiming jobs via Supabase RPCs.
3. **Recurrence Worker**: Standalone background worker rolling the 30-day recurring tournament horizon forward.
4. **Discord Bot**: Standalone bot ingesting announcements from authorized Discord channels into `event_sources` and parsing them into candidate events.

### Client & RLS Architecture
The backend strictly enforces Row Level Security (RLS) on Postgres tables:
- **Per-request Client (`createUserClient`)**: All user operations pass through the user's Supabase Auth JWT (`Authorization: Bearer <token>`). Postgres evaluates RLS policies in the context of `auth.uid()`.
- **Service Role Client (`createServiceClient`)**: Privileged operations (job queues, delivery status updates, recurrence generation) run strictly on workers or privileged internal endpoints. The frontend never accesses or uses the service role key.

---

## 2. API Base Path and Endpoint Inventory

**Base Path:** `/api/v1` (with root liveness `/health` also mirrored).
**Standard Response Formats:**
- Single item: Returns the JSON entity directly (e.g., `{ id, title, ... }`)
- Collections: `{ data: T[], meta: { total: number, limit: number, offset: number, count: number, hasMore: boolean } }`
- Error envelope: `{ error: { code: string, message: string, requestId: string, details?: unknown } }`

### Complete Endpoint Inventory

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| **System & Health** | | | |
| `GET` | `/health` (and `/api/v1/health`) | Public | Liveness probe: returns `{"status":"ok"}` |
| `GET` | `/api/v1/ready` | Public | Readiness probe (database connectivity + reminder queue metrics) |
| **User Profile & Preferences** | | | |
| `GET` | `/api/v1/me` | Bearer JWT | Returns current authenticated user profile (`profiles` table) |
| `PATCH` | `/api/v1/me` | Bearer JWT | Updates profile fields: `username`, `display_name`, `avatar_path`, `timezone` |
| `GET` | `/api/v1/me/preferences` | Bearer JWT | Fetches user-default reminder lead times and notification toggles |
| `PATCH` | `/api/v1/me/preferences` | Bearer JWT | Upserts user-default reminder preferences |
| **Tournament Organizers** | | | |
| `GET` | `/api/v1/organizers` | Public | Lists organizers with pagination (`limit`, `offset`) and filters (`game`, `slug`, `is_verified`) |
| `POST` | `/api/v1/organizers` | Bearer JWT | Creates new organizer profile |
| `GET` | `/api/v1/organizers/:id` | Public | Fetches organizer by UUID |
| `PATCH` | `/api/v1/organizers/:id` | Bearer JWT | Updates organizer (requires ownership/admin RLS) |
| `POST` | `/api/v1/organizers/:id/follow` | Bearer JWT | Follows organizer |
| `DELETE` | `/api/v1/organizers/:id/follow` | Bearer JWT | Unfollows organizer |
| **Recurrence Schedules** | | | |
| `GET` | `/api/v1/organizers/:id/schedules`| Bearer JWT | Lists recurrence rules for an organizer |
| `POST` | `/api/v1/organizers/:id/schedules`| Bearer JWT | Creates a recurring event rule (triggers reminder regeneration) |
| `PATCH` | `/api/v1/schedules/:id` | Bearer JWT | Updates recurrence rule |
| `DELETE` | `/api/v1/schedules/:id` | Bearer JWT | Deletes recurrence rule |
| **Tournament Radar (Events)** | | | |
| `GET` | `/api/v1/events` | Bearer JWT | Lists events with filters (`organizer_id`, `event_status`, `confirmation_status`, `event_type`, `from`, `to`, `tracked`, `upcoming`) + pagination |
| `POST` | `/api/v1/events` | Bearer JWT | Creates event |
| `GET` | `/api/v1/events/:id` | Bearer JWT | Retrieves single event details |
| `PATCH` | `/api/v1/events/:id` | Bearer JWT | Updates event fields |
| `POST` | `/api/v1/events/:id/cancel` | Bearer JWT | Cancels event (`event_status = 'cancelled'`) |
| `POST` | `/api/v1/events/:id/confirm` | Bearer JWT | Confirms event (`confirmation_status = 'confirmed'`) & regenerates reminders |
| `POST` | `/api/v1/events/:id/track` | Bearer JWT | Tracks event for current user with tracking/registration status and notes |
| `DELETE` | `/api/v1/events/:id/track` | Bearer JWT | Untracks event |
| **Reminders & Push Subscriptions** | | | |
| `GET` | `/api/v1/reminders` | Bearer JWT | Lists user's scheduled/delivered/failed reminder jobs |
| `GET` | `/api/v1/reminders/preferences` | Bearer JWT | Resolves reminder preferences |
| `PATCH` | `/api/v1/reminders/preferences` | Bearer JWT | Updates reminder preferences |
| `POST` | `/api/v1/reminders/subscriptions` | Bearer JWT | Registers web-push or email subscription (credentials stored; never returned) |
| `DELETE` | `/api/v1/reminders/subscriptions/:id` | Bearer JWT | Deactivates push/email subscription |
| `GET` | `/api/v1/reminders/deliveries` | Bearer JWT | Retrieves user's notification delivery history |
| **Integrations & Import Parsers** | | | |
| `GET` | `/api/v1/integrations` | Bearer JWT | Lists source connections for user's organizers |
| `POST` | `/api/v1/integrations/discord` | Bearer JWT | Registers Discord guild/channel (deliberately returns `501` if Vault/token unwired) |
| `DELETE` | `/api/v1/integrations/:id` | Bearer JWT | Removes integration connection |
| `POST` | `/api/v1/imports/announcement` | Bearer JWT | Pure parser parses pasted tournament announcement text into candidate fields |
| `POST` | `/api/v1/imports/ical` | Bearer JWT | Parses iCal/ICS feeds into candidate events |
| **Teams & Roster** | | | |
| `GET` | `/api/v1/teams` | Bearer JWT | Lists teams (filtered by `game`, `slug`) |
| `POST` | `/api/v1/teams` | Bearer JWT | Creates new team (caller assigned as owner) |
| `GET` | `/api/v1/teams/:id` | Bearer JWT | Retrieves team details |
| `PATCH` | `/api/v1/teams/:id` | Bearer JWT | Updates team details |
| `DELETE` | `/api/v1/teams/:id` | Bearer JWT | Deletes team |
| `GET` | `/api/v1/teams/:teamId/members` | Bearer JWT | Lists team roster with roles and jersey numbers |
| `POST` | `/api/v1/teams/:teamId/members` | Bearer JWT | Adds member |
| `PATCH` | `/api/v1/teams/:teamId/members/:memberId` | Bearer JWT | Updates member role / jersey number |
| `DELETE` | `/api/v1/teams/:teamId/members/:memberId` | Bearer JWT | Removes team member |
| `GET` | `/api/v1/teams/:teamId/invitations` | Bearer JWT | Lists team invitations |
| `POST` | `/api/v1/teams/:teamId/invitations` | Bearer JWT | Sends invitation by email or user_id |
| `GET` | `/api/v1/teams/:teamId/announcements` | Bearer JWT | Lists team board announcements |
| `POST` | `/api/v1/teams/:teamId/announcements` | Bearer JWT | Posts announcement to team board |
| **Strategy Workspace** | | | |
| `GET` | `/api/v1/teams/:teamId/strategy-rooms` | Bearer JWT | Lists strategy rooms for a team |
| `POST` | `/api/v1/teams/:teamId/strategy-rooms` | Bearer JWT | Creates a new strategy room |
| `GET` | `/api/v1/strategy-rooms/:roomId` | Bearer JWT | Fetches strategy room details and notes |
| `PATCH` | `/api/v1/strategy-rooms/:roomId` | Bearer JWT | Updates strategy room name, description, content |
| `DELETE` | `/api/v1/strategy-rooms/:roomId` | Bearer JWT | Deletes strategy room |
| `GET` | `/api/v1/strategy-rooms/:roomId/attachments` | Bearer JWT | Lists metadata of uploaded tactical maps and attachments |
| `POST` | `/api/v1/strategy-rooms/:roomId/attachments` | Bearer JWT | Records metadata after direct upload to `strategy-attachments` bucket |
| **Matches & Statistics** | | | |
| `GET` | `/api/v1/matches` | Bearer JWT | Lists matches (filter by `event_id`, `organizer_id`, `status`) |
| `POST` | `/api/v1/matches` | Bearer JWT | Creates match |
| `GET` | `/api/v1/matches/:id` | Bearer JWT | Gets match details |
| `PATCH` | `/api/v1/matches/:id` | Bearer JWT | Updates match status / schedule / map |
| `GET` | `/api/v1/matches/:matchId/participants` | Bearer JWT | Lists match participants |
| `POST` | `/api/v1/matches/:matchId/participants` | Bearer JWT | Adds participant (team or solo user) |
| `GET` | `/api/v1/matches/:matchId/statistics` | Bearer JWT | Lists recorded match stats (kills, knocks, damage, placement, survival) |
| `POST` | `/api/v1/matches/:matchId/statistics` | Bearer JWT | Logs match statistics |
| **Achievements & Evidence** | | | |
| `GET` | `/api/v1/achievements` | Bearer JWT | Lists verified achievements (scope: `personal` or `team`) |
| `POST` | `/api/v1/achievements` | Bearer JWT | Creates achievement record |
| `GET` | `/api/v1/achievements/:id` | Bearer JWT | Retrieves single achievement |
| `PATCH` | `/api/v1/achievements/:id` | Bearer JWT | Updates achievement details |
| `GET` | `/api/v1/achievements/:achievementId/evidence` | Bearer JWT | Lists evidence documents metadata |
| `POST` | `/api/v1/achievements/:achievementId/evidence` | Bearer JWT | Records evidence metadata uploaded to `achievement-evidence` bucket |

---

## 3. Authentication & Session-Handling Approach

1. **Authentication Provider**: Hosted Supabase Auth (`https://pivamlbexbpnlqbhqljm.supabase.co`).
2. **Client Login / Signup Flow**:
   - The frontend connects to Supabase via `@supabase/supabase-js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - Methods: `supabase.auth.signInWithPassword({ email, password })`, `supabase.auth.signUp(...)`, `supabase.auth.signOut()`.
   - Session restoration: Handled via `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`.
3. **API Authorization**:
   - The frontend extracts `session.access_token` and attaches:
     `Authorization: Bearer <session.access_token>`
   - The Fastify backend intercepts this in `src/plugins/auth.ts`, validates the token with `supabase.auth.getUser(token)`, and instantiates a scoped `userClient` with that bearer token so Postgres RLS is evaluated per-user.
4. **Security Bounds**:
   - Anon key is public and safe in browser client bundles.
   - Service-role key is **never** included in the frontend.

---

## 4. Request & Response Examples from Actual Implementation

### List Events (`GET /api/v1/events?limit=20&upcoming=true`)
**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "7f093db2-4d2c-47ea-a868-80f49a46399a",
      "organizer_id": "038319f3-8f0a-4a6c-9407-7386d4999120",
      "title": "Free Fire Pro Scrims Season 4",
      "description": "Weekly Tier-1 scrimmages for verified Indian & SEA rosters. Bermuda & Purgatory maps.",
      "game": "Free Fire",
      "event_type": "scrim",
      "event_status": "registration_open",
      "confirmation_status": "confirmed",
      "timezone": "Asia/Kolkata",
      "registration_opens_at": "2026-10-27T10:00:00+05:30",
      "registration_closes_at": "2026-10-29T18:00:00+05:30",
      "check_in_at": "2026-10-29T19:30:00+05:30",
      "stream_starts_at": "2026-10-29T20:00:00+05:30",
      "match_starts_at": "2026-10-29T20:30:00+05:30",
      "registration_url": "https://esportshq.gg/register/ff-scrims-s4",
      "stream_url": "https://youtube.com/live/ff-scrims-s4",
      "source_message_url": null,
      "is_recurring_occurrence": true,
      "occurrence_date": "2026-10-29",
      "recurrence_rule_id": "d03e9447-1945-429a-ae18-a37a7f4749f7",
      "last_verified_at": "2026-10-27T14:00:00Z",
      "created_by": "00000000-0000-0000-0000-000000000001",
      "created_at": "2026-10-27T14:00:00Z",
      "updated_at": "2026-10-27T14:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "count": 1,
    "hasMore": false
  }
}
```

### Track Event (`POST /api/v1/events/:id/track`)
**Request Body:**
```json
{
  "tracking_status": "registered",
  "registration_status": "registered",
  "personal_notes": "Lineup: Rahul, Ajay, Kabir, Vikram"
}
```
**Response (200 OK):**
```json
{
  "id": "e96f1d8c-761e-45fa-bb26-ec47942125bb",
  "user_id": "893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc",
  "event_id": "7f093db2-4d2c-47ea-a868-80f49a46399a",
  "tracking_status": "registered",
  "registration_status": "registered",
  "personal_notes": "Lineup: Rahul, Ajay, Kabir, Vikram",
  "created_at": "2026-10-28T01:00:00Z",
  "updated_at": "2026-10-28T01:00:00Z"
}
```

### Get Current User Profile (`GET /api/v1/me`)
**Response (200 OK):**
```json
{
  "id": "893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc",
  "username": "shadow_sniper",
  "display_name": "Kabir Sharma",
  "avatar_path": "avatars/shadow.png",
  "timezone": "Asia/Kolkata",
  "created_at": "2026-10-20T12:00:00Z",
  "updated_at": "2026-10-25T15:30:00Z"
}
```

### Error Envelope Example (`401 Unauthorized`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or malformed Authorization bearer token.",
    "requestId": "92deaf08-77da-497a-9193-eb91fa66a001"
  }
}
```

---

## 5. Available Frontend Features and Backend Dependencies

| Frontend Feature | Backend API Dependency | Required Permissions / Auth |
| :--- | :--- | :--- |
| **Landing Page** | `GET /organizers`, `GET /health` | Public access |
| **Tournament Radar** | `GET /events`, `POST /events/:id/track`, `DELETE /events/:id/track` | Authenticated user |
| **Tournament Details** | `GET /events/:id`, `GET /organizers/:id`, `GET /matches?event_id=` | Authenticated user |
| **Personal Dashboard** | `GET /events?tracked=true`, `GET /events?upcoming=true`, `GET /reminders`, `GET /me` | Authenticated user |
| **Reminders Management** | `GET /reminders`, `GET /me/preferences`, `PATCH /me/preferences`, `POST /reminders/subscriptions` | Authenticated user |
| **Team Management** | `GET /teams`, `POST /teams`, `GET/POST /teams/:teamId/members`, `GET/POST /teams/:teamId/announcements` | Authenticated user (team member / owner) |
| **Strategy Workspace** | `GET/POST /teams/:teamId/strategy-rooms`, `GET/PATCH /strategy-rooms/:roomId`, `GET/POST /strategy-rooms/:roomId/attachments` | Authenticated team member |
| **Match Stats & History**| `GET /matches`, `GET /matches/:matchId/statistics`, `GET /matches/:matchId/participants` | Authenticated user |
| **Achievements & Profile**| `GET /achievements`, `GET /me`, `PATCH /me` | Authenticated user |
| **Announcement Parser**| `POST /imports/announcement` | Authenticated organizer/user |

---

## 6. Required Environment Variables

Frontend (`.env`):
```env
# Backend Fastify API Base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Supabase Public Keys (safe for browser)
VITE_SUPABASE_URL=https://pivamlbexbpnlqbhqljm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdmFtbGJleGJwbmxxYmhxbGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMDE2NjcsImV4cCI6MjEwODY3NzY2N30.pVa9aNfATUwZg3hRFihPLS35bfTISkNUtvb4eWfqTCc
```

---

## 7. Missing Endpoints, Blockers, and Integration Risks

1. **`GET /events` Requires Authentication**:
   - *Impact*: The backend strictly places `app.authenticate` on `GET /events`. Unauthenticated visitors cannot browse live events via this endpoint without logging in.
   - *Frontend Handling*: Public landing showcases verified organizers (`GET /organizers` is public) and sample tournament preview cards, with clear prompt to sign in to access live radar tracking.
2. **Discord Connection Guard (`POST /integrations/discord`)**:
   - *Status*: The backend returns `501 NOT_IMPLEMENTED` with clear message when `DISCORD_BOT_TOKEN` or Vault is unwired.
   - *Frontend Handling*: UI surfaces Discord Bot setup status honestly without pretending it succeeded.
3. **Storage Binary Streaming**:
   - *Status*: The Fastify backend does not stream file binaries; it only manages metadata rows (`strategy_attachments`, `achievement_evidence`).
   - *Frontend Handling*: Files are uploaded directly to Supabase Storage private buckets (`strategy-attachments`, `achievement-evidence`) using `@supabase/supabase-js`, and the resulting `storage_path` is committed to the backend.
4. **Scraping / Generic API Adapters**:
   - *Status*: Intentionally unsupported on backend (`unsupported` status).
   - *Frontend Handling*: Only manual text paste (`POST /imports/announcement`) and iCal (`POST /imports/ical`) are presented in the import interface.
