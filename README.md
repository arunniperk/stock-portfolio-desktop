# Stock Portfolio Monitor

A high-performance **Windows 11 desktop application** for managing personal stock portfolios across Indian and US markets. Built with **React 18 + Vite + Electron** — NVIDIA-style dark UI, dual AI analysis, real-time Yahoo Finance data, sector analysis, benchmark comparison, news feed, and full financial toolset.

---

## 🚀 Key Features

### ⚡ Performance & Optimization (v4.6.1)
- **75% Payload Reduction** — Implemented **React.lazy** and **Code Splitting**. Initial JS bundle size is just **117 KB**.
- **Dynamic XLSX Loading** — Heavy libraries load only on-demand, saving significant startup memory.
- **Instant "Orbitron" Startup** — Splash screen with background hydration prevents UI thread blocking.
- **Data Safety (v4.6.1)** — Fixed critical startup race conditions to prevent data loss during asynchronous loading.
- **Forced CSV Backups** — Optional mandatory CSV export on exit that now includes both **Portfolio Holdings** and **Price Alerts**.

### Portfolio Management
- **Multi-market** — Indian Equity (₹) and US Equity ($) in separate tabs
- **Multi-portfolio** — Create, rename, delete multiple portfolios
- **CSV & XLSX export** — Full metrics in both formats
- **CSV import** — Drag-and-drop with column auto-detection
- **Collapsible UI** — Hide left/right sidebars for maximum focus

### Stock Detail Analysis
- **Interactive SVG price chart** — 1M/3M/6M/1Y with buy price + target overlays
- **Analyst Targets** — Set/revise targets per stock; upside/downside % shown inline
- **AI Analysis** — Dual-provider (Groq/Gemini) sentiment and risks.

---

## 🧰 Tools (Sidebar)

| Tool | Description |
|---|---|
| 👁 **Watchlist** | Track stocks with target entry/exit prices. |
| 📝 **Notes** | Per-stock notes/rationale. |
| 🔔 **Price Alerts** | Dual targets and automatic direction detection. Included in auto-backups. |
| 🏭 **Sectors** | Group holdings by sector with unified INR conversion. |
| 📰 **News** | Filtered news feed from Yahoo Finance. |
| 📊 **Benchmark** | Compare performance vs **Nifty 50** and **S&P 500** via time-series graphs. |
| 📈 **History** | Auto-snapshots portfolio value daily. |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Lazy Loaded) + Vite 5 |
| Desktop | Electron 41 (Frameless) |
| Data | Yahoo Finance v8 Chart + v10 Summary APIs |
| AI | Groq (Llama 3.3 70B) · Gemini 2.0 Flash |
| Export | SheetJS (Dynamically Loaded) · Native Blob (CSV) |

---

## 📦 Installation

### For Users
1. Download `Stock Portfolio Monitor Setup 4.6.1.exe` from Releases
2. On first launch — enter Groq/Gemini keys or skip

### For Developers
```bash
git clone https://github.com/arunniperk/stock-portfolio-desktop.git
cd stock-portfolio-desktop
npm install
build-win.bat   # Run as Administrator
```

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.6.1 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.6.1 Changelog

| Change | Description |
|---|---|
| 🛡️ **Data Integrity** | Fixed a critical race condition where initial states could overwrite disk data during the async startup phase. |
| 💾 **Enhanced Backups** | Forced exit modal now includes **Price Alerts** in the generated CSV backup. |
| ⚡ **Performance Engine** | 75% smaller initial payload via React Lazy. Dynamic XLSX loading removes 430KB of bloat. |
| 🚀 **Orbitron Startup** | Instant-load splash screen with background data hydration. |
| 🖥️ **Desktop Focus** | Purged all mobile/Capacitor files to optimize for Windows. |
