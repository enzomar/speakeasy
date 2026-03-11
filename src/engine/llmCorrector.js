/**
 * llmCorrector.js
 *
 * Optional Gemini-powered naturalisation pass.
 * Takes a deterministic sentence from sentenceBuilder and polishes it
 * for grammar and fluency, without changing meaning.
 *
 * Gracefully returns the original sentence on network errors or timeout.
 *
 * @module llmCorrector
 */

// Built-in key — same as useAIPrediction.js.
// This module is intentionally self-contained and does not import from features/.
const GEMINI_BUILT_IN_KEY = 'AIzaSyAjeJhA91grQ9Z9ihRfDtDnobOXDAGLM0k';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const LANG_NAMES = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
};

/** Default timeout for LLM requests (ms). */
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Polish a sentence using Gemini Flash.
 * Returns the original sentence if LLM is unavailable or times out.
 *
 * @param {string} sentence - Deterministic sentence from sentenceBuilder
 * @param {string} lang     - Language code ("en"|"it"|"fr"|"es"|"pt")
 * @param {Object} [opts]
 * @param {string} [opts.apiKey]            - Override the built-in key
 * @param {number} [opts.timeoutMs]         - Timeout in ms (default 4000)
 * @returns {Promise<string>}
 */
export async function correctSentence(sentence, lang, opts = {}) {
  if (!sentence?.trim()) return sentence;

  const apiKey = opts.apiKey?.trim() || GEMINI_BUILT_IN_KEY;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const langName = LANG_NAMES[lang] ?? 'English';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const prompt = [
    `You are an AAC communication assistant.`,
    `A person using an AAC device composed this sentence in ${langName}:`,
    `"${sentence}"`,
    `Fix grammar, articles, and naturalness while keeping the same meaning.`,
    `Reply with ONLY the corrected sentence — no quotation marks, no explanation.`,
    `If the sentence is already natural, return it unchanged.`,
  ].join('\n');

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 80,
          topP: 0.8,
        },
      }),
    });

    if (!res.ok) return sentence;

    const json = await res.json();
    const corrected = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!corrected || corrected.length < 2) return sentence;

    // Sanity check: ensure the corrected text is not drastically longer/different
    const ratio = corrected.length / sentence.length;
    if (ratio > 2.5 || ratio < 0.3) return sentence;

    return corrected;
  } catch {
    return sentence;
  } finally {
    clearTimeout(timer);
  }
}
