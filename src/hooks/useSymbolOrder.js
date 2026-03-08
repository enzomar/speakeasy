/**
 * useSymbolOrder — persist custom symbol ordering per category in localStorage.
 * Stores { [categoryId]: symbolId[] } — an ordered list of symbol IDs.
 * Categories without a saved order fall back to frequency-sorted defaults.
 */

import { useState, useCallback } from "react";

const KEY = "speakeasy_symbol_order_v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { /* quota */ }
}

export function useSymbolOrder() {
  const [orderMap, setOrderMap] = useState(read);

  /** Return the saved ID order for a category, or null if none saved. */
  const getOrder = useCallback((category) => {
    return orderMap[category] ?? null;
  }, [orderMap]);

  /** Save a new order (array of symbol IDs) for a category. */
  const saveOrder = useCallback((category, ids) => {
    setOrderMap(prev => {
      const next = { ...prev, [category]: ids };
      write(next);
      return next;
    });
  }, []);

  /** Reset the order for a category back to default. */
  const resetOrder = useCallback((category) => {
    setOrderMap(prev => {
      const next = { ...prev };
      delete next[category];
      write(next);
      return next;
    });
  }, []);

  return { getOrder, saveOrder, resetOrder };
}
