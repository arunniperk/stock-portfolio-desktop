// storage.js — File-based persistent storage for Portfolio Tracker
// Saves each key as Documents\Portfolio\<key>.json via Electron IPC.
// Falls back to localStorage when running outside Electron (e.g. vite dev).

const isElectron = () =>
  typeof window !== 'undefined' &&
  typeof window.electronAPI !== 'undefined' &&
  typeof window.electronAPI.storageRead === 'function';

// ── In-memory write-through cache (avoids redundant disk writes) ────────────
const _cache = {};

/**
 * Read a stored value asynchronously.
 * Returns the raw JSON string (same contract as localStorage.getItem).
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getItem(key) {
  if (!isElectron()) {
    return localStorage.getItem(key);
  }
  if (Object.prototype.hasOwnProperty.call(_cache, key)) {
    return _cache[key];
  }
  const raw = await window.electronAPI.storageRead(key);
  _cache[key] = raw ?? null;
  return _cache[key];
}

/**
 * Write a value to disk asynchronously.
 * @param {string} key
 * @param {string} value   — JSON string
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  _cache[key] = value;
  if (!isElectron()) {
    localStorage.setItem(key, value);
    return;
  }
  await window.electronAPI.storageWrite(key, value);
}

// ── Known storage keys ───────────────────────────────────────────────────────
const KNOWN_KEYS = [
  'pm_portfolios', 'pm_activeId', 'pm_tweaks',
  'pm_groq_key', 'pm_gemini_key', 'pm_primary_ai',
  'pm_alerts', 'pm_sectors', 'pm_portfolio_history',
  'pm_watchlist', 'pm_lots', 'pm_sold_lots', 'pm_notes',
];

// ── One-time migration from localStorage → file storage ─────────────────────
async function migrateFromLocalStorage() {
  if (!isElectron()) return;

  // Check sentinel — if already migrated, skip
  const alreadyMigrated = await window.electronAPI.storageRead('pm_migrated');
  if (alreadyMigrated) {
    console.log('[storage] Migration already done, skipping.');
    return;
  }

  console.log('[storage] Starting one-time migration from localStorage → Documents\\Portfolio\\');
  let migratedCount = 0;

  await Promise.all(KNOWN_KEYS.map(async (key) => {
    let lsValue = null;
    try { lsValue = localStorage.getItem(key); } catch {}

    if (lsValue !== null && lsValue !== undefined) {
      // Only write to file if the file doesn't already have data
      const fileValue = await window.electronAPI.storageRead(key);
      if (!fileValue) {
        await window.electronAPI.storageWrite(key, lsValue);
        _cache[key] = lsValue;
        migratedCount++;
        console.log(`[storage] Migrated: ${key}`);
      }
    }
  }));

  // Write sentinel so migration never runs again
  await window.electronAPI.storageWrite('pm_migrated', JSON.stringify({ migratedAt: new Date().toISOString(), keys: migratedCount }));
  _cache['pm_migrated'] = JSON.stringify({ migratedAt: new Date().toISOString(), keys: migratedCount });

  console.log(`[storage] Migration complete — ${migratedCount} key(s) migrated.`);
}

// ── Synchronous bootstrap helper ─────────────────────────────────────────────
// 1. Runs one-time localStorage migration (if not done yet)
// 2. Pre-loads all known keys from disk into _cache so that useState
//    initialisers can read them synchronously on first render.

let _loaded = false;

export async function preloadStorage() {
  if (_loaded) return;

  // Step 1 — migrate old localStorage data (no-op after first run)
  await migrateFromLocalStorage();

  // Step 2 — warm the in-memory cache from disk
  if (isElectron()) {
    await Promise.all([...KNOWN_KEYS, 'pm_migrated'].map(async (k) => {
      if (!Object.prototype.hasOwnProperty.call(_cache, k)) {
        const raw = await window.electronAPI.storageRead(k);
        _cache[k] = raw ?? null;
      }
    }));
  }

  _loaded = true;
}

/**
 * Synchronous read from cache (only valid after preloadStorage() resolves).
 * Safe fallback: returns localStorage value or null.
 */
export function getItemSync(key) {
  if (Object.prototype.hasOwnProperty.call(_cache, key)) return _cache[key];
  // Fallback: localStorage (dev mode / first render race)
  try { return localStorage.getItem(key); } catch { return null; }
}

/**
 * Synchronous write — updates cache immediately, queues async disk write.
 */
export function setItemSync(key, value) {
  _cache[key] = value;
  if (!isElectron()) {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  window.electronAPI.storageWrite(key, value).catch(e =>
    console.error('[storage] write error', key, e)
  );
}

/**
 * flushAll() — writes every cached key to disk and resolves when done.
 * Called just before the app closes to make sure no writes are in-flight.
 */
export async function flushAll() {
  if (!isElectron()) return;
  const entries = Object.entries(_cache).filter(([, v]) => v !== null);
  if (!entries.length) return;
  await Promise.all(
    entries.map(([key, value]) =>
      window.electronAPI.storageWrite(key, value).catch(e =>
        console.error('[storage] flushAll write error', key, e)
      )
    )
  );
  console.log(`[storage] flushAll — ${entries.length} key(s) written.`);
}

