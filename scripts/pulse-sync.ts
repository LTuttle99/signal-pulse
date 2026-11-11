import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  emptyBundle,
  mergeCompanyCatalog,
  feedDefinitions,
  normalizeFeed,
  deduplicate,
  clusterArticles,
  storyDelta,
  categorize,
  normalizeSubmissions,
  normalizeFacts,
  normalizeObservations,
  normalizeBLS,
  normalizeCalendar,
  categories,
  type PulseBundle,
  type ProviderState,
  type EconomicRelease,
} from "../shared/pulse";
import { retryTime } from "../shared/source-policy";
const at = new Date().toISOString(),
  runVersion = at.replace(/\D/g, ""),
  now = Date.parse(at),
  local = process.argv.includes("--local"),
  db = process.argv.includes("--db"),
  force = process.argv.includes("--force");
const sql = (s: string | number | null) =>
  s === null
    ? "NULL"
    : typeof s === "number"
      ? String(s)
      : "'" + s.replaceAll("'", "''") + "'";
const target = local ? "--local" : "--remote";
function d1(command: string) {
  return JSON.parse(
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "election-atlas",
        target,
        "--command",
        command,
        "--json",
      ],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    ),
  );
}
let bundle = emptyBundle();
let databaseRecovered = false;
try {
  bundle = JSON.parse(await readFile("public/pulse/latest.json", "utf8"));
} catch {
  /* first run */
}
if (db) {
  const chunks =
    d1(
      "SELECT data FROM pulse_cache WHERE key >= COALESCE('collector:' || (SELECT data FROM pulse_cache WHERE key='active') || ':','collector:') AND key < COALESCE('collector:' || (SELECT data FROM pulse_cache WHERE key='active') || ':~','collector:~') AND ((SELECT data FROM pulse_cache WHERE key='active') IS NOT NULL OR length(key)=14) ORDER BY key",
    )[0]?.results ?? [];
  if (chunks.length) {
    bundle = JSON.parse(chunks.map((x: { data: string }) => x.data).join(""));
    databaseRecovered = true;
  }
}
const previous =
    db && !databaseRecovered ? emptyBundle() : structuredClone(bundle),
  states = new Map(bundle.providers.map((p) => [p.id, p]));
bundle.companies=mergeCompanyCatalog(bundle.companies);
function state(
  id: string,
  name: string,
  url: string,
  interval: number,
  rights: string,
): ProviderState {
  return (
    states.get(id) ?? {
      id,
      name,
      url,
      interval,
      rights,
      status: "unverified",
      lastAttempt: null,
      lastSuccess: null,
      nextAttempt: null,
      records: 0,
      failures: 0,
      error: null,
    }
  );
}
const proxyReady = Boolean(
  process.env.FRED_PROXY_URL && process.env.FRED_PROXY_TOKEN,
);
function fredUrl(route: string, params: Record<string, string>) {
  if (proxyReady) {
    const url = new URL("/api/internal/fred", process.env.FRED_PROXY_URL);
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      throw Error("FRED proxy must use HTTPS");
    url.search = new URLSearchParams({ route, ...params }).toString();
    return url.toString();
  }
  return (
    "https://api.stlouisfed.org/fred/" +
    route +
    "?" +
    new URLSearchParams({
      ...params,
      api_key: process.env.FRED_API_KEY!,
      file_type: "json",
    })
  );
}
let requests = 0;
async function get(
  id: string,
  name: string,
  url: string,
  interval: number,
  rights: string,
  parse: (text: string) => number,
  extra: Record<string, string> = {},
) {
  const p = state(id, name, url, interval, rights);
  states.set(id, p);
  if (!force && p.nextAttempt && Date.parse(p.nextAttempt) > now) return;
  p.lastAttempt = at;
  try {
    if (++requests > 60) throw Error("Run request cap reached");
    const headers: Record<string, string> = {
      accept:
        "application/json, application/rss+xml, application/xml, text/xml",
      ...extra,
    };
    if (id.startsWith("fred-") && proxyReady)
      headers.authorization = "Bearer " + process.env.FRED_PROXY_TOKEN;
    if (p.etag && !force) headers["if-none-match"] = p.etag;
    if (p.modified && !force) headers["if-modified-since"] = p.modified;
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
    if (r.status === 304) {
      p.lastSuccess = at;
      p.status = "healthy";
      p.error = null;
      p.failures = 0;
      p.nextAttempt = new Date(now + interval * 1000).toISOString();
      return;
    }
    if (!r.ok) {
      p.nextAttempt = retryTime(
        now,
        interval,
        p.failures + 1,
        r.headers.get("retry-after"),
      );
      throw Error("HTTP " + r.status);
    }
    if (Number(r.headers.get("content-length") || 0) > 6_000_000)
      throw Error("Provider response exceeds 6 MB cap");
    const reader = r.body?.getReader();
    if (!reader) throw Error("Empty response");
    const parts: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 6_000_000) {
        await reader.cancel();
        throw Error("Provider response exceeds 6 MB cap");
      }
      parts.push(value);
    }
    const body = Buffer.concat(parts).toString("utf8");
    p.records = parse(body);
    p.bodyHash = createHash("sha256").update(body).digest("hex");
    p.etag = r.headers.get("etag") ?? undefined;
    p.modified = r.headers.get("last-modified") ?? undefined;
    p.lastSuccess = at;
    p.failures = 0;
    p.error = null;
    p.status = "healthy";
    p.nextAttempt = new Date(now + interval * 1000).toISOString();
  } catch (e) {
    p.status = "error";
    p.failures++;
    p.error = (e as Error).message;
    for (const secret of [
      process.env.FRED_API_KEY,
      process.env.SEC_USER_AGENT,
      process.env.FRED_PROXY_TOKEN,
    ])
      if (secret) p.error = p.error.replaceAll(secret, "[redacted]");
    p.nextAttempt =
      p.nextAttempt && Date.parse(p.nextAttempt) > now
        ? p.nextAttempt
        : retryTime(now, interval, p.failures);
  }
  console.log(id, p.status, p.records, p.error ?? "");
}
for (const feed of feedDefinitions) {
  if (!feed.enabled) {
    states.set(feed.id, {
      ...state(feed.id, feed.name, feed.url, feed.interval, feed.rights),
      status: "disabled",
      error:
        "Access returned HTTP 429 during verification; automatic use disabled.",
    });
    continue;
  }
  await get(
    feed.id,
    feed.name,
    feed.url,
    feed.interval,
    feed.rights,
    (text) => {
      const items = normalizeFeed(
        text,
        {
          id: feed.id,
          name: "publisher" in feed ? feed.publisher! : feed.name,
        },
        at,
        bundle.companies,
      );
      if (!items.length) throw Error("No valid feed metadata");
      bundle.articles = deduplicate([...items, ...bundle.articles]);
      return items.length;
    },
  );
}
await get(
  "bls-calendar",
  "BLS release calendar",
  "https://www.bls.gov/schedule/news_release/bls.ics",
  86400,
  "Official published BLS release dates. Dates only; no guessed times.",
  (text) => {
    const releases = normalizeCalendar(text, at);
    bundle.releases = [
      ...bundle.releases.filter((r) => !r.id.startsWith("bls-")),
      ...releases,
    ];
    return releases.length;
  },
);
// Official keyless BLS fallback: one daily request per series, no account required.
if (!process.env.FRED_API_KEY && !proxyReady)
  for (const [id, blsId] of [
    ["CPIAUCSL", "CUSR0000SA0"],
    ["UNRATE", "LNS14000000"],
    ["PAYEMS", "CES0000000001"],
  ]) {
    const series = bundle.economy.find((s) => s.id === id)!;
    const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${blsId}?startyear=${new Date(at).getUTCFullYear() - 2}&endyear=${new Date(at).getUTCFullYear()}`;
    await get(
      "bls-" + id,
      "BLS " + series.name,
      url,
      86400,
      "U.S. government public data API; unregistered access is bounded to 3 requests/day in this collector.",
      (text) => {
        series.observations = normalizeBLS(
          JSON.parse(text),
          blsId,
          series.observations,
        );
        if (!series.observations.length)
          throw Error("BLS returned no valid observations");
        series.status = "available";
        series.observedAt = at;
        series.updatedAt = null;
        series.source = "U.S. Bureau of Labor Statistics";
        series.sourceUrl = `https://data.bls.gov/timeseries/${blsId}`;
        series.notes =
          "Seasonally adjusted official BLS observations, keyless daily collection. Publication timestamp and complete vintage history are not provided by this endpoint. Source footnotes, including preliminary labels when supplied, are retained. Revisions are changes observed between collected snapshots.";
        return series.observations.length;
      },
    );
  }
const secAgent = process.env.SEC_USER_AGENT;
if (!secAgent || !/@/.test(secAgent)) {
  states.set("sec", {
    ...state(
      "sec",
      "SEC EDGAR",
      "https://data.sec.gov/",
      21600,
      "Public EDGAR APIs. Identifying User-Agent and fair access required.",
    ),
    status: "needs-configuration",
    error:
      "Set SEC_USER_AGENT to an identifying app name and real contact email; no invented contact is used.",
  });
} else {
  // Bounded curated universe; one request at a time, at most 2/sec (SEC ceiling: 10/sec).
  const selected = bundle.companies.filter((c) => c.cik).slice(0, 10);
  let successes = 0;
  for (const company of selected) {
    const cik = company.cik!.padStart(10, "0");
    await get(
      "sec-" + company.symbol,
      "SEC " + company.symbol,
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      21600,
      "SEC public submissions, original source documents.",
      (text) => {
        const i = bundle.companies.findIndex(
          (c) => c.symbol === company.symbol,
        );
        bundle.companies[i] = normalizeSubmissions(
          JSON.parse(text),
          bundle.companies[i],
          at,
        );
        successes++;
        return bundle.companies[i].filings?.length ?? 0;
      },
      { "User-Agent": secAgent },
    );
    await new Promise((r) => setTimeout(r, 550));
    await get(
      "sec-facts-" + company.symbol,
      "SEC facts " + company.symbol,
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      86400,
      "SEC XBRL facts with form, period, accession and filing date.",
      (text) => {
        const i = bundle.companies.findIndex(
          (c) => c.symbol === company.symbol,
        );
        bundle.companies[i].facts = normalizeFacts(
          JSON.parse(text),
          company.cik!,
          at,
        );
        return bundle.companies[i].facts!.length;
      },
      { "User-Agent": secAgent },
    );
    await new Promise((r) => setTimeout(r, 550));
  }
  states.set("sec", {
    ...state(
      "sec",
      "SEC EDGAR",
      "https://data.sec.gov/",
      21600,
      "SEC public APIs; bounded curated company universe.",
    ),
    status: [...states.values()]
      .filter((p) => p.id.startsWith("sec-"))
      .some((p) => p.status === "error")
      ? "error"
      : "healthy",
    lastAttempt: at,
    lastSuccess: successes ? at : (states.get("sec")?.lastSuccess ?? null),
    records: bundle.companies.reduce((s, c) => s + (c.filings?.length ?? 0), 0),
    error: null,
  });
}
if (!process.env.FRED_API_KEY && !proxyReady) {
  states.set("fred", {
    ...state(
      "fred",
      "FRED",
      "https://api.stlouisfed.org/fred/",
      21600,
      "FRED terms and series-specific rights. UMCSENT excluded pending permission.",
    ),
    status: "needs-configuration",
    error:
      "Owner FRED_API_KEY is not configured. No economic values have been invented.",
  });
} else {
  for (const series of bundle.economy.filter((s) => s.id !== "UMCSENT")) {
    const url = fredUrl;
    // State URLs never include API credentials.
    const publicUrl = "https://fred.stlouisfed.org/series/" + series.id;
    await get(
      "fred-" + series.id,
      "FRED " + series.name,
      url("series/observations", {
        series_id: series.id,
        sort_order: "desc",
        limit: "180",
      }),
      series.frequency === "Daily" ? 86400 : 21600,
      "Government-origin series via FRED; observation dates and units retained.",
      (text) => {
        series.observations = normalizeObservations(
          JSON.parse(text),
          series.observations,
        );
        series.observedAt = at;
        series.status = "available";
        series.sourceUrl = "https://fred.stlouisfed.org/series/" + series.id;
        return series.observations.length;
      },
    );
    const p = states.get("fred-" + series.id)!;
    p.url = publicUrl;
    if (p.error && process.env.FRED_API_KEY)
      p.error = p.error.replaceAll(process.env.FRED_API_KEY, "[redacted]");
    await get(
      "fred-meta-" + series.id,
      "FRED metadata " + series.id,
      url("series", { series_id: series.id }),
      604800,
      "Official series metadata and last publication update.",
      (text) => {
        const raw = JSON.parse(text).seriess?.[0];
        if (!raw || raw.id !== series.id)
          throw Error("Series metadata mismatch");
        series.unit = raw.units;
        series.frequency = raw.frequency;
        series.updatedAt = raw.last_updated ?? null;
        series.notes =
          "Latest available vintage. Revised value means changed since the preceding collected snapshot; preliminary/final status is not inferred.";
        return 1;
      },
    );
    states.get("fred-meta-" + series.id)!.url = publicUrl;
  }
  for (const releaseId of [
    ...new Set(
      bundle.economy.filter((s) => s.id !== "UMCSENT").map((s) => s.releaseId),
    ),
  ]) {
    const url = fredUrl("release/dates", { release_id: String(releaseId) });
    await get(
      "fred-release-" + releaseId,
      "FRED release " + releaseId,
      url,
      86400,
      "Confirmed FRED release dates; date-only timing.",
      (text) => {
        const rows = JSON.parse(text).release_dates;
        if (!Array.isArray(rows)) throw Error("Invalid release dates");
        const items: EconomicRelease[] = rows
          .filter(
            (r) =>
              /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date >= at.slice(0, 10),
          )
          .map((r) => ({
            id: releaseId + "-" + r.date,
            name: String(r.release_name),
            date: r.date,
            sourceUrl: `https://fred.stlouisfed.org/release?rid=${releaseId}`,
            observedAt: at,
            seriesIds: bundle.economy
              .filter((s) => s.releaseId === releaseId)
              .map((s) => s.id),
          }));
        bundle.releases = [
          ...bundle.releases.filter((r) => !r.id.startsWith(releaseId + "-")),
          ...items,
        ];
        return items.length;
      },
    );
    states.get("fred-release-" + releaseId)!.url =
      `https://fred.stlouisfed.org/release?rid=${releaseId}`;
  }
  const components = [...states.values()].filter((p) =>
    p.id.startsWith("fred-"),
  );
  states.set("fred", {
    ...state(
      "fred",
      "FRED",
      "https://api.stlouisfed.org/fred/",
      21600,
      "FRED terms and original series attribution. Third-party UMCSENT excluded.",
    ),
    status: components.some((p) => p.status === "error") ? "error" : "healthy",
    lastAttempt: at,
    lastSuccess: components.some((p) => p.lastSuccess === at)
      ? at
      : (states.get("fred")?.lastSuccess ?? null),
    records: bundle.economy.reduce((s, e) => s + e.observations.length, 0),
    error: components.some((p) => p.status === "error")
      ? "One or more series requests failed; prior observations retained."
      : null,
  });
}
bundle.articles = deduplicate(bundle.articles)
  .filter((a) => now - Date.parse(a.observedAt) < 14 * 86400000)
  .slice(0, 1200);
bundle.articles = bundle.articles.map((a) =>
  a.sourceId === "nasa" || a.sourceId.startsWith("pbs")
    ? {
        ...a,
        category: categorize(
          a.title,
          a.sourceId,
          new URL(a.url).pathname.split("/")[2] ?? "",
        ),
      }
    : a,
);
bundle.stories = clusterArticles(bundle.articles, now, previous.stories);
bundle.releases = bundle.releases
  .filter((r) => r.date >= at.slice(0, 10))
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 60);
bundle.providers = [...states.values()].map((p) => {
  if (
    p.status === "healthy" &&
    p.lastSuccess &&
    now - Date.parse(p.lastSuccess) > p.interval * 3000
  )
    return { ...p, status: "stale" as const };
  return p;
});
bundle.generatedAt = at;
bundle.counts = {
  articles: bundle.articles.length,
  stories: bundle.stories.length,
  companyMentions: Object.fromEntries(
    bundle.companies.map((c) => [
      c.symbol,
      bundle.articles.filter((a) => a.companies.includes(c.symbol)).length,
    ]),
  ),
};
let commands: string[] = [];
const upsert = (
  table: string,
  columns: string[],
  values: (string | number | null)[],
  conflict: string,
  update: string,
) =>
  commands.push(
    `INSERT INTO ${table}(${columns.join(",")}) VALUES(${values.map(sql).join(",")}) ON CONFLICT(${conflict}) DO UPDATE SET ${update};`,
  );
for (const f of feedDefinitions)
  upsert(
    "article_sources",
    ["id", "name", "url", "rights"],
    [f.id, f.name, f.url, f.rights],
    "id",
    "name=excluded.name,url=excluded.url,rights=excluded.rights WHERE rights<>excluded.rights OR url<>excluded.url",
  );
for (const c of bundle.companies) {
  if (
    JSON.stringify(c) ===
      JSON.stringify(previous.companies.find((x) => x.symbol === c.symbol)) &&
    db &&
    previous.generatedAt
  )
    continue;
  upsert(
    "companies",
    ["symbol", "name", "cik", "sector", "data", "updated_at"],
    [c.symbol, c.name, c.cik, c.sector, JSON.stringify(c), at],
    "symbol",
    "name=excluded.name,data=excluded.data,updated_at=excluded.updated_at WHERE data<>excluded.data",
  );
  upsert(
    "stock_symbols",
    ["symbol", "company_symbol", "exchange", "kind"],
    [c.symbol, c.symbol, c.exchange, c.kind ?? (c.cik ? "stock" : "etf")],
    "symbol",
    "exchange=excluded.exchange WHERE exchange<>excluded.exchange",
  );
  for (const f of c.filings ?? [])
    upsert(
      "sec_filings",
      ["id", "symbol", "form", "filed", "source_url", "data"],
      [f.id, c.symbol, f.form, f.filed, f.url, JSON.stringify(f)],
      "id",
      "data=excluded.data WHERE data<>excluded.data",
    );
}
for (const a of bundle.articles) {
  const old = previous.articles.find((x) => x.id === a.id);
  if (
    old &&
    JSON.stringify({ ...old, observedAt: a.observedAt }) ===
      JSON.stringify(a) &&
    db &&
    previous.generatedAt
  )
    continue;
  upsert(
    "articles",
    [
      "id",
      "url",
      "title",
      "source_id",
      "published_at",
      "observed_at",
      "category",
      "data",
    ],
    [
      a.id,
      a.url,
      a.title,
      a.sourceId,
      a.publishedAt,
      a.observedAt,
      a.category,
      JSON.stringify(a),
    ],
    "id",
    "title=excluded.title,observed_at=excluded.observed_at,data=excluded.data WHERE title<>excluded.title OR data<>excluded.data",
  );
  for (const symbol of a.companies)
    commands.push(
      `INSERT OR IGNORE INTO company_article_links VALUES(${sql(symbol)},${sql(a.id)},'Explicit company alias or $ticker in headline; ambiguous names guarded');`,
    );
}
for (const s of bundle.stories) {
  const delta = storyDelta(
    previous.stories.find((old) => old.id === s.id),
    s,
  );
  if (delta.changed)
    upsert(
      "story_clusters",
      ["id", "headline", "score", "updated_at", "data"],
      [s.id, s.headline, s.score, at, JSON.stringify(s)],
      "id",
      "headline=excluded.headline,score=excluded.score,updated_at=excluded.updated_at,data=excluded.data WHERE data<>excluded.data",
    );
  for (const id of delta.removed)
    commands.push(
      `DELETE FROM story_articles WHERE story_id=${sql(s.id)} AND article_id=${sql(id)};`,
    );
  for (const id of delta.added)
    commands.push(
      `INSERT OR IGNORE INTO story_articles VALUES(${sql(s.id)},${sql(id)});`,
    );
}
commands.push(
  `DELETE FROM story_clusters WHERE id IN (SELECT id FROM story_clusters WHERE id NOT IN (${bundle.stories.map((s) => sql(s.id)).join(",") || "''"}) LIMIT 1200);`,
);
for (const name of categories.slice(1))
  commands.push(
    `INSERT OR IGNORE INTO topics VALUES(${sql(name.toLowerCase().replaceAll(" ", "-"))},${sql(name)});`,
  );
for (const e of bundle.economy) {
  upsert(
    "economic_series",
    ["id", "name", "unit", "frequency", "source_url", "data"],
    [e.id, e.name, e.unit, e.frequency, e.sourceUrl, JSON.stringify(e)],
    "id",
    "data=excluded.data WHERE data<>excluded.data",
  );
  for (const o of e.observations) {
    const old = previous.economy
      .find((s) => s.id === e.id)
      ?.observations.find((x) => x.date === o.date);
    if (old?.value === o.value && previous.generatedAt && db) continue;
    upsert(
      "economic_observations",
      [
        "series_id",
        "date",
        "value",
        "realtime_start",
        "realtime_end",
        "observed_at",
        "revised",
      ],
      [
        e.id,
        o.date,
        o.value,
        o.realtimeStart,
        o.realtimeEnd,
        e.observedAt,
        Number(o.changed),
      ],
      "series_id,date",
      "value=excluded.value,realtime_start=excluded.realtime_start,observed_at=excluded.observed_at,revised=excluded.revised WHERE value<>excluded.value",
    );
  }
}
for (const r of bundle.releases)
  upsert(
    "economic_releases",
    ["id", "date", "name", "source_url", "data"],
    [r.id, r.date, r.name, r.sourceUrl, JSON.stringify(r)],
    "id",
    "data=excluded.data WHERE data<>excluded.data",
  );
for (const p of bundle.providers) {
  upsert(
    "provider_syncs",
    ["id", "status", "last_success", "last_attempt", "next_attempt", "data"],
    [
      p.id,
      p.status,
      p.lastSuccess,
      p.lastAttempt,
      p.nextAttempt,
      JSON.stringify(p),
    ],
    "id",
    "status=excluded.status,last_success=excluded.last_success,last_attempt=excluded.last_attempt,next_attempt=excluded.next_attempt,data=excluded.data WHERE data<>excluded.data",
  );
  if (["error", "stale"].includes(p.status) && p.lastAttempt === at)
    commands.push(
      `INSERT OR IGNORE INTO data_quality_events VALUES(${sql(p.id + "-" + at)},${sql(p.id)},'warning',${sql(at)},${sql(p.error ?? "Source is stale")});`,
    );
}
const previousWrites =
  previous.usage.day === at.slice(0, 10)
    ? previous.usage.estimatedRowsWritten
    : 0;
// Includes indexed-write and cache/checkpoint allowance, a conservative estimate (not billing analytics).
bundle.usage = {
  day: at.slice(0, 10),
  estimatedRowsWritten: db ? previousWrites + commands.length * 3 + 200 : 0,
  lastStatements: commands.length,
  note: db
    ? "Conservative estimated indexed row writes, not account analytics. Collector stops at 80,000/day. Check Cloudflare for actual usage."
    : "Static snapshot mode: no D1 writes. Collection and publishing run in GitHub Actions.",
};
if (bundle.usage.estimatedRowsWritten > 80000 && db && !local)
  throw Error(
    "Conservative daily write budget exceeded; serving last successful snapshot",
  );
const put = (key: string, data: unknown) => {
  const serialized = JSON.stringify(data);
  for (let i = 0; i < serialized.length; i += 25000)
    upsert(
      "pulse_cache",
      ["key", "data", "updated_at"],
      [
        key + ":" + runVersion + ":" + String(i / 25000).padStart(4, "0"),
        serialized.slice(i, i + 25000),
        at,
      ],
      "key",
      "data=excluded.data,updated_at=excluded.updated_at WHERE data<>excluded.data",
    );
};
put("dashboard", {
  ...bundle,
  articles: bundle.articles.slice(0, 80),
  stories: bundle.stories.slice(0, 50),
});
put("companies", bundle.companies);
put("economy", { economy: bundle.economy, releases: bundle.releases });
put("diagnostics", {
  generatedAt: at,
  providers: bundle.providers,
  usage: bundle.usage,
});
put("news", { articles: bundle.articles, stories: bundle.stories });
const checkpoint = JSON.stringify(bundle);
for (let i = 0; i < checkpoint.length; i += 25000)
  upsert(
    "pulse_cache",
    ["key", "data", "updated_at"],
    [
      "collector:" + runVersion + ":" + String(i / 25000).padStart(4, "0"),
      checkpoint.slice(i, i + 25000),
      at,
    ],
    "key",
    "data=excluded.data,updated_at=excluded.updated_at WHERE data<>excluded.data",
  );
commands.push(
  `INSERT INTO pulse_cache(key,data,updated_at) VALUES('active',${sql(runVersion)},${sql(at)}) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at;`,
);
commands.push(
  "DELETE FROM pulse_cache WHERE key<>'active' AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 hours');",
);
commands.push(
  "DELETE FROM articles WHERE id IN (SELECT id FROM articles WHERE observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days') LIMIT 200);",
  "DELETE FROM story_clusters WHERE id NOT IN (SELECT story_id FROM story_articles) AND id IN (SELECT id FROM story_clusters ORDER BY updated_at LIMIT 200);",
  "DELETE FROM data_quality_events WHERE id IN (SELECT id FROM data_quality_events WHERE observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days') LIMIT 100);",
  "DELETE FROM economic_releases WHERE date < date('now','-7 days');",
);
for (const e of bundle.economy)
  if (e.observations.length)
    commands.push(
      `DELETE FROM economic_observations WHERE series_id=${sql(e.id)} AND date<${sql(e.observations[0].date)};`,
    );
commands.push(
  "DELETE FROM sec_filings WHERE id IN (SELECT id FROM sec_filings WHERE filed < date('now','-2 years') LIMIT 100);",
);
await mkdir("public/pulse", { recursive: true });
await mkdir("work/pulse", { recursive: true });
// Recovery snapshots are committed only after a successful DB write when DB mode is enabled.
await writeFile(
  "work/pulse/ingestion.sql",
  "PRAGMA foreign_keys=ON;\n" + commands.join("\n"),
);
if (db) {
  let part = 0,
    chunk = "";
  const flush = () => {
    if (!chunk) return;
    const path = `work/pulse/batch-${part++}.sql`;
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "election-atlas",
        target,
        "--file",
        path,
        "--json",
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    chunk = "";
  };
  for (const command of commands) {
    if (Buffer.byteLength(command) > 90000)
      throw Error("SQL statement exceeds bounded size");
    if (Buffer.byteLength(chunk) + Buffer.byteLength(command) > 85000) {
      await writeFile(`work/pulse/batch-${part}.sql`, chunk);
      flush();
    }
    chunk += command + "\n";
  }
  if (chunk) {
    await writeFile(`work/pulse/batch-${part}.sql`, chunk);
    flush();
  }
}
await writeFile("public/pulse/latest.json", JSON.stringify(bundle));
await writeFile(
  "work/pulse/last-run.json",
  JSON.stringify(
    {
      at,
      requests,
      articles: bundle.articles.length,
      stories: bundle.stories.length,
      statements: commands.length,
      usage: bundle.usage,
      providers: bundle.providers,
    },
    null,
    2,
  ),
);
console.log(
  "Signal Pulse synchronized:",
  bundle.articles.length,
  "articles,",
  bundle.stories.length,
  "stories,",
  requests,
  "requests,",
  commands.length,
  "statements",
);
