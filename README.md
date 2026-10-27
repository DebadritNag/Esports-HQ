# Esports HQ — Free Fire Tournament Radar & Squad Operations

A high-performance, production-ready web frontend for **Esports HQ**, engineered around the strict Fastify v4 + PostgreSQL 17 (Supabase) backend contract.

Esports HQ provides competitive Free Fire rosters with verified tournament discovery, automated registration deadline tracking, squad management, and strategy workspaces.

---

## Architecture & Design Direction

- **Design Philosophy**: Editorial Esports — refined editorial typography (Space Grotesk + Inter/Geist), authentic esports compositions, purposeful whitespace, and thin surface borders.
- **Color System**:
  - Warm Ivory (`#F5F3EE` / background)
  - Pure White (`#FFFFFF` / main surfaces)
  - Deep Charcoal (`#202522` / primary text and dark sections)
  - Secondary Slate (`#777A75` / metadata & subtle labels)
  - Forest Green (`#246B4B` / primary actions and verified states)
  - Burnt Orange (`#D97736` / registration urgency and deadlines)
  - Muted Borders (`#E4E1D9`)
- **Backend Single Source of Truth**:
  - Connects to the versioned `/api/v1` REST surface on the Fastify backend.
  - Per-request Supabase Auth Bearer JWT injection (`Authorization: Bearer <jwt>`) for Postgres Row Level Security (RLS) enforcement.
  - No service role keys or secrets shipped in client bundles.
  - Comprehensive integration specification in [`docs/frontend-backend-integration.md`](docs/frontend-backend-integration.md).

---

## Features & Implemented Endpoints

| Feature | Backend Endpoints Used | Description |
| :--- | :--- | :--- |
| **Landing Page** | `GET /organizers`, `GET /health` | Public exploration, hero spotlight card, upcoming schedule table, and verified organizers. |
| **Tournament Radar** | `GET /events`, `POST /events/:id/track`, `DELETE /events/:id/track` | Real-time tournament discovery with filters for format, status, and organizers. Tracks events for automated reminders. |
| **Tournament Details** | `GET /events/:id`, `GET /matches?event_id=` | Detailed timeline (registration window, captain check-in, first match drop), rules, maps, and stream links. |
| **Command Dashboard** | `GET /events?upcoming=true`, `GET /events?tracked=true`, `GET /reminders`, `GET /me` | Player dashboard highlighting the next critical deadline (&le; 24h urgency), schedule milestones, and reminder queue. |
| **Squad & Roster** | `GET /teams`, `POST /teams`, `GET/POST /teams/:teamId/members`, `GET/POST /teams/:teamId/announcements` | Roster management (Captain, Active Roster, Substitutes), jersey numbers, and internal notice board. |
| **Strategy Workspace** | `GET/POST /teams/:teamId/strategy-rooms`, `GET/PATCH /strategy-rooms/:roomId`, `GET/POST /strategy-rooms/:roomId/attachments` | Drop rotation notes, pre-match squad checklists, and tactical map attachments metadata (scoped to private storage bucket). |
| **Pre-Drop Reminders** | `GET /reminders`, `GET/PATCH /me/preferences`, `POST /reminders/subscriptions` | Custom lead time settings (30m registration, 15m check-in, 30m match) and active delivery queue. |
| **Announcement Parser** | `POST /imports/announcement` | Workbench to test raw pasted Discord announcements against backend date and time regex extraction without fabricating unconfirmed times. |
| **Player Profile** | `GET/PATCH /me`, `GET /achievements` | Handle updates, regional timezone configuration, and verified tournament achievement awards. |

---

## Setup & Environment Configuration

### 1. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

`.env` contents:
```env
# Fastify Backend API Base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Supabase Public Configuration (Safe for client browsers)
VITE_SUPABASE_URL=https://pivamlbexbpnlqbhqljm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdmFtbGJleGJwbmxxYmhxbGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMDE2NjcsImV4cCI6MjEwODY3NzY2N30.pVa9aNfATUwZg3hRFihPLS35bfTISkNUtvb4eWfqTCc
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Server

Start Vite with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Running with the Backend

In a separate terminal, launch the Fastify backend:

```bash
cd backend
npm run dev # or npm start
```

The Fastify server starts on `http://localhost:3000`.

### 5. Typecheck & Build

Run strict TypeScript typechecking:

```bash
npm run lint
```

Build the optimized production bundle with manual code-splitting:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Demo Preview Mode

To explore all screens with sample data without creating a live account or when offline:
- Click the **"Live Mode / Demo Active"** button in the navigation bar or on the login page.
- Demo mode is explicitly labeled with an orange banner and uses realistic South Asia Free Fire tournament rosters.
- Toggle back to **Live API** at any time.

---

## Security Invariants

1. **Row Level Security (RLS)**: Client actions execute in the context of the authenticated user's JWT.
2. **Zero Secret Exposure**: Only the Supabase publishable anon key is accessible in browser code. The service role key is strictly absent from the frontend.
3. **Storage Direct Upload**: Private bucket binaries (`strategy-attachments` and `achievement-evidence`) are uploaded directly to Supabase Storage; Fastify only handles verified metadata records.
