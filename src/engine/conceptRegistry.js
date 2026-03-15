/**
 * conceptRegistry.js
 *
 * Single semantic source of truth for every concept in the AAC engine.
 * Unifies lexicon.json concepts/operators with hierarchy IDs, phrase-table
 * lookups, and semantic metadata into one queryable registry.
 *
 * Other modules should use this instead of directly importing lexicon.json
 * when they need concept metadata, hierarchy→concept bridging, or
 * semantic role information.
 *
 * @module conceptRegistry
 */

import LEXICON from './lexicon.json' assert { type: 'json' };

// ─── Semantic roles ───────────────────────────────────────────────────────────
// Each concept carries a semantic role that drives grammatical composition.

/** @typedef {'agent'|'action'|'object'|'state'|'place'|'time'|'modifier'|'operator'|'social'} SemanticRole */

/**
 * Semantic type classifies what kind of communicative act an L2 item represents.
 * Used by the generator to auto-compose recipes.
 * @typedef {'emotion'|'physical_need'|'action'|'social_action'|'location'|'question'|'descriptor'|'pronoun_ref'|'person_ref'} SemanticType
 */

// ─── L2 Semantic type map ─────────────────────────────────────────────────────
// Maps hierarchy L2 IDs to their semantic type for generator auto-composition.

const L2_SEMANTIC_TYPE = {
  // FEEL palette — emotion states
  f_hurt: 'emotion', f_sick: 'emotion', f_scared: 'emotion',
  f_sad: 'emotion', f_angry: 'emotion', f_tired: 'emotion',
  f_frustrated: 'emotion', f_confused: 'emotion', f_nervous: 'emotion',
  f_bored: 'emotion', f_lonely: 'emotion', f_happy: 'emotion',
  f_excited: 'emotion', f_calm: 'emotion',

  // NEED palette — physical/care needs
  n_water: 'physical_need', n_food: 'physical_need', n_toilet: 'physical_need',
  n_help: 'physical_need', n_drink: 'physical_need', n_medicine: 'physical_need',
  n_sleep: 'physical_need', n_rest: 'physical_need', n_hug: 'physical_need',
  n_change: 'physical_need', n_quiet: 'physical_need', n_space: 'physical_need',
  n_clean: 'physical_need', n_break: 'physical_need',

  // PEOPLE palette — pronouns and person references
  pe_i: 'pronoun_ref', pe_you: 'pronoun_ref', pe_we: 'pronoun_ref', pe_they: 'pronoun_ref',
  pe_mom: 'person_ref', pe_dad: 'person_ref', pe_brother: 'person_ref',
  pe_sister: 'person_ref', pe_grandma: 'person_ref', pe_grandpa: 'person_ref',
  pe_friend: 'person_ref', pe_teacher: 'person_ref', pe_doctor: 'person_ref',
  pe_nurse: 'person_ref', pe_therapist: 'person_ref',

  // DO palette — action verbs
  d_stop: 'action', d_help: 'action', d_go: 'action', d_come: 'action',
  d_give: 'action', d_turn: 'action', d_eat: 'action', d_drink: 'action',
  d_play: 'action', d_watch: 'action', d_open: 'action', d_make: 'action',
  d_read: 'action', d_like: 'action', d_finish: 'action',

  // TALK palette — social/communication actions
  s_hello: 'social_action', s_bye: 'social_action', s_yes: 'social_action',
  s_no: 'social_action', s_please: 'social_action', s_thanks: 'social_action',
  s_sorry: 'social_action', s_ok: 'social_action', s_idk: 'social_action',
  s_wait: 'social_action', s_understand: 'social_action', s_tell: 'social_action',
  s_ask: 'social_action', s_repeat: 'social_action',

  // PLACE palette — locations
  lc_home: 'location', lc_school: 'location', lc_hospital: 'location',
  lc_outside: 'location', lc_store: 'location', lc_restau: 'location',
  lc_car: 'location', lc_bus: 'location', lc_bathroom: 'location',
  lc_park: 'location', lc_here: 'location', lc_there: 'location',
  lc_bedroom: 'location',

  // QUESTION palette — interrogatives
  q_what: 'question', q_where: 'question', q_when: 'question',
  q_who: 'question', q_why: 'question', q_how: 'question',
  q_howmuch: 'question', q_howmany: 'question', q_canI: 'question',
  q_canYou: 'question', q_doYouHave: 'question', q_isIt: 'question',

  // DESCRIBE palette — adjective descriptors
  dc_good: 'descriptor', dc_bad: 'descriptor', dc_ready: 'descriptor',
  dc_nice: 'descriptor', dc_big: 'descriptor', dc_small: 'descriptor',
  dc_hot: 'descriptor', dc_cold: 'descriptor', dc_new: 'descriptor',
  dc_old: 'descriptor', dc_loud: 'descriptor', dc_quiet: 'descriptor',
  dc_broken: 'descriptor', dc_same: 'descriptor',
};

// ─── Hierarchy → Concept bridge ───────────────────────────────────────────────
// Maps hierarchy L2/L3 IDs to lexicon concept IDs where a direct
// semantic correspondence exists.

const HIERARCHY_TO_CONCEPT = {
  // ── People (person palette) ──
  p_mom:       'MOM',
  p_dad:       'DAD',
  p_friend:    'FRIEND',
  p_teacher:   'TEACHER',
  p_doctor:    'DOCTOR',
  p_nurse:     'NURSE',
  p_caregiver: 'CAREGIVER',
  p_brother:   'BROTHER',
  p_sister:    'SISTER',

  // ── Places ──
  pl_home:     'HOME',
  pl_school:   'SCHOOL',
  pl_outside:  'OUTSIDE',
  pl_park:     'PARK',
  pl_here:     'HERE',
  pl_there:    'THERE',
  pl_hospital: 'HOSPITAL',

  // ── Objects ──
  o_water:     'WATER',
  o_food:      'FOOD',
  o_medicine:  'MEDICINE',
  o_space:     'SPACE',

  // ── Feelings (L2 items in FEEL palette) ──
  f_happy:     'HAPPY',
  f_sad:       'SAD',
  f_angry:     'ANGRY',
  f_scared:    'SCARED',
  f_tired:     'TIRED',
  f_sick:      'SICK',
  f_hurt:      'HURT',
  f_bored:     'BORED',
  f_excited:   'EXCITED',
  f_confused:  'CONFUSED',
  f_hungry:    'HUNGRY',
  f_lonely:    'LONELY',

  // ── Actions (L2 items in DO palette) ──
  d_go:        'GO',
  d_eat:       'EAT',
  d_drink:     'DRINK',
  d_play:      'PLAY',
  d_sleep:     'SLEEP',
  d_read:      'READ',
  d_stop:      'STOP',
  d_wait:      'WAIT',
  d_help:      'HELP',
  d_open:      'OPEN',
};

// Reverse map: concept ID → hierarchy IDs (one-to-many possible)
const CONCEPT_TO_HIERARCHY = Object.create(null);
for (const [hId, cId] of Object.entries(HIERARCHY_TO_CONCEPT)) {
  (CONCEPT_TO_HIERARCHY[cId] ??= []).push(hId);
}

// ─── Semantic role inference ──────────────────────────────────────────────────
// Maps lexicon type strings to semantic roles.

const TYPE_TO_ROLE = {
  pronoun:   'agent',
  noun:      'object',
  verb:      'action',
  adjective: 'state',
  adverb:    'modifier',
  place:     'place',
  // Operators
  tense:     'operator',
  modal:     'operator',
  polarity:  'operator',
  intensity: 'operator',
  aspect:    'operator',
  mood:      'operator',
};

// Override for specific concepts whose role differs from their type
const ROLE_OVERRIDES = {
  MOM: 'agent', DAD: 'agent', FRIEND: 'agent', TEACHER: 'agent',
  DOCTOR: 'agent', NURSE: 'agent', CAREGIVER: 'agent',
  BROTHER: 'agent', SISTER: 'agent',
};

// ─── Registry entry ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} ConceptEntry
 * @property {string}       id            - Canonical concept ID (e.g. "GO", "HAPPY")
 * @property {string}       type          - Lexicon type (pronoun, verb, noun, adjective, place, ...)
 * @property {SemanticRole} semanticRole  - Derived semantic role
 * @property {boolean}      isOperator    - True for tense/modal/polarity/intensity/aspect/mood
 * @property {Object}       labels        - Per-language surface forms
 * @property {Object}       [raw]         - Full lexicon entry for downstream use
 */

// ─── Precomputed registry ─────────────────────────────────────────────────────

/** @type {Map<string, ConceptEntry>} */
const _registry = new Map();

function _inferRole(id, type) {
  if (ROLE_OVERRIDES[id]) return ROLE_OVERRIDES[id];
  return TYPE_TO_ROLE[type] ?? 'object';
}

// Populate from lexicon concepts
for (const [id, entry] of Object.entries(LEXICON.concepts)) {
  _registry.set(id, {
    id,
    type: entry.type,
    semanticRole: _inferRole(id, entry.type),
    isOperator: false,
    labels: entry.labels ?? {},
    raw: entry,
  });
}

// Populate from lexicon operators
for (const [id, entry] of Object.entries(LEXICON.operators ?? {})) {
  _registry.set(id, {
    id,
    type: entry.type,
    semanticRole: 'operator',
    isOperator: true,
    labels: entry.labels ?? {},
    raw: entry,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a concept by its canonical ID.
 * Checks both concepts and operators.
 */
export function lookupConcept(id) {
  return _registry.get(id) ?? null;
}

/**
 * Resolve a hierarchy ID (e.g. "pl_home", "f_happy") to a concept entry.
 * Returns null if no mapping exists.
 */
export function resolveHierarchyId(hierarchyId) {
  const conceptId = HIERARCHY_TO_CONCEPT[hierarchyId];
  if (!conceptId) return null;
  return _registry.get(conceptId) ?? null;
}

/**
 * Map a hierarchy ID to its canonical concept ID (string), or null.
 */
export function hierarchyToConcept(hierarchyId) {
  return HIERARCHY_TO_CONCEPT[hierarchyId] ?? null;
}

/**
 * Map a concept ID to all known hierarchy IDs that reference it.
 */
export function conceptToHierarchyIds(conceptId) {
  return CONCEPT_TO_HIERARCHY[conceptId] ?? [];
}

/**
 * Get the semantic role for a concept or hierarchy ID.
 */
export function getSemanticRole(id) {
  // Direct concept lookup
  const entry = _registry.get(id);
  if (entry) return entry.semanticRole;
  // Try hierarchy bridge
  const conceptId = HIERARCHY_TO_CONCEPT[id];
  if (conceptId) return _registry.get(conceptId)?.semanticRole ?? null;
  return null;
}

/**
 * Query all concepts matching a given semantic role.
 * @param {SemanticRole} role
 * @returns {ConceptEntry[]}
 */
export function getConceptsByRole(role) {
  const results = [];
  for (const entry of _registry.values()) {
    if (entry.semanticRole === role) results.push(entry);
  }
  return results;
}

/**
 * Query all concepts matching a given lexicon type.
 * @param {string} type - e.g. "verb", "pronoun", "adjective"
 * @returns {ConceptEntry[]}
 */
export function getConceptsByType(type) {
  const results = [];
  for (const entry of _registry.values()) {
    if (entry.type === type) results.push(entry);
  }
  return results;
}

/**
 * Get a localized label for a concept or hierarchy ID.
 * Falls back to English, then to the ID itself.
 */
export function getLabel(id, lang = 'en') {
  const entry = _registry.get(id)
    ?? _registry.get(HIERARCHY_TO_CONCEPT[id]);
  if (!entry) return id;
  return entry.labels[lang] ?? entry.labels.en ?? id;
}

/**
 * Check whether a given ID (concept or hierarchy) is known.
 */
export function isKnown(id) {
  return _registry.has(id) || id in HIERARCHY_TO_CONCEPT;
}

/**
 * Total number of registered concepts (excluding hierarchy aliases).
 */
export function size() {
  return _registry.size;
}

/**
 * Iterate all concept entries.
 * @returns {IterableIterator<ConceptEntry>}
 */
export function allConcepts() {
  return _registry.values();
}

// ─── Re-export for compatibility ──────────────────────────────────────────────
export { HIERARCHY_TO_CONCEPT, CONCEPT_TO_HIERARCHY };

// ─── L2 Semantic type queries ─────────────────────────────────────────────────

/**
 * Get the semantic type of a hierarchy L2 item.
 * @param {string} l2Id - e.g. "f_happy", "d_go", "s_hello"
 * @returns {SemanticType|null}
 */
export function getL2SemanticType(l2Id) {
  return L2_SEMANTIC_TYPE[l2Id] ?? null;
}

/**
 * Get all L2 IDs matching a given semantic type.
 * @param {SemanticType} type - e.g. "emotion", "action", "social_action"
 * @returns {string[]}
 */
export function getL2sBySemanticType(type) {
  const results = [];
  for (const [id, t] of Object.entries(L2_SEMANTIC_TYPE)) {
    if (t === type) results.push(id);
  }
  return results;
}

// ─── Concept Ontology Graph ───────────────────────────────────────────────────
// Defines semantic relationships between concepts for smarter prediction
// and contextual suggestion ranking.

/** @typedef {'IS_A'|'HAS_PROPERTY'|'USED_FOR'|'LOCATED_AT'|'REQUIRES'|'OPPOSITE'|'RELATED'} RelationType */

/**
 * @typedef {Object} OntologyEdge
 * @property {string}       from     - Source concept ID
 * @property {RelationType} relation - Relationship type
 * @property {string}       to       - Target concept ID
 */

/** @type {OntologyEdge[]} */
const ONTOLOGY_EDGES = [
  // ── IS_A (taxonomic) ──
  { from: 'MOM',       relation: 'IS_A',         to: 'PERSON' },
  { from: 'DAD',       relation: 'IS_A',         to: 'PERSON' },
  { from: 'FRIEND',    relation: 'IS_A',         to: 'PERSON' },
  { from: 'TEACHER',   relation: 'IS_A',         to: 'PERSON' },
  { from: 'DOCTOR',    relation: 'IS_A',         to: 'PERSON' },
  { from: 'NURSE',     relation: 'IS_A',         to: 'PERSON' },
  { from: 'WATER',     relation: 'IS_A',         to: 'DRINK' },
  { from: 'FOOD',      relation: 'IS_A',         to: 'CONSUMABLE' },
  { from: 'MEDICINE',  relation: 'IS_A',         to: 'CONSUMABLE' },
  { from: 'HOME',      relation: 'IS_A',         to: 'LOCATION' },
  { from: 'SCHOOL',    relation: 'IS_A',         to: 'LOCATION' },
  { from: 'HOSPITAL',  relation: 'IS_A',         to: 'LOCATION' },
  { from: 'PARK',      relation: 'IS_A',         to: 'LOCATION' },

  // ── HAS_PROPERTY (adjective associations) ──
  { from: 'WATER',     relation: 'HAS_PROPERTY', to: 'COLD' },
  { from: 'FOOD',      relation: 'HAS_PROPERTY', to: 'HOT' },
  { from: 'MEDICINE',  relation: 'HAS_PROPERTY', to: 'BITTER' },

  // ── USED_FOR (functional) ──
  { from: 'WATER',     relation: 'USED_FOR',     to: 'DRINK' },
  { from: 'FOOD',      relation: 'USED_FOR',     to: 'EAT' },
  { from: 'MEDICINE',  relation: 'USED_FOR',     to: 'SICK' },
  { from: 'HOSPITAL',  relation: 'USED_FOR',     to: 'DOCTOR' },
  { from: 'SCHOOL',    relation: 'USED_FOR',     to: 'TEACHER' },

  // ── LOCATED_AT (typical location) ──
  { from: 'TEACHER',   relation: 'LOCATED_AT',   to: 'SCHOOL' },
  { from: 'DOCTOR',    relation: 'LOCATED_AT',   to: 'HOSPITAL' },
  { from: 'NURSE',     relation: 'LOCATED_AT',   to: 'HOSPITAL' },

  // ── REQUIRES (precondition) ──
  { from: 'EAT',       relation: 'REQUIRES',     to: 'FOOD' },
  { from: 'DRINK',     relation: 'REQUIRES',     to: 'WATER' },
  { from: 'GO',        relation: 'REQUIRES',     to: 'LOCATION' },
  { from: 'SLEEP',     relation: 'REQUIRES',     to: 'TIRED' },

  // ── OPPOSITE ──
  { from: 'HAPPY',     relation: 'OPPOSITE',     to: 'SAD' },
  { from: 'HOT',       relation: 'OPPOSITE',     to: 'COLD' },
  { from: 'BIG',       relation: 'OPPOSITE',     to: 'SMALL' },
  { from: 'LOUD',      relation: 'OPPOSITE',     to: 'QUIET' },

  // ── RELATED (semantic proximity) ──
  { from: 'TIRED',     relation: 'RELATED',      to: 'SLEEP' },
  { from: 'HUNGRY',    relation: 'RELATED',      to: 'EAT' },
  { from: 'SICK',      relation: 'RELATED',      to: 'MEDICINE' },
  { from: 'HURT',      relation: 'RELATED',      to: 'DOCTOR' },
  { from: 'SCARED',    relation: 'RELATED',      to: 'HELP' },
  { from: 'LONELY',    relation: 'RELATED',      to: 'FRIEND' },
  { from: 'BORED',     relation: 'RELATED',      to: 'PLAY' },
];

// Build adjacency index for fast lookups
const _outgoing = new Map();  // concept → edges from it
const _incoming = new Map();  // concept → edges to it

for (const edge of ONTOLOGY_EDGES) {
  if (!_outgoing.has(edge.from)) _outgoing.set(edge.from, []);
  _outgoing.get(edge.from).push(edge);
  if (!_incoming.has(edge.to)) _incoming.set(edge.to, []);
  _incoming.get(edge.to).push(edge);
}

/**
 * Get all outgoing relationships from a concept.
 * @param {string} conceptId
 * @returns {OntologyEdge[]}
 */
export function getRelationsFrom(conceptId) {
  return _outgoing.get(conceptId) ?? [];
}

/**
 * Get all incoming relationships to a concept.
 * @param {string} conceptId
 * @returns {OntologyEdge[]}
 */
export function getRelationsTo(conceptId) {
  return _incoming.get(conceptId) ?? [];
}

/**
 * Get concepts related to a given concept by a specific relation type.
 * @param {string} conceptId
 * @param {RelationType} relation
 * @returns {string[]} Target concept IDs
 */
export function getRelated(conceptId, relation) {
  return (_outgoing.get(conceptId) ?? [])
    .filter(e => e.relation === relation)
    .map(e => e.to);
}

/**
 * Get all concepts that have a given relation to the target.
 * E.g. getInverseRelated("SCHOOL", "LOCATED_AT") → ["TEACHER"]
 * @param {string} conceptId
 * @param {RelationType} relation
 * @returns {string[]} Source concept IDs
 */
export function getInverseRelated(conceptId, relation) {
  return (_incoming.get(conceptId) ?? [])
    .filter(e => e.relation === relation)
    .map(e => e.from);
}

/**
 * Find semantic neighbors of a concept (all relations, both directions).
 * Useful for prediction: given the user tapped "SICK", suggest related concepts.
 * @param {string} conceptId
 * @param {number} [maxDepth=1] - How many hops to follow (default: direct neighbors only)
 * @returns {string[]} Related concept IDs (deduplicated)
 */
export function getSemanticNeighbors(conceptId, maxDepth = 1) {
  const visited = new Set([conceptId]);
  let frontier = [conceptId];

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextFrontier = [];
    for (const id of frontier) {
      for (const edge of (_outgoing.get(id) ?? [])) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          nextFrontier.push(edge.to);
        }
      }
      for (const edge of (_incoming.get(id) ?? [])) {
        if (!visited.has(edge.from)) {
          visited.add(edge.from);
          nextFrontier.push(edge.from);
        }
      }
    }
    frontier = nextFrontier;
  }

  visited.delete(conceptId);
  return [...visited];
}
