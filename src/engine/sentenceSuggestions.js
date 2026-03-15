/**
 * sentenceSuggestions.js — Resolve ranked sentence suggestions for
 * an L1→L2→L3 selection path.
 *
 * v2 — ranked collection model:
 *   Instead of returning the first matching branch, collects candidates
 *   from ALL sources, tags each with a priority tier, deduplicates, and
 *   returns the top 3 ranked by:
 *     Tier 1  exact L3 recipe (generator)
 *     Tier 2  temporal L3 derivation
 *     Tier 3  board override (exact L3)
 *     Tier 4  board override (L2)
 *     Tier 5  L2 generator fallback
 *     Tier 6  curated fallback template (L3)
 *     Tier 7  curated fallback template (L2)
 *
 *   Emotion-aware re-ranking: when an emotion is provided, candidates
 *   matching the emotional tone are promoted.
 *
 * L3 policy (strict by default):
 *   • If an L3 is selected, only L3 keys are resolved unless
 *     `allowL3ToL2Fallback` is explicitly true.
 *
 * @module sentenceSuggestions
 */

import { SENTENCE_TEMPLATES, getTemplates } from "../data/sentenceTemplates.js";
import {
  generateTemplate,
  generateTemplateFromL2Modifier,
  composeFromModifier,
  hasRecipe,
} from "./templateGenerator.js";
import {
  generateFromGrammar,
  generateFromGrammarL3,
} from "./grammarPatterns.js";

// ── Emotion keyword sets for re-ranking ─────────────────────────────────────
const URGENT_PATTERNS   = /\b(help|emergency|hurry|now|pain|hurt|stop|sos)\b/i;
const POSITIVE_PATTERNS = /\b(happy|good|great|love|like|thank|please|excited|calm)\b/i;
const NEGATIVE_PATTERNS = /\b(sad|bad|angry|scared|sick|tired|lonely|don't|not|no)\b/i;
const UNCERTAIN_PATTERNS = /\b(maybe|don't know|confused|wonder|think)\b/i;

function emotionScore(text, emotion) {
  if (!emotion || emotion === "neutral") return 0;
  switch (emotion) {
    case "urgent":    return URGENT_PATTERNS.test(text)    ? 2 : 0;
    case "positive":  return POSITIVE_PATTERNS.test(text)  ? 2 : 0;
    case "negative":  return NEGATIVE_PATTERNS.test(text)  ? 2 : 0;
    case "uncertain": return UNCERTAIN_PATTERNS.test(text) ? 2 : 0;
    default: return 0;
  }
}

/**
 * Build the template lookup key for a given tap path.
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} [l3Id]
 * @returns {string}
 */
function makeKey(l1Id, l2Id, l3Id) {
  return l3Id ? `${l1Id}:${l2Id}:${l3Id}` : `${l1Id}:${l2Id}`;
}

/**
 * @typedef {Object} Candidate
 * @property {string} text
 * @property {number} tier  - Lower = higher priority
 */

/**
 * Collect candidates from a source and tag them with a tier.
 * @param {string[]} texts
 * @param {number}   tier
 * @returns {Candidate[]}
 */
function tagCandidates(texts, tier) {
  if (!texts?.length) return [];
  return texts.map(text => ({ text, tier }));
}

/**
 * Deduplicate candidates by normalized text, keeping the best tier for each.
 * Then sort by effective priority (tier - emotionBonus) and return top N texts.
 *
 * @param {Candidate[]} candidates
 * @param {string} [emotion]
 * @param {number} [limit=3]
 * @returns {string[]}
 */
function rankAndDedupe(candidates, emotion, limit = 3) {
  const seen = new Map(); // normalized text → best candidate
  for (const c of candidates) {
    const key = c.text.trim().toLowerCase();
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing || c.tier < existing.tier) {
      seen.set(key, c);
    }
  }

  const ranked = [...seen.values()].sort((a, b) => {
    const aScore = a.tier - emotionScore(a.text, emotion);
    const bScore = b.tier - emotionScore(b.text, emotion);
    return aScore - bScore;
  });

  return ranked.slice(0, limit).map(c => c.text.trim());
}

/**
 * Get ranked sentence suggestions for a tap path.
 *
 * @param {object} params
 * @param {string}  params.l1Id
 * @param {string}  params.l2Id
 * @param {string}  [params.l3Id]
 * @param {string}  [params.langCode]           - Language code (default: "en")
 * @param {boolean} [params.allowL3ToL2Fallback] - Permit L2 fallback when L3 has no match
 * @param {string}  [params.emotion]             - Detected or user-selected emotion for re-ranking
 * @param {Record<string, string[]>} [params.boardOverrides]
 * @returns {string[]} 1–3 ranked sentence suggestions
 */
export function getSentenceSuggestions({
  l1Id,
  l2Id,
  l3Id,
  langCode = "en",
  allowL3ToL2Fallback = false,
  emotion,
  boardOverrides,
}) {
  const hasL3 = Boolean(l3Id);
  const key3 = hasL3 ? makeKey(l1Id, l2Id, l3Id) : null;
  const key2 = makeKey(l1Id, l2Id);

  /** @type {Candidate[]} */
  const candidates = [];

  // ── Tier 1: Exact L3 recipe (generator) ──
  if (key3 && hasRecipe(key3)) {
    candidates.push(...tagCandidates(generateTemplate(key3, langCode), 1));
  }

  // ── Tier 2: Temporal L3 derivation from L2 recipe ──
  if (key3) {
    candidates.push(
      ...tagCandidates(generateTemplateFromL2Modifier(l1Id, l2Id, l3Id, langCode), 2),
    );
  }

  // ── Tier 2.5: Compositional grammar (auto-compose from modifier type) ──
  if (key3) {
    candidates.push(
      ...tagCandidates(composeFromModifier(l1Id, l2Id, l3Id, langCode), 2.5),
    );
  }

  // ── Tier 2.7: Grammar pattern L3 (syntactic auto-generation) ──
  if (key3) {
    candidates.push(
      ...tagCandidates(generateFromGrammarL3(l1Id, l2Id, l3Id, langCode), 2.7),
    );
  }

  // ── Tier 3: Board override exact L3 ──
  if (boardOverrides && hasL3) {
    candidates.push(
      ...tagCandidates(boardOverrides[makeKey(l1Id, l2Id, l3Id)], 3),
    );
  }

  // ── Tier 4: Board override L2 (only when no L3 or fallback allowed) ──
  if (boardOverrides && (!hasL3 || allowL3ToL2Fallback)) {
    candidates.push(
      ...tagCandidates(boardOverrides[makeKey(l1Id, l2Id)], 4),
    );
  }

  // ── Tier 5: L2 generator fallback ──
  if ((!hasL3 || allowL3ToL2Fallback) && hasRecipe(key2)) {
    candidates.push(...tagCandidates(generateTemplate(key2, langCode), 5));
  }

  // ── Tier 5.5: Grammar pattern L2 (syntactic auto-generation) ──
  if (!hasL3 || allowL3ToL2Fallback) {
    candidates.push(
      ...tagCandidates(generateFromGrammar(l1Id, l2Id, langCode), 5.5),
    );
  }

  // ── Tier 6: Curated fallback template (L3, language-aware) ──
  if (key3) {
    candidates.push(...tagCandidates(getTemplates(key3, langCode), 6));
  }

  // ── Tier 7: Curated fallback template (L2, language-aware) ──
  if (!hasL3 || allowL3ToL2Fallback) {
    candidates.push(...tagCandidates(getTemplates(key2, langCode), 7));
  }

  return rankAndDedupe(candidates, emotion);
}
