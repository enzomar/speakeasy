/**
 * intentEmotionEngine.js — 2-Axis Intent × Emotion Detection for AAC
 * ====================================================================
 * Auto-detects communicative intent and emotional tone from context signals.
 * Pure functions, no side effects.
 *
 * Axis 1 — Intent (what the user wants to do):
 *   statement | question | request | response | social
 *
 * Axis 2 — Emotion (how it is said):
 *   neutral | positive | negative | urgent | uncertain
 *
 * 5 × 5 = 25 expressive communication modes.
 */

// ── Word sets for auto-emotion detection ──────────────────────────────────────

const POSITIVE_WORDS = new Set([
  "happy", "excited", "love", "content", "good", "better", "fine", "ready",
  "thank you", "you're welcome", "yes", "ok",
  "calm", "hug", "friend", "family",
]);

const NEGATIVE_WORDS = new Set([
  "sad", "angry", "scared", "bored", "bad", "worse", "hurt", "sick",
  "confused", "pain", "no", "sorry",
  "lonely", "nervous", "worry", "tired",
]);

const URGENT_WORDS = new Set([
  "now", "help", "please", "stop", "medicine", "bathroom",
  "toilet", "doctor",
]);

const UNCERTAIN_WORDS = new Set([
  "maybe", "I don't know", "a little",
]);

// ── Intent Detection ──────────────────────────────────────────────────────────

/**
 * Auto-detect communicative intent from context.
 *
 * Priority:
 *   1. Transcript present → response (replying to someone)
 *   2. Phrase / social category → social (greetings, courtesy)
 *   3. Noun / food / things / places → request (wanting something)
 *   4. Verb / actions → request (wanting to do something)
 *   5. Adjective / feelings → statement (describing state)
 *   6. Default → statement
 *
 * @param {string}  pos            - POS of tapped symbol
 * @param {string}  categoryId     - Category mapTo value
 * @param {boolean} hasTranscript  - Whether a listen-mode transcript is active
 * @param {string}  [modifierCanon] - English canonical label of L3 modifier
 * @returns {string} One of: "statement" | "question" | "request" | "response" | "social"
 */
export function detectIntent(pos, categoryId, hasTranscript, modifierCanon) {
  // Transcript → always reply mode
  if (hasTranscript) return "response";

  // Questions category → question intent (must check BEFORE phrase check because
  // question words like "what"/"where" have pos=phrase in POS_DICT)
  if (categoryId === "questions") return "question";

  // Verbs always use request intent (imperative), even in the TALK category.
  // This ensures "tell", "ask", "wait", "repeat", "understand" get proper verb
  // templates ("Help me understand") instead of bare phrase concatenation.
  if (pos === "verb") return "request";

  // Social expressions: greetings, responses, courtesy
  if (pos === "phrase" || categoryId === "social") return "social";

  // Objects, needs, places, people → user wants something
  if (pos === "noun" || categoryId === "needs" || categoryId === "people" || categoryId === "places") return "request";

  // Actions → user wants to do something
  if (categoryId === "actions") return "request";

  // Feelings / descriptors → describing state
  if (pos === "adjective" || categoryId === "feelings" || categoryId === "descriptors") return "statement";

  // Adverbs → statement
  if (pos === "adverb") return "statement";

  return "statement";
}

// ── Emotion Detection ─────────────────────────────────────────────────────────

/**
 * Auto-detect emotional tone from context signals.
 *
 * Checks modifier first (it refines/overrides), then the main symbol.
 *
 * @param {string} canonicalLabel  - English label of tapped symbol (e.g., "happy", "water")
 * @param {string} [modifierCanon] - English canonical label of L3 modifier
 * @param {string} [categoryId]    - Category mapTo value
 * @returns {string} One of: "neutral" | "positive" | "negative" | "urgent" | "uncertain"
 */
export function detectEmotion(canonicalLabel, modifierCanon, categoryId) {
  const canon = canonicalLabel?.toLowerCase() || "";
  const mod   = modifierCanon?.toLowerCase() || "";

  // ── Modifier overrides (L3 selection refines tone) ──
  if (URGENT_WORDS.has(mod))    return "urgent";
  if (UNCERTAIN_WORDS.has(mod)) return "uncertain";
  if (mod === "not" || mod === "less") return "negative";
  if (mod === "very" || mod === "more") return "positive";

  // ── Main symbol emotion ──
  if (POSITIVE_WORDS.has(canon))  return "positive";
  if (NEGATIVE_WORDS.has(canon))  return "negative";
  if (URGENT_WORDS.has(canon))    return "urgent";
  if (UNCERTAIN_WORDS.has(canon)) return "uncertain";

  return "neutral";
}
