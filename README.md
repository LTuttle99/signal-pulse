# Signal Pulse

A personal national-news, market, company, and economic intelligence dashboard, transformed from the existing Election Atlas project. React, TypeScript, Vite, Tailwind, React Router, TanStack Query, Recharts, Cloudflare Workers Static Assets, and D1 are retained. Election-specific navigation, code, and D3/topology dependencies are removed from the active application.

**Usable now:** automatic attributed news collection, headline search and filters, conservative story clustering, original-source links, TradingView tickers/charts/screeners/financial widgets, 12 supported stocks/ETFs, three keyless official BLS economic histories, the official BLS release calendar, explicit company/headline matching, personal watchlists with notes and reordering, a private research notebook, preference import/export, diagnostics, and saved-snapshot outage fallback.

**Needs owner configuration:** FRED expands the economic dataset; an identifying SEC contact enables centralized filings and XBRL facts; Cloudflare and public GitHub repository credentials enable an independently operating deployed installation. No credentials are invented, no paid services are required, and no public deployment is claimed.

## Preview and local development

```sh
npm ci
npm run db:local
npm run sync -- --db --local
npm run build
```

Run these separately:

```sh
npm run dev
npm run worker:dev -- --port 8787
npm run collect:local
```

Open `http://127.0.0.1:5173/`. The local collector checks every 30 minutes; browser data refresh is five minutes; market widgets update themselves. Original data dates remain visible. The supplied captured snapshot is available if the API is down.

## Routes

`/`, `/markets`, `/stocks/:symbol`, `/news`, `/news/:storyId`, `/economy`, `/companies`, `/companies/:symbol`, `/watchlist`, `/insights`, `/sources`, `/diagnostics`, `/settings`.

Private preferences live in `signal-pulse:v1` in localStorage. They never use public mutation endpoints. Existing Atlas preferences and D1 tables are preserved. Stock and company coverage is a curated universe, not all listed securities. The displayed market session window is a clock-based estimate, not a verified exchange-holiday calendar.

## Data principles

- Headlines and metadata only: no full articles, publisher images, or fabricated summaries. Headline links go directly to the original publisher; separate Coverage links open metadata overviews.
- Ranking combines recency, distinct publishers, feed prominence, category relevance, and additional reports. One publisher is never described as nationally trending. Similar headlines are clustered conservatively, with limitations explained in `/sources`.
- Prices are official, attributed TradingView embeds. Signal Pulse never extracts or stores widget data. Quote timing and availability are controlled by the provider and may be delayed. The first two ticker instruments are explicitly labeled CFDs, not cash-index prices.
- CPI, unemployment, and nonfarm payroll history come from the official keyless BLS API with once-daily collection. Values are not implied to update continuously. CPI year-over-year change is calculated from available index observations and labeled derived.
- FRED series preserve original frequency, units, observation dates, vintage metadata, source, and publication-update metadata when available. University of Michigan consumer sentiment is excluded pending third-party display permission.
- SEC submissions and company facts are available through a bounded central collector after the owner sets `SEC_USER_AGENT` to a real app/contact. No visitor-triggered SEC requests.
- Company associations are guarded explicit headline aliases or $tickers. Event-window price returns and reliable stock-price predictions are unavailable. Associations do not imply causation.

The initial RSS configuration is for **personal noncommercial use**. Review publisher permissions before commercializing or promoting the application. The product is not a licensed quote or news redistribution service.

## Validate

```sh
npm run check
npm run test:migrations
npm run test:browser
npm run build
npm run benchmark
```

See [the implementation report](docs/IMPLEMENTATION-REPORT.md), [operations and deployment instructions](docs/OPERATIONS.md), [provider rights review](docs/PROVIDER-REVIEW.md), and [architecture](docs/ARCHITECTURE.md).

## Recovery checkpoint

`../election-atlas-preserved-2026-11-05.tar.gz` contains the Election Atlas source, original tests, documentation, configuration, result/poll/forecast snapshots, and compiled application as they existed before this pivot. No Git repository was present, so the complete archive is the preservation snapshot. To restore, extract it to a separate directory, run `npm ci`, and point it at a separately reviewed database binding. Do not overwrite the live Signal Pulse installation.
