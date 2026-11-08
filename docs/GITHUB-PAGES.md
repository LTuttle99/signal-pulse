# Deploy the compiled Signal Pulse app to GitHub Pages

The observed public site served the source `index.html` with `/src/main.tsx`. GitHub Pages serves static files and cannot compile that React/TypeScript entry. It needs the Vite build output instead.

The new `.github/workflows/pages.yml` installs dependencies, restores the prior collector snapshot/cooldowns, collects verified metadata, builds the project-prefix app, uploads **dist-pages**, and deploys it. It runs after main-branch pushes, manually, and every 30 minutes. Collection failures preserve the preceding snapshot. No Cloudflare credentials are required for the basic Pages deployment.

## One-time setting

In this repository, go to **Settings → Pages → Build and deployment → Source → GitHub Actions**. Run **Actions → Build and refresh Signal Pulse on GitHub Pages → Run workflow** if needed. GitHub can delay scheduled runs or disable schedules after inactivity.

The deployed entry is `https://ltuttle99.github.io/signal-pulse/`. Internal routes use hashes, for example `https://ltuttle99.github.io/signal-pulse/#/markets`, so refreshing a stock or news page does not produce GitHub's 404. All JS, CSS, lazy-loaded chart chunks, and snapshot requests remain under `/signal-pulse/`.

GitHub Pages has no Worker or D1 API. This build intentionally reads its collected JSON snapshot directly and makes no requests to nonexistent `/api/pulse/*` endpoints. TradingView embeds update independently. Optional FRED and SEC collector settings work as documented, with no secrets compiled into the app. The separate Cloudflare ingestion workflow runs only if `ENABLE_CLOUDFLARE_SYNC=true` is explicitly enabled, so a Pages-only repository does not repeatedly fail an unconfigured D1 job.

The state cache retains provider refresh times and ETags between ephemeral runners, avoiding repeated daily BLS calls on every deployment. The action does not commit generated headlines back to the repository. A cache eviction may require a full fresh collection; the bundled snapshot remains the fallback.

Local build verification:

```sh
npm ci
npm run check
npm run build:pages
npm run preview:pages -- --port 4175
```

Open `http://127.0.0.1:4175/signal-pulse/` and navigate between hash routes. The standard `npm run build` still produces the Cloudflare build with clean browser routes and cached APIs.
