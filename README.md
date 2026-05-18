# AgentDesk

A professional real estate agent tool dashboard built for an Ohio real estate agent. AgentDesk gives you an at-a-glance view of your pipeline, recent property comparisons, live mortgage rate data, and quick actions — all in one focused workspace.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with semantic design tokens
- Supabase (shared-schema mode) via `@supabase/ssr`
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
   - `FRED_API_KEY` — **server-only**. Free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html). Consumed exclusively by `/api/mortgage-rate` and the Market Stats server component. Never exposed to the browser.
   - `RAPIDAPI_KEY` — **server-only**. Subscribe to the `zillow-com-live-data-scraper-api` host on RapidAPI.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase credentials.
   - `NEXT_PUBLIC_SUPABASE_SCHEMA` — dedicated Postgres schema name (e.g. `agentdesk`).
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — client-side Google Maps Platform key used by the Property Comparator's address autocomplete.

   ⚠️ `FRED_API_KEY` and `RAPIDAPI_KEY` are server-only secrets and must never be exposed to the browser bundle. There is no client-side FRED fallback. The Google Maps key is intentionally `NEXT_PUBLIC_` because the Places JS library runs in the browser — protect it via HTTP referrer + API restrictions in the Google Cloud Console.

3. Run the dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Google Places Autocomplete — Property Comparator setup

The Property Comparator's address fields use **Google Places Autocomplete** to suggest full, parseable addresses as the agent types (street + city + state + ZIP). Confirmed picks are passed straight to the Zillow lookup, which dramatically improves match rates over freeform typing.

### How the key is configured

The Google Maps API key is read **directly from the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable** at runtime on the client. There is no per-user profile field, no API route, no fallback chain — set the env var once at the deployment level and every agent's browser uses the same key.

If the env var is missing, the comparator shows a clear admin-level error: **"Google Maps is not configured. Contact your administrator."** Address fields gracefully degrade to plain text inputs, and the MLS-ID mode is unaffected.

### Enabling the Google API

1. Open the [Google Cloud Console — Places API library](https://console.cloud.google.com/apis/library/places-backend.googleapis.com).
2. Create or select a project and click **Enable** on **Places API** *and* **Maps JavaScript API**.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key:
   - **Application restrictions** → HTTP referrers → add your AgentDesk domain(s) (e.g. `https://agentdesk.app/*`, `https://*.vercel.app/*`, `http://localhost:3000/*`).
   - **API restrictions** → restrict to *Places API* and *Maps JavaScript API* only.
5. Paste the key into your Vercel project env vars as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Production + Preview + Development) and redeploy.

### Autocomplete vs MLS ID toggle

Each address row in the comparator has a small **Use MLS** toggle on the right:

- **Address mode (default)** — Google Places Autocomplete is active. Start typing; pick a suggestion to confirm the address. Confirmed addresses are flagged internally and sent to Zillow's `byaddress` endpoint.
- **MLS ID mode** — Autocomplete is detached for that row. The input becomes a plain alphanumeric text field that's sent to Zillow's `bymlsid` endpoint, bypassing address parsing entirely. Useful for new construction or off-market listings.

### Troubleshooting Google Places

- **Banner says "Google Maps is not configured."** — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing or empty. Add it in Vercel → Project Settings → Environment Variables and redeploy. Env var changes do **not** apply to existing deployments.
- **Banner says "Address autocomplete unavailable."** — The script loaded but `Autocomplete` failed. Most common causes:
  - **Referrer mismatch** — your key is restricted to a domain that doesn't match the one you're loading from. Add `localhost:3000/*` for dev and your prod domain.
  - **Places API not enabled** — the key works for Maps but not Places. Enable Places API in Cloud Console.
  - **Quota exhausted** — check the *APIs & Services → Quotas* page in Cloud Console.
- **Dropdown opens but no suggestions appear** — usually a quota or referrer issue; check the browser console for Google's error string (e.g. `RefererNotAllowedMapError`, `ApiNotActivatedMapError`).
- **Force debug logs** — `localStorage.setItem('agentdesk:debug:gmaps','1')` then reload to see `[gmaps]` and `[AddressInputs]` logs in production.

## Pages

- **Dashboard** — Pipeline count, monthly comparisons, live FL 30yr rate, median DOM, recent comparisons table, quick-add-to-pipeline form.
- **Property Comparator** — Compare up to 5 properties side-by-side. Address inputs use Google Places Autocomplete with a per-row MLS-ID fallback.
- **My Pipeline** — Kanban board: Lead → Showing → Under Contract → Closed, with drag-and-drop.
- **Market Stats** — Live FRED 30yr + 15yr rates with sparklines, local market inputs, mortgage calculator, affordability check.
- **Client Report** — Turn a saved comparison into a branded, printable client report.
- **Profile** — Agent identity & branding (name, brokerage, phone, email, logo).
- **Email Client Report** — Stretch goal: email the report directly to a client.

## Shared-Schema Mode

This project uses an isolated Postgres schema on a shared Supabase instance. Every Supabase client is initialized with the schema option, and all migrations begin with `SET search_path TO "${SUPABASE_SCHEMA}", public;`. Never hardcode `public.` prefixes on tables.

## Deploy

Deploy to Vercel. Add the same env vars in your Vercel project settings — including the server-only `FRED_API_KEY` and `RAPIDAPI_KEY`, plus the client-exposed `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. After adding or changing env vars, trigger a fresh deployment so the new values are picked up.
