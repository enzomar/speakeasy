/**
 * useQuickPhrases — persist per-tab phrase customisations in localStorage.
 *
 * On first use, falls back to DEFAULT_PHRASES from boardTabs.js.
 * Users can add, remove, and reorder phrases per tab from Settings.
 */

import { useState, useCallback } from "react";
import { DEFAULT_PHRASES } from "../../data/boardTabs";

const STORAGE_KEY = "speakeasy_quick_phrases_v1";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

function getDefaults() {
  return {
    replies:      [...DEFAULT_PHRASES.replies],
    questions:    [...DEFAULT_PHRASES.questions],
    emergency:    [...DEFAULT_PHRASES.emergency],
    doctor:       [...DEFAULT_PHRASES.doctor],
    daily:        [...DEFAULT_PHRASES.daily],
    direction:    [...DEFAULT_PHRASES.direction],
    conversation: [...DEFAULT_PHRASES.conversation],
  };
}

export function useQuickPhrases() {
  const [phrases, setPhrases] = useState(() => readStored() ?? getDefaults());

  /** Get phrases for a specific tab id */
  const getTab = useCallback((tabId) => {
    return phrases[tabId] ?? [];
  }, [phrases]);

  /** Add a custom phrase to a tab */
  const addPhrase = useCallback((tabId, text, emoji = "💬") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPhrases(prev => {
      const list = prev[tabId] ?? [];
      // Avoid exact duplicates
      if (list.some(p => (p.translations?.en || p.label) === trimmed)) return prev;
      const next = {
        ...prev,
        [tabId]: [
          ...list,
          { id: `custom_${Date.now()}`, emoji, label: trimmed, translations: { en: trimmed } },
        ],
      };
      writeStored(next);
      return next;
    });
  }, []);

  /** Remove a phrase by id from a tab */
  const removePhrase = useCallback((tabId, phraseId) => {
    setPhrases(prev => {
      const list = prev[tabId] ?? [];
      const next = { ...prev, [tabId]: list.filter(p => p.id !== phraseId) };
      writeStored(next);
      return next;
    });
  }, []);

  /** Reset a tab to defaults */
  const resetTab = useCallback((tabId) => {
    setPhrases(prev => {
      const defaults = getDefaults();
      const next = { ...prev, [tabId]: defaults[tabId] ?? [] };
      writeStored(next);
      return next;
    });
  }, []);

  /** Reset all tabs to defaults */
  const resetAll = useCallback(() => {
    const defaults = getDefaults();
    writeStored(defaults);
    setPhrases(defaults);
  }, []);

  return { phrases, getTab, addPhrase, removePhrase, resetTab, resetAll };
}
