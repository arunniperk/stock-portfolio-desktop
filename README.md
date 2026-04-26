# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for managing personal stock portfolios across Indian and US markets. Built with **React 18 + Vite + Electron** — NVIDIA-style dark UI, dual AI analysis, real-time Yahoo Finance data, tax planning, sector analysis, benchmark comparison, screener, news feed, and full financial toolset.

---

## 🚀 Features

### Portfolio Management
- **Multi-market** — Indian Equity (₹) and US Equity ($) in separate tabs
- **Multi-portfolio** — Create, rename, delete multiple portfolios
- **Free Qty** — Track pledged vs free shares per holding
- **USD/INR live rate** — All US P&L shown in USD + INR equivalent
- **CSV & XLSX export** — Full metrics in both formats
- **CSV import** — Drag-and-drop with column auto-detection

### Stock Detail Tab
- **Click any stock** to open a dedicated analysis tab
- **Interactive SVG price chart** — 1M/3M/6M/1Y with buy price + target overlays
- **Analyst Targets** — Set/revise targets per stock; upside/downside % shown inline
- **Day-wise P&L table** — From 30 Mar 2026, bar chart + cumulative P&L
- **3-panel grid** — Your Position · Fundamentals · Day-wise P&L
- **Fundamentals** — Market Cap, P/E, EPS, 52W H/L, Volume, Beta, Div Yield
- **AI Analysis** — Sentiment, opportunities, risks, position comment

### AI Analysis (Optional)
- **Dual AI** — Groq (Llama 3.3 70B) + Gemini (2.0 Flash)
- **Auto-fallback** — Primary fails → secondary takes over
- **Per-stock toggle** — Switch provider per stock when both configured

---

## 🧰 Tools (Sidebar)

| Tool | Description |
|---|---|
| 👁 **Watchlist** | Track stocks with target entry/exit prices. Highlights near-entry (amber) and target-hit (green). Notes field. CSV export. |
| 📋 **Buy Lots** | Record individual buy transactions. Weighted avg price per stock. Per-lot P&L. STCG/LTCG badge. Shared with Tax module. |
| 🧾 **Tax P&L** | FY 2025-26 STCG/LTCG computation. Record sales, view realized vs unrealized liability. ITR-ready CSV export. |
| 📝 **Notes** | Per-stock notes/rationale. Card view of all annotated stocks. Edit in-place. |
| 🔔 **Price Alerts** | Set above/below thresholds per stock. Quick-pick from portfolio stocks. Browser notifications on trigger. Active + triggered log. |
| 🏭 **Sectors** | Group holdings by sector. All values unified in INR. Interactive donut chart. Fetches sector from Yahoo Finance. Always editable. |
| 🔍 **Screener** | Fundamental analysis for all portfolio stocks — PE, Forward PE, PB, EPS, ROE, D/E, Div Yield, Profit Margin, Revenue Growth, Beta, 52W H/L, Analyst Rating. Sortable columns. Filter by IN/US. Click to open Screener.in or Yahoo Finance. |
| 📰 **News** | Latest news from Yahoo Finance for portfolio stocks + market indices. Thumbnails, publisher, time-ago. Filter: All / Portfolio / Market. |
| 📊 **Benchmark** | Compare Indian portfolio vs Nifty 50, US portfolio vs S&P 500 over 1M/3M/6M/1Y. Portfolio returns drawn as dashed lines on chart. Interactive SVG line chart with hover tooltip. Performance table with invested/current/return. |
| 📈 **History** | Auto-snapshots portfolio value daily on each price refresh. Line chart + daily table. Up to 365 days. |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Desktop | Electron 41 |
| Bundler | electron-builder (NSIS + portable) |
| Data | Yahoo Finance v7/v8/v10 APIs |
| AI | Groq (Llama 3.3 70B) · Gemini 2.0 Flash |
| Export | SheetJS (XLSX) · native Blob (CSV) |
| Notifications | Browser Notification API |
| Charts | Custom SVG (no chart library) |
| Updates | electron-updater via GitHub Releases |

---

## 📦 Installation

### For Users
1. Download `Stock Portfolio Monitor Setup 4.5.1.exe` from Releases
2. On first launch — enter Groq/Gemini keys or skip (Yahoo Finance only)

### For Developers
```bash
git clone https://github.com/arunniperk/stock-portfolio-desktop.git
cd stock-portfolio-desktop
npm install
build-win.bat   # Run as Administrator
```

### AI Keys (Optional — both free)
| Provider | Key | Free Tier | Get Key |
|---|---|---|---|
| Groq | `gsk_…` | 14,400 req/day | console.groq.com |
| Gemini | `AIza…` | 1,500 req/day | aistudio.google.com |

---

## 📁 File Structure

```
C:\code\
├── package.json       # v4.5.1, dependencies, build config
├── vite.config.js
├── index.html         # CSP: Yahoo, Groq, Gemini, Yahoo CDN images
├── main.js            # Electron main + auto-updater
├── preload.js         # contextBridge (window controls, update events)
├── build-win.bat      # Build script (run as Administrator)
├── README.md
├── CLAUDE.md          # Claude Code project context
├── assets/icon.ico    # Portfolio P icon — 7 sizes (16–256px)
└── src/
    ├── index.js       # React entry
    ├── App.js         # ~3,000 lines — main app + 10 tool modules
    ├── utils.js       # Formatting helpers (fmt, fmtBig, isUS, short, sortRows)
    ├── theme.js       # NVIDIA-style dark/light theme, colors, defaults
    ├── icons.js       # SVG icon components
    ├── ai.js          # Groq + Gemini AI provider functions
    └── hooks.js       # Shared hooks: useYahooSearch, useNotes
```

---

## 🔒 Security
- CSP allows only `*.yahoo.com`, `api.groq.com`, `generativelanguage.googleapis.com`
- `img-src` extended for `*.yimg.com`, `*.yahoo.net` (news thumbnails)
- API keys in `localStorage` only — never sent elsewhere
- No telemetry, no analytics, no external logging

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.5.1 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.5.1 Changelog

| Change | Description |
|---|---|
| 📈 **Benchmark chart fix** | Indian and US portfolio returns now drawn as dashed horizontal lines on the SVG chart (🇮🇳 orange, 🇺🇸 cyan). Y-axis range includes portfolio values. Hover tooltip shows portfolio returns alongside index values. |
| 🔍 **Screener module** | New tool showing PE, Forward PE, PB, EPS, ROE, D/E, Div Yield, Profit Margin, Revenue Growth, Beta, 52-Week High/Low, and Analyst Rating for all portfolio stocks. All columns sortable. Filter by IN/US. Click any row to open Screener.in (Indian stocks) or Yahoo Finance (US stocks). |
| 📰 **News feed module** | Aggregates latest news from Yahoo Finance for all portfolio stocks plus market news (Nifty, S&P, Indian economy, US markets). Filters: All / Portfolio / Market. Thumbnails, publisher, time-ago display. Staggered API requests to avoid rate limits. |
| 🔒 **CSP update** | Added `img-src` directive for Yahoo image CDN domains (`*.yimg.com`, `*.yahoo.net`) to load news thumbnails. |

## 🔧 v4.5.0 Changelog

| Change | Description |
|---|---|
| 🔄 **Free Qty** | "Unpledged Qty" renamed to "Free Qty" everywhere; column width reduced (minWidth 110→72). |
| 📊 **Sector allocation** | All values (IN + US) converted to INR for unified allocation percentages. Sector is now always editable (pencil icon on every row, pre-fills current sector, supports Enter/Escape). |
| 📈 **Split benchmark** | Indian portfolio return shown vs Nifty 50, US portfolio return shown vs S&P 500 — in both the chart legend and performance table with invested/current values. |
| 🔔 **Alerts quick-pick** | Alerts module shows portfolio stock buttons for one-tap alert creation. Analyst Target column removed from the portfolio table (still accessible in stock detail view). |

## 🔧 v4.4.1 Changelog (Bugfixes + Refactoring)

| Fix | Description |
|---|---|
| 🐛 **fetchPrices loop** | Removed `prices` from `useCallback` deps — was causing interval reset on every refresh. Uses functional `setPrices(prev => ...)` instead. |
| 🐛 **Double onClick** | Dark mode toggle had two `onClick` handlers (React only uses last). Removed the dead first handler. |
| 🐛 **Benchmark comparison** | `portfolioSeries` always returned `null` (dead code). Now computes actual portfolio return and displays it in legend + performance table vs Nifty 50/S&P 500. |
| ♻️ **useYahooSearch hook** | Extracted identical `doSearch` implementations from Section, Alerts, Watchlist, Lots into a single shared hook (~60 lines of duplication removed). |
| ♻️ **File split** | Extracted utils, theme, icons, AI, hooks into 5 separate modules. App.js reduced from 2,921 → 2,704 lines. |
| ♻️ **SidebarContent** | Documented closure dependencies for future extraction. |

---

## 🔄 Push to GitHub as v4.5.1

```cmd
cd C:\code
git add .
git commit -m "Portfolio Manager v4.5.1 - Benchmark chart fix, Screener, News feed"
git push
git tag v4.5.1
git push origin v4.5.1
```

Then create a GitHub Release → upload installer from `dist\` → Publish.
Running v4.x instances will show the Update Ready banner automatically.

---

## 💡 Tax Notes (India — Equity)
- **STCG** (Short Term Capital Gains) — Held < 12 months → 15% flat
- **LTCG** (Long Term Capital Gains) — Held ≥ 12 months → 10% above ₹1L exemption
- Tax estimates are indicative only — consult a CA for ITR filing
