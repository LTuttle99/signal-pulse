# Signal Pulse implementation report

Implemented November 5 and reverified November 8, 2026. This report distinguishes the working local product from integrations and deployment that still require owner configuration. The latest visual instruction was applied: the application uses a **royal blue** accent palette, blue economic charts, and restrained blue glows. Provider-owned financial movement colors remain red/green with signed numerical changes.

## Preservation and migration

The existing Election Atlas application was inspected and preserved before active code changes in `../election-atlas-preserved-2026-11-05.tar.gz`. Source, tests, configuration, documentation, election observations, forecast snapshots, and compiled assets are recoverable from that archive. No Git repository existed, so preservation uses a verified archive rather than an invented branch. `preservation.json` contains its checksum and verified members; `migration-inventory.json` records the original source inventory.

This is an in-place transformation, retaining React/TypeScript/Vite/Tailwind, React Router, TanStack Query, Recharts, Lucide, XML parsing, the Cloudflare Worker/Static Assets/D1 binding, provider retry policy, cached APIs, and scheduled ingestion infrastructure. Active election routes, models, adapters, and D3/topology dependencies were removed. Existing D1 election tables and browser preference keys remain intact. New migrations 0005–0006 are additive.

## Functional features

| Area | Working behavior |
|---|---|
| National dashboard | Royal blue terminal design; responsive sidebar; category filters; global company/headline search; ticker; ranked stories; dispatch wire; economic observations; confirmed release dates; supported company mentions; watchlist previews; configurable sections. |
| National news | Automatic RSS collection, feed validation, canonical URL deduplication, source/topic categorization, conservative event clustering, transparent ranking, headline/source/date filters, original publication and observation timestamps, and metadata-only aggregated story timelines. |
| Market overview | Official TradingView ticker, benchmarks/ETF overview, historical chart, symbol selection, and U.S. equity screener. The first two ticker instruments are labeled CFDs. No widget prices are extracted or stored. |
| Stock/company pages | Twelve curated stocks/ETFs, local search, ticker/exchange/company context, attributed price/history chart, provider-hosted financial statements, matched headline links, and personal watch controls. SEC-backed filings/facts are conditional on owner contact configuration. |
| Economy | Three live-verified keyless official BLS histories: CPI, unemployment, and payrolls; date/units/frequency labels; interactive historical charts; derived CPI year-over-year change; official upcoming BLS release dates. FRED adds further coverage after configuration. |
| Insights | Explicit company/headline relationships, publication context, company links, economic context, and a private local research notebook. No causal stock-move claims or unsupported reliable price predictions. |
| Watchlists | Stocks/ETFs, companies, topics, and economic indicators; search/add/remove/reorder; notes; matched news activity; persistence without an account. |
| Preferences | Preferred news categories, configurable sections, density, external-widget toggle, validated JSON import/export, storage-failure notice. Atlas preferences are preserved separately. |
| Sources/diagnostics | Original source links, ranking/clustering and alias methods, rights limitations, actual provider last-attempt/last-success and response hashes, staleness detection, explicit unavailable/configuration statuses, bounded-usage explanations. |
| Infrastructure | Read-only cached APIs, SPA deep links, additive D1 schema, versioned snapshot publication, indexed cache range reads, source backoff/conditional requests, retention, a 30-minute public GitHub Actions workflow, and a local automatic collector. |

All thirteen requested routes exist. Unknown companies, missing stories, unsupported series, zero matching news, source failures, and unconfigured integrations have explicit states. Copyrighted full article content and publisher images are never stored or summarized. Headline anchors open original publishers directly; separately labeled Coverage links open Signal Pulse metadata pages.

## Verified actual integrations and snapshot

The verified captured dataset contains **227 deduplicated headlines**, **226 conservative story clusters**, **12 curated stocks/ETFs**, **99 monthly observations across three BLS series**, and **20 upcoming confirmed BLS release-date entries**. Counts describe the captured snapshot, not a promise about future coverage.

Successful actual sources: PBS national/economy RSS, NPR national/business/technology RSS, Federal Reserve releases, NASA RSS, the official BLS public data API, and the official BLS iCalendar. Distinct publisher counts are normalized: multiple NPR/PBS feeds do not inflate outlet breadth. The conservative current snapshot has predominantly single-publisher stories; the app does not invent additional perspectives or call these nationally trending. Company coverage is sparse in this sample and is labeled by observable headline counts.

TradingView ticker and historical chart were visually verified in the local browser, including provider delay labels and original attribution. Prices are not included as structured observations in D1 or in this report. See `source-verification.json` for actual retrieval times, hashes, counts, and status.

## Delayed, cached, and bounded data

News is collected every 30 minutes, Federal Reserve/NASA feeds hourly, BLS histories/calendar daily. TradingView updates its own embeds; individual quotes may be delayed. The browser refreshes data every five minutes and the API uses five-minute edge caching. A source's last successful HTTP response is not its publication date.

Economic values remain monthly/quarterly/daily as appropriate. BLS's endpoint does not supply a publication timestamp or complete real-time vintage classification; the interface says so rather than inventing one. BLS source footnotes are retained, including preliminary labels where supplied. FRED observation-vintage dates and publication-update metadata are retained when configured. A revision indicator means a historical value changed between collected snapshots, not that the application has inferred a preliminary/final designation.

Source downtime preserves prior observations. If the API fails, the frontend loads its captured static snapshot and exposes staleness. The UI snapshot retains at most 1,200 headlines and 180 observations per economic series. Retention and request/write limits are documented in `OPERATIONS.md`.

## Unsupported or owner-configured coverage

- **FRED live integration has not been authenticated or verified:** no owner API key was supplied. GDP, federal funds, Treasury yields, retail sales, and industrial production have configured series definitions and connector/UI support, but values remain unavailable until configuration succeeds. Deployed mode stores the actual FRED key in Cloudflare Secrets and authorizes only the scheduled collector through a whitelisted relay. The three BLS histories work without this key.
- **SEC live collection has not been verified:** no identifying owner app/contact was supplied. The submissions and XBRL adapters, curated ticker/CIK mapping, filing URLs, facts, cadence, and validation tests are implemented. Until configured, pages distinguish curated profiles and link to original SEC company records rather than fabricating filings or financial metrics.
- University of Michigan consumer sentiment is excluded pending third-party display permission.
- GDELT verification returned HTTP 429; it remains disabled. News coverage is a connected-feed sample, not comprehensive national or international reporting.
- Company coverage is limited to the twelve supported stocks/ETFs. The app does not claim a complete exchange directory or automatically collect every company's filings.
- Structured market-data redistribution rights have not been established. Numerical event-window returns, internal historical-price computations, and a separately computed market-movers feed are unavailable; official widget charts/screener supply permitted display instead.
- Market session status is a clock-based regular-session window, with holiday verification explicitly unavailable.
- Clustering and alias rules have known limitations; the product does not independently fact-check publishers or infer causation.

## Paid/restricted sources intentionally excluded

No paid AI services, paid databases, managed subscription infrastructure, or paid quote dependencies were added. Twelve Data Basic, Massive individual plans, and Alpha Vantage free APIs are not used to republish quotes. Their free access does not establish this application's public redistribution rights. NewsAPI Developer is excluded from production. TradingView required branding is retained. See `PROVIDER-REVIEW.md` for the primary documentation and rights decisions.

The supplied RSS configuration is for personal noncommercial use. A commercial or promotional publication would require an additional publisher permission review or disabling those feeds. The app does not function as a licensed quote/news redistribution service.

## Validation results

- TypeScript check: passed.
- Unit tests: **34 passed**, covering feed validation/deduplication/provenance, topic rules, cautious ticker matching, clustering and stable links, SEC filing/fact validation, economic normalization, official calendar dates, preferences, backoff, Worker error/cache behavior, and authentication/whitelisting/secret handling in the owner-only FRED relay.
- All **six additive migrations passed** in SQLite; foreign keys remained valid; legacy tables survived; unauthorized market inserts and updates were rejected. The cache-read query plan uses the primary-key range index.
- **All 16 desktop/mobile browser journeys passed in a complete November 8 run.** Dashboard/watchlist/economy axe scans passed on both viewports with the royal blue palette. External provider iframes were excluded from axe and inspected visually.
- Production Vite build: passed, with economic charts split into a lazy-loaded chunk.
- Cloudflare `wrangler deploy --dry-run`: passed; Worker bundle approximately **6.06 KiB / 2.13 KiB gzip**. This did not publish or authenticate a deployment.
- Local benchmark: **80 actual Worker/D1 API requests passed**. Cached response medians ranged roughly **4–6 ms**, with 19–20 cache hits out of 20 per endpoint in this run. Payloads were approximately 85 KB dashboard, 195 KB news, 19 KB economy, 7 KB diagnostics. See `workload-measurements.json` for exact values.
- These are local HTTP wall times, **not production Worker CPU measurements**. Production 10 ms CPU compliance and account-side quotas remain unverified.
- Remote/public deployment: **not performed**. The D1 binding still contains its deliberate placeholder UUID and no deployed URL was supplied. `verify:remote` accurately reports NOT RUN without a target URL.

## Estimated free-tier usage

Verified published Free limits: Workers 100,000 requests/day and 10 ms CPU per invocation; D1 5 million rows read/day, 100,000 rows written/day, 500 MB per database, 5 GB total account storage. Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

At the current source set, normal collection is approximately **292 news/calendar/BLS upstream requests/day**: five half-hourly news feeds (240), two hourly government feeds (48), three daily BLS API calls, and one daily calendar request—**292 total**. Actual conditional requests and failures can vary; forced verification runs add requests. With FRED/SEC enabled, their bounded cadences add requests but remain capped at 60 per run. Heavy processing runs in public GitHub Actions, not the Worker.

At the current 226-story snapshot, a conservative collector estimate is around **800–1,100 indexed row writes/run**, or roughly **38,000–53,000/day at 48 runs**, before source-driven changes. This is an estimate, not account telemetry; remote publication stops at an estimated 80,000/day. All existing databases and account workloads also consume shared quotas.

For audience context, 200 continuously active viewers polling one dashboard every five minutes for twelve hours generate about 28,800 API requests/day before additional routes. 1,000 such viewers generate 144,000 and exceed the Workers Free request allowance even when edge-cached. Static assets and provider-hosted embeds do not require a quote-fetch Worker invocation. No unlimited-traffic or universal production CPU guarantee is claimed.

## Remaining deployment steps

1. Configure the owner's real Cloudflare D1 binding and authenticate Wrangler.
2. Apply remote migrations and run initial remote collection.
3. Deploy the built Worker/static assets and run the provided remote SPA/API verification command.
4. Configure the public GitHub repository's Cloudflare token/account/DB settings and enable the scheduled workflow.
5. Optionally configure FRED and a genuine SEC identifying contact to expand coverage.
6. Inspect actual account CPU, requests, D1 read/write/storage, source freshness, and workflow status after deployment.

Exact commands and required setting names are in `OPERATIONS.md`. No API keys, contacts, authentication, public hosting, or successful remote measurements have been invented.


November 8 verification also confirmed that the automatic collector continued across sessions and ingested new headlines and the latest employment release. Story writes now apply relationship deltas: unchanged memberships are skipped and removed memberships are deleted explicitly, reducing unnecessary free-tier writes as coverage grows. Two additional unit tests verify those cases.
