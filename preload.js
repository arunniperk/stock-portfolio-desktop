// preload.js  –  exposes safe Electron APIs to the renderer via contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls (called from the custom React title bar)
  minimize:      () => ipcRenderer.send('window-minimize'),
  maximize:      () => ipcRenderer.send('window-maximize'),
  close:         () => ipcRenderer.send('window-close'),

  // Auto-updater (renderer triggers install when user clicks the banner)
  installUpdate: () => ipcRenderer.send('install-update'),

  // Listeners pushed from main process
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available',  () => cb()),
  onUpdateDownloaded:(cb) => ipcRenderer.on('update-downloaded', () => cb()),
});
