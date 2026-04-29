# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for managing personal stock portfolios across Indian and US markets. Built with **React 18 + Vite + Electron** — NVIDIA-style dark UI, dual AI analysis, real-time Yahoo Finance data, sector analysis, benchmark comparison, news feed, and full financial toolset.

---

## 🚀 Features

### Portfolio Management
- **Multi-market** — Indian Equity (₹) and US Equity ($) in separate tabs
- **Multi-portfolio** — Create, rename, delete multiple portfolios
- **Free Qty** — Track pledged vs free shares per holding
- **USD/INR live rate** — All US P&L shown in USD + INR equivalent
- **CSV & XLSX export** — Full metrics in both formats
- **CSV import** — Drag-and-drop with column auto-detection
- **Collapsible UI** — Hide left/right sidebars for maximum focus on your portfolio grid
- **Window Management** — Standardized Minimize, Maximize, and Close controls for the frameless desktop environment

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
| 📝 **Notes** | Per-stock notes/rationale. Card view of all annotated stocks. Edit in-place. |
| 🔔 **Price Alerts** | Manage alerts with a direct portfolio stock dropdown. Set dual price targets (**Target 1** & **Target 2**) per stock with automatic direction detection. Bulk-delete alerts per stock. |
| 🏭 **Sectors** | Group holdings by sector. All values unified in INR. **Total Portfolio Value** shown in INR. Interactive donut chart. Fetches sector from Yahoo Finance. |
| 📰 **News** | Latest news from Yahoo Finance for portfolio stocks + market indices. Thumbnails, publisher, time-ago. Filter: All / Portfolio / Market. |
| 📊 **Benchmark** | Compare portfolio performance vs Nifty 50 and S&P 500 using **dynamic time-series graphs**. Standardized date normalization for accurate comparative analysis. |
| 📈 **History** | Auto-snapshots portfolio value daily on each price refresh. Split **IN Day Change** and **US Day Change** columns. Line chart + daily table. |

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
1. Download `Stock Portfolio Monitor Setup 4.6.0.exe` from Releases
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
├── package.json       # v4.6.0, dependencies, build config
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
    ├── App.js         # main app shell + navigation logic
    ├── modules.js     # Tool modules (Watchlist, Alerts, Sectors, etc.)
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
| Version | 4.6.0 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.6.0 Changelog

| Change | Description |
|---|---|
| 📈 **Dynamic Benchmarking** | Portfolio returns are now graphed as time-series paths alongside Nifty 50 and S&P 500. Automatic date synchronization ensures apples-to-apples performance comparison over any selected range. |
| 🔔 **Alerts Refactor** | Streamlined alert creation with portfolio stock dropdowns. Removed redundant "DIR" columns and added bulk-delete capabilities per stock for cleaner management. |
| ⚡ **Performance Boost** | Throttled history snapshots and optimized data memoization. App remains fluid even with massive portfolios by reducing disk IO and unnecessary re-renders. |
| 🖱️ **Improved Scrolling** | Resolved vertical scroll issues in modules by implementing a more robust container architecture. Standardized window control icons for better UI consistency. |
| 📅 **Weekly View** | Set default benchmark chart range to 'Current Week' (5D) for immediate focus on recent market movements. |

---

## 🔄 Push to GitHub as v4.6.0

```cmd
git add .
git commit -m "Portfolio Manager v4.6.0 - Dynamic benchmarking, alerts refactor, and performance optimizations"
git push
git tag v4.6.0
git push origin v4.6.0
```
