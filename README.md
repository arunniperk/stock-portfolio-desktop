# Stock Portfolio Monitor

A high-performance, **Windows 11 desktop application** designed for tracking personal stock portfolios with a focus on speed, security, and multi-market insights. Built using **React 18** and **Vite**, the app offers a lightning-fast UI wrapped in an **Electron** shell for a native desktop experience [cite: package.json, main.js].

---

## 🚀 Key Features

* **Multi-Market Support**: Seamlessly track and toggle between **Indian Equity (INR)** and **US Equity (USD)** portfolios with dedicated currency views [cite: 1.png, 3.png].
* **Real-Time Analytics**: Visual dashboard providing real-time Total P&L, Daily P&L, and winner/loser counts across all holdings [cite: 1.png].
* **Deep Financial Visualizations**:
    * **Allocation Charts**: Interactive doughnut charts showing percentage-wise distribution of stocks [cite: 1.png, 3.png].
    * **Unrealized P&L Heatmaps**: Quick-glance progress bars indicating the performance of individual stocks [cite: 1.png].
    * **Performance Graphing**: Interactive price history charts with "Avg Buy Price" overlays for deep technical analysis [cite: 2.png].
* **Seamless Data Management**: Tools to **Export** and **Import** portfolio data, alongside manual "Add Holding" functionality [cite: 1.png].
* **Native Windows Integration**: Optimized for the Windows 11 desktop environment with support for both **Dark** and **Light** themes [cite: 1.png, 3.png, main.js].

---

## 🛠️ Technical Stack

* **Frontend**: React 18 with Vite [cite: package.json].
* **Desktop Layer**: Electron 41 [cite: package.json].
* **Data APIs**: Integrated with Yahoo Finance and Groq AI for live market data and intelligent insights [cite: index.html].
* **Typography**: Orbitron for headers, DM Sans for UI, and DM Mono for high-precision financial data [cite: index.html].
* **Build Tooling**: `electron-builder` for robust packaging and Windows installer generation [cite: build-win.bat].

---

## 📦 Installation & Setup

### For Users
1.  Navigate to the **Releases** section of the repository.
2.  Download `Stock Portfolio Monitor Setup.exe` for a full installation [cite: build-win.bat].
3.  Alternatively, download the **Portable** version to run the app instantly without installation [cite: package.json].

### For Developers
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/arunniperk/stock-portfolio-desktop.git
    cd stock-portfolio-desktop
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in development mode**:
    ```bash
    npm run dev
    ```
4.  **Build the Windows executable**:
    Run the automated batch script to clean, install, and package the app [cite: build-win.bat]:
    ```batch
    build-win.bat
    ```

---

## 🔒 Security

The application prioritizes data integrity with a strict **Content Security Policy (CSP)** [cite: index.html]:
* **Source Restrictions**: Only allows connections to trusted domains like `*.yahoo.com`, `api.groq.com`, and Google Fonts [cite: index.html].
* **Safe Communication**: Uses a `preload.js` script to bridge Electron APIs safely via `contextBridge`, keeping the renderer process isolated from system internals [cite: main.js, preload.js].

---

## 📄 Project Info

* **Version**: 4.1.0 [cite: package.json]
* **Author**: Arun Verma ([arunmcops@gmail.com](mailto:arunmcops@gmail.com)) [cite: package.json]
* **Repository**: [arunniperk/stock-portfolio-desktop](https://github.com/arunniperk/stock-portfolio-desktop) [cite: package.json]
