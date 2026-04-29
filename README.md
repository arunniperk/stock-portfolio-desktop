# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for managing personal stock portfolios across Indian and US markets. Built with **React 18 + Vite + Electron** — NVIDIA-style dark UI, dual AI analysis, real-time Yahoo Finance data, sector analysis, benchmark comparison, news feed, and full financial toolset.

---

## 🚀 Key Features

### ⚡ Performance & Optimization (v4.6.0)
- **75% Payload Reduction** — Implemented **React.lazy** and **Code Splitting**. Initial JS bundle size dropped from **471 KB to 117 KB**.
- **Dynamic XLSX Loading** — The heavy Excel export library (~430 KB) loads only on-demand, saving significant startup memory and execution time.
- **Instant "Orbitron" Startup** — New splash screen mask with background data hydration prevents UI thread blocking and provides immediate visual feedback.
- **Pure Desktop Architecture** — Purged all mobile/Capacitor dependencies for a leaner, faster Windows experience with a significantly reduced install footprint.

### Portfolio Management
- **Multi-market** — Indian Equity (₹) and US Equity ($) in separate tabs
- **Multi-portfolio** — Create, rename, delete multiple portfolios
- **Free Qty** — Track pledged vs free shares per holding
- **USD/INR live rate** — All US P&L shown in USD + INR equivalent
- **CSV & XLSX export** — Full metrics in both formats (with dynamic library loading)
- **CSV import** — Drag-and-drop with column auto-detection
- **Collapsible UI** — Hide left/right sidebars for maximum focus on your portfolio grid

### Stock Detail Analysis
- **Interactive SVG price chart** — 1M/3M/6M/1Y with buy price + target overlays
- **Analyst Targets** — Set/revise targets per stock; upside/downside % shown inline
- **Fundamentals** — Market Cap, P/E, EPS, 52W H/L, Volume, Beta, Div Yield
- **AI Analysis** — Dual-provider (Groq/Gemini) sentiment, opportunities, risks, and position commentary.

---

## 🧰 Tools (Sidebar)

| Tool | Description |
|---|---|
| 👁 **Watchlist** | Track stocks with target entry/exit prices. Highlights near-entry (amber) and target-hit (green). |
| 📝 **Notes** | Per-stock notes/rationale. Card view of all annotated stocks. |
| 🔔 **Price Alerts** | Streamlined alert management with dual targets and automatic direction detection. |
| 🏭 **Sectors** | Group holdings by sector with unified INR conversion and interactive donut charts. |
| 📰 **News** | Filtered news feed from Yahoo Finance for portfolio stocks + market indices. |
| 📊 **Benchmark** | Compare portfolio performance vs **Nifty 50** and **S&P 500** with dynamic time-series graphs. |
| 📈 **History** | Auto-snapshots portfolio value daily. Line chart + daily performance table. |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Lazy Loaded) + Vite 5 |
| Desktop | Electron 41 (Frameless) |
| Data | Yahoo Finance v8 Chart + v10 Summary APIs |
| AI | Groq (Llama 3.3 70B) · Gemini 2.0 Flash |
| Export | SheetJS (Dynamically Loaded) · Native Blob (CSV) |
| Charts | Custom High-Performance SVG (0 Dependencies) |

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

---

## 🔒 Security
- CSP allows only `*.yahoo.com`, `api.groq.com`, `generativelanguage.googleapis.com`
- API keys stored locally only — never sent to external servers
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
| ⚡ **Performance Engine** | 75% smaller initial payload via React Lazy and code splitting. Dynamic XLSX loading removes 430KB of bloat from the main bundle. |
| 🚀 **Orbitron Startup** | Added an instant-load splash screen mask with background data hydration for near-instant perceived startup speed. |
| 📈 **Dynamic Benchmarking** | Portfolio returns are now graphed as time-series paths alongside Nifty 50 and S&P 500 with automatic date synchronization. |
| 🔔 **Alerts Refactor** | Streamlined alert creation with portfolio stock dropdowns and bulk-delete capabilities. |
| 🖥️ **Desktop Focus** | Purged all mobile/Capacitor files and dependencies to optimize for the Windows desktop environment. |
