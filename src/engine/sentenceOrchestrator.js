/**
 * sentenceOrchestrator.js
 *
 * Main pipeline entry point for the SpeakEasy confidence-based correction system.
 *
 * Pipeline:
 *   Concept tokens
 *     → buildSentence()          deterministic grammar + morphology
 *     → computeConfidence()      grammar / morphology / n-gram scores
 *     → if overall >= threshold  return as-is  (source: 'deterministic')
 *     → getCached()              check persistent correction cache
 *     → if cache hit             return cached  (source: 'cache')
 *     → correctSentence()        LLM polish (Gemini)
 *     → setCached()              persist for next time
 *     → return corrected         (source: 'llm')
 *     → on LLM failure           return deterministic  (source: 'fallback')
 *
 * @module sentenceOrchestrator
 */

import { buildSentence }           from './sentenceBuilder.js';
import { computeConfidence }       from './confidenceScorer.js';
import { getCached, setCached }    from './correctionCache.js';
import { correctSentence }         from './llmCorrector.js';
import { learnSequence }           from './conceptPredictor.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_THRESHOLD = 0.8;
export const DEFAULT_WEIGHTS   = { w1: 0.4, w2: 0.4, w3: 0.2 };

// ─── Logging helpers ──────────────────────────────────────────────────────────
// Key orchestrator events (AI called, confidence, source) always log.
// Verbose detail is gated behind DEBUG.
//
// Enable verbose logs:
//   globalThis.__SPEAKEASY_DEBUG__ = true   (browser console)
//   VITE_DEBUG=1                            (.env file)

const DEBUG = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_DEBUG === '1' || import.meta.env?.DEV)
  : false;

const PREFIX = '[SpeakEasy ✨]';

/** Always-on: key pipeline events */
function _info(msg) {
  console.log(`${PREFIX} ${msg}`);
}

/** Verbose only: detailed internal state */
function _debug(msg, data) {
  if (!DEBUG && !globalThis.__SPEAKEASY_DEBUG__) return;
  data !== undefined
    ? console.debug(`${PREFIX} ${msg}`, data)
    : console.debug(`${PREFIX} ${msg}`);
}

/** Always-on: LLM errors / fallbacks */
function _warn(msg, data) {
  data !== undefined
    ? console.warn(`${PREFIX} ⚠️  ${msg}`, data)
    : console.warn(`${PREFIX} ⚠️  ${msg}`);
}

/** Render a compact confidence table to the console */
function _logConfidence(conceptIds, lang, confidence, threshold) {
  const pct = (n) => `${(n * 100).toFixed(1)}%`;
  const bar = (n) => '█'.repeat(Math.round(n * 10)).padEnd(10, '░');
  const pass = confidence.overall >= threshold ? '✅ PASS' : '❌ BELOW';

  // Always-visible summary line
  _info(
    `📊 confidence [${lang}] ${conceptIds.join(' ')} → ` +
    `overall ${pct(confidence.overall)} ${pass} (threshold ${pct(threshold)})`
  );

  // Detailed table — visible in DevTools when expanded (groupCollapsed)
  if (DEBUG || globalThis.__SPEAKEASY_DEBUG__) {
    console.groupCollapsed(
      `${PREFIX}   breakdown — grammar ${pct(confidence.grammar)} · ` +
      `morphology ${pct(confidence.morphology)} · prediction ${pct(confidence.prediction)}`
    );
    console.table({
      grammar:    { score: pct(confidence.grammar),    bar: bar(confidence.grammar),    weight: 'w1=0.4' },
      morphology: { score: pct(confidence.morphology), bar: bar(confidence.morphology), weight: 'w2=0.4' },
      prediction: { score: pct(confidence.prediction), bar: bar(confidence.prediction), weight: 'w3=0.2' },
      '─ overall': { score: pct(confidence.overall),  bar: bar(confidence.overall),    weight: `threshold ${pct(threshold)}` },
    });
    console.groupEnd();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OrchestratorResult
 * @property {string}   text        - Final output sentence (natural language)
 * @property {string}   lang        - Language code ('en'|'it'|'fr'|'es'|'pt')
 * @property {string[]} conceptIds  - Original concept tokens
 * @property {{ grammar: number, morphology: number, prediction: number, overall: number }} confidence
 * @property {'deterministic'|'cache'|'llm'|'fallback'} source
 *   How the sentence was produced:
 *   - 'deterministic' → confidence was high enough, no AI used
 *   - 'cache'         → AI had already corrected this sequence before
 *   - 'llm'           → AI corrected this run and result was cached
 *   - 'fallback'      → AI failed, deterministic result returned
 */

// ─── Main pipeline (async — may call LLM) ─────────────────────────────────────

/**
 * Generate a natural sentence from concept tokens, applying AI correction only
 * when the deterministic confidence is below the threshold.
 *
 * @param {string[]} conceptIds - Language-neutral concept IDs (e.g. ['I', 'WANT', 'EAT', 'FOOD'])
 * @param {string}   lang       - Target language code ('en'|'it'|'fr'|'es'|'pt')
 * @param {Object}   [opts]
 * @param {number}   [opts.threshold=0.8] - Min confidence to skip AI correction
 * @param {number}   [opts.w1=0.4]        - Grammar score weight
 * @param {number}   [opts.w2=0.4]        - Morphology score weight
 * @param {number}   [opts.w3=0.2]        - Prediction score weight
 * @param {boolean}  [opts.learn=true]    - Learn this sequence for future n-gram predictions
 * @param {string}   [opts.apiKey]        - Optional Gemini API key override
 * @param {number}   [opts.timeoutMs]     - Optional LLM timeout override (ms)
 * @returns {Promise<OrchestratorResult>}
 */
export async function generate(conceptIds, lang, opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => `${((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0).toFixed(1)} ms`;

  _info(`▶ generate [${lang}]  ${conceptIds.join(' → ')}`);

  // ── Step 1: deterministic sentence ─────────────────────────────────────────
  const built        = buildSentence(conceptIds, lang);
  const deterministic = built.text;
  _debug(`📝 deterministic`, `"${deterministic}"`);

  // ── Step 2: confidence score ────────────────────────────────────────────────
  const confidence = computeConfidence(conceptIds, lang, opts);
  _logConfidence(conceptIds, lang, confidence, threshold);

  // ── Optional: learn this sequence for future n-gram predictions ─────────────
  if (opts.learn !== false) {
    learnSequence(conceptIds);
    _debug(`🎓 learned sequence for n-gram model`);
  }

  // ── Step 3: high-confidence — no AI needed ──────────────────────────────────
  if (confidence.overall >= threshold) {
    _info(`✅ source=deterministic  (${ms()})  → "${deterministic}"`);
    return { text: deterministic, lang, conceptIds, confidence, source: 'deterministic' };
  }

  // ── Step 4: cache check ─────────────────────────────────────────────────────
  _info(`🔍 confidence ${(confidence.overall * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}% — checking cache…`);
  const cached = getCached(conceptIds, lang);
  if (cached) {
    _info(`⚡ source=cache  (${ms()})  → "${cached}"`);
    return { text: cached, lang, conceptIds, confidence, source: 'cache' };
  }

  // ── Step 5: LLM correction ──────────────────────────────────────────────────
  _info(`🤖 AI correction triggered  [${lang}]  "${deterministic}"`);
  _info(`   reason: overall ${(confidence.overall * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}% threshold, no cache hit`);

  try {
    const corrected = await correctSentence(deterministic, lang, {
      ...(opts.apiKey    ? { apiKey:    opts.apiKey    } : {}),
      ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    });

    setCached(conceptIds, lang, corrected);

    const changed = deterministic !== corrected;
    _info(
      `✨ source=llm  (${ms()})` +
      `\n   before: "${deterministic}"` +
      `\n   after:  "${corrected}"` +
      (changed ? '' : '  (unchanged — AI agreed with deterministic)')
    );

    return { text: corrected, lang, conceptIds, confidence, source: 'llm' };

  } catch (err) {
    _warn(`AI failed after ${ms()} — falling back to deterministic`, err?.message ?? err);
    _info(`↩️  source=fallback  → "${deterministic}"`);
    return { text: deterministic, lang, conceptIds, confidence, source: 'fallback' };
  }
}

// ─── Sync pipeline (no LLM — for instant preview / autocomplete) ──────────────

/**
 * Synchronous version of generate(). Never calls the LLM.
 * Returns the deterministic sentence or a cached correction if available.
 *
 * Useful for real-time preview as symbols are tapped.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @param {Object}   [opts] - Same opts as generate() except timeoutMs/apiKey (ignored)
 * @returns {OrchestratorResult}
 */
export function generateSync(conceptIds, lang, opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;

  _debug(`▶ generateSync [${lang}]  ${conceptIds.join(' → ')}`);

  const built        = buildSentence(conceptIds, lang);
  const deterministic = built.text;
  const confidence   = computeConfidence(conceptIds, lang, opts);

  _logConfidence(conceptIds, lang, confidence, threshold);

  if (confidence.overall >= threshold) {
    _debug(`✅ source=deterministic (sync)  → "${deterministic}"`);
    return { text: deterministic, lang, conceptIds, confidence, source: 'deterministic' };
  }

  const cached = getCached(conceptIds, lang);
  if (cached) {
    _debug(`⚡ source=cache (sync)  → "${cached}"`);
    return { text: cached, lang, conceptIds, confidence, source: 'cache' };
  }

  // No LLM in sync path — caller should follow up with generate() if needed
  _debug(`↩️  source=fallback (sync — AI skipped in sync path)  → "${deterministic}"`);
  return { text: deterministic, lang, conceptIds, confidence, source: 'fallback' };
}

