import {mergeCompanyCatalog,companySeeds} from "../shared/pulse";
import { deliveryTarget } from "../shared/delivery";
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  BrowserRouter,
  HashRouter,
  NavLink,
  Link,
  Routes,
  Route,
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Menu,
  Newspaper,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
  Database,
  MoveUp,
  MoveDown,
  Layers3,
  Command,
} from "lucide-react";
const EconomicChart = lazy(() => import("./economic-chart"));
import {
  categories,
  emptyBundle,
  defaultPreferences,
  parsePreferences,
  type Preferences,
  type Watch,
  type PulseBundle,
  type NewsArticle,
  type Story,
  type Company,
  type EconomicSeries,
} from "../shared/pulse";
import { MarketWidget } from "./market-widget";
import "./style.css";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchInterval: 300000,
    },
  },
});
const PreferencesContext = createContext<{
  prefs: Preferences;
  setPrefs: React.Dispatch<React.SetStateAction<Preferences>>;
}>({ prefs: defaultPreferences, setPrefs: () => {} });
function usePrefs() {
  return useContext(PreferencesContext);
}
const hosting = deliveryTarget(
  import.meta.env.BASE_URL,
  import.meta.env.MODE === "pages",
);
const HostingRouter = hosting.router === "hash" ? HashRouter : BrowserRouter;
async function loadSnapshot(): Promise<PulseBundle> {
  const r = await fetch(hosting.snapshot);
  if (!r.ok) throw Error("No collected snapshot available");
  const data=(await r.json()) as PulseBundle;
  return {...data,companies:mergeCompanyCatalog(data.companies??[])};
}
async function loadBundle(): Promise<PulseBundle> {
  if (!hosting.api) return loadSnapshot();
  try {
    const r = await fetch(hosting.api + "dashboard", {
      signal: AbortSignal.timeout(4500),
    });
    if (!r.ok) throw Error("API unavailable");
    const data = (await r.json()) as PulseBundle;
    if (data.version !== 1 || !Array.isArray(data.articles))
      throw Error("Invalid data");
    return {...data,companies:mergeCompanyCatalog(data.companies??[])};
  } catch {
    return loadSnapshot();
  }
}
function usePulse() {
  return useQuery({ queryKey: ["pulse"], queryFn: loadBundle });
}
function useNews() {
  const pulse = usePulse();
  const q = useQuery({
    queryKey: ["pulse-news"],
    queryFn: async () => {
      if (!hosting.api) return loadSnapshot();
      try {
        const r = await fetch(hosting.api + "news", {
          signal: AbortSignal.timeout(4500),
        });
        if (!r.ok) throw Error();
        return (await r.json()) as Pick<PulseBundle, "articles" | "stories">;
      } catch {
        return loadSnapshot();
      }
    },
  });
  return {
    ...pulse,
    data: pulse.data ? { ...pulse.data, ...(q.data ?? {}) } : undefined,
  };
}
const date = (s: string | null | undefined) =>
  s
    ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      )
    : "Not provided";
function ago(s: string | null | undefined) {
  if (!s) return "Time unavailable";
  const m = Math.floor((Date.now() - Date.parse(s)) / 60000);
  return m < 1
    ? "Just now"
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : date(s);
}
function stale(s: string | null | undefined, seconds = 5400) {
  return !s || Date.now() - Date.parse(s) > seconds * 1000;
}
function Session() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const weekday = !["Sat", "Sun"].includes(get("weekday"));
  return (
    <span className="session">
      <i />
      {weekday && mins >= 570 && mins < 960
        ? "U.S. session window"
        : "Outside regular hours"}
      <span className="session-note">Holiday status unverified</span>
    </span>
  );
}
function SaveButton({
  kind,
  id,
  label,
  small = false,
}: {
  kind: Watch["kind"];
  id: string;
  label: string;
  small?: boolean;
}) {
  const { prefs, setPrefs } = usePrefs();
  const exists = prefs.watchlist.some((w) => w.id === id && w.kind === kind);
  return (
    <button
      className={small ? "icon-button save" : "button secondary"}
      aria-label={`${exists ? "Remove" : "Watch"} ${label}`}
      aria-pressed={exists}
      disabled={!exists&&prefs.watchlist.length>=100}
      title={!exists&&prefs.watchlist.length>=100?"Watchlist limit: 100 signals":undefined}
      onClick={() =>
        setPrefs((p) => ({
          ...p,
          watchlist: exists
            ? p.watchlist.filter((w) => !(w.id === id && w.kind === kind))
            : [...p.watchlist, { id, kind, label, note: "" }],
        }))
      }
    >
      {exists ? <Check size={15} /> : <Plus size={15} />}{" "}
      {!small && (exists ? "Watching" : "Add to watchlist")}
    </button>
  );
}
function Panel({
  title,
  eyebrow,
  children,
  action,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Radio size={24} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="signal-dot" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function CategoryIcon({ category }: { category: string }) {
  return (
    <div
      className={`category-art cat-${category.split(" ")[0].toLowerCase()}`}
      aria-hidden="true"
    >
      {category === "Economy" ? (
        <ChartNoAxesCombined />
      ) : category === "Science & Space" ? (
        <Globe2 />
      ) : category === "Technology & AI" ? (
        <Layers3 />
      ) : category === "Politics & Government" ? (
        <Building2 />
      ) : (
        <Radio />
      )}
      <span />
    </div>
  );
}
function StoryCard({
  story,
  articles,
  index = 0,
  hero = false,
}: {
  story: Story;
  articles: NewsArticle[];
  index?: number;
  hero?: boolean;
}) {
  const first = articles.find((a) => a.id === story.articleIds[0]);
  return (
    <article className={`story-card ${hero ? "hero-story" : ""}`}>
      <div className="story-content">
        <div className="story-meta">
          <span className="category-label">{story.category}</span>
          <span>{ago(story.lastPublished)}</span>
          {story.developing && <span className="developing">Developing</span>}
        </div>
        <a
          href={first?.url ?? "/news/" + story.id}
          target={first ? "_blank" : undefined}
          rel="noreferrer"
        >
          <h3>{story.headline}</h3>
        </a>
        <p>
          {story.publishers.length > 1
            ? `${story.publishers.length} publishers covering this story`
            : `From ${first?.publisher ?? story.publishers[0]}. Coverage from one publisher.`}{" "}
          {story.articleIds.length > 1 &&
            `${story.articleIds.length} linked reports.`}
        </p>
        <div className="story-bottom">
          <span className="publisher-mark">{(first?.publisher ?? "S")[0]}</span>
          <span>{story.publishers.slice(0, 2).join(" · ")}</span>
          <Link
            className="coverage-link"
            to={"/news/" + story.id}
            aria-label={`Explore coverage: ${story.headline}`}
          >
            Coverage <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      {hero ? (
        <CategoryIcon category={story.category} />
      ) : (
        <span className="story-number">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
    </article>
  );
}
function EconomicMini({ series }: { series: EconomicSeries }) {
  const last = series.observations.at(-1),
    prev = series.observations.at(-2);
  const yearAgo = last
    ? series.observations.find(
        (o) =>
          o.date ===
          String(Number(last.date.slice(0, 4)) - 1) + last.date.slice(4),
      )
    : undefined;
  return (
    <div className="economic-mini">
      <div>
        <Link to={"/economy?series=" + series.id}>{series.name}</Link>
        <span>
          {series.frequency} · {last ? date(last.date) : "Awaiting connection"}
        </span>
      </div>
      <div className="economic-value">
        {last ? (
          <>
            <strong>
              {last.value.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </strong>
            <span>{series.unit}</span>
          </>
        ) : (
          <span className="unavailable">—</span>
        )}
      </div>
      {last && yearAgo && series.id === "CPIAUCSL" ? (
        <span className="neutral-change">
          {((last.value / yearAgo.value - 1) * 100).toFixed(2)}% vs year earlier
          · derived from index
        </span>
      ) : (
        last &&
        prev && (
          <span className="neutral-change">
            {last.value >= prev.value ? "+" : ""}
            {(last.value - prev.value).toFixed(2)} vs prior observation
          </span>
        )
      )}
      {!!last?.statusNotes?.length && (
        <span className="neutral-change">
          Source note: {last.statusNotes.join(" · ")}
        </span>
      )}
    </div>
  );
}
function Home({ bundle }: { bundle: PulseBundle }) {
  const { prefs } = usePrefs();
  const [category, setCategory] = useState("All signals");
  const [customize, setCustomize] = useState(false);
  const { setPrefs } = usePrefs();
  const stories = bundle.stories.filter((s) =>
    category === "All signals"
      ? !prefs.categories.length || prefs.categories.includes(s.category)
      : s.category === category,
  );
  const tracked = bundle.articles
    .filter((a) =>
      prefs.watchlist.some((w) =>
        w.kind === "topic" ? a.category === w.id : a.companies.includes(w.id),
      ),
    )
    .slice(0, 3);
  const companies = bundle.companies
    .map((c) => ({
      ...c,
      count: bundle.articles.filter((a) => a.companies.includes(c.symbol))
        .length,
    }))
    .filter((c) => c.count)
    .sort((a, b) => b.count - a.count);
  return (
    <>
      <Heading
        eyebrow="THE NATIONAL INTELLIGENCE DESK"
        title="See the signal. Stay ahead."
        description="A clear view of the news, markets, and economy. All in one pulse."
        action={
          <button
            className="button secondary"
            onClick={() => setCustomize(!customize)}
          >
            <SlidersHorizontal size={15} />
            Customize view
          </button>
        }
      />
      {customize && (
        <Panel title="Your dashboard">
          <div className="check-row">
            {defaultPreferences.sections.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={prefs.sections.includes(s)}
                  onChange={() =>
                    setPrefs((p) => ({
                      ...p,
                      sections: p.sections.includes(s)
                        ? p.sections.filter((x) => x !== s)
                        : [...p.sections, s],
                    }))
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </Panel>
      )}
      <div className="category-tabs" aria-label="News categories">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c === "All signals" ? <Activity size={14} /> : null}
            {c}
          </button>
        ))}
      </div>
      <div className="status-strip">
        <span>
          <span className="signal-dot" /> THE LATEST
        </span>
        <p>
          {bundle.articles[0]?.title ??
            "Collecting verified headlines from connected sources"}
        </p>
        <Link to="/news">
          News desk <ArrowRight size={13} />
        </Link>
      </div>
      <div className="dashboard-grid">
        <div className="main-column">
          {prefs.sections.includes("stories") && (
            <Panel
              title="The national picture"
              eyebrow="TOP STORIES"
              action={
                <Link className="text-link" to="/news">
                  All coverage <ArrowUpRight size={14} />
                </Link>
              }
            >
              {stories.length ? (
                <>
                  <StoryCard
                    story={stories[0]}
                    articles={bundle.articles}
                    hero
                  />
                  <div className="secondary-stories">
                    {stories.slice(1, 4).map((s, i) => (
                      <StoryCard
                        key={s.id}
                        story={s}
                        articles={bundle.articles}
                        index={i + 1}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Empty title="No stories in this view">
                  Choose another category or wait for the next successful
                  collection.
                </Empty>
              )}
            </Panel>
          )}
          {prefs.sections.includes("markets") && (
            <Panel
              title="A pulse on the market"
              eyebrow="MARKET INTELLIGENCE"
              action={
                <Link className="text-link" to="/markets">
                  Open terminal <ArrowUpRight size={14} />
                </Link>
              }
            >
              <div className="chart-heading">
                <div>
                  <Link to="/stocks/SPY">
                    <strong>SPDR S&P 500 ETF</strong>{" "}
                    <span className="symbol-tag">SPY</span>
                  </Link>
                  <p>
                    Provider-hosted historical chart · price timing shown by
                    provider
                  </p>
                </div>
                <SaveButton id="SPY" label="SPY" kind="stock" small />
              </div>
              {prefs.embeds ? (
                <MarketWidget symbol="AMEX:SPY" />
              ) : (
                <EmbedDisabled />
              )}
              <p className="fine-print">
                Quotes may be delayed. TradingView controls quote entitlements,
                session timestamps, and exchange coverage. No prices are
                extracted or stored.
              </p>
            </Panel>
          )}
          {prefs.sections.includes("companies") && (
            <Panel
              title="Companies in the conversation"
              eyebrow="OBSERVABLE COVERAGE"
              action={
                <Link className="text-link" to="/companies">
                  Directory <ArrowUpRight size={14} />
                </Link>
              }
            >
              {companies.length ? (
                <div className="company-grid">
                  {companies.slice(0, 4).map((c) => (
                    <Link
                      className="company-tile"
                      key={c.symbol}
                      to={"/companies/" + c.symbol}
                    >
                      <div className="company-logo">{c.symbol[0]}</div>
                      <div>
                        <strong>{c.name}</strong>
                        <span>
                          {c.symbol} · {c.sector}
                        </span>
                      </div>
                      <div className="mention-count">
                        {c.count}
                        <small>headlines</small>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty title="No company matches in the current feeds">
                  Only explicit names and unambiguous aliases are matched.
                  Coverage is not a measure of public interest.
                </Empty>
              )}
            </Panel>
          )}
        </div>
        <aside className="right-column" aria-label="Economy and latest signals">
          {prefs.sections.includes("economy") && (
            <Panel
              title="The economic backdrop"
              eyebrow="U.S. ECONOMY"
              action={
                <Link to="/economy" aria-label="Open economy">
                  <ArrowUpRight size={16} />
                </Link>
              }
            >
              {[...bundle.economy]
                .sort(
                  (a, b) =>
                    Number(!!b.observations.length) -
                    Number(!!a.observations.length),
                )
                .slice(0, 4)
                .map((s) => (
                  <EconomicMini key={s.id} series={s} />
                ))}
              {!bundle.economy.some((e) => e.observations.length) && (
                <div className="inline-note">
                  <Database size={15} />
                  <span>
                    FRED connection pending. Series are ready; values appear
                    after the owner configures the API key.
                  </span>
                </div>
              )}
            </Panel>
          )}
          {bundle.releases.length > 0 && (
            <Panel
              title="Next on the calendar"
              eyebrow="CONFIRMED RELEASE DATES"
              action={
                <Link to="/economy" aria-label="Economic release calendar">
                  <ArrowUpRight size={15} />
                </Link>
              }
            >
              {bundle.releases.slice(0, 3).map((r) => (
                <a
                  className="calendar-mini"
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  key={r.id}
                >
                  <span>{date(r.date)}</span>
                  <strong>{r.name}</strong>
                  <small>
                    {r.sourceUrl.includes("bls.gov") ? "BLS" : "FRED"} · date
                    confirmed
                  </small>
                </a>
              ))}
            </Panel>
          )}
          <Panel title="Latest dispatches" eyebrow="NEWS WIRE">
            <div className="wire">
              {bundle.articles.slice(0, 5).map((a) => (
                <div className="wire-item" key={a.id}>
                  <span className="wire-dot" />
                  <div>
                    <small>
                      {ago(a.publishedAt)} · {a.publisher}
                    </small>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <Link className="panel-footer-link" to="/news">
              Follow the news wire <ArrowRight size={14} />
            </Link>
          </Panel>
          {prefs.sections.includes("watchlist") && (
            <Panel
              title="Your radar"
              eyebrow="PERSONAL WATCHLIST"
              action={<Bookmark size={16} />}
            >
              <p className="muted">
                {prefs.watchlist.length
                  ? `${prefs.watchlist.length} signals on your watchlist`
                  : "A little less noise. A little more you."}
              </p>
              {tracked.map((a) => (
                <a
                  className="watch-update"
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.title}
                  <ArrowUpRight size={13} />
                </a>
              ))}
              {!prefs.watchlist.length && (
                <div className="suggested-watch">
                  {["NVDA", "AAPL", "MSFT"].map((s) => (
                    <div key={s}>
                      <span>{s}</span>
                      <SaveButton kind="stock" id={s} label={s} small />
                    </div>
                  ))}
                </div>
              )}
              <Link className="button primary wide" to="/watchlist">
                Open your watchlist <ArrowRight size={14} />
              </Link>
            </Panel>
          )}
          <div className="method-card">
            <ShieldCheck size={19} />
            <div>
              <strong>Sources, not speculation.</strong>
              <p>
                Attributed headlines. Transparent methods. No invented market
                data.
              </p>
              <Link to="/sources">
                How Signal Pulse works <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function EmbedDisabled() {
  return (
    <Empty title="External market embeds are off">
      Enable TradingView in <Link to="/settings">Settings</Link> to view
      provider-hosted charts.
    </Empty>
  );
}
function Markets() {
  const { prefs } = usePrefs();
  const [symbol, setSymbol] = useState("NASDAQ:NVDA");
  return (
    <>
      <Heading
        eyebrow="MARKET INTELLIGENCE"
        title="The market, in focus."
        description="U.S. equities, ETFs, and benchmarks. Official provider-hosted quotes and charts."
        action={<Session />}
      />
      <div className="market-scope">
        <span className="tag">AUTHORIZED DISPLAY · TRADINGVIEW</span>
        <span>
          Timing and exchange availability vary by symbol. See each widget’s
          timestamp.
        </span>
      </div>
      <div className="market-grid">
        <Panel title="U.S. benchmarks">
          {prefs.embeds ? <MarketWidget kind="overview" /> : <EmbedDisabled />}
        </Panel>
        <Panel
          title="Price action"
          action={
            <select
              aria-label="Chart symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            >
              {companySeeds.map(c=><option key={c.symbol} value={c.exchange+":"+c.symbol}>{c.symbol} · {c.name}</option>)}
            </select>
          }
        >
          {prefs.embeds ? <MarketWidget symbol={symbol} /> : <EmbedDisabled />}
        </Panel>
      </div>
      <Panel title="U.S. equity screener" eyebrow="EXPLORE & COMPARE">
        {prefs.embeds ? <MarketWidget kind="screener" /> : <EmbedDisabled />}
        <p className="fine-print">
          Sort inside the provider’s screener for gainers, losers, volume, and
          capitalization where supported. Signal Pulse does not persist or
          redistribute these observations.
        </p>
      </Panel>
    </>
  );
}
function News() {
  const { data } = useNews();
  const bundle = data ?? emptyBundle();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "",
    category = params.get("category") ?? "All signals",
    from = params.get("from") ?? "",
    publisher = params.get("publisher") ?? "";
  const [limit, setLimit] = useState(24);
  const { prefs } = usePrefs();
  const [onlyWatched, setOnlyWatched] = useState(false);
  const update = (k: string, v: string) => {
    setLimit(24);
    setParams((p) => {
      if (v) p.set(k, v);
      else p.delete(k);
      return p;
    });
  };
  const stories = bundle.stories.filter(
    (s) =>
      (category === "All signals" || s.category === category) &&
      (!q || s.headline.toLowerCase().includes(q.toLowerCase())) &&
      (!from || (!!s.lastPublished && s.lastPublished.slice(0, 10) >= from)) &&
      (!publisher || s.publishers.includes(publisher)) &&
      (!onlyWatched ||
        prefs.watchlist.some((w) =>
          w.kind === "topic" ? w.id === s.category : s.companies.includes(w.id),
        )),
  );
  return (
    <>
      <Heading
        eyebrow="NATIONAL NEWS INTELLIGENCE"
        title="Follow the story, not the noise."
        description="Publisher-attributed coverage, organized by event. Headlines link directly to original reporting."
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search headlines"
            placeholder="Search headlines, companies, or topics…"
            value={q}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <select
          aria-label="News category"
          value={category}
          onChange={(e) => update("category", e.target.value)}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Publisher"
          value={publisher}
          onChange={(e) => update("publisher", e.target.value)}
        >
          <option value="">All publishers</option>
          {[...new Set(bundle.articles.map((a) => a.publisher))].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <label className="date-filter">
          Since (UTC)
          <input
            type="date"
            aria-label="Published since"
            value={from}
            onChange={(e) => update("from", e.target.value)}
          />
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={onlyWatched}
            onChange={(e) => setOnlyWatched(e.target.checked)}
          />
          My radar
        </label>
      </div>
      <div className="results-meta">
        <span>
          {stories.length} story clusters · {bundle.articles.length} observed
          headlines
        </span>
        <Link to="/sources">
          How stories are ranked <ArrowUpRight size={12} />
        </Link>
      </div>
      {stories.length ? (
        <>
          <div className="news-grid">
            {stories.slice(0, limit).map((s, i) => (
              <StoryCard
                key={s.id}
                story={s}
                articles={bundle.articles}
                index={i}
              />
            ))}
          </div>
          {stories.length > limit && (
            <button
              className="button secondary load-more"
              onClick={() => setLimit((l) => l + 24)}
            >
              Load more stories
            </button>
          )}
        </>
      ) : (
        <Empty title="No matching stories">
          Try a different search, source, or date. A missing result is not
          evidence that no event occurred.
        </Empty>
      )}
    </>
  );
}
function StoryPage() {
  const { storyId } = useParams();
  const { data, isPending } = useNews();
  const bundle = data ?? emptyBundle();
  const story = bundle.stories.find((s) => s.id === storyId);
  if (!story)
    return (
      <Empty title={isPending ? "Loading coverage…" : "Story unavailable"}>
        This story may have left the 14-day retention window.{" "}
        <Link to="/news">Return to the news desk.</Link>
      </Empty>
    );
  const articles = story.articleIds.flatMap((id) =>
    bundle.articles.filter((a) => a.id === id),
  );
  return (
    <>
      <Link className="back-link" to="/news">
        ← News intelligence
      </Link>
      <Heading
        eyebrow={story.category}
        title={story.headline}
        description={`${story.publishers.length} publisher${story.publishers.length === 1 ? "" : "s"} · ${articles.length} reports · First published ${date(story.firstPublished)}`}
        action={
          <SaveButton kind="topic" id={story.category} label={story.category} />
        }
      />
      <div className="two-column">
        <div>
          <Panel title="Coverage overview">
            <p className="large-copy">
              {articles.length} attributed report
              {articles.length === 1 ? "" : "s"} from{" "}
              {story.publishers.join(", ")}. Publication dates span{" "}
              {date(story.firstPublished)} to {date(story.lastPublished)}.
            </p>
            <div className="inline-note">
              <ShieldCheck size={18} />
              <span>
                This is a metadata overview, not an AI-generated factual
                summary. Publisher claims have not been independently verified
                by Signal Pulse. Open the original reporting for full context.
              </span>
            </div>
          </Panel>
          <Panel title="Reporting timeline">
            {[...articles]
              .sort((a, b) =>
                (a.publishedAt ?? a.observedAt).localeCompare(
                  b.publishedAt ?? b.observedAt,
                ),
              )
              .map((a) => (
                <div className="timeline-row" key={a.id}>
                  <div>
                    <small>{date(a.publishedAt)}</small>
                    <span>
                      {a.publishedAt
                        ? new Date(a.publishedAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Publication time unavailable"}
                    </span>
                  </div>
                  <div>
                    <span className="category-label">{a.publisher}</span>
                    <h3>
                      <a href={a.url} target="_blank" rel="noreferrer">
                        {a.title} <ExternalLink size={14} />
                      </a>
                    </h3>
                    <small>
                      Observed {date(a.observedAt)} · {ago(a.observedAt)}
                    </small>
                  </div>
                </div>
              ))}
          </Panel>
        </div>
        <div>
          <Panel title="Ranking, explained">
            <div className="score-total">
              {story.score}
              <small>transparent relevance score</small>
            </div>
            {Object.entries(story.scoreParts).map(([k, v]) => (
              <div className="score-row" key={k}>
                <span>{k}</span>
                <strong>{v.toFixed(1)}</strong>
              </div>
            ))}
            <p className="fine-print">
              Ranking combines recency, distinct publishers, feed prominence,
              category relevance, and updates. Volume does not imply truth or
              public opinion.
            </p>
          </Panel>
          <Panel title="Related companies">
            {story.companies.length ? (
              story.companies.map((s) => (
                <Link className="list-link" key={s} to={"/companies/" + s}>
                  {s}
                  <ArrowUpRight size={14} />
                </Link>
              ))
            ) : (
              <p className="muted">
                No unambiguous company names found in these headlines.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
function Companies({ bundle }: { bundle: PulseBundle }) {
  const { data: fullNews } = useNews();
  bundle = fullNews ?? bundle;
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [limit,setLimit]=useState(40);
  const companies = bundle.companies.filter((c) =>
    (c.symbol + " " + c.name + " " + c.sector)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="COMPANY INTELLIGENCE"
        title="Know the companies behind the headlines."
        description="A curated U.S. universe connecting official filings, public company information, and news coverage."
      />
      <label className="search-field directory-search">
        <Search size={17} />
        <input
          aria-label="Search companies"
          placeholder="Search by company, ticker, or sector…"
          value={q}
          onChange={(e) =>
            setParams(e.target.value ? { q: e.target.value } : {})
          }
        />
        <span className="kbd">{bundle.companies.length} symbols</span>
      </label>
      <div className="company-directory">
        {companies.slice(0,limit).map((c) => (
          <div className="directory-row" key={c.symbol}>
            <div className="company-logo">{c.symbol[0]}</div>
            <Link to={"/companies/" + c.symbol}>
              <strong>{c.name}</strong>
              <span>
                {c.exchange}: {c.symbol}
              </span>
            </Link>
            <span className="sector">{c.sector}</span>
            <span className="company-news-count">
              {
                bundle.articles.filter((a) => a.companies.includes(c.symbol))
                  .length
              }{" "}
              headlines
            </span>
            <SaveButton kind="company" id={c.symbol} label={c.name} small />
            <Link
              to={"/companies/" + c.symbol}
              aria-label={"Explore " + c.name}
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        ))}
      </div>
      {companies.length>limit&&<button className="button secondary load-more" onClick={()=>setLimit(n=>n+40)}>Show more companies ({companies.length-limit} remaining)</button>}
      {!companies.length && (
        <Empty title="No supported company matches">
          This directory is a curated universe, not every listed U.S. security.
          TradingView’s chart supports broader symbol search.
        </Empty>
      )}
    </>
  );
}
function CompanyPage({
  bundle,
  stock = false,
}: {
  bundle: PulseBundle;
  stock?: boolean;
}) {
  const { data: fullNews } = useNews();
  bundle = fullNews ?? bundle;
  const { symbol: raw } = useParams();
  const symbol = raw?.toUpperCase();
  const c = bundle.companies.find((c) => c.symbol === symbol);
  const { prefs } = usePrefs();
  if (!c)
    return (
      <Empty title="Symbol not in the supported directory">
        Search the <Link to="/companies">company directory</Link> for an
        available company or ETF.
      </Empty>
    );
  const news = bundle.articles.filter((a) => a.companies.includes(c.symbol));
  return (
    <>
      <Link className="back-link" to={stock ? "/markets" : "/companies"}>
        ← {stock ? "Market overview" : "Company directory"}
      </Link>
      <Heading
        eyebrow={`${c.exchange}: ${c.symbol} · ${c.sector}`}
        title={c.name}
        description={c.description}
        action={<SaveButton kind="stock" id={c.symbol} label={c.symbol} />}
      />
      <div className="company-tabs">
        <NavLink to={"/stocks/" + c.symbol}>Stock analysis</NavLink>
        <NavLink to={"/companies/" + c.symbol}>Company intelligence</NavLink>
        <a href={c.sourceUrl} target="_blank" rel="noreferrer">
          {c.cik ? "SEC company record" : "Market source"}{" "}
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="two-column">
        <div>
          <Panel
            title={stock ? "Price & historical performance" : "Market context"}
            eyebrow="TRADINGVIEW · PROVIDER TIMESTAMPS"
          >
            {prefs.embeds ? (
              <MarketWidget symbol={c.exchange + ":" + c.symbol} />
            ) : (
              <EmbedDisabled />
            )}
          </Panel>
          <Panel title="Company news" eyebrow="EXPLICIT HEADLINE MATCHES">
            {news.length ? (
              news.map((a) => (
                <div className="article-row" key={a.id}>
                  <span>
                    {a.publisher} · {ago(a.publishedAt)}
                  </span>
                  <h3>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                      <ArrowUpRight size={14} />
                    </a>
                  </h3>
                </div>
              ))
            ) : (
              <Empty title="No matched headlines in the current feeds">
                Company matching uses explicit aliases in headlines. It does not
                infer associations from broad sectors.
              </Empty>
            )}
          </Panel>
          {stock && (
            <Panel
              title="Financial statements"
              eyebrow="PROVIDER-HOSTED DISPLAY"
            >
              {prefs.embeds ? (
                <MarketWidget
                  kind="financials"
                  symbol={c.exchange + ":" + c.symbol}
                />
              ) : (
                <EmbedDisabled />
              )}
            </Panel>
          )}
        </div>
        <div>
          <Panel title="Company snapshot">
            <div className="score-row">
              <span>Symbol</span>
              <strong>{c.symbol}</strong>
            </div>
            <div className="score-row">
              <span>Exchange</span>
              <strong>{c.exchange}</strong>
            </div>
            <div className="score-row">
              <span>SEC CIK</span>
              <strong>
                {c.cik?.padStart(10, "0") ?? "Not mapped"}
              </strong>
            </div>
            <p className="fine-print">
              {c.verifiedAt
                ? "SEC submissions verified " + date(c.verifiedAt)
                : "Curated company profile. Live SEC verification pending owner contact configuration."}
            </p>
          </Panel>
          <Panel title="Selected financial facts">
            {c.facts?.length ? (
              c.facts.map((f) => (
                <div className="fact-row" key={f.label}>
                  <span>{f.label}</span>
                  <strong>
                    {f.value.toLocaleString()} <small>{f.unit}</small>
                  </strong>
                  <small>
                    {f.start ? date(f.start) + " – " : ""}
                    {date(f.end)} · {f.form} filed {date(f.filed)}
                  </small>
                  <a
                    href={`https://www.sec.gov/Archives/edgar/data/${Number(c.cik)}/${f.accession.replaceAll("-", "")}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Original filing ↗
                  </a>
                </div>
              ))
            ) : (
              <p className="muted">
                {c.cik
                  ? "SEC financial facts will appear after the owner configures an identifying collector contact."
                  : "SEC financial facts are not mapped for this security."}
              </p>
            )}
          </Panel>
          <Panel title="Recent SEC filings" eyebrow="10-K · 10-Q · 8-K">
            {c.filings?.length ? (
              c.filings.slice(0, 10).map((f) => (
                <a
                  className="filing-row"
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="filing-tag">{f.form}</span>
                  <span>
                    {date(f.filed)}
                    <small>Period: {date(f.reportDate)}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </a>
              ))
            ) : (
              <Empty title="Filings not synchronized">
                {c.cik ? (
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                    View official SEC submissions ↗
                  </a>
                ) : (
                  "No mapped SEC filings for this security."
                )}
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
function Economy({ bundle }: { bundle: PulseBundle }) {
  const [params, setParams] = useSearchParams();
  const selected =
    bundle.economy.find((e) => e.id === params.get("series")) ??
    bundle.economy[0];
  const [range, setRange] = useState(60);
  return (
    <>
      <Heading
        eyebrow="THE U.S. ECONOMY"
        title="Put the numbers in perspective."
        description="Official observation dates, original units, and historical context. Monthly figures stay monthly. BLS series work without a key; FRED expands coverage."
      />
      <div className="economy-grid">
        {bundle.economy.map((e) => (
          <div
            className={`economic-selector panel ${selected.id === e.id ? "selected" : ""}`}
            key={e.id}
          >
            <EconomicMini series={e} />
          </div>
        ))}
      </div>
      <Panel
        title={selected.name}
        eyebrow={selected.id + " · " + selected.frequency.toUpperCase()}
        action={
          <select
            aria-label="History length"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={24}>24 observations</option>
            <option value={60}>60 observations</option>
            <option value={180}>180 observations</option>
          </select>
        }
      >
        {selected.observations.length ? (
          <>
            <div
              className="economic-chart"
              role="img"
              aria-label={`${selected.name} historical observations`}
            >
              <Suspense fallback={<p>Loading historical chart…</p>}>
                <EconomicChart data={selected.observations.slice(-range)} />
              </Suspense>
            </div>
            <p>
              {selected.unit} · Latest observation{" "}
              {date(selected.observations.at(-1)?.date)} · Publication metadata
              updated {date(selected.updatedAt)}
            </p>
          </>
        ) : (
          <Empty
            title={
              selected.status === "rights-review-required"
                ? "Display permission not established"
                : "FRED connection awaiting owner API key"
            }
          >
            {selected.notes}{" "}
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
              View this series at FRED ↗
            </a>
          </Empty>
        )}
        <div className="source-line">
          <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
            Source: {selected.source}
            {selected.sourceUrl.includes("fred.")
              ? " via FRED"
              : " · official BLS API"}{" "}
            <ExternalLink size={12} />
          </a>
          <span>Observed {date(selected.observedAt)}</span>
        </div>
        <p className="fine-print">
          {selected.notes} FRED is a registered trademark of the Federal Reserve
          Bank of St. Louis. Signal Pulse is not endorsed or certified by the
          Bank.
        </p>
        {selected.observations.some((o) => o.changed) && (
          <p className="notice">
            A historical value changed since the last collected snapshot.
            Original real-time vintage dates are retained; preliminary/final
            status is not inferred.
          </p>
        )}
      </Panel>
      <Panel title="Confirmed release calendar" eyebrow="ECONOMIC CALENDAR">
        {bundle.releases.length ? (
          bundle.releases.map((r) => (
            <a
              className="release-row"
              key={r.id}
              href={r.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>{date(r.date)}</span>
              <strong>{r.name}</strong>
              <span>
                Confirmed date ·{" "}
                {r.sourceUrl.includes("bls.gov") ? "BLS" : "FRED"}
              </span>
              <ArrowUpRight size={14} />
            </a>
          ))
        ) : (
          <Empty title="No confirmed release dates synchronized">
            The calendar populates from FRED release-date endpoints after FRED
            configuration. No estimated or guessed events are displayed.
          </Empty>
        )}
      </Panel>
    </>
  );
}
function Insights({ bundle }: { bundle: PulseBundle }) {
  const { data: fullNews } = useNews();
  bundle = fullNews ?? bundle;
  const { prefs, setPrefs } = usePrefs();
  const stories = bundle.stories.filter((s) => s.companies.length);
  return (
    <>
      <Heading
        eyebrow="CONNECTED INTELLIGENCE"
        title="Connect the signals."
        description="News, company disclosures, and economic context. Relationships are observations; causation is not assumed."
      />
      <div className="inline-note">
        <ShieldCheck size={18} />
        <span>
          Company matches require an explicit name, guarded alias, or $ticker in
          a headline. Price returns around publication are unavailable because
          no structured market-data redistribution rights have been established.
        </span>
      </div>
      <div className="two-column">
        <div>
          <Panel title="News × companies" eyebrow="OBSERVABLE RELATIONSHIPS">
            {stories.length ? (
              stories.slice(0, 20).map((s) => (
                <div className="insight-row" key={s.id}>
                  <div className="story-meta">
                    <span>{ago(s.lastPublished)}</span>
                    <span>
                      {s.publishers.length} publisher
                      {s.publishers.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3>
                    <a
                      href={
                        bundle.articles.find((a) => a.id === s.articleIds[0])
                          ?.url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.headline}
                    </a>
                  </h3>
                  <Link className="text-link" to={"/news/" + s.id}>
                    Explore attributed coverage ↗
                  </Link>
                  <div className="chip-row">
                    {s.companies.map((symbol) => (
                      <Link
                        className="symbol-tag"
                        key={symbol}
                        to={"/companies/" + symbol}
                      >
                        {symbol}
                        <ArrowUpRight size={12} />
                      </Link>
                    ))}
                  </div>
                  <p className="fine-print">
                    Matched by explicit headline alias. Open the company page
                    for chart context and related SEC disclosures. Temporal
                    proximity does not establish cause.
                  </p>
                </div>
              ))
            ) : (
              <Empty title="No defensible company relationships yet">
                New matches appear automatically when collected headlines
                identify a supported company.
              </Empty>
            )}
          </Panel>
        </div>
        <div>
          <Panel
            title="Your research notebook"
            eyebrow="PRIVATE · ON THIS DEVICE"
          >
            <label className="field-label" htmlFor="research-notes">
              Personal outlook & research notes
            </label>
            <textarea
              id="research-notes"
              rows={14}
              placeholder="Record a thesis, questions, relevant sources, and what would change your view…"
              value={prefs.notes}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  notes: e.target.value.slice(0, 30000),
                }))
              }
            />
            <div className="saved-indicator">
              <Check size={13} />
              Saved locally · included in settings export
            </div>
            <p className="fine-print">
              Personal analysis is not a system forecast. Signal Pulse does not
              generate unsupported stock-price predictions.
            </p>
          </Panel>
          <Panel title="Economic context">
            {bundle.economy.slice(0, 3).map((e) => (
              <EconomicMini key={e.id} series={e} />
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
function Watchlist({ bundle }: { bundle: PulseBundle }) {
  const { data: fullNews } = useNews();
  bundle = fullNews ?? bundle;
  const { prefs, setPrefs } = usePrefs();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Watch["kind"]>("stock");
  const options =
    kind === "topic"
      ? categories.slice(1).map((c) => ({ id: c, label: c }))
      : kind === "economy"
        ? bundle.economy.map((e) => ({ id: e.id, label: e.name }))
        : bundle.companies.map((c) => ({
            id: c.symbol,
            label: c.name + " · " + c.symbol,
          }));
  const change = (idx: number, by: number) =>
    setPrefs((p) => {
      const a = [...p.watchlist];
      if (idx + by < 0 || idx + by >= a.length) return p;
      [a[idx], a[idx + by]] = [a[idx + by], a[idx]];
      return { ...p, watchlist: a };
    });
  return (
    <>
      <Heading
        eyebrow="YOUR PERSONAL RADAR"
        title="Keep your signals close."
        description="Stocks, companies, topics, and economic indicators. Private preferences stay on this device."
      />
      <Panel title="Add a signal">
        <div className="filter-bar">
          <select
            aria-label="Watchlist kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Watch["kind"])}
          >
            <option value="stock">Stocks & ETFs</option>
            <option value="company">Companies</option>
            <option value="topic">News topics</option>
            <option value="economy">Economic indicators</option>
          </select>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Find a signal"
              placeholder="Find a signal to follow…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        <div className="watch-suggestions">
          {options
            .filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
            .slice(0, q ? 12 : 5)
            .map((o) => (
              <div key={o.id}>
                <span>{o.label}</span>
                <SaveButton kind={kind} id={o.id} label={o.label} small />
              </div>
            ))}
        </div>
      </Panel>
      {prefs.watchlist.length ? (
        <div className="watchlist-grid">
          {prefs.watchlist.map((w, i) => {
            const articles = bundle.articles.filter((a) =>
              w.kind === "topic"
                ? a.category === w.id
                : a.companies.includes(w.id),
            );
            return (
              <Panel
                key={w.kind + w.id}
                title={w.label}
                eyebrow={w.kind.toUpperCase()}
                action={
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={"Move " + w.label + " up"}
                      disabled={!i}
                      onClick={() => change(i, -1)}
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Move " + w.label + " down"}
                      disabled={i === prefs.watchlist.length - 1}
                      onClick={() => change(i, 1)}
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Remove " + w.label}
                      onClick={() =>
                        setPrefs((p) => ({
                          ...p,
                          watchlist: p.watchlist.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                }
              >
                {w.kind === "economy" ? (
                  bundle.economy.some((e) => e.id === w.id) ? (
                    <EconomicMini
                      series={bundle.economy.find((e) => e.id === w.id)!}
                    />
                  ) : (
                    <p className="muted">
                      This imported indicator is not in the supported directory.
                    </p>
                  )
                ) : (
                  <>
                    <Link
                      className="text-link"
                      to={
                        w.kind === "topic"
                          ? "/news?category=" + encodeURIComponent(w.id)
                          : "/companies/" + w.id
                      }
                    >
                      Open intelligence <ArrowUpRight size={13} />
                    </Link>
                    <p className="muted">
                      {articles.length} recent matched headlines
                    </p>
                    {articles.slice(0, 2).map((a) => (
                      <a
                        className="watch-update"
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.title}
                        <ArrowUpRight size={13} />
                      </a>
                    ))}
                  </>
                )}
                <label className="field-label" htmlFor={"note-" + i}>
                  Your note
                </label>
                <textarea
                  id={"note-" + i}
                  rows={3}
                  placeholder="What are you watching for?"
                  value={w.note}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      watchlist: p.watchlist.map((x, j) =>
                        j === i
                          ? { ...x, note: e.target.value.slice(0, 5000) }
                          : x,
                      ),
                    }))
                  }
                />
              </Panel>
            );
          })}
        </div>
      ) : (
        <Empty title="Your radar is ready">
          Add a signal above. Your watchlist, order, and notes persist without
          an account.
        </Empty>
      )}
    </>
  );
}
function Sources() {
  return (
    <>
      <Heading
        eyebrow="PROVENANCE & METHODOLOGY"
        title="Every signal has a source."
        description="Know where the data comes from, what it covers, and where its limits begin."
      />
      <div className="two-column">
        <div>
          <Panel title="News intelligence">
            <p>
              Signal Pulse collects attributed headline metadata and original
              links. It stores no article bodies, feed descriptions, publisher
              images, or AI-generated summaries. PBS and NPR RSS use is limited
              to this personal, noncommercial dashboard; commercial use requires
              a separate publisher rights review.
            </p>
            <ul className="source-list">
              <li>
                <a
                  href="https://www.pbs.org/newshour/feeds/rss/headlines"
                  target="_blank"
                  rel="noreferrer"
                >
                  PBS NewsHour · national headlines ↗
                </a>
              </li>
              <li>
                <a
                  href="https://feeds.npr.org/1001/rss.xml"
                  target="_blank"
                  rel="noreferrer"
                >
                  NPR · national headlines ↗
                </a>
              </li>
              <li>
                <a
                  href="https://www.federalreserve.gov/feeds/feeds.htm"
                  target="_blank"
                  rel="noreferrer"
                >
                  Federal Reserve · official releases ↗
                </a>
              </li>
              <li>
                <a
                  href="https://www.nasa.gov/news-release/feed/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA · official releases ↗
                </a>
              </li>
            </ul>
            <p className="fine-print">
              These feeds offer partial coverage. “Top” means ranked within
              connected feeds, not nationally trending. GDELT is disabled after
              an HTTP 429 verification response. NewsAPI Developer plan is
              excluded from production.
            </p>
          </Panel>
          <Panel title="Ranking & clustering">
            <p>
              Headlines are deduplicated by canonical URL. Stories are grouped
              conservatively by category, a 48-hour publication window, at least
              four shared headline tokens, and Jaccard similarity ≥ 0.52. False
              splits and occasional false joins remain possible.
            </p>
            <div className="method-grid">
              <div>
                <strong>40</strong>
                <span>Recency · 24h decay</span>
              </div>
              <div>
                <strong>24</strong>
                <span>Distinct publishers · max</span>
              </div>
              <div>
                <strong>15</strong>
                <span>Position in source feed</span>
              </div>
              <div>
                <strong>12</strong>
                <span>Category relevance · max</span>
              </div>
              <div>
                <strong>5</strong>
                <span>Additional updates · max</span>
              </div>
            </div>
            <p>
              “Developing” requires at least two publishers and a report
              published within six hours. Single-outlet coverage is labeled.
              Ranking does not certify truth, public opinion, or national
              importance.
            </p>
          </Panel>
          <Panel title="Company & news relationships">
            <p>
              Headlines are matched against a curated alias list, with full word
              boundaries. Ambiguous “Apple” requires a technology, financial, or
              product context; common standalone ticker words are not matched. A
              $ticker is explicit. Coverage counts measure only the connected
              feed sample. News is never said to cause price movement.
            </p>
          </Panel>
        </div>
        <div>
          <Panel title="Financial market display">
            <p>
              Quotes, charts, financial statements, benchmarks, and screeners
              are official attributed TradingView embeds. Prices may be delayed
              or unavailable depending on symbol, exchange, and entitlements.
              The widget’s own timing is authoritative.
            </p>
            <a
              className="text-link"
              href="https://www.tradingview.com/widget-docs/"
              target="_blank"
              rel="noreferrer"
            >
              TradingView widget documentation ↗
            </a>
            <p>
              Quotes are never scraped, extracted, or persisted. Historical
              event-window returns are unavailable. Twelve Data Basic is
              internal non-display; Massive individual plans and Alpha Vantage
              free access do not establish public redistribution permission, so
              these quote APIs are excluded.
            </p>
          </Panel>
          <Panel title="Economic observations">
            <p>
              CPI, unemployment, and payroll series use the official keyless BLS
              API with once-daily collection. Further FRED API data requires the
              owner’s key. Government-origin series retain source attribution,
              units, frequency, observation dates, and latest-vintage metadata.
              Publication metadata is distinguished from retrieval time. A
              revision indicator means a value changed between collected
              snapshots; preliminary/final classification is not inferred.
            </p>
            <p>
              University of Michigan consumer sentiment is excluded pending
              third-party display permission. Release dates are shown only when
              confirmed by FRED.
            </p>
            <a
              className="text-link"
              href="https://fred.stlouisfed.org/docs/api/terms_of_use.html"
              target="_blank"
              rel="noreferrer"
            >
              FRED API terms ↗
            </a>
          </Panel>
          <Panel title="SEC EDGAR">
            <p>
              SEC submissions and XBRL company facts are collected centrally, at
              most two requests per second. A real identifying application and
              contact email must be configured by the owner. No per-visitor SEC
              calls. Curated company profiles are distinguished from
              SEC-verified observations.
            </p>
            <a
              className="text-link"
              href="https://www.sec.gov/edgar/sec-api-documentation"
              target="_blank"
              rel="noreferrer"
            >
              SEC API documentation ↗
            </a>
          </Panel>
        </div>
      </div>
    </>
  );
}
function Diagnostics({ bundle }: { bundle: PulseBundle }) {
  return (
    <>
      <Heading
        eyebrow="SYSTEM OBSERVABILITY"
        title="A clear view behind the signals."
        description="Actual collection status, source timestamps, and operational limits. No simulated health checks."
      />
      <div className="metric-grid">
        <div className="metric">
          <span>Observed headlines</span>
          <strong>{bundle.counts?.articles ?? bundle.articles.length}</strong>
          <small>14-day retention · max 1,200</small>
        </div>
        <div className="metric">
          <span>Last collection</span>
          <strong className="smaller">{ago(bundle.generatedAt)}</strong>
          <small>{bundle.generatedAt ?? "Not run"}</small>
        </div>
        <div className="metric">
          <span>Estimated row writes today</span>
          <strong>{bundle.usage.estimatedRowsWritten.toLocaleString()}</strong>
          <small>Collector guard: 80,000 · not account analytics</small>
        </div>
        <div className="metric">
          <span>External quote storage</span>
          <strong>0</strong>
          <small>Embeds only · no extracted prices</small>
        </div>
      </div>
      <Panel title="Provider health">
        <div className="provider-list">
          {bundle.providers.map((p) => (
            <div className="provider-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.id} <ExternalLink size={11} />
                </a>
              </div>
              <span
                className={`health ${p.status === "healthy" && stale(p.lastSuccess, p.interval * 3) ? "stale" : p.status}`}
              >
                {p.status === "healthy" && stale(p.lastSuccess, p.interval * 3)
                  ? "stale"
                  : p.status}
              </span>
              <div>
                <small>Last success</small>
                <span>{p.lastSuccess ? ago(p.lastSuccess) : "Never"}</span>
              </div>
              <div>
                <small>Records</small>
                <span>{p.records}</span>
              </div>
              {p.error && <p>{p.error}</p>}
              <details>
                <summary>Provenance & cadence</summary>
                <p>{p.rights}</p>
                <p>
                  Attempt: {p.lastAttempt ?? "Never"} · Success:{" "}
                  {p.lastSuccess ?? "Never"} · Next:{" "}
                  {p.nextAttempt ?? "Not scheduled"} · Interval:{" "}
                  {p.interval / 60} minutes
                </p>
                {p.bodyHash && <code>SHA-256 {p.bodyHash}</code>}
              </details>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Free-tier operating envelope">
        <p>
          Workers Free: 100,000 requests/day and 10 ms CPU per invocation. D1
          Free: 5 million rows read/day, 100,000 rows written/day, 500 MB per
          database and 5 GB total storage. Static assets bypass the Worker; API
          JSON is edge-cached for five minutes. Actual account request, CPU,
          storage, and cache metrics are not connected.
        </p>
        <p>
          Scheduled collection runs every 30 minutes in a public GitHub
          repository. A 60-request cap, conditional requests, exponential
          backoff, bounded records, chunked SQL, and an estimated write budget
          limit work. Free tier can stop serving dynamic requests when limits
          are reached; no automatic paid upgrade is configured.
        </p>
        <p className="fine-print">
          Cloudflare deployment has not been authenticated or verified in this
          workspace. Local diagnostics do not establish production CPU
          compliance. Owner keys are collected in the scheduled runner, never in
          browser preferences.
        </p>
      </Panel>
    </>
  );
}
function Settings() {
  const { prefs, setPrefs } = usePrefs();
  const [message, setMessage] = useState("");
  const download = () => {
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "signal-pulse-settings.json";
    a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title="Your workspace. Your preferences."
        description="Saved privately on this device. Export a backup or import it on another browser."
      />
      <div className="two-column">
        <Panel title="News preferences">
          <p className="muted">
            Default categories on your dashboard. Leave all unchecked to include
            every category.
          </p>
          <div className="category-checks">
            {categories.slice(1).map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={prefs.categories.includes(c)}
                  onChange={() =>
                    setPrefs((p) => ({
                      ...p,
                      categories: p.categories.includes(c)
                        ? p.categories.filter((x) => x !== c)
                        : [...p.categories, c],
                    }))
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </Panel>
        <div>
          <Panel title="Display & external data">
            <label className="setting-row">
              <span>
                <strong>Compact density</strong>
                <small>Reduce spacing in the terminal</small>
              </span>
              <input
                type="checkbox"
                checked={prefs.compact}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, compact: e.target.checked }))
                }
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>TradingView market embeds</strong>
                <small>Load third-party quote and chart widgets</small>
              </span>
              <input
                type="checkbox"
                checked={prefs.embeds}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, embeds: e.target.checked }))
                }
              />
            </label>
          </Panel>
          <Panel title="Backup & restore">
            <div className="button-row">
              <button className="button secondary" onClick={download}>
                <Download size={15} />
                Export settings
              </button>
              <label className="button secondary upload">
                <Upload size={15} />
                Import settings
                <input
                  type="file"
                  accept="application/json,.json"
                  aria-label="Import settings"
                  onChange={async (e) => {
                    try {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 200000) throw Error("File too large");
                      setPrefs(parsePreferences(JSON.parse(await file.text())));
                      setMessage("Settings imported successfully.");
                    } catch {
                      setMessage(
                        "Import rejected: expected a valid Signal Pulse settings backup.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="fine-print">
              Includes watchlists, notes, category preferences, and dashboard
              sections. Election Atlas preferences are preserved separately.
            </p>
            <div role="status" aria-label="Settings import status">
              {message}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { data } = useNews();
  const [q, setQ] = useState("");
  const companies = (data?.companies ?? [])
    .filter(
      (c) =>
        q && (c.name + " " + c.symbol).toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 5);
  const stories = (data?.stories ?? [])
    .filter((s) => q && s.headline.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-search">
          <Search size={20} />
          <input
            autoFocus
            aria-label="Search Signal Pulse"
            placeholder="Search companies and headlines…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="search-results">
          {!q ? (
            <p className="muted">
              Find supported companies, tickers, and the latest national
              headlines.
            </p>
          ) : (
            <>
              <span className="eyebrow">COMPANIES</span>
              {companies.map((c) => (
                <Link
                  onClick={onClose}
                  to={"/companies/" + c.symbol}
                  key={c.symbol}
                >
                  <span className="symbol-tag">{c.symbol}</span>
                  {c.name}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
              <span className="eyebrow">NEWS COVERAGE</span>
              {stories.map((s) => (
                <a
                  onClick={onClose}
                  href={
                    data?.articles.find((a) => a.id === s.articleIds[0])?.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  key={s.id}
                >
                  {s.headline}
                  <ArrowUpRight size={14} />
                </a>
              ))}
              {!companies.length && !stories.length && (
                <p>No matching signals. Try another company or headline.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function App() {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    try {
      return parsePreferences(
        JSON.parse(localStorage.getItem("signal-pulse:v1") ?? "null"),
      );
    } catch {
      return defaultPreferences;
    }
  });
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("signal-pulse:v1", JSON.stringify(prefs));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [prefs]);
  const { data, isPending, isError } = usePulse();
  const bundle = data ?? emptyBundle();
  const [search, setSearch] = useState(false),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
    document.title = "Signal Pulse — National Intelligence";
  }, [location.pathname]);
  useEffect(() => {
    if (
      location.pathname.startsWith("/forecast") ||
      location.pathname.startsWith("/state")
    )
      nav("/", { replace: true });
  }, [location.pathname, nav]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const links = [
    ["/", "Overview", LayoutDashboard],
    ["/markets", "Markets", ChartNoAxesCombined],
    ["/news", "News intelligence", Newspaper],
    ["/economy", "U.S. economy", Globe2],
    ["/companies", "Companies", Building2],
    ["/insights", "Connected insights", Layers3],
  ] as const;
  return (
    <PreferencesContext.Provider value={{ prefs, setPrefs }}>
      <div className={`app ${prefs.compact ? "compact" : ""}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <aside
          className={`sidebar ${menu ? "open" : ""}`}
          aria-label="Application navigation"
        >
          <Link className="brand" to="/">
            <span className="brand-icon">
              <Activity size={24} />
            </span>
            <span>
              SIGNAL<span className="brand-light">PULSE</span>
              <small>INTELLIGENCE, CONNECTED.</small>
            </span>
          </Link>
          <div className="workspace-label">
            <span className="signal-dot" /> NATIONAL DESK<span>⌘</span>
          </div>
          <nav aria-label="Primary navigation">
            {links.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={17} />
                {label}
                {to === "/insights" && <span className="new-badge">LAB</span>}
              </NavLink>
            ))}
          </nav>
          <div className="nav-divider" />
          <div className="nav-section-label">YOUR WORKSPACE</div>
          <nav aria-label="Workspace navigation">
            <NavLink to="/watchlist">
              <Bookmark size={17} />
              Watchlist
              <span className="nav-count">{prefs.watchlist.length}</span>
            </NavLink>
            <NavLink to="/settings">
              <Settings2 size={17} />
              Preferences
            </NavLink>
          </nav>
          <div className="sidebar-bottom">
            <div className="source-assurance">
              <ShieldCheck size={17} />
              <span>
                Attribution at every step
                <small>Built around original sources</small>
              </span>
            </div>
            <nav aria-label="System navigation">
              <NavLink to="/sources">
                <Database size={16} />
                Sources & methods
              </NavLink>
              <NavLink to="/diagnostics">
                <Activity size={16} />
                System diagnostics
                <span
                  className={`tiny-status ${stale(bundle.generatedAt) ? "warn" : ""}`}
                />
              </NavLink>
            </nav>
            <div className="local-profile">
              <span>SP</span>
              <div>
                Personal workspace<small>Local · No account required</small>
              </div>
              <Settings2 size={14} />
            </div>
          </div>
        </aside>
        {menu && (
          <button
            className="mobile-shade"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="workspace">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              WORKSPACE <ChevronRight size={12} />
              <span>
                {links.find(
                  ([path]) =>
                    path !== "/" && location.pathname.startsWith(path),
                )?.[1] ??
                  (location.pathname === "/"
                    ? "National overview"
                    : location.pathname.startsWith("/stocks")
                      ? "Stock analysis"
                      : "Personal workspace")}
              </span>
            </div>
            <button className="global-search" onClick={() => setSearch(true)}>
              <Search size={15} />
              <span>Search the signal…</span>
              <kbd>⌘ K</kbd>
            </button>
            <Session />
            <Link
              className="top-watch icon-button"
              to="/watchlist"
              aria-label="Open watchlist"
            >
              <Bookmark size={18} />
            </Link>
          </header>
          {prefs.embeds && (
            <div
              className="ticker-shell"
              role="region"
              aria-label="Market ticker"
            >
              <MarketWidget kind="ticker" />
            </div>
          )}
          <div
            className="refresh-line"
            role="region"
            aria-label="Collection status"
          >
            <span>
              <Radio size={12} />{" "}
              {stale(bundle.generatedAt)
                ? "CACHED SNAPSHOT"
                : "AUTOMATIC COLLECTION"}
              <span className="refresh-divider" />
              Updated {ago(bundle.generatedAt)}
            </span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <main id="main">
            {storageError && (
              <div className="notice" role="status">
                Browser storage is unavailable. Export your preferences before
                closing this page.
              </div>
            )}
            {isPending && (
              <div className="notice" role="status">
                Loading the latest collected signals…
              </div>
            )}
            {isError && (
              <div className="notice" role="status">
                The data service is unavailable. Provider widgets and your local
                preferences remain accessible.
              </div>
            )}
            <Routes>
              <Route path="/" element={<Home bundle={bundle} />} />
              <Route path="/markets" element={<Markets />} />
              <Route
                path="/stocks/:symbol"
                element={<CompanyPage bundle={bundle} stock />}
              />
              <Route path="/news" element={<News />} />
              <Route path="/news/:storyId" element={<StoryPage />} />
              <Route path="/economy" element={<Economy bundle={bundle} />} />
              <Route
                path="/companies"
                element={<Companies bundle={bundle} />}
              />
              <Route
                path="/companies/:symbol"
                element={<CompanyPage bundle={bundle} />}
              />
              <Route
                path="/watchlist"
                element={<Watchlist bundle={bundle} />}
              />
              <Route path="/insights" element={<Insights bundle={bundle} />} />
              <Route path="/sources" element={<Sources />} />
              <Route
                path="/diagnostics"
                element={<Diagnostics bundle={bundle} />}
              />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <Empty title="This page has moved">
                    <Link to="/">Open Signal Pulse</Link> to explore the
                    national intelligence desk.
                  </Empty>
                }
              />
            </Routes>
          </main>
          <footer>
            <span className="footer-brand">
              <Activity size={14} />
              SIGNAL PULSE
            </span>
            <span>Independent perspective. Attributed information.</span>
            <Link to="/sources">
              Data & methodology <ArrowUpRight size={12} />
            </Link>
          </footer>
        </div>
        {search && <GlobalSearch onClose={() => setSearch(false)} />}
      </div>
    </PreferencesContext.Provider>
  );
}
const previewRoot = import.meta.hot?.data.root as Root | undefined;
const root = previewRoot ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HostingRouter>
        <App />
      </HostingRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
