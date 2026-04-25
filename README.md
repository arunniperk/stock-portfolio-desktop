# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for managing personal stock portfolios across Indian and US markets. Built with **React 18 + Vite + Electron** — NVIDIA-style dark UI, dual AI analysis, real-time Yahoo Finance data, tax planning, sector analysis, benchmark comparison, and full financial toolset.

---

## 🚀 Features

### Portfolio Management
- **Multi-market** — Indian Equity (₹) and US Equity ($) in separate tabs
- **Multi-portfolio** — Create, rename, delete multiple portfolios
- **Unpledged Qty** — Track pledged vs free shares per holding
- **Analyst Targets** — Set/revise targets; upside/downside % shown inline
- **USD/INR live rate** — All US P&L shown in USD + INR equivalent
- **CSV & XLSX export** — Full metrics in both formats
- **CSV import** — Drag-and-drop with column auto-detection

### Stock Detail Tab
- **Click any stock** to open a dedicated analysis tab
- **Interactive SVG price chart** — 1M/3M/6M/1Y with buy price + target overlays
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

### v4.3 — High Value
| Tool | Description |
|---|---|
| 👁 **Watchlist** | Track stocks with target entry/exit prices. Highlights near-entry (amber) and target-hit (green). Notes field. CSV export. |
| 📋 **Buy Lots** | Record individual buy transactions. Weighted avg price per stock. Per-lot P&L. STCG/LTCG badge. Shared with Tax module. |
| 🧾 **Tax P&L** | FY 2025-26 STCG/LTCG computation. Record sales, view realized vs unrealized liability. ITR-ready CSV export. |

### v4.4 — Medium Value
| Tool | Description |
|---|---|
| 📝 **Notes** | Per-stock notes/rationale. Card view of all annotated stocks. Edit in-place. |
| 🔔 **Price Alerts** | Set above/below thresholds per stock. Browser notifications on trigger. Active + triggered log. |
| 🏭 **Sectors** | Group holdings by sector. Interactive donut chart. Fetches sector from Yahoo Finance. Manual override. |
| 📊 **Benchmark** | Compare Nifty 50 + S&P 500 performance over 1M/3M/6M/1Y. Interactive SVG line chart. Performance table. |
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
1. Download `Stock Portfolio Monitor Setup 4.4.0.exe` from Releases
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
├── package.json       # v4.4.0, dependencies, build config
├── vite.config.js
├── index.html         # CSP: Yahoo, Groq, Gemini only
├── main.js            # Electron main + auto-updater
├── preload.js         # contextBridge (window controls, update events)
├── build-win.bat      # Build script (run as Administrator)
├── README.md
├── assets/icon.ico    # Portfolio P icon — 7 sizes (16–256px)
└── src/
    ├── index.js       # React entry
    └── App.js         # ~2,900 lines — full single-file app
                       # Modules: Watchlist, BuyLots, Tax, Notes,
                       # Alerts, Sectors, Benchmark, History,
                       # StockDetailView, Section, AI components,
                       # ErrorBoundary, PortfolioTabs
```

---

## 🔒 Security
- CSP allows only `*.yahoo.com`, `api.groq.com`, `generativelanguage.googleapis.com`
- API keys in `localStorage` only — never sent elsewhere
- No telemetry, no analytics, no external logging

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.4.0 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 🔄 Push to GitHub as v4.4

```cmd
cd C:\code
git add .
git commit -m "Portfolio Manager v4.4 - Notes, Alerts, Sectors, Benchmark, History"
git push
git tag v4.4.0
git push origin v4.4.0
```

Then create a GitHub Release → upload installer from `dist\` → Publish.
Running v4.x instances will show the Update Ready banner automatically.

---

## 💡 Tax Notes (India — Equity)
- **STCG** (Short Term Capital Gains) — Held < 12 months → 15% flat
- **LTCG** (Long Term Capital Gains) — Held ≥ 12 months → 10% above ₹1L exemption
- Tax estimates are indicative only — consult a CA for ITR filing
