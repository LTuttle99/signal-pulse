import { describe, it, expect, vi } from "vitest";
import {
  normalizeFeed,
  normalizeCalendar,
  normalizeBLS,
  companySeeds,
  matchCompanies,
  canonicalUrl,
  categorize,
  clusterArticles,
  storyDelta,
  deduplicate,
  normalizeSubmissions,
  normalizeFacts,
  normalizeObservations,
  parsePreferences,
  defaultPreferences,
  type NewsArticle,
} from "../shared/pulse";
import { retryTime, sourceAlerts } from "../shared/source-policy";
import { api, maintenance, fredRelay } from "../worker/index";
const at = "2026-11-05T16:00:00Z";
const source = { id: "npr", name: "NPR" };
const item = (
  title: string,
  url: string,
  pub = "Thu, 05 Nov 2026 15:00:00 GMT",
) =>
  `<item><title>${title}</title><link>${url}</link><pubDate>${pub}</pubDate><description>Copyrighted full content must never be stored</description></item>`;
const feed = (items: string) => `<rss><channel>${items}</channel></rss>`;
function article(
  title: string,
  publisher = "NPR",
  url = "https://example.org/" + encodeURIComponent(title),
): NewsArticle {
  return {
    ...normalizeFeed(
      feed(item(title, url)),
      { id: publisher.toLowerCase(), name: publisher },
      at,
    )[0],
  };
}
describe("Feed validation and safe attribution", () => {
  it("keeps headline provenance, publication time and observation time but no copyrighted body", () => {
    const [a] = normalizeFeed(
      feed(
        item(
          "Federal Reserve announces policy decision",
          "https://example.org/news",
        ),
      ),
      source,
      at,
    );
    expect(a).toMatchObject({
      publisher: "NPR",
      sourceId: "npr",
      publishedAt: "2026-11-05T15:00:00.000Z",
      observedAt: at,
      category: "Economy",
    });
    expect(a).not.toHaveProperty("description");
    expect(a).not.toHaveProperty("body");
  });
  it("deduplicates tracking links and retains the original publisher URL", () => {
    const items =
      item("Headline", "https://example.org/a?utm_source=x") +
      item("Headline", "https://example.org/a");
    expect(normalizeFeed(feed(items), source, at)).toHaveLength(1);
    expect(canonicalUrl("https://example.org/a?q=1&utm_campaign=x#here")).toBe(
      "https://example.org/a?q=1",
    );
  });
  it("rejects malformed feeds and HTML responses", () => {
    expect(() => normalizeFeed("<html>failure</html>", source, at)).toThrow();
    expect(() => normalizeFeed("<rss><channel>", source, at)).toThrow();
  });
  it("isolates unsafe article links", () => {
    expect(
      normalizeFeed(
        feed(
          item("Unsafe", "javascript:alert(1)") +
            item("Safe", "https://example.org/"),
        ),
        source,
        at,
      ),
    ).toHaveLength(1);
  });
  it("does not fabricate publication dates for missing or future dates", () => {
    expect(
      normalizeFeed(
        feed(item("Unknown", "https://example.org/a", "nonsense")),
        source,
        at,
      )[0].publishedAt,
    ).toBeNull();
    expect(
      normalizeFeed(
        feed(
          item(
            "Future",
            "https://example.org/a",
            "Thu, 05 Nov 2037 15:00:00 GMT",
          ),
        ),
        source,
        at,
      )[0].publishedAt,
    ).toBeNull();
  });
  it("supports Atom alternate links", () => {
    const [a] = normalizeFeed(
      '<feed><entry><title>NASA launches spacecraft</title><link rel="alternate" href="https://example.org/a"/><updated>2026-11-05T12:00:00Z</updated></entry></feed>',
      { id: "nasa", name: "NASA" },
      at,
    );
    expect(a.category).toBe("Science & Space");
    expect(a.url).toBe("https://example.org/a");
  });
  it("categories rely on observable headline signals", () => {
    expect(categorize("NVIDIA unveils AI chip")).toBe("Technology & AI");
    expect(categorize("Congress debates funding")).toBe(
      "Politics & Government",
    );
    expect(categorize("Hurricane reaches coast")).toBe("National Events");
  });
});
it("keeps NASA space categories distinct from international news", () => {
  expect(
    categorize("Midwestern City Lights", "nasa", "International Space Station"),
  ).toBe("Science & Space");
  expect(categorize("Court verdict in London", "pbs", "world")).toBe(
    "World & U.S.",
  );
  expect(categorize("New research findings", "pbs", "science")).toBe(
    "Science & Space",
  );
});
describe("Conservative relationships and clustering", () => {
  it("guards ambiguous company words and bare ticker words", () => {
    expect(matchCompanies("Apple harvest season begins", companySeeds)).toEqual(
      [],
    );
    expect(matchCompanies("We met at the park", companySeeds)).toEqual([]);
    expect(
      matchCompanies("Apple shares rise after iPhone launch", companySeeds),
    ).toContain("AAPL");
    expect(
      matchCompanies("Investors discuss $META earnings", companySeeds),
    ).toContain("META");
  });
  it("matches explicit names with word boundaries", () => {
    expect(
      matchCompanies("NVIDIA and Microsoft announce partnership", companySeeds),
    ).toEqual(["MSFT", "NVDA"]);
    expect(matchCompanies("Microsoftware grows", companySeeds)).toEqual([]);
  });
  it("groups close event headlines but separates unrelated events", () => {
    const a = article(
      "Congress passes federal funding bill after lengthy debate",
    );
    const b = article(
      "Congress passes federal funding bill after late debate",
      "PBS",
    );
    const c = article(
      "Congress investigates federal agency spending claims",
      "PBS",
    );
    const s = clusterArticles([a, b, c], Date.parse(at));
    expect(s).toHaveLength(2);
    expect(s.find((x) => x.articleIds.length === 2)?.publishers).toHaveLength(
      2,
    );
  });
  it("never labels a single publisher nationally trending or developing", () => {
    const s = clusterArticles(
      [article("Major national event announced")],
      Date.parse(at),
    )[0];
    expect(s.developing).toBe(false);
    expect(s.scoreParts.breadth).toBe(0);
  });
  it("time windows prevent false joins and future time does not amplify recency", () => {
    const a = article(
      "Congress passes federal funding bill after lengthy debate",
    );
    const b = {
      ...article(a.title, "PBS"),
      publishedAt: "2026-10-01T00:00:00Z",
    };
    expect(clusterArticles([a, b], Date.parse(at))).toHaveLength(2);
  });
  it("preserves story URLs when new coverage joins an existing story", () => {
    const a = article(
      "Congress passes federal funding bill after lengthy debate",
    );
    const old = clusterArticles([a], Date.parse(at));
    const b = article(
      "Congress passes federal funding bill after late debate",
      "PBS",
    );
    expect(clusterArticles([b, a], Date.parse(at), old)[0].id).toBe(old[0].id);
  });
  it("retains distinct publisher attribution when headlines are identical", () => {
    const a = article(
      "Congress passes funding bill",
      "NPR",
      "https://npr.org/a",
    );
    const b = article(a.title, "PBS", "https://pbs.org/a");
    expect(deduplicate([a, b])).toHaveLength(2);
  });
});
describe("SEC validation and economic provenance", () => {
  const raw = {
    cik: 320193,
    name: "Apple Inc.",
    sicDescription: "Electronic Computers",
    filings: {
      recent: {
        accessionNumber: ["0000320193-26-000001", "0000320193-26-000002"],
        filingDate: ["2026-10-30", "2026-10-31"],
        reportDate: ["2026-09-30", "2026-09-30"],
        form: ["10-K", "4"],
        primaryDocument: ["aapl-20260930.htm", "form4.xml"],
      },
    },
  };
  it("builds original filing links for supported forms only", () => {
    const c = normalizeSubmissions(raw, companySeeds[0], at);
    expect(c.filings).toHaveLength(1);
    expect(c.filings?.[0].url).toBe(
      "https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/aapl-20260930.htm",
    );
    expect(c.verifiedAt).toBe(at);
  });
  it("rejects incorrect CIK and document traversal", () => {
    expect(() =>
      normalizeSubmissions({ ...raw, cik: 42 }, companySeeds[0], at),
    ).toThrow();
    const bad = structuredClone(raw);
    bad.filings.recent.primaryDocument[0] = "../bad.htm";
    expect(normalizeSubmissions(bad, companySeeds[0], at).filings).toHaveLength(
      0,
    );
  });
  it("retains XBRL period, filing date, unit, form and accession", () => {
    const facts = normalizeFacts(
      {
        cik: 320193,
        facts: {
          "us-gaap": {
            NetIncomeLoss: {
              units: {
                USD: [
                  {
                    val: 100,
                    end: "2026-09-30",
                    start: "2025-10-01",
                    filed: "2026-10-30",
                    form: "10-K",
                    accn: "0000320193-26-000001",
                  },
                ],
              },
            },
          },
        },
      },
      "320193",
      at,
    );
    expect(facts[0]).toMatchObject({
      value: 100,
      unit: "USD",
      start: "2025-10-01",
      end: "2026-09-30",
      filed: "2026-10-30",
      form: "10-K",
    });
  });
  it("skips unavailable FRED values and flags only observed changes", () => {
    const rows = normalizeObservations(
      {
        observations: [
          { date: "2026-09-01", value: "." },
          {
            date: "2026-10-01",
            value: "4.2",
            realtime_start: "2026-11-01",
            realtime_end: "2026-11-05",
          },
        ],
      },
      [
        {
          date: "2026-10-01",
          value: 4.1,
          realtimeStart: null,
          realtimeEnd: null,
          changed: false,
        },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      value: 4.2,
      changed: true,
      realtimeStart: "2026-11-01",
    });
  });
  it("imports only upcoming noncancelled official calendar dates", () => {
    const ics =
      "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nDTSTART;TZID=US-Eastern:20261106T083000\nSUMMARY:Employment Situation\nEND:VEVENT\nBEGIN:VEVENT\nUID:b\nDTSTART:20261001T120000Z\nSUMMARY:Past event\nEND:VEVENT\nBEGIN:VEVENT\nUID:c\nDTSTART:20261107T120000Z\nSTATUS:CANCELLED\nSUMMARY:Cancelled event\nEND:VEVENT\nEND:VCALENDAR";
    const rows = normalizeCalendar(ics, at);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-11-06",
      name: "Employment Situation",
      seriesIds: ["UNRATE", "PAYEMS"],
    });
    expect(() => normalizeCalendar("broken", at)).toThrow();
  });
  it("validates exact BLS series and omits annual-average pseudo-months", () => {
    const raw = {
      status: "REQUEST_SUCCEEDED",
      Results: {
        series: [
          {
            seriesID: "LNS14000000",
            data: [
              {
                year: "2026",
                period: "M09",
                value: "4.2",
                footnotes: [{ code: "P", text: "Preliminary" }],
              },
              { year: "2026", period: "M13", value: "4.3" },
            ],
          },
        ],
      },
    };
    expect(normalizeBLS(raw, "LNS14000000")).toHaveLength(1);
    expect(normalizeBLS(raw, "LNS14000000")[0].statusNotes).toEqual([
      "Preliminary",
    ]);
    expect(() => normalizeBLS(raw, "OTHER")).toThrow();
    expect(() =>
      normalizeBLS({ ...raw, status: "REQUEST_FAILED" }, "LNS14000000"),
    ).toThrow();
  });
  it("rejects invalid economic schemas and does not treat empty values as zero", () => {
    expect(() =>
      normalizeObservations({ observations: [{ date: "wrong", value: "3" }] }),
    ).toThrow();
    expect(
      normalizeObservations({
        observations: [{ date: "2026-10-01", value: "" }],
      }),
    ).toEqual([]);
  });
});
describe("Preferences and source recovery", () => {
  it("validates import and preserves custom notes and ordering", () => {
    const p = {
      ...defaultPreferences,
      watchlist: [
        { id: "NVDA", kind: "stock", label: "NVIDIA", note: "Research thesis" },
      ],
    };
    expect(parsePreferences(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(() => parsePreferences({ version: 0, secret: "bad" })).toThrow();
  });
  it("honors Retry-After and alerts on missing observations", () => {
    expect(
      Date.parse(retryTime(Date.parse(at), 60, 1, "3600")) - Date.parse(at),
    ).toBe(3600000);
    expect(
      sourceAlerts(
        [{ id: "pbs", lastSuccess: null, status: "error", interval: 1800 }],
        Date.parse(at),
      ),
    ).toHaveLength(1);
  });
});
describe("Worker cache-only APIs and bounded maintenance", () => {
  function env(rows: { data: string }[] = []) {
    return {
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn(async () => ({ results: rows })),
        })),
        batch: vi.fn(async () => []),
      },
      ASSETS: { fetch: vi.fn() },
    } as never;
  }
  it("rejects mutation endpoints for private preferences", async () =>
    expect(
      (
        await api(
          new Request("https://test/api/pulse/dashboard", { method: "POST" }),
          env(),
        )
      ).status,
    ).toBe(405));
  it("returns honest missing-cache status and rejects unknown endpoints", async () => {
    expect(
      (await api(new Request("https://test/api/pulse/dashboard"), env()))
        .status,
    ).toBe(503);
    expect(
      (await api(new Request("https://test/api/private/preferences"), env()))
        .status,
    ).toBe(404);
  });
  it("serves precomputed chunked JSON without per-visitor upstream calls", async () => {
    const r = await api(
      new Request("https://test/api/pulse/dashboard"),
      env([{ data: '{"version":' }, { data: "1}" }]),
    );
    expect(await r.json()).toEqual({ version: 1 });
    expect(r.headers.get("cache-control")).toContain("s-maxage=300");
  });
  it("performs bounded cron cleanup and retains legacy tables", async () => {
    const e = env() as any;
    await maintenance(e, at);
    expect(e.DB.batch).toHaveBeenCalledOnce();
    expect(e.DB.batch.mock.calls[0][0]).toHaveLength(3);
    expect(
      e.DB.prepare.mock.calls.every((c: any) => !c[0].includes("DROP TABLE")),
    ).toBe(true);
  });
});

describe("Private FRED relay", () => {
  const env = {
    FRED_API_KEY: "fixture-key",
    INGEST_TOKEN: "fixture-owner-token",
  } as any;
  const request = (query: string, authorized = true) =>
    new Request("https://pulse.test/api/internal/fred?" + query, {
      headers: authorized
        ? { authorization: "Bearer fixture-owner-token" }
        : {},
    });
  it("refuses missing configuration and unauthenticated visitors", async () => {
    expect(
      (await fredRelay(request("route=series&series_id=UNRATE"), {} as any))
        .status,
    ).toBe(503);
    expect(
      (await fredRelay(request("route=series&series_id=UNRATE", false), env))
        .status,
    ).toBe(401);
  });
  it("rejects arbitrary URLs, unsupported routes and restricted series", async () => {
    expect(
      (await fredRelay(request("route=https://example.org"), env)).status,
    ).toBe(400);
    expect(
      (await fredRelay(request("route=series&series_id=UMCSENT"), env)).status,
    ).toBe(400);
  });
  it("adds the secret server-side only and does not publicly cache relay responses", async () => {
    const fetcher = vi.fn(
      async (_input: unknown, _options?: unknown) =>
        new Response('{"observations":[]}'),
    );
    vi.stubGlobal("fetch", fetcher);
    try {
      const r = await fredRelay(
        request("route=series/observations&series_id=UNRATE"),
        env,
      );
      expect(r.status).toBe(200);
      expect(r.headers.get("cache-control")).toBe("no-store");
      const url = fetcher.mock.calls[0]?.[0] as unknown as URL;
      expect(url.hostname).toBe("api.stlouisfed.org");
      expect(url.searchParams.get("api_key")).toBe("fixture-key");
      expect(await r.text()).not.toContain("fixture-key");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("does not forward upstream secret-bearing error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad fixture-key", { status: 400 })),
    );
    try {
      const r = await fredRelay(request("route=series&series_id=UNRATE"), env);
      expect(r.status).toBe(502);
      expect(await r.text()).not.toContain("fixture-key");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

it("does not rewrite unchanged story memberships during scheduled refresh", () => {
  const [story] = clusterArticles(
    [article("Congress passes funding bill")],
    Date.parse(at),
  );
  expect(storyDelta(story, structuredClone(story))).toEqual({
    changed: false,
    added: [],
    removed: [],
  });
  expect(storyDelta(story, { ...story, score: story.score + 1 })).toEqual({
    changed: true,
    added: [],
    removed: [],
  });
});
it("handles newly clustered and removed story relationships explicitly", () => {
  const [story] = clusterArticles(
    [article("Congress passes funding bill")],
    Date.parse(at),
  );
  expect(storyDelta(undefined, story).added).toEqual(story.articleIds);
  expect(storyDelta(story, { ...story, articleIds: ["new-report"] })).toEqual({
    changed: true,
    added: ["new-report"],
    removed: story.articleIds,
  });
});
