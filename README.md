# AgentDesk

A professional real estate agent tool dashboard built for an Ohio real estate agent. AgentDesk gives you an at-a-glance view of your pipeline, recent property comparisons, live mortgage rate data, and quick actions — all in one focused workspace.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with semantic design tokens
- Supabase (shared-schema mode) via `@supabase/ssr`
- FRED API for live 30yr + 15yr fixed mortgage rates
- RapidAPI (Zillow Live Data Scraper) for property lookups
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
   - `FRED_API_KEY` — server-only. Free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html).
   - `RAPIDAPI_KEY` — server-only. Subscribe to the `zillow-com-live-data-scraper-api` host on RapidAPI.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase credentials.
   - `NEXT_PUBLIC_SUPABASE_SCHEMA` — dedicated Postgres schema name (e.g. `agentdesk`).

   ⚠️ Neither `FRED_API_KEY` nor `RAPIDAPI_KEY` is prefixed with `NEXT_PUBLIC_` — they are server-only secrets and must never be exposed to the browser bundle. All upstream calls are proxied through Next.js route handlers.

3. Run the dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Pages

- **Dashboard** — Pipeline count, monthly comparisons, live FL 30yr rate, median DOM, recent comparisons table, quick-add-to-pipeline form.
- **Property Comparator** — Compare up to 5 properties side-by-side via the RapidAPI Zillow proxy.
- **My Pipeline** — Kanban board: Lead → Showing → Under Contract → Closed, with drag-and-drop.
- **Market Stats** — Live FRED 30yr + 15yr rates with sparklines, local market inputs, mortgage calculator, affordability check.
- **Client Report** — Turn a saved comparison into a branded, printable client report.
- **Email Client Report** — Stretch goal: email the report directly to a client.

## Troubleshooting the Property Comparator

The comparator proxies through `/api/property-lookup`, which hits the RapidAPI Zillow Live Data Scraper host (`zillow-com-live-data-scraper-api.p.rapidapi.com`). When a card shows an error, the message tells you which class of failure occurred. The patterns below cover ~95% of real-world failures.

### "No data found for this address" (yellow card)

RapidAPI returned a 404 or an empty record — the **address itself** is the problem, not the connection. Fixes, in order:

1. **Use the full USPS form.** `123 Main St, Tampa, FL 33601` works far more reliably than `123 Main St Tampa`. Always include city, state, and ZIP.
2. **Verify on zillow.com first.** Paste the same address into Zillow's search bar. If Zillow can't find it, RapidAPI can't either — the property may not be indexed (new construction, off-market, commercial, rural parcel without a street address).
3. **Avoid unit/apt suffixes on first try.** `123 Main St #4B` sometimes fails when `123 Main St` succeeds. Look up the building, then drill in.
4. **Check for typos in city/state.** `Tamap FL` silently returns no data instead of a helpful error.

### "Data unavailable — check your connection" (red card)

This is a network, auth, or quota problem on the RapidAPI side — the address may be fine. Diagnose in this order:

1. **Confirm `RAPIDAPI_KEY` is set in your environment.** On Vercel: Project → Settings → Environment Variables. Locally: `.env.local`. After adding it, **redeploy** — env var changes don't apply to existing deployments.
2. **Confirm you're subscribed to the right host.** The code calls `zillow-com-live-data-scraper-api.p.rapidapi.com`. If you subscribed to a different Zillow scraper on RapidAPI, your key won't authorize this host. Either subscribe to this exact host or update `ZILLOW_HOST` in `lib/zillow.ts` to match yours.
3. **Check your RapidAPI quota.** Free tiers typically allow 50–500 requests/month. A 429 or 403 from quota exhaustion surfaces as a connection error. Log into RapidAPI → My Apps → check usage.
4. **Test the key directly** with curl to isolate whether it's your app or RapidAPI:
   ```bash
   curl -H "x-rapidapi-key: $RAPIDAPI_KEY" \
        -H "x-rapidapi-host: zillow-com-live-data-scraper-api.p.rapidapi.com" \
        "https://zillow-com-live-data-scraper-api.p.rapidapi.com/byaddress?address=1600%20Pennsylvania%20Ave%20NW%2C%20Washington%2C%20DC%2020500"
   ```
   - `200` with JSON → your key works; the problem is address-specific.
   - `401`/`403` → key is invalid, unsubscribed, or for the wrong host.
   - `429` → rate-limited; wait or upgrade your tier.
   - `5xx` → RapidAPI/Zillow upstream outage; retry in a few minutes.
5. **Check the server logs.** `lib/zillow.ts` and `/api/property-lookup` log the exact HTTP status and upstream message. On Vercel: Project → Deployments → click the deployment → Functions → `/api/property-lookup`.

### Vercel cold-start timeouts

The RapidAPI Zillow host is sometimes slow on the first request after idle. On Vercel's free tier, a cold function start adds 1–3 seconds, and the upstream itself can take another 10–20 seconds when warming up. The comparator uses a 12s timeout per request with automatic retries, but you may still see a single red "Data unavailable" card on the very first compare of a session.

**Fix:** click the **Retry failed** button (appears whenever ≥1 card is in a connection-error state). The second attempt typically succeeds because the function is warm and the upstream has stabilized.

### Mixed results (one card works, one fails)

This is the most common pattern and is almost always per-address: the API is reachable (because one card succeeded), so the failed card is either a 404 ("no data found" — address problem) or a transient timeout. Retry the failed card individually; if it still fails with a red card after a working request just succeeded, it's almost certainly a flaky address rather than a connection issue.

### Rate limits inside AgentDesk

The `/api/property-lookup` route enforces a per-user sliding-window limit of 20 requests/minute to protect your RapidAPI quota. If you hit it, you'll see a 429 with a `Retry-After` header — wait the suggested seconds and try again. The UI surfaces the wait time in the error card.

### When in doubt, network-debug from the browser

Open DevTools → Network tab → run a compare. Look at the `/api/property-lookup` POST response. The JSON body includes an `errorType` field (`not_found`, `connection_error`, `rate_limited`, `missing_key`, `unauthorized`, `timeout`, `invalid_address`, `unknown`) that pinpoints the failure class. Match that against the sections above.

## Shared-Schema Mode

This project uses an isolated Postgres schema on a shared Supabase instance. Every Supabase client is initialized with the schema option, and all migrations begin with `SET search_path TO "${SUPABASE_SCHEMA}", public;`. Never hardcode `public.` prefixes on tables.

## Deploy

Deploy to Vercel. Add the same env vars in your Vercel project settings — including the server-only `FRED_API_KEY` and `RAPIDAPI_KEY`. After adding or changing env vars, trigger a fresh deployment so the new values are picked up.
