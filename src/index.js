import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { preloadStorage, flushAll } from './storage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Pre-load all storage keys from disk (and run one-time localStorage migration
// if this is the first launch after the file-storage upgrade).
// Only then mount React so that all useState() initialisers get synchronous
// cache hits via getItemSync().
preloadStorage().then(async () => {
  // ── Capacitor Setup ───────────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    } catch (e) {
      console.warn('Capacitor StatusBar error:', e);
    }
  }
  // ── Graceful-close handler ────────────────────────────────────────────────
  // When Electron signals the window is about to close, flush every key in
  // the in-memory cache to disk, then tell main it is safe to quit.
  if (window.electronAPI?.onAppClosing) {
    window.electronAPI.onAppClosing(async () => {
      try {
        await flushAll();
      } finally {
        window.electronAPI.flushComplete();
      }
    });
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});