# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for tracking personal stock portfolios across Indian and US markets. Built with **React 18** and **Vite**, wrapped in an **Electron** shell — with NVIDIA-style dark UI, dual AI analysis (Groq + Gemini), real-time Yahoo Finance data, and built-in tax planning tools.

---

## 🚀 Key Features

### Portfolio Management
- **Multi-Market Support** — Dedicated tabs for **Indian Equity (₹ INR)** and **US Equity ($ USD)**
- **Multi-Portfolio** — Create, rename, delete multiple portfolios
- **Unpledged Quantity Tracking** — Track pledged vs free shares per holding
- **Analyst Targets** — Set, revise, clear price targets; upside/downside % shown inline
- **CSV & XLSX Export** — Full metrics export in both formats
- **CSV Import** — Drag-and-drop with column auto-detection

### Stock Detail View
- **Click any stock** to open a dedicated tab
- **Interactive SVG Price Chart** — 1M/3M/6M/1Y range selector with buy price and target overlays
- **Day-wise P&L Table** — From 30 Mar 2026 · Bar chart + Cumulative P&L column
- **Fundamentals Panel** — Market Cap, P/E, EPS, 52W High/Low, Volume, Beta, Div Yield
- **Your Position Panel** — Qty, Unpledged Qty, Invested, Market Value, Unrealized P&L
- **Analyst Consensus** — Recommendation, analyst count, mean target price

### New in v4.3 — Tools
- **👁 Watchlist** — Track stocks you're researching. Set target entry and exit prices. Visual alerts when price is near entry (within 5%) or hits exit target. Search autocomplete, notes, CSV export
- **📋 Buy Lots Tracker** — Record individual buy transactions per stock with date. Calculates weighted average buy price per stock. Shows per-lot P&L, holding period, STCG/LTCG status. Shared with Tax module
- **🧾 Tax P&L (STCG/LTCG)** — FY 2025-26 tax computation. STCG 15%, LTCG 10% (above ₹1L). Record sales, see realized vs unrealized tax liability. Export ITR-ready data as CSV

### AI Analysis (Optional)
- **Dual AI** — Groq (Llama 3.3 70B, free) + Gemini (2.0 Flash, free tier)
- **Primary + Fallback** — Auto-fallback if primary quota hits
- **Per-stock Analysis** — Sentiment, opportunities, risks, position comment
- **Provider toggle** — Switch between Groq/Gemini per stock

### UI & UX
- **NVIDIA-style dark theme** — `#0a0a0a` background, `#76b900` green accent
- **USD/INR live rate** — US P&L shown in both USD and INR equivalent
- **Error Boundary** — Recovery UI instead of white screen crash
- **Last-known price cache** — Prices persist on failed refresh
- **Auto-updater** — Silent GitHub release updates

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Desktop | Electron 41 |
| Bundler | electron-builder (NSIS + portable) |
| Data | Yahoo Finance v7/v8/v10 APIs |
| AI | Groq (Llama 3.3 70B) · Gemini (2.0 Flash) |
| Export | SheetJS (XLSX) · native Blob (CSV) |
| Charts | Custom SVG |
| Updates | electron-updater via GitHub Releases |

---

## 📦 Installation

### For Users
1. Download `Stock Portfolio Monitor Setup 4.3.0.exe` from Releases
2. On first launch — enter Groq/Gemini keys or skip for Yahoo-only mode

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

## 🔒 Security
- CSP restricts connections to Yahoo Finance, Groq, and Gemini only
- API keys stored in `localStorage` — never sent elsewhere
- No telemetry, no analytics

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.3.0 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 📁 File Structure

```
C:\code\
├── package.json       # v4.3.0, dependencies, build config
├── vite.config.js
├── index.html         # CSP meta tag
├── main.js            # Electron main + auto-updater
├── preload.js         # contextBridge
├── build-win.bat      # Build script
├── README.md
├── assets/icon.ico    # Portfolio P icon (7 sizes)
└── src/
    ├── index.js       # React entry point
    └── App.js         # Full app (~2,250 lines)
                       # Includes: WatchlistModule, LotsModule,
                       # TaxModule, StockDetailView, Section,
                       # AISetupModal, AIAnalysis, ErrorBoundary
```

---

## 🔄 Push to GitHub as v4.3

```cmd
cd C:\code
git add .
git commit -m "Portfolio Manager v4.3 - Watchlist, Buy Lots, Tax P&L"
git push
git tag v4.3.0
git push origin v4.3.0
```

Then create a GitHub Release at:
`github.com/arunniperk/stock-portfolio-desktop/releases`
Upload installer from `dist\` and publish.
