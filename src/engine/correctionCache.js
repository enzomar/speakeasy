/**
 * correctionCache.js
 *
 * Persistent localStorage cache for AI-corrected AAC sentences.
 *
 * Cache key format: "<CONCEPT_A>|<CONCEPT_B>|...<CONCEPT_N>:<lang>"
 * Cache value: corrected sentence string
 *
 * The cache survives app restarts (localStorage), and is loaded lazily
 * on first access.
 *
 * @module correctionCache
 */

const STORAGE_KEY = 'speakeasy_correction_cache_v1';

/** In-memory mirror of the cache (Map<cacheKey, correctedSentence>) */
let _cache = null;

// ─── Debug logger ─────────────────────────────────────────────────────────────
const DEBUG = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_DEBUG === '1' || import.meta.env?.DEV)
  : false;

function _log(msg, data) {
  if (!DEBUG && !globalThis.__SPEAKEASY_DEBUG__) return;
  data !== undefined
    ? console.debug(`[SpeakEasy:cache] ${msg}`, data)
    : console.debug(`[SpeakEasy:cache] ${msg}`);
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

/**
 * Build the string cache key for a concept sequence + language pair.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @returns {string}
 */
export function buildCacheKey(conceptIds, lang) {
  return `${conceptIds.join('|')}:${lang}`;
}

// ─── Load / save ──────────────────────────────────────────────────────────────

function _load() {
  if (_cache !== null) return;
  _cache = new Map();
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) _cache.set(k, v);
    }
  } catch {
    // Corrupted storage — start fresh
    _cache = new Map();
  }
}

function _persist() {
  if (typeof localStorage === 'undefined') return;
  try {
    const obj = Object.fromEntries(_cache);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Quota exceeded — silently ignore
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve a previously AI-corrected sentence.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @returns {string|null} corrected sentence, or null if not cached
 */
export function getCached(conceptIds, lang) {
  _load();
  const key = buildCacheKey(conceptIds, lang);
  const hit = _cache.get(key) ?? null;
  if (hit) {
    _log(`✅ HIT  [${lang}] "${key}" →`, hit);
  } else {
    _log(`❌ MISS [${lang}] "${key}"`);
  }
  return hit;
}

/**
 * Store an AI-corrected sentence in the cache and persist to localStorage.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @param {string}   correctedSentence
 */
export function setCached(conceptIds, lang, correctedSentence) {
  _load();
  const key = buildCacheKey(conceptIds, lang);
  _cache.set(key, correctedSentence);
  _persist();
  _log(`💾 SET  [${lang}] "${key}" →`, correctedSentence);
  _log(`   cache size: ${_cache.size} entries`);
}

/**
 * Check if a (conceptIds, lang) pair has a cached correction.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @returns {boolean}
 */
export function hasCached(conceptIds, lang) {
  _load();
  return _cache.has(buildCacheKey(conceptIds, lang));
}

/**
 * Delete a single cached entry.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 */
export function deleteCached(conceptIds, lang) {
  _load();
  _cache.delete(buildCacheKey(conceptIds, lang));
  _persist();
}

/**
 * Clear the entire correction cache (localStorage + in-memory).
 */
export function clearCache() {
  const prev = _cache?.size ?? 0;
  _cache = new Map();
  if (typeof localStorage !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  _log(`🗑️  CLEAR — removed ${prev} entries`);
}

/**
 * Return a snapshot of the cache contents for debugging.
 *
 * @returns {{ key: string, sentence: string }[]}
 */
export function inspectCache() {
  _load();
  return [..._cache.entries()].map(([key, sentence]) => ({ key, sentence }));
}

/**
 * Return the number of cached entries.
 *
 * @returns {number}
 */
export function cacheSize() {
  _load();
  return _cache.size;
}
