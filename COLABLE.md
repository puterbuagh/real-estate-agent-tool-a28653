# Real Estate Agent Tool
Stack: nextjs-supabase-vercel-stripe
Created: 2026-05-16

## Decisions
- Next.js 14 App Router with strict TypeScript and `@/*` path alias
- Tailwind with AgentDesk semantic tokens (navy sidebar, steel-blue primary, Inter Tight display + Inter body)
- Design tokens stored as HSL triplets in `globals.css` to pair with `hsl(var(--token))` Tailwind wrappers
- Print stylesheet in `globals.css` hides app chrome, forces light tokens, and exposes page-break utilities
- Supabase shared-schema client (browser + server) for cross-app data access
- FRED API as live source for mortgage rates (MORTGAGE30US + MORTGAGE15US), proxied via cached Next route with 12-week history per series
- `/api/mortgage-rate` returns `{ rate30yr: RateSeries, rate15yr: RateSeries }` with current value, week-over-week delta, and history points; `StatsGrid` is backward-compatible with this shape
- Market Stats page server-fetches the 30yr FRED rate and passes it as a prefill prop to `MortgageCalculator` and `AffordabilityCheck` for instant-loaded live-rate defaults
- Zillow data via RapidAPI, proxied through `/api/property-lookup` with consistent `{ok, data|error}` envelope
- RapidAPI key is server-only (`RAPIDAPI_KEY`, no `NEXT_PUBLIC_` prefix) — never exposed to the browser
- `/api/property-lookup` returns shape-specific payloads: `{ properties }` for POST (batch), `{ property }` for GET (single)
- Zod for form validation; sonner for toasts; framer-motion for UI polish
- Client-side pipeline + comparisons + local market inputs state via React Context / localStorage (no auth yet)
- PipelineContext tracks extended entries (price, clientName, notes, stageEnteredAt) and auto-stamps `stageEnteredAt` on stage transitions for days-in-stage tracking
- PipelineContext exposes `pipeline`, `updatePipelineStage`, `addPipelineItem` (full entry), `removePipelineItem`, and `addComparison(properties, label?)` with auto-computed winner
- Local market inputs (median price, DOM, inventory, YoY, mortgage rate) persisted to localStorage with edit/save toggle; shape extracted as reusable `LocalMarketInputsData` type
- Mortgage math helpers (`calcMonthlyPayment`, `maxHomePriceForIncome`) live in `lib/utils` and assume 28% DTI for affordability
- Kanban drag-and-drop uses native HTML5 DnD (no external lib) for lightweight stage transitions
- Honeypot pattern for spam protection on quick-add forms
- Prefer `type` aliases over empty `interface` extensions to satisfy strict lint

## Components
- Layout: `Sidebar` (collapsible dark-navy nav), `TopBar` (sticky, page title + date), `AppShell`
- Pages: Dashboard (`/`), Property Comparator (2–5 addresses, parallel lookup, save/clear/print), Pipeline (kanban with summary bar + inline add form + DnD across stages), Market Stats (server-fetched live 30yr rate prefill + local inputs + mortgage calc + affordability), Email Report (stub)
- Dashboard widgets: `StatsGrid` (live FRED 30yr rate via new API shape, Florida labeling), `StatCard`, `RecentComparisons`, `QuickAddToPipeline`
- Comparator: `AddressInputs` (dynamic 2–5), `PropertySkeletonCard`, `PropertyCard` (Best/Highest Value badges), `PropertyErrorCard` (yellow no-data / red connection-error), `ComparisonTable` (scannable metrics, Best Value & Highest Value highlights, red >60 DOM), `ClientReport` (printable branded modal with per-property pages)
- Pipeline: `AddPropertyForm` (inline address/price/client/stage/notes), `PipelineSummaryBar` (total value, per-stage counts, longest-sitting deal), `PipelineCard` (draggable, days-in-stage badge, expandable notes, delete), `KanbanBoard` (4 stage columns with HTML5 drag-and-drop)
- Market Stats: `Sparkline` (token-styled inline SVG), `RateDisplay` (current rate, WoW delta, sparkline via correct `data` prop), `LiveRatesSection` (fetches /api/mortgage-rate with skeleton+retry, renders 30yr/15yr cards + FRED source caption), `LocalMarketInputs` (zod-validated, localStorage-persisted, edit/save toggle with 5 stat cards), `MortgageCalculator` (real-time P&I, live-rate prefill prop, 15/30yr term), `AffordabilityCheck` (28% DTI max-price calc with live-rate prefill prop + assumptions panel)
- UI primitives: `Button`, `Input`, `Select`, `Card` (+ subcomponents), `Skeleton`, `EmptyState`
- State: `PipelineContext` (extended pipeline entries with price/client/notes/stageEnteredAt + recent comparisons with winner, localStorage-backed)
- API: `/api/mortgage-rate` (cached FRED proxy returning 30yr+15yr series with 12-week history + WoW deltas), `/api/property-lookup` (Zillow via RapidAPI; POST→`{ properties }`, GET→`{ property }`)
- Lib: `lib/fred.ts` (multi-series helper), `lib/zillow.ts` (server-only RAPIDAPI_KEY; fetchPropertyByAddress + parallel lookups), `lib/utils.ts` (cn, currency/date/number/percent formatters, `daysBetween`, `calcMonthlyPayment`, `maxHomePriceForIncome`), `lib/supabase/{client,server}.ts`
- Types: shared `types/index.ts` (incl. `ComparisonProperty`, `ComparisonResult`, extended `PipelineEntry`, `RateSeries`, `LocalMarketInputs`, `LocalMarketInputsData`, `MortgageCalc*`)
- Config: Tailwind tokens, PostCSS, `.env.example` (Supabase shared-schema + `NEXT_PUBLIC_FRED_API_KEY` used by both /api/mortgage-rate and Market Stats + server-only `RAPIDAPI_KEY`), README