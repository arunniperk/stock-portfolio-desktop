# Stock Portfolio Monitor

Windows desktop app for tracking Indian + US stock portfolios. React 18 + Vite + Electron, NVIDIA-style dark UI, Yahoo Finance data, dual AI analysis (Groq/Gemini).

## Commands

```bash
npm install              # install dependencies
npm run dev              # start Vite dev server (localhost:3000)
npm run start            # launch Electron (needs dev server running)
npm run build            # production build → build/
build-win.bat            # full Windows installer + portable (run as Admin)
```

No test suite exists. Validate changes by running `npm run dev` + `npm run start` and confirming the UI renders without console errors.

## Architecture

Single-page Electron app. All React code lives in `src/`. Electron main process in root `main.js` + `preload.js`.

```
src/
  App.js       # Main app component (~2,700 lines) — all UI components + state
  utils.js     # Formatting: fmt, fmtBig, isUS, short, sortRows, yahooSearch
  theme.js     # Dark/light theme (mkT), color palettes, default holdings
  icons.js     # SVG icon components (Ic object)
  ai.js        # Groq (Llama 3.3 70B) + Gemini (2.0 Flash) providers, callAI with fallback
  hooks.js     # useYahooSearch (debounced Yahoo search), useNotes
  index.js     # React entry point
```

App.js contains: ErrorBoundary, NvBtn, NvInput, Badge, SortTh, StatCard, PriceChart, DonutChart, PLBarChart, StockDetailView, AIAnalysis, Section (holdings table), CSVImportModal, AISetupModal, SettingsPanel, PortfolioTabs, and 10 tool modules (Notes, Alerts, Sectors, Screener, News, Benchmark, History, Watchlist, BuyLots, Tax). SidebarContent is defined inside AppInner and uses closure variables.

## Key Patterns

- **All inline styles** — no CSS files, no CSS-in-JS. Every element uses `style={{...}}`. Theme object `T` is threaded as a prop.
- **localStorage for persistence** — each module has its own key: `pm_portfolios`, `pm_notes`, `pm_alerts`, `pm_lots`, `pm_sold_lots`, `pm_watchlist`, `pm_sectors`, `pm_portfolio_history`, `pm_tweaks`, `pm_groq_key`, `pm_gemini_key`.
- **Custom SVG charts** — PriceChart, DonutChart, PLBarChart, benchmark line chart. No chart library (no recharts/d3). All hand-built with `<svg>` elements.
- **Yahoo Finance APIs** — v8 chart (prices/history), v7 quote (fundamentals), v10 quoteSummary (detailed data), v1 search. Always try `query1.finance.yahoo.com` then fallback to `query2`.
- **Dual currency** — Indian stocks use INR (₹), US stocks use USD ($). `isUS(symbol)` returns true for non-.NS/.BO suffixed symbols. USD values show INR equivalent using live USDINR rate. Sector allocation and benchmark comparison convert all USD values to INR for unified calculations.
- **AI fallback** — primary provider tried first, secondary is automatic fallback. Per-stock toggle when both configured.

## Gotchas

- `fetchPrices` uses functional `setPrices(prev => ...)` to avoid a dependency loop. Do NOT add `prices` to its useCallback deps.
- `fmtBig` uses Indian notation (Cr/L) for INR but should use B/M/T for USD. Currently it uses Indian notation for amounts above ₹1Cr regardless of currency — be aware when formatting USD values above $100K.
- NvBtn component has hardcoded color values that don't fully respect light mode theme.
- Tax rates are hardcoded: equity STCG 15%, LTCG 10% (India), STCG 30%, LTCG 20% (US).
- Analyst Target column removed from portfolio table but TargetCell + targets state still exist — used only inside StockDetailView now.
- SectorModule edit pencil icon is always visible; sector can be changed after initial auto-fetch from Yahoo.
- BenchmarkModule receives `inRows` and `usRows` separately to compute per-market returns vs their respective index. Portfolio returns are drawn as horizontal dashed lines on the SVG chart (not time-series — we don't have daily historical portfolio prices).
- `const START_DATE = new Date('2026-03-30')` in StockDetailView — hardcoded date filter for day-wise P&L. Consider making this dynamic.
- CSP in index.html allows: `*.yahoo.com`, `api.groq.com`, `generativelanguage.googleapis.com`; `img-src` adds `*.yimg.com`, `*.yahoo.net` for news thumbnails.
- Electron devtools are disabled in production builds (`devtools-opened` listener closes them).

## Terminology

- **LTP** — Last Traded Price (current market price)
- **Free Qty** — shares not pledged as collateral (free to sell); previously called "Unpledged Qty"
- **STCG/LTCG** — Short/Long Term Capital Gains (India: <12mo / ≥12mo)
- **Section** — the main holdings table component (not a page section)
- **Tool modules** — sidebar features: Watchlist, Buy Lots, Tax P&L, Notes, Alerts, Sectors, Screener, News, Benchmark, History
- **Screener** — fetches Yahoo v10 quoteSummary fundamentals for all portfolio stocks; links to Screener.in (Indian) or Yahoo Finance (US)
- **News** — aggregates Yahoo Finance news for portfolio symbols + market indices; staggered fetches to avoid rate limits
