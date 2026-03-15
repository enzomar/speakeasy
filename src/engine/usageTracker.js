/**
 * usageTracker.js — Lightweight in-memory usage analytics for the AAC engine.
 *
 * Tracks tap patterns, suggestion selections, and correction rates to enable
 * frequency-based prediction improvements and vocabulary optimization.
 *
 * Data stays local (in-memory + optional localStorage persistence).
 * No external network calls — privacy-first design.
 *
 * @module usageTracker
 */

const STORAGE_KEY = 'speakeasy_usage_stats';
const MAX_HISTORY = 500;

// ─── In-memory store ──────────────────────────────────────────────────────────

const _store = {
  /** Tap sequence frequency: "feel:f_happy" → count */
  tapCounts: Object.create(null),
  /** L2 tap frequency: "f_happy" → count */
  l2Counts: Object.create(null),
  /** Suggestion pick rate: "feel:f_happy" → { shown: N, picked: N } */
  suggestionStats: Object.create(null),
  /** LLM correction rate: { corrected: N, total: N } */
  corrections: { corrected: 0, total: 0 },
  /** Recent tap history (circular buffer) */
  history: [],
  /** Session start time */
  sessionStart: Date.now(),
};

// ─── Event recording ──────────────────────────────────────────────────────────

/**
 * Record a board tap (L1+L2, optionally L3).
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} [l3Id]
 */
export function recordTap(l1Id, l2Id, l3Id) {
  const key = l3Id ? `${l1Id}:${l2Id}:${l3Id}` : `${l1Id}:${l2Id}`;
  _store.tapCounts[key] = (_store.tapCounts[key] ?? 0) + 1;
  _store.l2Counts[l2Id] = (_store.l2Counts[l2Id] ?? 0) + 1;

  _store.history.push({ key, ts: Date.now() });
  if (_store.history.length > MAX_HISTORY) {
    _store.history = _store.history.slice(-MAX_HISTORY);
  }
}

/**
 * Record that suggestions were shown for a tap path.
 * @param {string} tapKey - e.g. "feel:f_happy" or "feel:f_happy:t_now"
 * @param {number} count  - Number of suggestions shown
 */
export function recordSuggestionsShown(tapKey, count) {
  if (!_store.suggestionStats[tapKey]) {
    _store.suggestionStats[tapKey] = { shown: 0, picked: 0 };
  }
  _store.suggestionStats[tapKey].shown += count;
}

/**
 * Record that a suggestion was selected/spoken.
 * @param {string} tapKey
 */
export function recordSuggestionPicked(tapKey) {
  if (!_store.suggestionStats[tapKey]) {
    _store.suggestionStats[tapKey] = { shown: 0, picked: 0 };
  }
  _store.suggestionStats[tapKey].picked += 1;
}

/**
 * Record an LLM correction event.
 * @param {boolean} wasCorrected - true if LLM changed the sentence
 */
export function recordCorrection(wasCorrected) {
  _store.corrections.total += 1;
  if (wasCorrected) _store.corrections.corrected += 1;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get the most frequently tapped L2 items.
 * @param {number} [limit=10]
 * @returns {{ id: string, count: number }[]}
 */
export function getTopL2(limit = 10) {
  return Object.entries(_store.l2Counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get the most frequently tapped full paths.
 * @param {number} [limit=10]
 * @returns {{ key: string, count: number }[]}
 */
export function getTopTapPaths(limit = 10) {
  return Object.entries(_store.tapCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get suggestion pick rate for a tap key.
 * @param {string} tapKey
 * @returns {{ shown: number, picked: number, rate: number }|null}
 */
export function getSuggestionPickRate(tapKey) {
  const stats = _store.suggestionStats[tapKey];
  if (!stats) return null;
  return {
    ...stats,
    rate: stats.shown > 0 ? stats.picked / stats.shown : 0,
  };
}

/**
 * Get overall LLM correction rate.
 * @returns {{ corrected: number, total: number, rate: number }}
 */
export function getCorrectionRate() {
  const { corrected, total } = _store.corrections;
  return { corrected, total, rate: total > 0 ? corrected / total : 0 };
}

/**
 * Get recent tap history.
 * @param {number} [limit=20]
 * @returns {{ key: string, ts: number }[]}
 */
export function getRecentHistory(limit = 20) {
  return _store.history.slice(-limit);
}

/**
 * Get tap count for a specific path.
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} [l3Id]
 * @returns {number}
 */
export function getTapCount(l1Id, l2Id, l3Id) {
  const key = l3Id ? `${l1Id}:${l2Id}:${l3Id}` : `${l1Id}:${l2Id}`;
  return _store.tapCounts[key] ?? 0;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Save current stats to localStorage.
 */
export function persistStats() {
  try {
    const data = {
      tapCounts: _store.tapCounts,
      l2Counts: _store.l2Counts,
      suggestionStats: _store.suggestionStats,
      corrections: _store.corrections,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable or full — silently ignore
  }
}

/**
 * Load stats from localStorage (merge with current session).
 */
export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.tapCounts) {
      for (const [k, v] of Object.entries(data.tapCounts)) {
        _store.tapCounts[k] = (_store.tapCounts[k] ?? 0) + v;
      }
    }
    if (data.l2Counts) {
      for (const [k, v] of Object.entries(data.l2Counts)) {
        _store.l2Counts[k] = (_store.l2Counts[k] ?? 0) + v;
      }
    }
    if (data.suggestionStats) {
      for (const [k, v] of Object.entries(data.suggestionStats)) {
        if (!_store.suggestionStats[k]) _store.suggestionStats[k] = { shown: 0, picked: 0 };
        _store.suggestionStats[k].shown += v.shown ?? 0;
        _store.suggestionStats[k].picked += v.picked ?? 0;
      }
    }
    if (data.corrections) {
      _store.corrections.corrected += data.corrections.corrected ?? 0;
      _store.corrections.total += data.corrections.total ?? 0;
    }
  } catch {
    // corrupted data — silently ignore
  }
}

/**
 * Reset all stats (for testing or user privacy request).
 */
export function resetStats() {
  Object.keys(_store.tapCounts).forEach(k => delete _store.tapCounts[k]);
  Object.keys(_store.l2Counts).forEach(k => delete _store.l2Counts[k]);
  Object.keys(_store.suggestionStats).forEach(k => delete _store.suggestionStats[k]);
  _store.corrections.corrected = 0;
  _store.corrections.total = 0;
  _store.history.length = 0;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
