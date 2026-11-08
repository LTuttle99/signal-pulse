import { useEffect, useRef, useState } from "react";
export function MarketWidget({
  kind = "chart",
  symbol = "NASDAQ:NVDA",
}: {
  kind?:
    "chart" | "ticker" | "overview" | "screener" | "profile" | "financials";
  symbol?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setFailed(false);
    node.replaceChildren();
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    node.appendChild(widget);
    const chart = {
      autosize: true,
      symbol,
      interval: "D",
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      backgroundColor: "rgba(15, 15, 20, 1)",
      hide_top_toolbar: false,
      support_host: "https://www.tradingview.com",
    };
    const ticker = {
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 CFD" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100 CFD" },
        { proName: "AMEX:SPY", title: "SPY" },
        { proName: "NASDAQ:NVDA", title: "NVIDIA" },
        { proName: "NASDAQ:AAPL", title: "APPLE" },
        { proName: "NASDAQ:MSFT", title: "MICROSOFT" },
        { proName: "NASDAQ:TSLA", title: "TESLA" },
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    };
    const overview = {
      colorTheme: "dark",
      dateRange: "3M",
      showChart: true,
      locale: "en",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height: "100%",
      tabs: [
        {
          title: "U.S. benchmarks",
          symbols: [
            { s: "AMEX:SPY", d: "S&P 500 ETF" },
            { s: "NASDAQ:QQQ", d: "Nasdaq-100 ETF" },
            { s: "AMEX:DIA", d: "Dow Jones ETF" },
            { s: "AMEX:IWM", d: "Russell 2000 ETF" },
          ],
        },
      ],
    };
    const configs = {
      chart: { script: "advanced-chart", options: chart },
      ticker: { script: "ticker-tape", options: ticker },
      overview: { script: "market-overview", options: overview },
      screener: {
        script: "screener",
        options: {
          width: "100%",
          height: "100%",
          defaultColumn: "overview",
          defaultScreen: "most_capitalized",
          market: "america",
          showToolbar: true,
          colorTheme: "dark",
          locale: "en",
          isTransparent: true,
        },
      },
      profile: {
        script: "symbol-profile",
        options: {
          width: "100%",
          height: "100%",
          colorTheme: "dark",
          isTransparent: true,
          symbol,
          locale: "en",
        },
      },
      financials: {
        script: "financials",
        options: {
          width: "100%",
          height: "100%",
          colorTheme: "dark",
          isTransparent: true,
          symbol,
          locale: "en",
          displayMode: "regular",
        },
      },
    };
    const config = configs[kind];
    const script = document.createElement("script");
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${config.script}.js`;
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify(config.options);
    script.onerror = () => setFailed(true);
    node.appendChild(script);
    return () => {
      node.replaceChildren();
    };
  }, [kind, symbol]);
  return (
    <div className={`market-embed embed-${kind}`}>
      <div ref={ref} className="tradingview-widget-container" />
      {failed && (
        <div className="embed-failure">
          Market embed unavailable.{" "}
          <a
            href={`https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`}
            target="_blank"
            rel="noreferrer"
          >
            View at TradingView ↗
          </a>
        </div>
      )}
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow noreferrer"
          target="_blank"
        >
          Track all markets on TradingView
        </a>
      </div>
    </div>
  );
}
