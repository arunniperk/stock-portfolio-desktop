// main.js  –  Electron main process
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path   = require('path');
const isDev  = process.env.NODE_ENV === 'development';

// ── Auto-updater (electron-updater) ──────────────────────────────────────────
// Only active in production builds. Requires the "publish" key in package.json
// pointing at your GitHub releases page. Tag your releases as vX.Y.Z.
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload       = true;   // download silently in background
  autoUpdater.autoInstallOnAppQuit = false; // we'll ask the user first
} catch (e) {
  // electron-updater not installed yet (dev environment) — safe to ignore
}

let mainWindow;

function createWindow() {
  // Fill the primary display by default (respects multi-monitor setups)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth:  900,
    minHeight: 600,
    frame:     false,          // Custom Orbitron title bar drawn in React
    show:      false,          // Avoid white flash before content loads
    backgroundColor: '#020408',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  // Show once ready — removes the white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start maximised but don't go full-screen (user can resize)
    mainWindow.maximize();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

// ── Window control IPC ────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── Auto-update IPC ───────────────────────────────────────────────────────────
ipcMain.on('install-update', () => {
  autoUpdater?.quitAndInstall(false, true);
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // Start update check 3 seconds after launch (non-blocking)
  if (autoUpdater && !isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 3000);

    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-downloaded');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
