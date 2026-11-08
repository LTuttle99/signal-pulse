import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
export const categories = [
  "All signals",
  "Politics & Government",
  "Business & Finance",
  "Technology & AI",
  "Science & Space",
  "National Events",
  "Economy",
  "World & U.S.",
] as const;
export type Category = (typeof categories)[number];
export interface Company {
  symbol: string;
  name: string;
  exchange: string;
  cik: string | null;
  aliases: string[];
  sector: string;
  description: string;
  sourceUrl: string;
  verifiedAt?: string;
  filings?: Filing[];
  facts?: Fact[];
}
export interface Filing {
  id: string;
  form: string;
  filed: string;
  reportDate: string | null;
  url: string;
  document: string;
}
export interface Fact {
  label: string;
  value: number;
  unit: string;
  end: string;
  filed: string;
  form: string;
  accession: string;
  start?: string;
}
export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceId: string;
  publishedAt: string | null;
  observedAt: string;
  category: Category;
  companies: string[];
  topics: string[];
  prominence: number;
}
export interface Story {
  id: string;
  headline: string;
  articleIds: string[];
  publishers: string[];
  category: Category;
  companies: string[];
  firstPublished: string | null;
  lastPublished: string | null;
  score: number;
  scoreParts: {
    recency: number;
    breadth: number;
    prominence: number;
    relevance: number;
    updates: number;
  };
  developing: boolean;
}
export interface Observation {
  statusNotes?: string[];
  date: string;
  value: number;
  realtimeStart: string | null;
  realtimeEnd: string | null;
  changed: boolean;
}
export interface EconomicSeries {
  id: string;
  name: string;
  unit: string;
  frequency: string;
  source: string;
  sourceUrl: string;
  releaseId: number;
  status: string;
  observations: Observation[];
  observedAt: string | null;
  updatedAt: string | null;
  notes: string;
}
export interface EconomicRelease {
  id: string;
  name: string;
  date: string;
  sourceUrl: string;
  observedAt: string;
  seriesIds: string[];
}
export interface ProviderState {
  id: string;
  name: string;
  url: string;
  status:
    | "healthy"
    | "error"
    | "stale"
    | "disabled"
    | "needs-configuration"
    | "unverified";
  lastAttempt: string | null;
  lastSuccess: string | null;
  nextAttempt: string | null;
  records: number;
  failures: number;
  error: string | null;
  interval: number;
  etag?: string;
  modified?: string;
  bodyHash?: string;
  rights: string;
}
export interface PulseBundle {
  version: 1;
  generatedAt: string | null;
  articles: NewsArticle[];
  stories: Story[];
  companies: Company[];
  economy: EconomicSeries[];
  releases: EconomicRelease[];
  providers: ProviderState[];
  counts?: {
    articles: number;
    stories: number;
    companyMentions: Record<string, number>;
  };
  usage: {
    day: string;
    estimatedRowsWritten: number;
    lastStatements: number;
    note: string;
  };
}
export const companySeeds: Company[] = [
  [
    "AAPL",
    "Apple",
    "NASDAQ",
    "320193",
    ["Apple Inc.", "Apple", "iPhone"],
    "Technology",
    "Designs consumer electronics, software, and services.",
  ],
  [
    "MSFT",
    "Microsoft",
    "NASDAQ",
    "789019",
    ["Microsoft", "OpenAI partnership"],
    "Technology",
    "Develops software, cloud infrastructure, and business services.",
  ],
  [
    "NVDA",
    "NVIDIA",
    "NASDAQ",
    "1045810",
    ["Nvidia"],
    "Semiconductors",
    "Designs graphics processors and accelerated computing systems.",
  ],
  [
    "GOOGL",
    "Alphabet",
    "NASDAQ",
    "1652044",
    ["Alphabet", "Google"],
    "Technology",
    "Operates Google Search, YouTube, and cloud services.",
  ],
  [
    "AMZN",
    "Amazon",
    "NASDAQ",
    "1018724",
    ["Amazon", "Amazon Web Services"],
    "Consumer & Cloud",
    "Operates e-commerce, logistics, and cloud services.",
  ],
  [
    "META",
    "Meta Platforms",
    "NASDAQ",
    "1326801",
    ["Meta Platforms", "Facebook", "Instagram"],
    "Technology",
    "Operates social platforms and develops AI and computing technologies.",
  ],
  [
    "TSLA",
    "Tesla",
    "NASDAQ",
    "1318605",
    ["Tesla"],
    "Automotive",
    "Manufactures electric vehicles and energy systems.",
  ],
  [
    "JPM",
    "JPMorgan Chase",
    "NYSE",
    "19617",
    ["JPMorgan", "JPMorgan Chase"],
    "Financials",
    "Provides banking, investment, and financial services.",
  ],
  [
    "WMT",
    "Walmart",
    "NASDAQ",
    "104169",
    ["Walmart"],
    "Consumer Staples",
    "Operates retail stores and e-commerce services.",
  ],
  [
    "XOM",
    "Exxon Mobil",
    "NYSE",
    "34088",
    ["Exxon Mobil", "ExxonMobil"],
    "Energy",
    "Produces energy and petrochemical products.",
  ],
  [
    "SPY",
    "SPDR S&P 500 ETF Trust",
    "AMEX",
    null,
    ["SPDR S&P 500"],
    "ETF",
    "Exchange-traded fund tracking the S&P 500.",
  ],
  [
    "QQQ",
    "Invesco QQQ Trust",
    "NASDAQ",
    null,
    ["Invesco QQQ"],
    "ETF",
    "Exchange-traded fund tracking the Nasdaq-100.",
  ],
].map(([symbol, name, exchange, cik, aliases, sector, description]) => ({
  symbol: symbol as string,
  name: name as string,
  exchange: exchange as string,
  cik: cik as string | null,
  aliases: aliases as string[],
  sector: sector as string,
  description: description as string,
  sourceUrl: cik
    ? `https://www.sec.gov/edgar/browse/?CIK=${cik}&owner=exclude`
    : "https://www.tradingview.com/markets/etfs/",
}));
export const seriesSeeds: EconomicSeries[] = [
  [
    "CPIAUCSL",
    "Consumer price index",
    "Index 1982–1984=100",
    "Monthly",
    "U.S. Bureau of Labor Statistics",
    10,
  ],
  [
    "UNRATE",
    "Unemployment rate",
    "Percent",
    "Monthly",
    "U.S. Bureau of Labor Statistics",
    50,
  ],
  [
    "A191RL1Q225SBEA",
    "Real GDP growth",
    "Percent change, annual rate",
    "Quarterly",
    "U.S. Bureau of Economic Analysis",
    53,
  ],
  [
    "FEDFUNDS",
    "Federal funds rate",
    "Percent",
    "Monthly",
    "Board of Governors of the Federal Reserve System",
    18,
  ],
  [
    "DGS10",
    "10-year Treasury yield",
    "Percent",
    "Daily",
    "Board of Governors of the Federal Reserve System",
    18,
  ],
  [
    "PAYEMS",
    "Nonfarm payroll employment",
    "Thousands of persons",
    "Monthly",
    "U.S. Bureau of Labor Statistics",
    50,
  ],
  [
    "RSAFS",
    "Retail sales",
    "Millions of dollars",
    "Monthly",
    "U.S. Census Bureau",
    9,
  ],
  [
    "INDPRO",
    "Industrial production",
    "Index 2017=100",
    "Monthly",
    "Board of Governors of the Federal Reserve System",
    13,
  ],
  [
    "UMCSENT",
    "Consumer sentiment",
    "Index 1966 Q1=100",
    "Monthly",
    "University of Michigan",
    91,
  ],
].map(([id, name, unit, frequency, source, releaseId]) => ({
  id: id as string,
  name: name as string,
  unit: unit as string,
  frequency: frequency as string,
  source: source as string,
  sourceUrl: `https://fred.stlouisfed.org/series/${id}`,
  releaseId: releaseId as number,
  status: id === "UMCSENT" ? "rights-review-required" : "needs-configuration",
  observations: [],
  observedAt: null,
  updatedAt: null,
  notes:
    id === "UMCSENT"
      ? "Third-party copyrighted series; excluded until display permission is verified."
      : "FRED API key required. Original frequency and observation dates are retained.",
}));
export const feedDefinitions = [
  {
    id: "pbs",
    name: "PBS NewsHour",
    url: "https://www.pbs.org/newshour/feeds/rss/headlines",
    interval: 1800,
    rights:
      "Headline and original link only; personal noncommercial use. No article text or images. Public commercial reuse requires publisher permission.",
    enabled: true,
  },
  {
    id: "npr",
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    interval: 1800,
    rights:
      "RSS metadata only; personal noncommercial use, attribution and direct original links. Commercial redistribution excluded.",
    enabled: true,
  },
  {
    id: "pbs-economy",
    name: "PBS NewsHour economy",
    publisher: "PBS NewsHour",
    url: "https://www.pbs.org/newshour/feeds/rss/economy",
    interval: 1800,
    rights:
      "Headline and original link only; personal noncommercial RSS display; no text or images.",
    enabled: true,
  },
  {
    id: "npr-business",
    name: "NPR business",
    publisher: "NPR",
    url: "https://feeds.npr.org/1006/rss.xml",
    interval: 1800,
    rights:
      "RSS headline metadata only; attributed personal noncommercial display.",
    enabled: true,
  },
  {
    id: "npr-technology",
    name: "NPR technology",
    publisher: "NPR",
    url: "https://feeds.npr.org/1019/rss.xml",
    interval: 1800,
    rights:
      "RSS headline metadata only; attributed personal noncommercial display.",
    enabled: true,
  },
  {
    id: "fed",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    interval: 3600,
    rights:
      "U.S. government release metadata with direct attribution. Does not imply endorsement.",
    enabled: true,
  },
  {
    id: "nasa",
    name: "NASA",
    url: "https://www.nasa.gov/news-release/feed/",
    interval: 3600,
    rights:
      "U.S. government release metadata only. No third-party images or logos copied.",
    enabled: true,
  },
  {
    id: "gdelt",
    name: "GDELT DOC 2.0",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcecountry:US%20sourcelang:english&mode=artlist&format=json&maxrecords=100&timespan=1d",
    interval: 3600,
    rights:
      "Discovery metadata only; publisher copyright remains. Disabled until production access and source coverage are verified.",
    enabled: false,
  },
];
export const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function safeUrl(value: string) {
  const u = new URL(value);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw Error("Unsafe URL");
  return u.toString();
}
export function canonicalUrl(value: string) {
  const u = new URL(safeUrl(value));
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}
export function stableId(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++)
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  let g = 5381;
  for (let i = 0; i < value.length; i++)
    g = Math.imul(g, 33) ^ value.charCodeAt(i);
  return (h >>> 0).toString(36) + (g >>> 0).toString(36);
}
export function categorize(
  title: string,
  sourceId = "",
  sourceCategory = "",
): Category {
  const t = title.toLowerCase();
  if (sourceId === "nasa") return "Science & Space";
  if (/^(science|space)$/i.test(sourceCategory.trim()))
    return "Science & Space";
  if (/^politics$/i.test(sourceCategory.trim())) return "Politics & Government";
  if (/world|international/i.test(sourceCategory)) return "World & U.S.";
  if (sourceId.includes("technology")) return "Technology & AI";
  if (sourceId.includes("business")) return "Business & Finance";
  if (sourceId.includes("economy") || /economy|economic/i.test(sourceCategory))
    return "Economy";
  if (
    sourceId === "nasa" ||
    /\b(nasa|spacecraft|astronaut|lunar|science|artemis|telescope)\b/.test(t)
  )
    return "Science & Space";
  if (
    sourceId === "fed" ||
    /\b(inflation|unemployment|federal reserve|interest rate|payroll|gdp|economy|economic)\b/.test(
      t,
    )
  )
    return "Economy";
  if (
    /\b(ai|artificial intelligence|technology|nvidia|microsoft|apple|google|cyber|chip|openai)\b/.test(
      t,
    )
  )
    return "Technology & AI";
  if (
    /\b(stock|market|business|bank|earnings|company|companies|trade|tariff|merger|amazon|tesla)\b/.test(
      t,
    )
  )
    return "Business & Finance";
  if (
    /\b(congress|senate|election|trump|president|government|white house|supreme court|democrat|republican|vote)\b/.test(
      t,
    )
  )
    return "Politics & Government";
  if (/\b(ukraine|russia|china|israel|gaza|iran|war|global|foreign)\b/.test(t))
    return "World & U.S.";
  return "National Events";
}
export function matchCompanies(title: string, companies: Company[]) {
  return companies
    .filter(
      (c) =>
        c.aliases.some((alias) => {
          if (
            alias === "Apple" &&
            !/\b(iphone|ipad|macbook|tim cook|apple inc|apple intelligence|stock|shares|earnings|tech)\b/i.test(
              title,
            )
          )
            return false;
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp("\\b" + escaped + "\\b", "i").test(title);
        }) || new RegExp("\\$" + c.symbol + "\\b").test(title),
    )
    .map((c) => c.symbol);
}
export function normalizeFeed(
  xml: string,
  source: { id: string; name: string },
  observedAt: string,
  companies: Company[] = companySeeds,
): NewsArticle[] {
  if (XMLValidator.validate(xml) !== true) throw Error("Invalid XML");
  const doc = new XMLParser({
    ignoreAttributes: false,
    processEntities: true,
  }).parse(xml);
  const raw = doc.rss?.channel?.item ?? doc.feed?.entry;
  if (!raw) throw Error("No RSS or Atom entries");
  return deduplicate(
    (Array.isArray(raw) ? raw : [raw])
      .slice(0, 100)
      .flatMap((r: any, i: number) => {
        try {
          const title = clean(r.title?.["#text"] ?? r.title);
          const link = Array.isArray(r.link)
            ? r.link.find((l: any) => l["@_rel"] === "alternate")?.["@_href"]
            : typeof r.link === "object"
              ? r.link["@_href"]
              : r.link;
          const url = canonicalUrl(link);
          const date = clean(
            r.pubDate ?? r.published ?? r.updated ?? r["dc:date"],
          );
          const ms = Date.parse(date);
          if (!title || title.length > 600) throw Error("Invalid headline");
          return [
            {
              id: stableId(url),
              title,
              url,
              publisher: source.name,
              sourceId: source.id,
              publishedAt:
                Number.isFinite(ms) && ms <= Date.parse(observedAt) + 300000
                  ? new Date(ms).toISOString()
                  : null,
              observedAt,
              category: categorize(
                title,
                source.id,
                clean(
                  Array.isArray(r.category)
                    ? r.category
                        .map((c: any) =>
                          typeof c === "object" ? c["#text"] : c,
                        )
                        .join(" ")
                    : typeof r.category === "object"
                      ? r.category["#text"]
                      : r.category,
                ),
              ),
              companies: matchCompanies(title, companies),
              topics: [],
              prominence: Math.max(0, 1 - i / 100),
            },
          ];
        } catch {
          return [];
        }
      }),
  );
}
export function deduplicate(articles: NewsArticle[]) {
  const seen = new Map<string, NewsArticle>();
  for (const a of articles) {
    const key = canonicalUrl(a.url);
    const old = seen.get(key);
    if (!old || a.observedAt > old.observedAt) seen.set(key, a);
  }
  return [...seen.values()].sort((a, b) =>
    (b.publishedAt ?? b.observedAt).localeCompare(
      a.publishedAt ?? a.observedAt,
    ),
  );
}
const stop = new Set(
  "the a an to of and in for on with as is are was by from at that this how what why after over new says said us u s".split(
    " ",
  ),
);
function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stop.has(t)),
  );
}
export function similarity(a: string, b: string) {
  const x = tokens(a),
    y = tokens(b);
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return { shared, jaccard: shared / (x.size + y.size - shared || 1) };
}
export function clusterArticles(
  articles: NewsArticle[],
  now: number,
  previous: Story[] = [],
): Story[] {
  const groups: NewsArticle[][] = [];
  for (const a of articles) {
    const group = groups.find((g) => {
      const first = g[0];
      const s = similarity(a.title, first.title);
      return (
        a.category === first.category &&
        a.publishedAt &&
        first.publishedAt &&
        Math.abs(Date.parse(a.publishedAt) - Date.parse(first.publishedAt)) <
          48 * 3600000 &&
        s.shared >= 4 &&
        s.jaccard >= 0.52
      );
    });
    if (group) group.push(a);
    else groups.push([a]);
  }
  return groups
    .map((g) => {
      const dated = g
        .map((a) => a.publishedAt)
        .filter((v): v is string => !!v)
        .sort();
      const publishers = [...new Set(g.map((a) => a.publisher))];
      const age = dated.length
        ? Math.max(0, (now - Date.parse(dated.at(-1)!)) / 3600000)
        : 72;
      const scoreParts = {
        recency: 40 * Math.exp(-age / 24),
        breadth: Math.min(24, (publishers.length - 1) * 8),
        prominence: Math.max(...g.map((a) => a.prominence)) * 15,
        relevance: [
          "Economy",
          "Politics & Government",
          "National Events",
        ].includes(g[0].category)
          ? 12
          : 8,
        updates: Math.min(5, Math.max(0, g.length - publishers.length)),
      };
      return {
        id:
          previous.find((s) => g.some((a) => s.articleIds.includes(a.id)))
            ?.id ??
          stableId([...g].sort((a, b) => a.id.localeCompare(b.id))[0].id),
        headline: g[0].title,
        articleIds: g.map((a) => a.id),
        publishers,
        category: g[0].category,
        companies: [...new Set(g.flatMap((a) => a.companies))],
        firstPublished: dated[0] ?? null,
        lastPublished: dated.at(-1) ?? null,
        score:
          Math.round(
            Object.values(scoreParts).reduce((s, v) => s + v, 0) * 10,
          ) / 10,
        scoreParts,
        developing: publishers.length >= 2 && age < 6,
      };
    })
    .sort((a, b) => b.score - a.score);
}
const submissionsSchema = z.object({
  cik: z.union([z.string(), z.number()]),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  sicDescription: z.string().optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      reportDate: z.array(z.string()),
      form: z.array(z.string()),
      primaryDocument: z.array(z.string()),
    }),
  }),
});
export function normalizeSubmissions(
  raw: unknown,
  company: Company,
  at: string,
): Company {
  const d = submissionsSchema.parse(raw);
  if (Number(d.cik) !== Number(company.cik)) throw Error("SEC CIK mismatch");
  const r = d.filings.recent;
  const filings = r.form
    .flatMap((form, i) => {
      if (
        !["10-K", "10-Q", "8-K", "10-K/A", "10-Q/A", "8-K/A"].includes(form) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(r.filingDate[i]) ||
        !/^\d{10}-\d{2}-\d{6}$/.test(r.accessionNumber[i]) ||
        !r.primaryDocument[i] ||
        /[\/\\]/.test(r.primaryDocument[i])
      )
        return [];
      return [
        {
          id: r.accessionNumber[i],
          form,
          filed: r.filingDate[i],
          reportDate: r.reportDate[i] || null,
          document: r.primaryDocument[i],
          url: `https://www.sec.gov/Archives/edgar/data/${Number(d.cik)}/${r.accessionNumber[i].replaceAll("-", "")}/${encodeURIComponent(r.primaryDocument[i])}`,
        },
      ];
    })
    .slice(0, 24);
  return {
    ...company,
    name: d.name,
    verifiedAt: at,
    filings,
    sector: d.sicDescription || company.sector,
  };
}
export function normalizeFacts(raw: unknown, cik: string, now: string): Fact[] {
  const d = z
    .object({ cik: z.number(), facts: z.record(z.string(), z.any()) })
    .parse(raw);
  if (d.cik !== Number(cik)) throw Error("SEC facts CIK mismatch");
  const fields = [
    ["Revenues", "Revenue"],
    ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenue"],
    ["NetIncomeLoss", "Net income"],
    ["Assets", "Total assets"],
    ["StockholdersEquity", "Stockholders equity"],
    ["EarningsPerShareDiluted", "Diluted EPS"],
  ];
  const out: Fact[] = [];
  for (const [key, label] of fields) {
    if (out.some((x) => x.label === label)) continue;
    const field = d.facts["us-gaap"]?.[key];
    if (!field?.units) continue;
    for (const [unit, rows] of Object.entries(field.units)) {
      if (!["USD", "USD/shares"].includes(unit) || !Array.isArray(rows))
        continue;
      const eligible = rows
        .filter(
          (r: any) =>
            typeof r.val === "number" &&
            Number.isFinite(r.val) &&
            ["10-K", "10-Q"].includes(r.form) &&
            r.filed <= now.slice(0, 10) &&
            r.end &&
            r.accn,
        )
        .sort(
          (a: any, b: any) =>
            b.filed.localeCompare(a.filed) || b.end.localeCompare(a.end),
        );
      const r = eligible[0];
      if (r)
        out.push({
          label,
          value: r.val,
          unit,
          end: r.end,
          filed: r.filed,
          form: r.form,
          accession: r.accn,
          ...(r.start ? { start: r.start } : {}),
        });
    }
  }
  return out;
}
export function normalizeObservations(
  raw: unknown,
  previous: Observation[] = [],
): Observation[] {
  const d = z
    .object({
      observations: z.array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          value: z.string(),
          realtime_start: z.string().optional(),
          realtime_end: z.string().optional(),
        }),
      ),
    })
    .parse(raw);
  return d.observations
    .flatMap((o) => {
      const v = Number(o.value);
      if (o.value === "." || !o.value.trim() || !Number.isFinite(v)) return [];
      const old = previous.find((p) => p.date === o.date);
      return [
        {
          date: o.date,
          value: v,
          realtimeStart: o.realtime_start ?? null,
          realtimeEnd: o.realtime_end ?? null,
          changed: old ? old.value !== v : false,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-180);
}
export interface Watch {
  id: string;
  kind: "stock" | "company" | "topic" | "economy";
  label: string;
  note: string;
}
export interface Preferences {
  version: 1;
  watchlist: Watch[];
  categories: string[];
  sections: string[];
  notes: string;
  compact: boolean;
  embeds: boolean;
}
export const defaultPreferences: Preferences = {
  version: 1,
  watchlist: [],
  categories: [],
  sections: ["stories", "markets", "economy", "companies", "watchlist"],
  notes: "",
  compact: false,
  embeds: true,
};
export function parsePreferences(raw: unknown): Preferences {
  return z
    .object({
      version: z.literal(1),
      watchlist: z
        .array(
          z.object({
            id: z.string().min(1).max(100),
            kind: z.enum(["stock", "company", "topic", "economy"]),
            label: z.string().max(160),
            note: z.string().max(5000),
          }),
        )
        .max(100),
      categories: z.array(z.enum(categories)).max(10),
      sections: z
        .array(
          z.enum(["stories", "markets", "economy", "companies", "watchlist"]),
        )
        .max(5),
      notes: z.string().max(30000),
      compact: z.boolean(),
      embeds: z.boolean(),
    })
    .parse(raw);
}
export function emptyBundle(): PulseBundle {
  return {
    version: 1,
    generatedAt: null,
    articles: [],
    stories: [],
    companies: companySeeds,
    economy: seriesSeeds,
    releases: [],
    providers: [],
    usage: {
      day: new Date().toISOString().slice(0, 10),
      estimatedRowsWritten: 0,
      lastStatements: 0,
      note: "Cloudflare usage is not connected; estimates are not account analytics.",
    },
  };
}

export function normalizeBLS(
  raw: unknown,
  seriesId: string,
  previous: Observation[] = [],
): Observation[] {
  const d = z
    .object({
      status: z.literal("REQUEST_SUCCEEDED"),
      Results: z.object({
        series: z.array(
          z.object({
            seriesID: z.string(),
            data: z.array(
              z.object({
                year: z.string().regex(/^\d{4}$/),
                period: z.string(),
                value: z.string(),
                footnotes: z
                  .array(
                    z.object({
                      code: z.string().optional(),
                      text: z.string().optional(),
                    }),
                  )
                  .optional(),
              }),
            ),
          }),
        ),
      }),
    })
    .parse(raw);
  const series = d.Results.series.find((s) => s.seriesID === seriesId);
  if (!series) throw Error("BLS series mismatch");
  const rows = series.data
    .filter((r) => /^M(0[1-9]|1[0-2])$/.test(r.period))
    .map((r) => ({
      date: r.year + "-" + r.period.slice(1) + "-01",
      value: r.value,
      statusNotes: (r.footnotes ?? [])
        .map((f) => clean(f.text || f.code))
        .filter(Boolean)
        .slice(0, 6),
    }));
  return normalizeObservations({ observations: rows }, previous).map((o) => ({
    ...o,
    statusNotes: rows.find((r) => r.date === o.date)?.statusNotes ?? [],
  }));
}

export function normalizeCalendar(
  ics: string,
  observedAt: string,
): EconomicRelease[] {
  if (!ics.startsWith("BEGIN:VCALENDAR") || !ics.includes("END:VCALENDAR"))
    throw Error("Invalid iCalendar");
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)]
    .flatMap((m) => {
      const event = m[1];
      if (/^STATUS:CANCELLED/m.test(event)) return [];
      const start = event.match(/^DTSTART(?:;[^:]*)?:(\d{8})/m)?.[1],
        summary = event
          .match(/^SUMMARY:(.*)$/m)?.[1]
          ?.replace(/\\,/g, ",")
          .replace(/\\n/g, " ");
      if (!start || !summary) return [];
      const date =
        start.slice(0, 4) + "-" + start.slice(4, 6) + "-" + start.slice(6, 8);
      if (date < observedAt.slice(0, 10)) return [];
      const name = clean(summary);
      const uid = event.match(/^UID:(.*)$/m)?.[1]?.trim() ?? date + name;
      return [
        {
          id: "bls-" + stableId(uid),
          name,
          date,
          sourceUrl: "https://www.bls.gov/schedule/news_release/",
          observedAt,
          seriesIds: /Consumer Price Index/i.test(name)
            ? ["CPIAUCSL"]
            : /^Employment Situation/i.test(name)
              ? ["UNRATE", "PAYEMS"]
              : [],
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 40);
}

/** Persist changed stories and relationship deltas without rewriting unchanged joins. */
export function storyDelta(previous: Story | undefined, current: Story) {
  const oldIds = new Set(previous?.articleIds ?? []),
    newIds = new Set(current.articleIds);
  return {
    changed: !previous || JSON.stringify(previous) !== JSON.stringify(current),
    added: current.articleIds.filter((id) => !oldIds.has(id)),
    removed: [...oldIds].filter((id) => !newIds.has(id)),
  };
}
