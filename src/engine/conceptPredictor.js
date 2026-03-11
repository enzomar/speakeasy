/**
 * conceptPredictor.js
 *
 * Concept-level n-gram prediction with grammar graph filtering.
 * Operates on canonical concept IDs (e.g., "GO", "WATER") rather than surface words,
 * so the same prediction works across all 5 languages.
 *
 * Persistence: localStorage key "speakeasy_concept_ngrams_v1"
 *
 * @module conceptPredictor
 */

import GRAPH from './grammarGraph.json' assert { type: 'json' };
import LEXICON from './lexicon.json' assert { type: 'json' };

const STORAGE_KEY = 'speakeasy_concept_ngrams_v1';
const MAX_SUGGESTIONS = 8;

// ─── Roles ────────────────────────────────────────────────────────────────────
// Operators that carry grammatical meaning
const OPERATORS = new Set(['PAST', 'FUTURE', 'NOW', 'NOT', 'WANT', 'CAN', 'MUST']);
const SUBJECTS  = new Set(['I', 'YOU', 'HE', 'SHE', 'WE', 'THEY']);

// ─── State ────────────────────────────────────────────────────────────────────
let _unigrams = {}; // { conceptId: count }
let _bigrams  = {}; // { "A|B": count }
let _trigrams = {}; // { "A|B|C": count }
let _loaded   = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load persisted n-gram tables from localStorage.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function loadNgrams() {
  if (_loaded || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      _unigrams = saved.unigrams || {};
      _bigrams  = saved.bigrams  || {};
      _trigrams = saved.trigrams || {};
    }
  } catch {
    // Ignore parse errors — start fresh
  }
  _loaded = true;
}

/** Persist current n-gram tables to localStorage. */
export function saveNgrams() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      unigrams: _unigrams,
      bigrams:  _bigrams,
      trigrams: _trigrams,
    }));
  } catch {
    // Quota exceeded or private mode — ignore
  }
}

/**
 * Record a completed concept ID sequence (e.g., from a confirmed sentence).
 * Updates unigram, bigram and trigram counts.
 *
 * @param {string[]} conceptIds
 */
export function learnSequence(conceptIds) {
  loadNgrams();
  if (!conceptIds || conceptIds.length === 0) return;

  for (let i = 0; i < conceptIds.length; i++) {
    const a = conceptIds[i];
    _unigrams[a] = (_unigrams[a] || 0) + 1;

    if (i > 0) {
      const key2 = `${conceptIds[i - 1]}|${a}`;
      _bigrams[key2] = (_bigrams[key2] || 0) + 1;
    }

    if (i > 1) {
      const key3 = `${conceptIds[i - 2]}|${conceptIds[i - 1]}|${a}`;
      _trigrams[key3] = (_trigrams[key3] || 0) + 1;
    }
  }

  saveNgrams();
}

/**
 * Reset all learned n-gram data (useful for testing or privacy clearing).
 */
export function resetNgrams() {
  _unigrams = {};
  _bigrams  = {};
  _trigrams = {};
  _loaded   = true;
  saveNgrams();
}

/**
 * Predict the best next concept IDs given the current history.
 *
 * @param {string[]} history   - Concept IDs spoken so far in this utterance
 * @param {number}   [n=6]     - Max suggestions to return
 * @returns {string[]} Ordered concept IDs (best first)
 */
export function predictNext(history, n = MAX_SUGGESTIONS) {
  loadNgrams();

  const candidates = _getCandidates();
  const allowedByGraph = _getGraphCandidates(history);

  // Score each candidate
  const scored = candidates
    .filter(id => allowedByGraph.size === 0 || allowedByGraph.has(id))
    .map(id => ({ id, score: _score(id, history) }))
    .filter(({ score }) => score > 0);

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  const result = scored.slice(0, n).map(s => s.id);

  // If we don't have enough scored results, pad with grammar-graph suggestions
  if (result.length < n) {
    for (const id of allowedByGraph) {
      if (!result.includes(id) && result.length < n) {
        result.push(id);
      }
    }
  }

  return result;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** All known concept IDs from lexicon (both concepts and operators) */
function _getCandidates() {
  return [
    ...Object.keys(LEXICON.concepts),
    ...Object.keys(LEXICON.operators),
  ];
}

/**
 * Use the grammar graph to determine which concept types are valid next.
 * Returns a Set of valid concept IDs (empty = no graph constraint).
 *
 * @param {string[]} history
 * @returns {Set<string>}
 */
function _getGraphCandidates(history) {
  if (!GRAPH.nodes || !GRAPH.edges) return new Set();

  const currentRole = _inferCurrentRole(history);
  const nextRoles = _getNextRoles(currentRole);

  if (nextRoles.length === 0) return new Set();

  // Collect all concept IDs whose "role" matches valid next roles
  const allowed = new Set();
  for (const [id, entry] of [
    ...Object.entries(LEXICON.concepts),
    ...Object.entries(LEXICON.operators),
  ]) {
    const conceptRole = _conceptToRole(id, entry.type);
    if (nextRoles.includes(conceptRole)) {
      allowed.add(id);
    }
  }

  return allowed;
}

/**
 * Infer the current grammatical role position from history.
 *
 * @param {string[]} history
 * @returns {string} node id in grammar graph (uppercase, matching grammarGraph.json)
 */
function _inferCurrentRole(history) {
  if (history.length === 0) return 'START';

  const last = history[history.length - 1];
  const entry = LEXICON.concepts[last] ?? LEXICON.operators[last];
  if (!entry) return 'START';

  return _conceptToRole(last, entry.type);
}

/** Map concept type to grammar graph role (matches grammarGraph.json node ids) */
function _conceptToRole(id, type) {
  if (SUBJECTS.has(id))             return 'SUBJECT';
  if (id === 'NOT')                 return 'NEGATION';
  if (type === 'tense')             return 'TENSE';
  if (type === 'modal' || id === 'WANT' || id === 'CAN' || id === 'MUST') return 'MODAL';
  if (OPERATORS.has(id))            return 'MODAL'; // catch-all for operator IDs
  if (type === 'verb')              return 'VERB';
  if (type === 'noun')              return 'OBJECT';
  if (type === 'place')             return 'PLACE';
  if (type === 'adjective')         return 'STATE';
  if (type === 'adverb')            return 'OBJECT';
  return 'START';
}

/**
 * Look up valid transitions in the grammar graph.
 *
 * @param {string} fromRole
 * @returns {string[]} valid next role node ids
 */
function _getNextRoles(fromRole) {
  if (!GRAPH.edges) return [];
  const outgoing = GRAPH.edges.filter(e => e.from === fromRole);
  return outgoing.map(e => e.to);
}

/**
 * Score a candidate concept given history.
 * Uses trigram > bigram > unigram fallback with add-1 smoothing.
 *
 * @param {string} candidateId
 * @param {string[]} history
 * @returns {number}
 */
function _score(candidateId, history) {
  const len = history.length;
  const total = _totalCounts();

  if (len >= 2) {
    const triKey = `${history[len - 2]}|${history[len - 1]}|${candidateId}`;
    if (_trigrams[triKey]) {
      const biKey = `${history[len - 2]}|${history[len - 1]}`;
      const biCount = _bigrams[biKey] || 1;
      return (_trigrams[triKey] + 1) / (biCount + Object.keys(_trigrams).length);
    }
  }

  if (len >= 1) {
    const biKey = `${history[len - 1]}|${candidateId}`;
    if (_bigrams[biKey]) {
      const uniCount = _unigrams[history[len - 1]] || 1;
      return (_bigrams[biKey] + 1) / (uniCount + Object.keys(_bigrams).length);
    }
  }

  const uniCount = _unigrams[candidateId] || 0;
  if (uniCount === 0) return 0;
  return (uniCount + 1) / (total + Object.keys(_unigrams).length);
}

function _totalCounts() {
  return Object.values(_unigrams).reduce((s, c) => s + c, 0) || 1;
}

// ─── Exported probability API ─────────────────────────────────────────────────

/**
 * Compute the n-gram sequence probability for an ordered list of concept IDs.
 * Returns a value in [0, 1] where 1 means the sequence is perfectly predicted
 * by learned history, and 0 means it has never been seen.
 *
 * Uses geometric mean of per-step conditional probabilities so that length
 * differences don't penalise longer sentences.
 *
 * Returns 0.5 (neutral) if no n-gram data has been learned yet.
 *
 * @param {string[]} conceptIds
 * @returns {number} probability in [0, 1]
 */
export function scoreSequenceProbability(conceptIds) {
  loadNgrams();
  if (!conceptIds || conceptIds.length === 0) return 0;

  const hasData = Object.keys(_unigrams).length > 0;
  if (!hasData) return 0.5; // neutral — no training data yet

  const stepProbs = [];

  for (let i = 0; i < conceptIds.length; i++) {
    const history = conceptIds.slice(0, i);
    const candidate = conceptIds[i];
    const p = _score(candidate, history);
    stepProbs.push(p);
  }

  // If all steps are zero, return 0
  if (stepProbs.every(p => p === 0)) return 0;

  // Geometric mean of non-zero step probs
  const nonZero = stepProbs.filter(p => p > 0);
  const logSum = nonZero.reduce((s, p) => s + Math.log(p), 0);
  const geomMean = Math.exp(logSum / nonZero.length);

  // Apply a penalty for any zero-probability steps (unseen transitions)
  const zeroFraction = (stepProbs.length - nonZero.length) / stepProbs.length;
  const penalised = geomMean * (1 - 0.5 * zeroFraction);

  return Math.max(0, Math.min(1, penalised));
}
