# Signal Pulse architecture

## Reused foundation

This is an in-place transformation of the existing Vite/React application and Cloudflare configuration. React Router persists every product route. TanStack Query caches and refreshes precomputed observations. Recharts is lazy-loaded only for economic history. Lucide, Tailwind, the XML parser, provider backoff helper, D1 migration chain, scheduled GitHub ingestion, and Worker edge caching are retained. The active frontend contains no election navigation, forecasts, result maps, candidate models, or election-specific D3/topology packages. Historical D1 tables are preserved by additive migrations.

The archive and migration inventory document the pre-change checkpoint. The working checkout retains its existing directory and D1 database name to avoid breaking the original binding. Product and Worker names are Signal Pulse.

## Collection

`scripts/pulse-sync.ts` runs outside Workers in Node. It recovers the active collector checkpoint from D1, checks provider cadence, performs bounded conditional fetches, validates and normalizes records, deduplicates URLs, associates supported companies, groups near-identical stories, calculates ranking, and emits a last-successful snapshot. Failed providers retain prior observations and honest health/error status. SHA-256 hashes describe actual fetched response bodies without retaining raw copyrighted articles or contact records.

The collector caps requests, body size, timeouts, retained records, economic observations, SQL statement/batch bytes, and estimated daily writes. SEC requests are sequential and rate limited. In deployed relay mode the FRED key remains in Cloudflare Secrets; an owner-only bearer token permits the scheduled collector to request whitelisted government series and releases. Direct local mode uses a process-environment key. Provider URLs and errors are sanitized before persistence. A keyless BLS fallback serves CPI, unemployment, and payroll observations when FRED is not configured. Original data dates and units remain distinct from collection timestamps. Official calendar dates are parsed from BLS iCalendar events; canceled and past events are omitted. No release dates are guessed.

## Persistence and publication

Migrations 0005–0006 add companies, symbols, market sources, guarded market observations, articles and sources, stories and memberships, topics, company links, economic series/observations/releases, SEC filings, provider status, quality warnings, and a versioned cache. Unique keys, foreign keys, and indexes support idempotent writes and retention. Original migrations remain applicable to fresh installations; existing installations apply only unapplied additions.

No quote provider is authorized for persistence. Insert/update triggers refuse storing TradingView observations. Empty market tables are intentional.

Large JSON documents are split into 25,000-character fragments. New fragments and a collector checkpoint are written under a unique version. Only after the fragments exist is `pulse_cache.active` switched. A reader therefore sees one complete version rather than mixed JSON during a collection run. Old versions expire after two hours. Cache reads use primary-key ranges; migration tests verify that SQLite selects the range index rather than scanning the cache table.

Changed-only upserts reduce unnecessary row writes. Source observation clocks and rankings may legitimately change between runs. A conservative estimate stops remote publication before 80,000 indexed writes/day; actual Cloudflare usage is not instrumented by this local application. If a run fails before publication, the preceding active version remains available. A failure after publication can still leave a valid newly published version; the next run recovers it from D1.

## Serving

The Worker serves five public, read-only data APIs under `/api/pulse/`: dashboard, news, companies, economy, and diagnostics. It joins a bounded set of precomputed fragments, with a five-minute edge cache and one-minute browser cache. It makes no per-visitor requests to news, SEC, FRED, or quote APIs. The separate authenticated `/api/internal/fred` route is available only to the owner collector, adds the Cloudflare-secret key server-side, restricts upstream routes and IDs, and bypasses public caching. Non-GET methods are rejected. Static assets and SPA deep links use Workers Static Assets and bypass Worker execution except `/api/*`.

The frontend tries the cached API with a timeout, then loads the captured static snapshot. Snapshot staleness and per-provider last-success timestamps are visible. Third-party TradingView iframes are independent of the data API and retain their original attribution and timing indicators.

The hourly Cloudflare scheduled handler performs a small bounded retention batch. The public GitHub workflow performs actual collection every 30 minutes and preserves diagnostic artifacts. A local companion performs the same work against local D1 for the preview.

## Private preferences

Watchlists, notes, order, preferred categories, dashboard sections, density, external-embed preference, and a research notebook live only in the browser under a new Signal Pulse namespace. Imports are schema-validated and size-limited. Exports are local JSON downloads. There are no public preference mutation endpoints, user accounts, or external note synchronization. Existing Atlas browser data is left untouched.

## Limits

Source coverage is a sample, company coverage is curated, clustering can split or join incorrectly, and no model independently verifies publishers' factual claims. Public display rights for structured market data have not been established, so event-window numerical returns are unavailable. FRED and SEC integrations require genuine owner configuration and have not been live-tested with those credentials. Free-tier production CPU and audience capacity remain account-side verification tasks, not conclusions from a local latency benchmark.
