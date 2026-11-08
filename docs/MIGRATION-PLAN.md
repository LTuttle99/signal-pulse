# Election Atlas → Signal Pulse

Checkpoint: ../election-atlas-preserved-2026-11-05.tar.gz preserves the full application, data snapshots, tests, migrations, and documentation before migration. No Git repository was present; the archive is the recovery snapshot. Existing D1 election tables and browser atlas preferences are retained, not overwritten.

Reuse: React/Vite/Tailwind, React Router, TanStack Query, Recharts, Lucide, XML parser, Workers asset routing/cache, D1 migrations, scheduled Actions ingestion, provider backoff and local preferences.

Replace active election routes and adapters with news metadata, story clustering, company/SEC and economic providers. Remove election-specific D3/topology packages from active dependencies. Add a non-destructive 0005 migration for Signal Pulse tables. Preserve original migrations to support existing databases. Private preferences use a new signal-pulse storage namespace.

Sequence: archive → additive data schema and provider collection → new terminal UI → widgets and companies → economy and insights → watchlist → testing and deployment readiness. Heavy processing stays in Actions, with changed-only bounded D1 writes. Workers serve precomputed JSON and perform bounded retention maintenance.

Market data: use attributed official TradingView embeds only; do not extract or store quotes. FRED requires an owner key; SEC requires a real identifying contact. Missing credentials appear as unavailable, never fabricated data.
