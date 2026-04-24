# Stock Portfolio Monitor

A high-performance, **Windows 11 desktop application** for tracking personal stock portfolios across Indian and US markets. Built with **React 18** and **Vite**, wrapped in an **Electron** shell for a native desktop experience — with NVIDIA-style dark UI, dual AI analysis (Groq + Gemini), and real-time Yahoo Finance data.

---

## 🚀 Key Features

### Portfolio Management
- **Multi-Market Support** — Dedicated tabs for **Indian Equity (₹ INR)** and **US Equity ($ USD)** portfolios with separate sidebars, allocation charts, and P&L tracking
- **Multi-Portfolio** — Create, rename, and delete multiple portfolios; switch between them instantly
- **Unpledged Quantity Tracking** — Track pledged vs free shares per holding with inline editing
- **Analyst Targets** — Set, revise, and clear price targets per stock; upside/downside % shown inline
- **CSV & XLSX Export** — Export holdings with full metrics (Invested, LTP, Day P&L, P&L%, Alloc%, Target, Upside%) to both formats
- **CSV Import** — Drag-and-drop import with column auto-detection; supports Symbol, Qty, Buy Price, Name, Analyst Target

### Stock Detail View
- **Click any stock row** to open it in a dedicated tab
- **Interactive Price Chart** — SVG price history with 1M / 3M / 6M / 1Y range selector; Avg Buy Price and Analyst Target overlaid as dashed lines
- **Day-wise P&L Table** — Full history of daily Open/High/Low/Close/Change%/Day P&L with **Cumulative P&L column** and **bar chart visualization**
- **Fundamentals Panel** — Market Cap, P/E (TTM), EPS, 52W High/Low, Volume, Beta, Dividend Yield via Yahoo Finance v7 API
- **Your Position Panel** — Qty, Unpledged Qty, Avg Buy Price, Invested, Market Value, Unrealized P&L, Return %, Day P&L
- **Analyst Consensus** — Recommendation key, analyst count, mean price target

### AI Analysis (Optional)
- **Dual AI Provider Support** — Configure **Groq** (Llama 3.3 70B, free) and/or **Gemini** (2.0 Flash, free tier) independently
- **Primary + Fallback** — Set one as primary; app automatically falls back to the other if primary fails or hits quota
- **Provider Switcher** — Toggle between Groq and Gemini per-stock when both keys are configured
- **AI Insights** — Sentiment (Bullish/Neutral/Bearish), company overview, opportunities, risks, recent performance, position-specific comment
- **First-Launch Setup** — Modal prompts for AI keys on first run; skip to use Yahoo Finance only
- **Key Management** — Add, update, test, remove keys and switch primary provider from Settings

### UI & UX
- **NVIDIA-style dark theme** — `#0a0a0a` background, `#76b900` green accent, flat cards, rounded corners
- **Dark / Light mode toggle**
- **Compact rows toggle**
- **Auto-refresh** — Configurable 1–30 min interval with live price indicator
- **Error Boundary** — Prevents white-screen crashes; shows recovery UI with Try Again / Reload App
- **Last-known price cache** — Prices persist across failed refreshes instead of going blank
- **Sortable columns** — Click any column header to sort asc/desc; Allocation % defaults to descending
- **Stock search autocomplete** — Yahoo Finance search with query1/query2 fallback
- **Auto-updater** — Silently downloads new releases from GitHub; shows update banner in title bar

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Desktop | Electron 41 |
| Bundler | electron-builder (NSIS installer + portable) |
| State | React useState / useCallback / useMemo |
| Data | Yahoo Finance v7 & v8 APIs (no API key required) |
| AI | Groq API (Llama 3.3 70B) · Google Gemini API (2.0 Flash) |
| Export | xlsx (SheetJS) for XLSX · native Blob for CSV |
| Charts | Custom SVG (no chart library dependency) |
| Updates | electron-updater via GitHub Releases |

---

## 📦 Installation

### For Users
1. Go to the **Releases** tab on GitHub
2. Download `Stock Portfolio Monitor Setup 4.2.0.exe` for a standard installation
3. Or download the **Portable** `.exe` to run without installing
4. On first launch, an AI setup modal will appear — enter Groq/Gemini keys or skip to use Yahoo Finance only

### For Developers
```bash
# Clone
git clone https://github.com/arunniperk/stock-portfolio-desktop.git
cd stock-portfolio-desktop

# Install dependencies
npm install

# Development mode (Vite dev server — no Electron)
npm run dev

# Build Windows installer
build-win.bat
```

> Run `build-win.bat` as **Administrator** (required for symlink creation during packaging)

### AI API Keys (Optional — both are free)

| Provider | Key format | Free tier | Get key |
|---|---|---|---|
| Groq | `gsk_…` | 14,400 req/day | console.groq.com |
| Gemini | `AIza…` | 1,500 req/day | aistudio.google.com |

---

## 🔒 Security

- **Content Security Policy** — Renderer only connects to `*.yahoo.com`, `api.groq.com`, `generativelanguage.googleapis.com`
- **contextBridge** — Electron APIs (minimize, maximize, close, auto-updater) are exposed to the renderer via `preload.js` with no direct Node.js access
- **Local storage only** — API keys stored in `localStorage`; never sent to any server other than the respective AI provider
- **No telemetry** — No usage tracking, no analytics, no external logging

---

## 📄 Project Info

| Field | Value |
|---|---|
| Version | 4.2.0 |
| Author | Arun Verma (arunmcops@gmail.com) |
| Repository | github.com/arunniperk/stock-portfolio-desktop |
| License | Private |
| Platform | Windows 10 / 11 (64-bit) |

---

## 📁 File Structure

```
C:\code\
├── package.json          # Dependencies, version, build config, GitHub publish
├── vite.config.js        # Vite build (esbuild minifier, base './')
├── index.html            # Root HTML with CSP meta tag
├── main.js               # Electron main process, auto-updater, window config
├── preload.js            # contextBridge: window controls + update events
├── build-win.bat         # 4-step build script (install → build → package)
├── README.md             # This file
├── assets/
│   └── icon.ico          # Multi-size ICO (16–256px, NV-style green on black)
└── src/
    ├── index.js           # React entry point
    └── App.js             # Entire application (single-file, ~1,540 lines)
```

---

## 🔄 Auto-Update Workflow

```
Developer:                    User (running app):
  bump version in package.json    ↓
  build-win.bat                   auto-updater checks GitHub releases
  git tag v4.x.x                  downloads update silently
  git push origin v4.x.x          shows "Update Ready" banner
  create GitHub Release           user clicks → installs on exit
  upload .exe
```
