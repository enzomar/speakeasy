/**
 * grammarPatterns.js — Compositional grammar layer for the AAC engine.
 *
 * Reduces RECIPE_MAP size by auto-generating sentences for L2 (and L2+L3)
 * combinations that follow common syntactic patterns.
 *
 * This module is ONLY used as a fallback — explicit RECIPE_MAP entries and
 * other tiers (temporal, modifier composition) always take priority.
 *
 * Works for all 10 languages because it delegates to buildSentence(),
 * which uses the morphology engine and lexicon for surface rendering.
 *
 * @module grammarPatterns
 */

import { buildSentence } from "./sentenceBuilder.js";
import { hierarchyToConcept, getL2SemanticType } from "./conceptRegistry.js";
import LEXICON from "./lexicon.json" assert { type: "json" };

// ─── Grammar pattern definitions ──────────────────────────────────────────────
//
// Each pattern maps a semantic type to a concept template.
// The template uses placeholders resolved at runtime:
//   {SUBJECT}  → default "I"
//   {CONCEPT}  → the L2's mapped concept from HIERARCHY_TO_CONCEPT
//   {L3}       → the L3's mapped concept (if available)

/**
 * @typedef {Object} GrammarPattern
 * @property {string[]} concepts  - Concept ID template (with placeholder strings)
 * @property {string}   [desc]    - Human description for auditing
 */

/**
 * L2 grammar patterns by semantic type.
 * When an L2 item has a mapped concept but no explicit recipe,
 * we build a sentence from this pattern.
 * @type {Record<string, GrammarPattern>}
 */
const L2_PATTERNS = {
  // "I feel {state}" — all emotions
  emotion: {
    concepts: ["I", "{CONCEPT}"],
    desc: "PERSON + STATE (copula)"
  },

  // "I need {object/action}" — physical needs
  physical_need: {
    concepts: ["I", "NEED", "{CONCEPT}"],
    desc: "PERSON + NEED + OBJECT"
  },

  // "I {action}" — action verbs (go, eat, drink, play...)
  action: {
    concepts: ["I", "{CONCEPT}"],
    desc: "PERSON + ACTION"
  },

  // "It is {descriptor}" — adjective predicates
  descriptor: {
    concepts: ["I", "{CONCEPT}"],
    desc: "PERSON + STATE (descriptor)"
  },
};

/**
 * Additional L2 ID → explicit concept sequences for items that
 * don't have a direct HIERARCHY_TO_CONCEPT mapping but follow
 * known patterns.
 */
const L2_CONCEPT_OVERRIDES = {
  // NEED items without lexicon concepts
  n_water:    ["I", "WANT", "WATER"],
  n_food:     ["I", "WANT", "FOOD"],
  n_drink:    ["I", "WANT", "DRINK"],
  n_toilet:   ["I", "NEED", "GO", "BATHROOM"],
  n_help:     ["I", "NEED", "HELP"],
  n_medicine: ["I", "NEED", "MEDICINE"],
  n_sleep:    ["I", "NEED", "SLEEP"],
  n_rest:     ["I", "NEED", "REST"],
  n_hug:      ["I", "NEED", "HUG"],
  n_change:   ["I", "NEED", "CHANGE"],
  n_quiet:    ["I", "NEED", "QUIET"],
  n_space:    ["I", "NEED", "SPACE"],
  n_clean:    ["I", "NEED", "CLEAN"],
  n_break:    ["I", "NEED", "BREAK"],

  // DESCRIBE items
  dc_good:    ["I", "GOOD"],
  dc_bad:     ["I", "BAD"],
  dc_ready:   ["I", "READY"],
  dc_nice:    ["I", "NICE"],
  dc_big:     ["I", "BIG"],
  dc_small:   ["I", "SMALL"],
  dc_hot:     ["I", "HOT"],
  dc_cold:    ["I", "COLD"],
  dc_new:     ["I", "NEW"],
  dc_old:     ["I", "OLD"],
  dc_loud:    ["I", "LOUD"],
  dc_quiet:   ["I", "QUIET"],
  dc_broken:  ["I", "BROKEN"],
  dc_same:    ["I", "SAME"],

  // TALK items that map to social actions
  s_wait:     ["I", "WAIT"],
  s_understand: ["I", "UNDERSTAND"],
  s_tell:     ["I", "TELL"],
  s_ask:      ["I", "ASK"],
  s_repeat:   ["I", "REPEAT"],
};

// ─── Core resolution ──────────────────────────────────────────────────────────

/**
 * Resolve concept IDs for an L2 item using the grammar pattern system.
 * Returns null if no pattern applies (caller should try other tiers).
 *
 * @param {string} l2Id - Hierarchy L2 ID (e.g. "f_happy", "d_go", "n_water")
 * @returns {string[]|null} Concept ID array or null
 */
function resolveL2Concepts(l2Id) {
  // 1. Check explicit concept overrides first
  if (L2_CONCEPT_OVERRIDES[l2Id]) {
    return [...L2_CONCEPT_OVERRIDES[l2Id]];
  }

  // 2. Try hierarchy→concept bridge + semantic type pattern
  const conceptId = hierarchyToConcept(l2Id);
  if (!conceptId) return null;

  // Verify the concept exists in lexicon
  const entry = LEXICON.concepts[conceptId] ?? LEXICON.operators[conceptId];
  if (!entry) return null;

  const semType = getL2SemanticType(l2Id);
  const pattern = semType ? L2_PATTERNS[semType] : null;

  if (pattern) {
    return pattern.concepts.map(c => c === "{CONCEPT}" ? conceptId : c);
  }

  // 3. Fallback: just build "I + concept"
  return ["I", conceptId];
}

/**
 * Generate a sentence for an L2 item using grammar patterns.
 * Delegates to buildSentence() so all 10 languages are supported.
 *
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} lang - Language code (en, es, fr, de, it, pt, ar, zh, ja, ko)
 * @returns {string[]} 0-1 generated sentences
 */
export function generateFromGrammar(l1Id, l2Id, lang = "en") {
  const concepts = resolveL2Concepts(l2Id);
  if (!concepts) return [];

  const result = buildSentence(concepts, lang);
  if (!result.text) return [];

  return [result.text];
}

/**
 * Generate a sentence for an L2+L3 combination using grammar patterns.
 * Augments the L2 concept sequence with the L3 modifier's concept.
 *
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} l3Id
 * @param {string} lang
 * @returns {string[]} 0-1 generated sentences
 */
export function generateFromGrammarL3(l1Id, l2Id, l3Id, lang = "en") {
  const baseConcepts = resolveL2Concepts(l2Id);
  if (!baseConcepts) return [];

  // Resolve L3 to a concept if possible
  const l3Concept = hierarchyToConcept(l3Id);
  if (!l3Concept) return [];

  // Verify L3 concept exists
  const l3Entry = LEXICON.concepts[l3Concept] ?? LEXICON.operators[l3Concept];
  if (!l3Entry) return [];

  // Append L3 concept to the base sequence
  const concepts = [...baseConcepts, l3Concept];

  const result = buildSentence(concepts, lang);
  if (!result.text) return [];

  return [result.text];
}

/**
 * Check if grammar patterns can handle a given L2 item.
 * @param {string} l2Id
 * @returns {boolean}
 */
export function hasGrammarPattern(l2Id) {
  return resolveL2Concepts(l2Id) !== null;
}
