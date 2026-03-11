/**
 * confidenceScorer.js
 *
 * Computes a composite confidence score (0–1) for a generated sentence based on:
 *   - Grammar score:    does the concept sequence follow the grammar graph?
 *   - Morphology score: do all concepts have surface forms in the target language?
 *   - Prediction score: how probable is the concept sequence according to learned n-grams?
 *
 * Final confidence = w1*grammar + w2*morphology + w3*prediction
 * Default weights:    w1=0.4,    w2=0.4,         w3=0.2
 *
 * @module confidenceScorer
 */

import GRAPH  from './grammarGraph.json'    assert { type: 'json' };
import LEXICON from './lexicon.json'         assert { type: 'json' };
import TABLES  from './morphologyTables.json' assert { type: 'json' };
import { scoreSequenceProbability } from './conceptPredictor.js';

// ─── Debug logger ─────────────────────────────────────────────────────────────
// Set globalThis.__SPEAKEASY_DEBUG__ = true (or VITE_DEBUG=1 env var) to enable.
const DEBUG = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_DEBUG === '1' || import.meta.env?.DEV)
  : false;

function _log(msg, data) {
  if (!DEBUG && !globalThis.__SPEAKEASY_DEBUG__) return;
  data !== undefined
    ? console.debug(`[SpeakEasy:confidence] ${msg}`, data)
    : console.debug(`[SpeakEasy:confidence] ${msg}`);
}

// ─── Role mapping (mirrors conceptPredictor._conceptToRole) ───────────────────
const SUBJECTS   = new Set(['I', 'YOU', 'HE', 'SHE', 'WE', 'THEY']);

function _roleOf(id) {
  const concept  = LEXICON.concepts[id];
  const operator = LEXICON.operators[id];
  const entry    = operator ?? concept;
  if (!entry) return null;

  if (SUBJECTS.has(id))                   return 'SUBJECT';
  if (id === 'NOT')                        return 'NEGATION';
  const t = entry.type;
  if (t === 'tense')                       return 'TENSE';
  if (t === 'modal' || id === 'WANT' || id === 'CAN' || id === 'MUST') return 'MODAL';
  if (t === 'verb')                        return 'VERB';
  if (t === 'adjective')                   return 'STATE';
  if (t === 'place' || (t === 'noun' && concept?.role === 'place')) return 'PLACE';
  if (t === 'noun')                        return 'OBJECT';
  if (t === 'interjection')                return 'INTERJ';
  return null;
}

// ─── Grammar score ─────────────────────────────────────────────────────────────

/**
 * Score how well the concept sequence follows the grammar graph.
 *
 * Algorithm:
 *   1. Map each concept to its grammar role.
 *   2. For each consecutive pair of roles, look up the edge weight in the graph.
 *      - Valid edge found  → add its weight (0–1)
 *      - No edge found     → add 0 (hard violation)
 *   3. Score = sum(edge_weights) / count_transitions
 *   4. If every concept is unrecognised, score = 0.5 (uncertain).
 *   5. Single concept always scores 1.0 (no transitions to validate).
 *
 * @param {string[]} conceptIds
 * @returns {number} 0–1
 */
export function scoreGrammar(conceptIds) {
  if (!conceptIds || conceptIds.length <= 1) return 1.0;

  const roles = conceptIds.map(_roleOf);

  // Build edge weight lookup: "FROM|TO" → weight
  const edgeMap = {};
  for (const edge of GRAPH.edges ?? []) {
    edgeMap[`${edge.from}|${edge.to}`] = edge.weight ?? 1.0;
  }

  let weightSum = 0;
  let count = 0;

  // First transition: START → roles[0]
  const firstRole = roles[0];
  if (firstRole) {
    const startKey = `START|${firstRole}`;
    weightSum += edgeMap[startKey] ?? 0;
    count++;
  }

  // Subsequent transitions
  for (let i = 1; i < roles.length; i++) {
    const fromRole = roles[i - 1];
    const toRole   = roles[i];
    if (!fromRole || !toRole) {
      count++;          // unknown concept = uncertainty, counts as 0
      continue;
    }
    const key = `${fromRole}|${toRole}`;
    weightSum += edgeMap[key] ?? 0;
    count++;
  }

  if (count === 0) return 0.5;
  return weightSum / count;
}

// ─── Morphology score ─────────────────────────────────────────────────────────

/**
 * Score how complete the morphological coverage is for the target language.
 *
 * Checks:
 *   - Verbs:       entry in morphologyTables.verbs[id][lang]
 *   - Nouns/place: label in lexicon.concepts[id].labels[lang]
 *   - Adjectives:  label in lexicon.concepts[id].labels[lang]
 *   - Pronouns:    entry in morphologyTables.pronouns[id][lang]
 *   - Operators:   always score 1 (grammar-level tokens)
 *
 * @param {string[]} conceptIds
 * @param {string}   lang - one of 'en'|'it'|'fr'|'es'|'pt'
 * @returns {number} 0–1
 */
export function scoreMorphology(conceptIds, lang) {
  if (!conceptIds || conceptIds.length === 0) return 1.0;

  let covered = 0;
  let total   = 0;

  for (const id of conceptIds) {
    const operator = LEXICON.operators[id];
    if (operator) {
      covered++;
      total++;
      continue; // operators are always resolvable
    }

    const concept = LEXICON.concepts[id];
    if (!concept) {
      total++;  // completely unknown concept → 0
      continue;
    }

    const type = concept.type;

    if (type === 'verb') {
      // Check morphology table first, then lexicon lemma
      const hasTable = !!TABLES.verbs?.[id]?.[lang];
      const hasLemma = !!concept.lemma?.[lang];
      if (hasTable || hasLemma) covered++;
      total++;
    } else if (type === 'pronoun') {
      const hasTable = !!TABLES.pronouns?.[id]?.[lang];
      if (hasTable) covered++;
      total++;
    } else if (type === 'adjective') {
      const label = concept.labels?.[lang];
      // Adjectives may have gender-split: { m, f }
      const hasLabel = label && (typeof label === 'string' ? label.length > 0 : (label.m || label.f));
      if (hasLabel) covered++;
      total++;
    } else {
      // noun, place, interjection
      const label = concept.labels?.[lang];
      if (label && typeof label === 'string' && label.length > 0) covered++;
      total++;
    }
  }

  if (total === 0) return 1.0;
  return covered / total;
}

// ─── Composite confidence ─────────────────────────────────────────────────────

/**
 * @typedef {Object} ConfidenceResult
 * @property {number} grammar        - Grammar graph score (0–1)
 * @property {number} morphology     - Morphological coverage score (0–1)
 * @property {number} prediction     - N-gram sequence probability (0–1)
 * @property {number} overall        - Weighted combined score (0–1)
 */

/**
 * Compute composite confidence for a concept sequence.
 *
 * @param {string[]} conceptIds
 * @param {string}   lang
 * @param {Object}   [opts]
 * @param {number}   [opts.w1=0.4]  - Weight for grammar score
 * @param {number}   [opts.w2=0.4]  - Weight for morphology score
 * @param {number}   [opts.w3=0.2]  - Weight for prediction score
 * @returns {ConfidenceResult}
 */
export function computeConfidence(conceptIds, lang, opts = {}) {
  const w1 = opts.w1 ?? 0.4;
  const w2 = opts.w2 ?? 0.4;
  const w3 = opts.w3 ?? 0.2;

  const grammar    = scoreGrammar(conceptIds);
  const morphology = scoreMorphology(conceptIds, lang);
  const prediction = scoreSequenceProbability(conceptIds);

  // Normalise weights in case they don't sum to 1
  const wTotal = w1 + w2 + w3;
  const overall = (w1 * grammar + w2 * morphology + w3 * prediction) / wTotal;

  const result = {
    grammar:    Math.round(grammar    * 1000) / 1000,
    morphology: Math.round(morphology * 1000) / 1000,
    prediction: Math.round(prediction * 1000) / 1000,
    overall:    Math.round(overall    * 1000) / 1000,
  };

  _log(`📊 [${lang}] ${conceptIds.join(' ')} →`, {
    grammar:    `${(result.grammar    * 100).toFixed(1)}%  (w=${w1})`,
    morphology: `${(result.morphology * 100).toFixed(1)}%  (w=${w2})`,
    prediction: `${(result.prediction * 100).toFixed(1)}%  (w=${w3})`,
    overall:    `${(result.overall    * 100).toFixed(1)}%`,
    weights:    `${w1}/${w2}/${w3}`,
  });

  return result;
}
