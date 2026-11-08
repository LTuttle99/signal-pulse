# Signal Pulse operations

Signal Pulse reuses the existing React/Vite application, Cloudflare Worker, Static Assets, D1 binding, and GitHub Actions infrastructure. It requires no paid AI service. The original Election Atlas application is preserved in `../election-atlas-preserved-2026-11-05.tar.gz`. The six D1 migrations are additive: no election table is dropped and no Atlas browser preference key is overwritten.

## Run locally

Use Node 24 or newer. From this directory:

```sh
npm ci
npm run db:local
npm run sync -- --db --local
npm run build
```

Keep these in separate terminals:

```sh
npm run worker:dev -- --port 8787
npm run dev
npm run collect:local
```

Open `http://127.0.0.1:5173/`. `collect:local` checks the sources immediately and every 30 minutes; it respects each provider's next-attempt time. The browser refreshes cached observations every five minutes while open. TradingView updates its own embeds. Closing the browser does not affect a deployed scheduled collector.

## Cloudflare deployment

No public deployment or remote authentication has been performed. The placeholder D1 ID intentionally prevents an accidental deploy.

1. Sign in with `npx wrangler login` using your own Cloudflare account. Stay on Workers Free.
2. Reuse your existing `election-atlas` D1 database, or create a new database with `npx wrangler d1 create election-atlas`. Preserve the old database if you want its election observations.
3. Set the real ID with `node scripts/configure-db.mjs YOUR_DATABASE_UUID`. The Worker is named **signal-pulse**; the existing database binding/name remains **election-atlas** intentionally.
4. Apply migrations: `npm run db:remote`. On an existing database only new unapplied migrations run. Migrations 0005 and 0006 add the new data architecture and enforce quote-persistence restrictions.
5. Initial collection: `npm run sync -- --db`. This writes provider observations, cached APIs, and a recoverable collector checkpoint. It does not need a FRED key for news, BLS observations, or the BLS calendar.
6. Deploy: `npm run deploy`. The command validates your binding, compiles TypeScript, builds assets, and invokes Wrangler.
7. Verify the returned URL with `npm run verify:remote -- https://YOUR_WORKER.workers.dev`. This checks SPA deep links and all five JSON APIs. If Cloudflare environment credentials are available, it also performs an authenticated read-only D1 query. Do not claim success from a local check alone.
8. Set up the scheduled public GitHub repository described below. Deployment alone does not configure GitHub credentials or enable that workflow.

## Automatic collection in GitHub Actions

Publish the source to a public GitHub repository to use the no-charge public-runner workflow. The workflow intentionally does not run on private repositories, where included Actions minutes may be insufficient. Set:

| Setting | Location | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Repository secret | Least-privilege D1 editing for this account/database |
| `CLOUDFLARE_ACCOUNT_ID` | Repository secret | Cloudflare account |
| `D1_DATABASE_ID` | Repository variable | Existing or newly created D1 UUID |
| `FRED_PROXY_URL` | Optional repository variable | Deployed Signal Pulse base URL for the authenticated FRED relay |
| `FRED_PROXY_TOKEN` | Optional repository secret | Matches the owner-only Cloudflare `INGEST_TOKEN` secret |
| `FRED_API_KEY` | Optional local/direct collector secret | Direct collector mode only; the preferred deployed mode keeps this key in Cloudflare Secrets |
| `SEC_USER_AGENT` | Optional repository secret | Real identifying app name and contact email; e.g. your actual `SignalPulse contact@your-owned-domain` |

For deployed FRED access, keep the actual API key in Cloudflare Secrets:

```sh
npx wrangler secret put FRED_API_KEY
npx wrangler secret put INGEST_TOKEN
```

Supply the real owner FRED key to the first command and a separately generated private ingestion token to the second. Set the repository variable `FRED_PROXY_URL` to the deployed site's HTTPS base URL and the repository secret `FRED_PROXY_TOKEN` to that same ingestion token. The scheduled collector uses an authenticated `/api/internal/fred` relay; the key is added only inside the Worker. The relay is whitelisted to the reviewed series/release IDs, never publicly cached, and is not called by dashboard visitors. It cannot relay arbitrary URLs or restricted UMCSENT observations.

Never put secrets in Vite variables, browser settings, committed `.env` files, or exported user preferences. A local/direct collection can instead use a process-environment `FRED_API_KEY`; no secret is saved in provider URLs or logs. Cloudflare Secrets do not automatically propagate to GitHub, which is why the relay uses a separate collector token. SEC's real identifying contact remains in the scheduled collector's environment.

The scheduled workflow runs at :07 and :37 each hour. GitHub may delay or skip cron runs and may disable schedules after repository inactivity; monitor diagnostics and the workflow history. Re-enable or manually dispatch the workflow if required. The hourly Cloudflare Cron only performs bounded maintenance; heavy collection does not run inside the Free Worker.

## Collector safety and recovery

- A maximum of 60 upstream requests per run, each bounded to 18 seconds and 6 MB.
- Feed validation, canonical URL deduplication, conservative story matching, no article bodies or publisher images.
- Conditional ETags/Last-Modified, per-provider cadence, Retry-After handling, exponential backoff up to daily retries. `--force` bypasses cadence and conditional headers for a deliberate verification run.
- Source errors retain the preceding successful observations. HTTP 304 is a successful validation, not a new publication.
- Centralized SEC requests run sequentially at no more than two per second, beneath the SEC's published ceiling. No SEC collection runs without a real identifying contact.
- BLS keyless series are requested once daily: three series, plus one daily calendar request. Three API calls/day is below the unregistered API's published 25-request daily limit. A forced verification run consumes additional requests; do not schedule `--force`.
- The collector recovers its state and conditional-request metadata from D1 before fetching; ephemeral GitHub runners do not lose checkpoints.
- JSON is split into 25,000-character fragments and SQL batches are bounded to 85 KB. A version pointer publishes the new cached snapshot only after its fragments have been written, preventing mixed-version JSON during ingestion.
- A conservative estimated indexed-write budget halts remote writes at 80,000/day. This is a guard, not Cloudflare billing analytics. Cached observations continue to be served if collection halts. Check actual row read/write, CPU, request, and storage metrics in Cloudflare.
- The dataset retains at most 1,200 headline observations in its UI snapshot, 14 days of observed news, 180 observations per economic series, 24 recent filings per company in its snapshot, two years of persisted SEC filings, and 14 days of diagnostic warnings. Old cached versions are removed after two hours. Bounded cleanup may require multiple runs to catch up after a long outage.
- No market observations are collected. Database triggers reject inserts and updates against unapproved market sources, including TradingView.

## Source-use scope

The supplied news configuration is for the owner's personal, noncommercial dashboard. NPR's terms permit attributed personal application feed display and require original links without an intermediate page. Headline anchors open originals; a separately labeled Coverage link opens Signal Pulse's metadata overview. PBS general terms prohibit commercial exploitation; no article body is copied. Before changing this into a commercial or promotional publication, obtain the necessary publisher permissions or disable these feeds. Public API routes are internal application data paths, not a licensed news-redistribution service.

UMCSENT is intentionally excluded pending University of Michigan display permission. GDELT was rate limited during verification and remains disabled. NewsAPI Developer and structured quote APIs without established public display rights are excluded.

## Verification

```sh
npm run check
npm run test:migrations
npm run test:browser
npm run build
npm run benchmark
```

The browser tests expect a running local Vite server and Chrome, exercise desktop/mobile routes, metadata attribution, preferences, notebook persistence, import/export, outage fallback, and accessibility on core pages. Third-party TradingView iframes are outside the axe scan's control; verify them visually. The benchmark makes 80 sequential real local API requests. Its HTTP wall times are not Worker CPU measurements. Production Free-tier CPU compliance, account quotas, external provider behavior, and remote deep-link behavior remain deployment verification tasks.
