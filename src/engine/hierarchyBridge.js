/**
 * hierarchyBridge.js
 * ==================
 * Maps tap events from the grid / hierarchy layer to engine concept IDs.
 *
 * The engine works with uppercase concept IDs (e.g. 'DRINK', 'WATER').
 * The hierarchy / CoreWordBar layer uses canonical English base-form labels
 * (e.g. 'drink', 'water', 'I', 'want').
 *
 * Strategy: label.toUpperCase() resolves ~90% of cases since the lexicon
 * intentionally mirrors the hierarchy vocabulary.  LABEL_OVERRIDES handles
 * the edge cases (CoreWordBar contractions, operators, unmappable modifiers).
 *
 * Usage:
 *   import { tapContextToConceptIds, labelsToConceptIds } from './hierarchyBridge.js';
 *
 *   // From a full tap context (most common):
 *   const ids = tapContextToConceptIds(corePrefixLabels, tapContext);
 *   // → e.g. ['I', 'WANT', 'DRINK', 'WATER']
 *
 *   // From raw word strings:
 *   const ids = labelsToConceptIds(['I', 'need', 'help']);
 *   // → ['I', 'NEED', 'HELP']
 */

import lexiconData from './lexicon.json';

// ── Known-concept lookup set ─────────────────────────────────────────────────

const KNOWN_CONCEPTS = new Set([
  ...Object.keys(lexiconData.concepts),
  ...Object.keys(lexiconData.operators),
]);

// ── Label overrides ──────────────────────────────────────────────────────────
// Maps lower-cased label → concept ID, or null to skip (no engine concept).

const LABEL_OVERRIDES = {
  // CoreWordBar words that need special handling
  'i':           'I',
  'you':         'YOU',
  'want':        'WANT',
  'need':        'NEED',
  'go':          'GO',
  'like':        'LIKE',
  'help':        'HELP',
  'not':         'NOT',       // operator
  'stop':        'STOP',
  'yes':         'YES',
  'no':          'NO',
  'please':      'PLEASE',

  // CoreWordBar words without lexicon equivalents → skip
  'that':        null,        // deictic pronoun — no engine concept
  'my':          null,        // possessive — no engine concept
  'more':        null,        // intensifier — no engine concept
  'done':        null,        // state word  — no engine concept

  // Tense operators (can appear as L3 label in some categories)
  'now':         'NOW',
  'past':        'PAST',
  'future':      'FUTURE',
  'can':         'CAN',

  // Time modifier labels that map to operators
  'yesterday':   'PAST',
  'tomorrow':    'FUTURE',

  // Common AAC phrases/words that aren't in lexicon → skip cleanly
  'a little':    null,
  'very':        null,
  'always':      null,
  'every day':   null,
  'in a minute': null,
  'soon':        null,
  'later':       null,
  'today':       null,
  'morning':     null,
  'afternoon':   null,
  'night':       null,
  'here':        null,
  'there':       null,
  'different':   null,
  'again':       null,
  'maybe':       null,

  // Sub-place labels (L3) — no direct concept equivalent
  'kitchen':     null,
  'bedroom':     null,
  'bathroom':    null,
  'living room': null,
  'garden':      null,
  'classroom':   null,
  'gym':         null,
  'library':     null,
  'cafeteria':   null,
  'playground':  null,
  'therapy room':null,
  'room':        null,
  'clinic':      null,
  'waiting room':null,
  'pharmacy':    null,
  'x-ray':       null,
  'street':      null,
  'beach':       null,
  'pool':        null,
  'field':       null,
  'supermarket': null,
  'bakery':      null,
  'swing':       null,
  'slide':       null,
  'bench':       null,
  'sandbox':     null,

  // Body part labels (L3) — no direct concept
  'head':        null,
  'stomach':     null,
  'throat':      null,
  'chest':       null,
  'back':        null,
  'leg':         null,
  'arm':         null,
  'tooth':       null,
  'ear':         null,
  'nose':        null,
  'eyes':        null,
  'skin':        null,

  // Colour labels — no lexicon concept
  'red':         null,
  'blue':        null,
  'green':       null,
  'yellow':      null,
  'black':       null,
  'white':       null,
  'pink':        null,
  'orange':      null,
};

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Convert a single label string to an engine concept ID.
 * Returns null if the label has no engine equivalent.
 *
 * @param {string} label  - Canonical English label (any case)
 * @returns {string|null}
 */
export function labelToConceptId(label) {
  if (!label || typeof label !== 'string') return null;

  const lower = label.trim().toLowerCase();

  // Explicit override (may return null intentionally)
  if (lower in LABEL_OVERRIDES) return LABEL_OVERRIDES[lower];

  // Auto-map via toUpperCase()
  const upper = lower.toUpperCase();
  return KNOWN_CONCEPTS.has(upper) ? upper : null;
}

/**
 * Convert an array of labels (canonical English, any case mixed allowed)
 * to engine concept IDs.  Unknown/unmappable labels are silently dropped.
 *
 * @param {string[]} labels
 * @returns {string[]}
 */
export function labelsToConceptIds(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map(l => labelToConceptId(l)).filter(Boolean);
}

/**
 * Build an ordered concept-ID sequence from a hierarchy tap context and
 * any CoreWordBar prefix words tapped before the fringe symbol.
 *
 * Order: [coreWords...] → [l2Canon] → [l3Canon]
 *
 * Example:
 *   corePrefixLabels = ['I', 'want']
 *   tapContext = { l2Canon: 'drink', l3Canon: 'water' }
 *   → ['I', 'WANT', 'DRINK', 'WATER']
 *
 * @param {string[]} corePrefixLabels - English labels of core-word buttons tapped
 * @param {{ l2Canon?: string, l3Canon?: string } | null} tapContext
 * @returns {string[]}
 */
export function tapContextToConceptIds(corePrefixLabels = [], tapContext = null) {
  const raw = [
    ...corePrefixLabels,
    tapContext?.l2Canon,
    tapContext?.l3Canon,
  ].filter(Boolean);
  return labelsToConceptIds(raw);
}

/**
 * Quick helper — returns true if the label resolves to a known concept.
 *
 * @param {string} label
 * @returns {boolean}
 */
export function isKnownConcept(label) {
  return labelToConceptId(label) !== null;
}
