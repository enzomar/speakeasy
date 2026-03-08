/**
 * intentPrompt.js — System & user prompt templates for the AAC intent predictor.
 *
 * The on-device LLM receives these prompts to predict complete communication
 * intents (full sentences) from one or more tapped core words.
 *
 * ── Design rationale ──────────────────────────────────────────────────────────
 *  • AAC users (aphasia, autism, cerebral palsy, ALS, motor impairments) need
 *    to communicate in as few taps as possible — ideally 1-3.
 *  • The model must predict *entire sentences*, not single words.
 *  • Suggestions should cover the four main AAC intent categories:
 *      1. Requests  — "I want water", "Can I have my phone?"
 *      2. Feelings  — "I feel tired", "I am happy"
 *      3. Social    — "Hello!", "Thank you", "Good morning"
 *      4. Questions — "Where are we going?", "What time is it?"
 *  • Past phrases (via RAG retrieval) personalise suggestions.
 *  • Output must be a strict numbered list — no commentary, no markdown.
 *  • Sentences: 2-8 words, natural, first-person, grammatically correct.
 *  • The model should prefer high-frequency daily communication patterns.
 */

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) intent predictor embedded in a communication app for people with speech disabilities.

CONTEXT:
- The user has limited motor ability and communicates by tapping symbols/words on a board.
- Each additional tap costs significant effort. Your goal: minimise taps to a full sentence.
- The user taps 1-3 core words; you predict 4 complete sentences they most likely want to say.

RULES:
1. Output EXACTLY 4 numbered sentences (1. … 2. … 3. … 4. …).
2. Each sentence must be 2-8 words, natural, first-person where appropriate, and grammatically correct.
3. Cover diverse intents — do NOT repeat the same idea in different words:
   • At least one REQUEST ("I want…", "Can I have…", "Please give me…")
   • At least one FEELING or STATE ("I feel…", "I am…", "I'm not…")
   • The rest: a social phrase, question, or action statement as context suggests.
4. If the user's past phrases are provided, weigh them heavily — the user likely repeats similar communication patterns.
5. Prefer concrete, actionable sentences over vague ones.
6. Never output explanations, markdown, or anything besides the numbered list.
7. If the tapped words strongly imply a specific sentence, make that #1 (highest confidence).
8. Keep language simple — target a 6th-grade reading level.`;

/** Language names for the system prompt */
const LANG_NAMES = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", ar: "Arabic", zh: "Chinese",
  ja: "Japanese", ko: "Korean",
};

/**
 * Build the system prompt, optionally adding a language instruction.
 * @param {string} [langCode="en"] — ISO 639-1 code for the output language.
 */
export function buildSystemPrompt(langCode = "en") {
  if (langCode === "en") return BASE_SYSTEM_PROMPT;
  const langName = LANG_NAMES[langCode] ?? LANG_NAMES.en;
  return `${BASE_SYSTEM_PROMPT}\n9. IMPORTANT: You MUST write ALL 4 sentences in ${langName}. The tapped words may be in ${langName} — always reply in ${langName}.`;
}

// Keep a default English export for backward compatibility
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

// ── User prompt builder ───────────────────────────────────────────────────────

/** User prompt instructions per language */
const PREDICT_LINE = {
  en: "Predict 4 complete sentences they most likely want to say:",
  es: "Predice 4 oraciones completas que probablemente quieran decir:",
  fr: "Prédis 4 phrases complètes qu'ils voudraient probablement dire :",
  de: "Sage 4 vollständige Sätze voraus, die sie wahrscheinlich sagen möchten:",
  it: "Prevedi 4 frasi complete che probabilmente vogliono dire:",
  pt: "Preveja 4 frases completas que provavelmente querem dizer:",
  ar: "توقع 4 جمل كاملة يريدون قولها على الأرجح:",
  zh: "预测他们最可能想说的4个完整句子：",
  ja: "ユーザーが言いたい4つの完全な文を予測してください：",
  ko: "사용자가 말하고 싶어할 4개의 완전한 문장을 예측하세요:",
};

/**
 * Build the user-facing prompt sent to the LLM.
 *
 * @param {string}   currentWords  - Space-joined words the user has tapped so far.
 * @param {Array<{text: string}>} ragHits - Top-k similar past utterances from RAG memory.
 * @param {string}   [langCode="en"] - ISO 639-1 code for the output language.
 * @returns {string} The complete user prompt.
 */
export function buildUserPrompt(currentWords, ragHits = [], langCode = "en") {
  const parts = [];

  if (ragHits.length > 0) {
    parts.push(
      "Phrases this user frequently says:",
      ...ragHits.map(h => `- "${h.text}"`),
      ""
    );
  }

  parts.push(
    `The user tapped: "${currentWords}"`,
    "",
    PREDICT_LINE[langCode] ?? PREDICT_LINE.en,
  );

  return parts.join("\n");
}

// ── LLM generation config ─────────────────────────────────────────────────────

export const GENERATION_CONFIG = {
  max_tokens:  120,
  temperature: 0.3,
  top_p:       0.8,
  stream:      false,
};
