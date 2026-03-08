/**
 * useStorage — persist utterance history and user settings in localStorage.
 *
 * localStorage works in Capacitor WebView on both iOS and Android,
 * so no migration to @capacitor/preferences is needed.
 * Export uses Capacitor Share plugin on native for the system share sheet.
 */

import { useState, useCallback } from "react";
import { isNative } from "../utils/platform";

const HISTORY_KEY  = "speakeasy_history_v1";
const SETTINGS_KEY = "speakeasy_settings_v1";
const MAX_HISTORY  = 200; // cap stored entries

// ── Helpers ──────────────────────────────────────────────────────────────────

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch { /* quota */ }
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStorage() {
  const [history, setHistory]   = useState(() => readHistory());
  const [settings, setSettingsState] = useState(() => readSettings());

  /**
   * Save a spoken utterance to history.
   * Increments count if the phrase already exists, otherwise prepends a new entry.
   * @param {string} text
   */
  const saveUtterance = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let savedEntry;
    setHistory(prev => {
      const idx = prev.findIndex(
        h => h.text.toLowerCase() === trimmed.toLowerCase()
      );

      let next;
      if (idx !== -1) {
        // Bump count and move to top
        const updated = { ...prev[idx], count: prev[idx].count + 1, updatedAt: Date.now() };
        next = [updated, ...prev.filter((_, i) => i !== idx)];
        savedEntry = updated;
      } else {
        const newEntry = {
          id:        Date.now(),
          text:      trimmed,
          count:     1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        next = [newEntry, ...prev];
        savedEntry = newEntry;
      }

      writeHistory(next);
      return next;
    });
    return savedEntry;
  }, []);

  /** Remove a single history entry by id */
  const deleteUtterance = useCallback((id) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      writeHistory(next);
      return next;
    });
  }, []);

  /** Clear all history */
  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  /**
   * Export history as a downloadable JSON file.
   * Users can import this on another device (future feature).
   */
  const exportHistory = useCallback(async () => {
    const json = JSON.stringify({ version: 1, history }, null, 2);

    if (isNative) {
      // Use Capacitor Share sheet on native
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: "SpeakEasy Phrases",
          text: json,
          dialogTitle: "Export Phrases",
        });
      } catch { /* user cancelled */ }
      return;
    }

    // Web: download as file
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `speakeasy-phrases-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  /** Persist a settings key-value pair */
  const saveSetting = useCallback((key, value) => {
    setSettingsState(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  return {
    history,
    saveUtterance,
    deleteUtterance,
    clearHistory,
    exportHistory,
    settings,
    saveSetting,
  };
}
