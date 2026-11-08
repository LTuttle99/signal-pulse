export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  FRED_API_KEY?: string;
  INGEST_TOKEN?: string;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control":
        status === 200 ? "public, max-age=60, s-maxage=300" : "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
/** Owner-only relay keeps the FRED key in Cloudflare Secrets. Never used per visitor. */
export async function fredRelay(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET")
    return json({ error: "Method not allowed" }, 405);
  if (!env.FRED_API_KEY || !env.INGEST_TOKEN)
    return json({ error: "FRED relay is not configured" }, 503);
  if (request.headers.get("authorization") !== "Bearer " + env.INGEST_TOKEN)
    return json({ error: "Unauthorized" }, 401);
  const u = new URL(request.url),
    route = u.searchParams.get("route");
  const series = [
    "CPIAUCSL",
    "UNRATE",
    "A191RL1Q225SBEA",
    "FEDFUNDS",
    "DGS10",
    "PAYEMS",
    "RSAFS",
    "INDPRO",
  ];
  const releases = ["10", "50", "53", "18", "9", "13"];
  const upstream = new URL("https://api.stlouisfed.org/fred/");
  if (route === "series" || route === "series/observations") {
    const id = u.searchParams.get("series_id") ?? "";
    if (!series.includes(id)) return json({ error: "Unsupported series" }, 400);
    upstream.pathname += route;
    upstream.searchParams.set("series_id", id);
    if (route === "series/observations") {
      upstream.searchParams.set("sort_order", "desc");
      upstream.searchParams.set("limit", "180");
    }
  } else if (route === "release/dates") {
    const id = u.searchParams.get("release_id") ?? "";
    if (!releases.includes(id))
      return json({ error: "Unsupported release" }, 400);
    upstream.pathname += route;
    upstream.searchParams.set("release_id", id);
    upstream.searchParams.set("include_release_dates_with_no_data", "true");
    upstream.searchParams.set(
      "realtime_start",
      new Date().toISOString().slice(0, 10),
    );
    upstream.searchParams.set("sort_order", "asc");
    upstream.searchParams.set("limit", "12");
  } else return json({ error: "Unsupported FRED route" }, 400);
  upstream.searchParams.set("api_key", env.FRED_API_KEY);
  upstream.searchParams.set("file_type", "json");
  try {
    const response = await fetch(upstream, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return json(
        { error: "FRED upstream unavailable", upstreamStatus: response.status },
        response.status === 429 ? 429 : 502,
      );
    return new Response(response.body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return json({ error: "FRED upstream unavailable" }, 502);
  }
}
export async function api(request: Request, env: Env): Promise<Response> {
  const u = new URL(request.url);
  if (request.method !== "GET")
    return json({ error: "Method not allowed" }, 405);
  if (u.pathname === "/api/internal/fred") return fredRelay(request, env);
  const keys: Record<string, string> = {
    "/api/pulse/dashboard": "dashboard",
    "/api/pulse/news": "news",
    "/api/pulse/companies": "companies",
    "/api/pulse/economy": "economy",
    "/api/pulse/diagnostics": "diagnostics",
  };
  const key = keys[u.pathname];
  if (!key) return json({ error: "Unknown API route" }, 404);
  const rows = await env.DB.prepare(
    "SELECT data FROM pulse_cache WHERE key >= (? || ':' || (SELECT data FROM pulse_cache WHERE key='active') || ':') AND key < (? || ':' || (SELECT data FROM pulse_cache WHERE key='active') || ':~') ORDER BY key LIMIT 100",
  )
    .bind(key, key)
    .all<{ data: string }>();
  if (!rows.results.length)
    return json(
      { error: "No successful Signal Pulse synchronization yet" },
      503,
    );
  return new Response(rows.results.map((r) => r.data).join(""), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}
export async function maintenance(env: Env, now = new Date().toISOString()) {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO operations(key,value,updated_at) VALUES('pulse-cron','Hourly bounded retention; collection runs in GitHub Actions',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    ).bind(now),
    env.DB.prepare(
      "DELETE FROM data_quality_events WHERE id IN (SELECT id FROM data_quality_events WHERE observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days') LIMIT 100)",
    ),
    env.DB.prepare(
      "DELETE FROM market_observations WHERE id IN (SELECT id FROM market_observations WHERE observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days') LIMIT 100)",
    ),
  ]);
}
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return env.ASSETS.fetch(request);
    if (request.url.length > 2048) return json({ error: "URL too long" }, 414);
    if (new URL(request.url).pathname === "/api/internal/fred")
      return fredRelay(request, env);
    const cache = (caches as unknown as { default: Cache }).default;
    if (request.method === "GET") {
      const hit = await cache.match(request);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("x-pulse-cache", "hit");
        return new Response(hit.body, { status: hit.status, headers });
      }
    }
    try {
      const response = await api(request, env);
      if (response.ok && request.method === "GET")
        ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch {
      return json(
        {
          error:
            "Data service unavailable. Last collected snapshot is available in the interface.",
        },
        503,
      );
    }
  },
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(maintenance(env));
  },
} satisfies ExportedHandler<Env>;
