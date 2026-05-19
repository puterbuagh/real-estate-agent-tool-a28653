# AgentDesk

A professional real estate agent tool dashboard built for Ohio real estate agents. AgentDesk gives you an at-a-glance view of your pipeline, recent property comparisons, live mortgage rate data, and quick actions — all in one focused workspace.

> **Multi-agent ready.** AgentDesk now supports authenticated sign-up and sign-in. Every agent has their own isolated profile, branding, and pipeline. The previous single-agent ("Jordan Miller") hardcoding has been fully removed.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with semantic design tokens
- Supabase (shared-schema mode) via `@supabase/ssr` — **auth + data**
- FRED API for live 30yr + 15yr fixed mortgage rates
- RapidAPI (Zillow Live Data Scraper) for property lookups
- Google Places Autocomplete (`@googlemaps/js-api-loader`) for address inputs in the Property Comparator
- Recharts, framer-motion, lucide-react, sonner

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

   You'll need:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase credentials (required for auth).
   - `NEXT_PUBLIC_SUPABASE_SCHEMA` — dedicated Postgres schema name (e.g. `agentdesk`).
   - `FRED_API_KEY` — **server-only**. Free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html).
   - `RAPIDAPI_KEY` — **server-only**. Subscribe to the `zillow-com-live-data-scraper-api` host on RapidAPI.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — client-side Google Maps Platform key used by the Property Comparator's address autocomplete.

   ⚠️ `FRED_API_KEY`, `RAPIDAPI_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets and must never be exposed to the browser bundle.

3. Apply the database migration to create the `agent_profiles` table:
   ```bash
   # Via Supabase SQL editor, paste the contents of:
   #   lib/supabase/migrations/001_agent_profiles.sql
   ```
   The migration creates the `agent_profiles` table (one row per `auth.users` record) and RLS policies so each agent can only read/update their own profile.

4. Run the dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

## Authentication

AgentDesk uses **Supabase Auth** (email + password) via `@supabase/ssr` cookies. The flow:

### Routes

- **`/login`** — Email + password sign-in. Redirects to the originally requested page (or `/`) on success.
- **`/signup`** — Name + email + password registration. Creates a Supabase auth user and inserts a matching row in `agent_profiles`. If email confirmation is enabled in your Supabase project, the user receives a verification link that returns to `/auth/callback`.
- **`/auth/callback`** — Server route that exchanges the OAuth/email-verification code for a session cookie and redirects to the dashboard.
- All other routes (`/`, `/dashboard`, `/profile`, `/pipeline`, `/property-comparator`, `/market-stats`, `/client-report`, `/email-report`) are **protected** by `middleware.ts`. Unauthenticated requests are redirected to `/login?redirectTo=<original-path>`.

### `agent_profiles` table

Each authenticated user has exactly one row in `agent_profiles`:

| column       | type        | notes                                     |
|--------------|-------------|-------------------------------------------|
| `id`         | `uuid` PK   | References `auth.users(id)` ON DELETE CASCADE |
| `name`       | `text`      | Agent's display name (used in sidebar, reports) |
| `email`      | `text`      | Mirrored from `auth.users.email`          |
| `brokerage`  | `text`      | Optional — set on the Profile page        |
| `phone`      | `text`      | Optional                                  |
| `logo_url`   | `text`      | Optional brokerage logo                   |
| `avatar_url` | `text`      | Optional agent headshot                   |
| `created_at` | `timestamptz` | Defaults to `now()`                     |
| `updated_at` | `timestamptz` | Auto-updated on row change              |

**RLS policies** restrict every row to its owner: agents can `SELECT` and `UPDATE` only their own profile row, and `INSERT` only with their own `auth.uid()` as the row `id`.

### Session management

- **Middleware** (`middleware.ts`) runs on every request, refreshes the session cookie via `supabase.auth.getUser()`, and enforces auth gating.
- **Server components** read the session via `lib/supabase/server.ts`.
- **Client components** read the session via `lib/supabase/client.ts` and the `AgentBrandingContext` provider, which now hydrates branding from `agent_profiles` on mount (falling back to localStorage for offline / pre-hydration paint).
- **Sign-out** is available from the sidebar avatar in the bottom-left of every authenticated page.

### Removing the old Jordan Miller hardcoding

The sidebar, top bar, and client reports previously rendered "Jordan Miller" as a static string. They now read the signed-in agent's `name` + `brokerage` from `agent_profiles`. On first sign-up the profile row is created with the name from the registration form; visit `/profile` to add brokerage, phone, and logo.

## Google Places Autocomplete — Property Comparator setup

The Property Comparator's address fields use **Google Places Autocomplete** to suggest full, parseable addresses as the agent types (street + city + state + ZIP). Confirmed picks are passed straight to the Zillow lookup, which dramatically improves match rates over freeform typing.

### How the key is configured

The Google Maps API key is read **directly from the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable** at runtime on the client. Set the env var once at the deployment level and every agent's browser uses the same key.

### Enabling the Google API

1. Open the [Google Cloud Console — Places API library](https://console.cloud.google.com/apis/library/places-backend.googleapis.com).
2. Create or select a project and click **Enable** on **Places API** *and* **Maps JavaScript API**.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key:
   - **Application restrictions** → HTTP referrers → add your AgentDesk domain(s).
   - **API restrictions** → restrict to *Places API* and *Maps JavaScript API* only.
5. Paste the key into your Vercel project env vars as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and redeploy.

## Pages

- **Dashboard** — Pipeline count, monthly comparisons, live FL 30yr rate, median DOM, recent comparisons table, quick-add-to-pipeline form.
- **Property Comparator** — Compare up to 5 properties side-by-side. Address inputs use Google Places Autocomplete with a per-row MLS-ID fallback.
- **My Pipeline** — Kanban board: Lead → Showing → Under Contract → Closed, with drag-and-drop.
- **Market Stats** — Live FRED 30yr + 15yr rates with sparklines, local market inputs, mortgage calculator, affordability check.
- **Client Report** — Turn a saved comparison into a branded, printable client report.
- **Profile** — Agent identity & branding (name, brokerage, phone, email, logo). Synced to Supabase `agent_profiles`.
- **Email Client Report** — Stretch goal: email the report directly to a client.

## Shared-Schema Mode

This project uses an isolated Postgres schema on a shared Supabase instance. Every Supabase client is initialized with the schema option, and all migrations begin with `SET search_path TO "${SUPABASE_SCHEMA}", public;`. Never hardcode `public.` prefixes on tables.

## Deploy

Deploy to Vercel. Add the same env vars in your Vercel project settings — including the server-only `FRED_API_KEY`, `RAPIDAPI_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, plus the client-exposed `NEXT_PUBLIC_*` vars. After adding or changing env vars, trigger a fresh deployment so the new values are picked up.
