import { useState, useRef, useCallback } from 'react';
import { yahooSearch } from './utils';

// ── FIX #4: Shared Yahoo Finance search hook ─────────────────────────────────
// Replaces 4 identical doSearch implementations (Section, Alerts, Watchlist, Lots)
export function useYahooSearch() {
  const [srch, setSrch] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const [busyS, setBusyS] = useState(false);
  const timer = useRef(null);

  const doSearch = useCallback((q) => {
    setSrch(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setBusyS(true);
      try {
        const found = await yahooSearch(q);
        setResults(found);
      } catch { setResults([]); }
      setBusyS(false);
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSrch('');
    setResults([]);
  }, []);

  return { srch, setSrch, results, setResults, focused, setFocused, busyS, doSearch, clearSearch };
}

// ── Notes hook ───────────────────────────────────────────────────────────────
export function useNotes() {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_notes') || '{}'); }
    catch { return {}; }
  });
  const saveNote = (sym, text) => {
    setNotes(p => {
      const n = { ...p };
      if (text.trim()) n[sym] = text; else delete n[sym];
      localStorage.setItem('pm_notes', JSON.stringify(n));
      return n;
    });
  };
  return { notes, saveNote };
}
