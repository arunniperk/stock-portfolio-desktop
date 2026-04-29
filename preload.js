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

  // File-based storage (reads/writes Documents\Portfolio\<key>.json)
  storageRead:  (key)        => ipcRenderer.invoke('storage-read',  key),
  storageWrite: (key, value) => ipcRenderer.invoke('storage-write', key, value),

  // Generic file saving (any name in Documents\Portfolio)
  fileSave:     (name, data) => ipcRenderer.invoke('file-save', name, data),

  // Graceful-close handshake
  // main → renderer: "please flush your storage now"
  onAppClosing:  (cb) => ipcRenderer.on('app-closing', () => cb()),
  // renderer → main: "all writes are done, safe to quit"
  flushComplete: ()   => ipcRenderer.send('flush-complete'),

  // Secure cross-origin fetch via main process
  netFetch:      (url, options) => ipcRenderer.invoke('net-fetch', url, options),
});

