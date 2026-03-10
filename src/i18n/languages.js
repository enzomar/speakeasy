/**
 * languages.js — Core language definitions.
 *
 * Each language has:
 *   code     — ISO 639-1 (used as key everywhere)
 *   name     — display name in that language
 *   flag     — emoji flag
 *   ttsLang  — BCP-47 tag passed to SpeechSynthesisUtterance.lang
 *   dir      — "ltr" | "rtl"
 *
 * EXTENDING:
 *   Add a new language object to LANGUAGES, then add its translations to
 *   translations.js and ui-strings.js.  Nothing else needs to change.
 */

export const LANGUAGES = [
  { code: "en", name: "English",    flag: "🇬🇧", ttsLang: "en-US", dir: "ltr" },
  { code: "es", name: "Español",    flag: "🇪🇸", ttsLang: "es-ES", dir: "ltr" },
  { code: "fr", name: "Français",   flag: "🇫🇷", ttsLang: "fr-FR", dir: "ltr" },
  { code: "it", name: "Italiano",   flag: "🇮🇹", ttsLang: "it-IT", dir: "ltr" },
  { code: "pt", name: "Português",  flag: "🇧🇷", ttsLang: "pt-BR", dir: "ltr" },
];

export const LANG_MAP = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));

// ── Activation keyword choices (3 per language) ─────────────────────────────────

export const ACTIVATION_KEYWORDS = {
  en: ["Luma", "Nora", "SpeakEasy"],
  es: ["Luma", "Nora", "SpeakEasy"],
  fr: ["Luma", "Nora", "SpeakEasy"],
  it: ["Luma", "Nora", "SpeakEasy"],
  pt: ["Luma", "Nora", "SpeakEasy"],
};
