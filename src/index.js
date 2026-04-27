import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { preloadStorage, flushAll } from './storage';

// Pre-load all storage keys from disk (and run one-time localStorage migration
// if this is the first launch after the file-storage upgrade).
// Only then mount React so that all useState() initialisers get synchronous
// cache hits via getItemSync().
preloadStorage().then(() => {
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