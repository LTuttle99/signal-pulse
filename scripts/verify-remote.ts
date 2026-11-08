import { writeFile } from "node:fs/promises";
const url = process.argv[2] ?? process.env.SIGNAL_PULSE_URL;
if (!url) {
  console.log(
    "NOT RUN: provide deployed URL: npm run verify:remote -- https://your-worker.workers.dev",
  );
  process.exit(2);
}
const base = new URL(url);
if (
  base.protocol !== "https:" &&
  base.hostname !== "localhost" &&
  base.hostname !== "127.0.0.1"
)
  throw Error("HTTPS production URL required");
const checks = [];
for (const path of [
  "/",
  "/markets",
  "/news",
  "/economy",
  "/companies/NVDA",
  "/watchlist",
  "/api/pulse/dashboard",
  "/api/pulse/news",
  "/api/pulse/economy",
  "/api/pulse/companies",
  "/api/pulse/diagnostics",
]) {
  const started = performance.now();
  const r = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
  });
  const body = await r.text();
  if (!r.ok) throw Error(path + " HTTP " + r.status);
  if (path.startsWith("/api/")) JSON.parse(body);
  else if (!body.includes('id="root"'))
    throw Error("SPA asset route failed " + path);
  checks.push({
    path,
    status: r.status,
    bytes: new TextEncoder().encode(body).length,
    wallMs: performance.now() - started,
  });
}
let directD1 = "NOT RUN: account credentials not provided";
if (
  process.env.CLOUDFLARE_API_TOKEN &&
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.D1_DATABASE_ID
) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT count(*) AS articles FROM articles",
      }),
    },
  );
  if (!r.ok)
    throw Error("Remote D1 query failed (credentials are never printed)");
  const response = (await r.json()) as { success: boolean };
  if (!response.success) throw Error("Remote D1 API did not confirm success");
  directD1 = "passed authenticated read-only remote D1 query";
}
const report = {
  url: base.origin,
  checkedAt: new Date().toISOString(),
  checks,
  directD1,
  note: "HTTP wall times are not Cloudflare CPU billing measurements.",
};
await writeFile(
  "docs/remote-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
