/**
 * useFavorites — persist a list of favourite phrases/words in localStorage.
 * Each entry: { id: number, text: string, emoji?: string }
 */

import { useState, useCallback } from "react";

const FAVS_KEY  = "speakeasy_favorites_v1";
const MAX_FAVS  = 100;

function read() {
  try { return JSON.parse(localStorage.getItem(FAVS_KEY) ?? "[]"); }
  catch { return []; }
}

function write(items) {
  try { localStorage.setItem(FAVS_KEY, JSON.stringify(items.slice(0, MAX_FAVS))); }
  catch { /* quota */ }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(read);

  const addFavorite = useCallback((text, emoji = "") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setFavorites(prev => {
      // avoid exact duplicates
      if (prev.some(f => f.text.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [{ id: Date.now(), text: trimmed, emoji }, ...prev];
      write(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      write(next);
      return next;
    });
  }, []);

  const updateFavorite = useCallback((id, text, emoji) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setFavorites(prev => {
      const next = prev.map(f =>
        f.id === id ? { ...f, text: trimmed, emoji: emoji ?? f.emoji } : f
      );
      write(next);
      return next;
    });
  }, []);

  const moveFavorite = useCallback((id, direction) => {
    setFavorites(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      write(next);
      return next;
    });
  }, []);

  return { favorites, addFavorite, removeFavorite, updateFavorite, moveFavorite };
}
