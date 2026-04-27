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
| 🔔 **Price Alerts** | Set dual price targets (**Target 1** & **Target 2**) per stock. Sequential hit tracking. Inline editing to reset targets after they are met. Browser notifications. |
| 🏭 **Sectors** | Group holdings by sector. All values unified in INR. **Total Portfolio Value** shown in INR. Interactive donut chart. Fetches sector from Yahoo Finance. |
| 📰 **News** | Latest news from Yahoo Finance for portfolio stocks + market indices. Thumbnails, publisher, time-ago. Filter: All / Portfolio / Market. |
| 📊 **Benchmark** | Compare Indian portfolio vs Nifty 50, US portfolio vs S&P 500 over 1M/3M/6M/1Y. Performance table with invested/current/return. |
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
1. Download `Stock Portfolio Monitor Setup 4.5.2.exe` from Releases
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
├── package.json       # v4.5.2, dependencies, build config
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
| Version | 4.5.2 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.5.2 Changelog

| Change | Description |
|---|---|
| 🔔 **Multi-Target Alerts** | Overhauled Alerts module to support dual targets (**Target 1** and **Target 2**). Sequential tracking, independent hit timestamps, and **inline editing** for triggered alerts to easily reset targets. |
| ↔️ **Collapsible Sidebars** | Added toggle buttons to collapse both left and right sidebars independently. Main content area now expands to fill the screen. State persists across app launches. |
| 📈 **Split Daily Snapshots** | History module now shows independent **IN Day Chg** and **US Day Chg** columns in the daily snapshot table for better market-specific tracking. |
| 🏭 **Total Value in Sectors** | Sector Allocation header now displays the **Total Portfolio Value** in INR (calculated via live USD/INR exchange rates). |
| 🧹 **Module Cleanup** | Removed "Buy Lots", "Tax P&L", and "Screener" modules to simplify the interface and focus on core portfolio management. |
| 🛡️ **Improved Fetching** | Enhanced Yahoo Finance data retrieval with multi-server fallbacks and batched requests to prevent connection errors and rate limiting. |

---

## 🔄 Push to GitHub as v4.5.2

```cmd
cd C:\code
git add .
git commit -m "Portfolio Manager v4.5.2 - Multi-target alerts, collapsible sidebars, split history"
git push
git tag v4.5.2
git push origin v4.5.2
```

---

## 💡 Tax Notes (India — Equity)
- **STCG** (Short Term Capital Gains) — Held < 12 months → 15% flat
- **LTCG** (Long Term Capital Gains) — Held ≥ 12 months → 10% above ₹1L exemption
- Tax estimates are indicative only — consult a CA for ITR filing
