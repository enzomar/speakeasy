/**
 * useCustomSymbols — manage user-created symbols and hidden built-in symbols.
 *
 * Custom symbols: { id, label, emoji, category }  (stored in localStorage)
 * Hidden IDs:     Set of built-in symbol IDs the user chose to hide.
 */

import { useState, useCallback } from "react";

const CUSTOM_KEY = "speakeasy_custom_symbols_v1";
const HIDDEN_KEY = "speakeasy_hidden_symbols_v1";
const MAX_CUSTOM = 200;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)); }
  catch { return fallback; }
}

function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

export function useCustomSymbols() {
  const [custom, setCustom] = useState(() => readJSON(CUSTOM_KEY, []));
  const [hidden, setHidden] = useState(() => readJSON(HIDDEN_KEY, []));

  // ── Custom symbols ──────────────────────────────────────────────────────

  const addSymbol = useCallback((label, emoji, category) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustom(prev => {
      if (prev.some(s => s.label.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, { id: `custom_${Date.now()}`, label: trimmed, emoji: emoji || "⭐", category: category || "social" }];
      writeJSON(CUSTOM_KEY, next.slice(0, MAX_CUSTOM));
      return next.slice(0, MAX_CUSTOM);
    });
  }, []);

  const removeSymbol = useCallback((id) => {
    setCustom(prev => {
      const next = prev.filter(s => s.id !== id);
      writeJSON(CUSTOM_KEY, next);
      return next;
    });
  }, []);

  const updateSymbol = useCallback((id, label, emoji, category) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustom(prev => {
      const next = prev.map(s =>
        s.id === id ? { ...s, label: trimmed, emoji: emoji || s.emoji, category: category || s.category } : s
      );
      writeJSON(CUSTOM_KEY, next);
      return next;
    });
  }, []);

  // ── Hidden built-in symbols ─────────────────────────────────────────────

  const hideSymbol = useCallback((id) => {
    setHidden(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeJSON(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const unhideSymbol = useCallback((id) => {
    setHidden(prev => {
      const next = prev.filter(h => h !== id);
      writeJSON(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const isHidden = useCallback((id) => hidden.includes(id), [hidden]);

  return {
    custom,
    hidden,
    addSymbol,
    removeSymbol,
    updateSymbol,
    hideSymbol,
    unhideSymbol,
    isHidden,
  };
}
