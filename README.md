# AgentDesk

A professional real estate agent tool dashboard built for an Ohio real estate agent. AgentDesk gives you an at-a-glance view of your pipeline, recent property comparisons, live mortgage rate data, and quick actions — all in one focused workspace.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with semantic design tokens
- Supabase (shared-schema mode) via `@supabase/ssr`
- FRED API for live 30yr fixed mortgage rate
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
   - A free [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html)
   - A Supabase project URL + anon key + service role key
   - A dedicated Postgres schema name (e.g. `agentdesk`) — this app runs in shared-schema mode

3. Run the dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Pages

- **Dashboard** — Pipeline count, monthly comparisons, live FL 30yr rate, median DOM, recent comparisons table, quick-add-to-pipeline form.
- **Property Comparator** — Compare properties side-by-side (in progress).
- **My Pipeline** — Track leads from first contact to closed.
- **Market Stats** — Local + national market data (in progress).
- **Email Client Report** — Generate branded client-facing reports (stretch goal).

## Shared-Schema Mode

This project uses an isolated Postgres schema on a shared Supabase instance. Every Supabase client is initialized with the schema option, and all migrations begin with `SET search_path TO "${SUPABASE_SCHEMA}", public;`. Never hardcode `public.` prefixes on tables.

## Deploy

Deploy to Vercel. Add the same env vars in your Vercel project settings.
