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

  // Standalone interjections / social words
  'goodbye':     'BYE',
  'thank you':   'THANKS',
  'ok':          'OK',
  "i don't know": null,

  // Question compound labels → no engine concept (form interrogative type)
  'what time':   null,
  'how much':    null,
  'how many':    null,
  'can i':       null,
  'can you':     null,

  // Operators that ARE in the lexicon — map explicitly
  'very':        'VERY',
  'a little':    'A_LITTLE',
  'again':       'AGAIN',

  // Common AAC phrases/words that aren't in lexicon → skip cleanly
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
  'maybe':       null,

  // ── Predicate labels (PEOPLE L3) ── map to engine concept when possible
  'is here':     null,     // situational — heuristic handles
  'is coming':   null,
  'is gone':     null,
  'wants':       'WANT',
  'needs':       'NEED',
  'said':        null,     // past-tense social — heuristic handles
  'helps':       'HELP',
  'is happy':    'HAPPY',
  'is angry':    'ANGRY',
  'is sick':     'SICK',
  'where?':      null,     // question frame — heuristic handles
  'call':        null,     // imperative — heuristic handles

  // ── Self-state labels (PEOPLE pronoun L3) ──
  'am ready':    'READY',
  'am here':     null,
  'am coming':   null,
  'am leaving':  null,
  'am hungry':   'HUNGRY',
  'am thirsty':  null,
  'am tired':    'TIRED',
  'am ok':       'OK',
  'am not ok':   null,
  'am busy':     null,
  'am waiting':  null,
  'am lost':     null,

  // ── Question context labels (new QUESTION L3s) ──
  'wrong':       null,
  'for lunch':   null,
  'for dinner':  null,
  'your name':   null,
  'do this':     null,
  'say it':      null,
  'spell it':    null,
  'use it':      null,
  'get there':   null,
  'you feel':    null,
  'fix it':      null,
  'open it':     null,
  'lunch':       null,
  'go home':     null,
  'bedtime':     null,
  'the doctor':  null,
  'recess':      null,
  'is this over': null,
  'does it start': null,
  'did this':    null,
  'is talking':  null,
  'is coming':   null,
  'is that':     null,
  'can help':    null,
  'is it for':   null,
  'can\'t i':    null,
  'crying':      null,
  'leaving':     null,
  'help me':     null,
  'show me':     null,
  'tell me':     null,
  'give me':     null,
  'sit here':    null,
  'do you have': null,
  'is it':       null,

  // ── New L2 labels ──
  'open':        'OPEN',
  'make':        null,
  'read':        null,
  'nice':        null,
  'new':         null,
  'old':         null,

  // Sub-place labels (L3) — no direct concept equivalent
  // Note: 'bathroom' now maps to BATHROOM concept (L2 place)
  'kitchen':     null,
  'bedroom':     null,
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

// ── L1 category → implicit concept ID ────────────────────────────────────────
// Maps a hierarchy L1 category ID to the engine concept that should be
// auto-injected as the implicit verb/operator for that category.
//
// Examples:
//   'need'  → 'NEED'   → "I need water."   (subject + NEED + object)
//   'feel'  → 'FEEL'   → "I feel sad."     (subject + FEEL + adjective)
//   'do'    → null     → verb is the L2 item itself – no injection needed
//   'talk'  → null     → interjection / social – no injection needed
//
// Usage (in board component):
//   const prefix = l1CategoryToConceptId(activeCategoryId);
//   const ids = tapContextToConceptIds(
//     prefix ? ['I', prefix] : corePrefixLabels,
//     tapContext
//   );

const L1_CATEGORY_CONCEPT = {
  need:     'NEED',   // "I need [water/toilet/help]"
  feel:     'FEEL',   // "I feel [sad/happy/hurt]"  → sentenceBuilder uses copula when adj follows
  do:       null,     // L2 IS the verb
  people:   null,     // L2 IS the subject
  talk:     null,     // pragmatic/social — standalone
  place:    'GO',     // "go [home/school]" — default motion verb
  question: null,     // interrogative — no implicit concept
  describe: null,     // L2 IS the adjective; subject picks from PEOPLE
};

/**
 * Return the implicit concept ID that should be prepended for a given
 * L1 hierarchy category, or null if no injection is needed.
 *
 * @param {string} categoryId - e.g. 'need', 'feel', 'do', 'place'
 * @returns {string|null}
 */
export function l1CategoryToConceptId(categoryId) {
  if (!categoryId) return null;
  const key = categoryId.toLowerCase();
  return Object.prototype.hasOwnProperty.call(L1_CATEGORY_CONCEPT, key)
    ? L1_CATEGORY_CONCEPT[key]
    : null;
}
