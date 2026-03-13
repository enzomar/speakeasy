/**
 * ui-strings.js — UI string tables for the app shell in each language.
 *
 * Each language lives in its own file under ./locales/<lang>.js for
 * easier maintenance and diffing.  This module re-exports the combined
 * UI_STRINGS map and the getUI() helper used throughout the app.
 */
import en from "./locales/en.js";
import es from "./locales/es.js";
import fr from "./locales/fr.js";
import it from "./locales/it.js";
import pt from "./locales/pt.js";
import de from "./locales/de.js";
import ar from "./locales/ar.js";
import zh from "./locales/zh.js";
import ja from "./locales/ja.js";
import ko from "./locales/ko.js";

export const UI_STRINGS = { en, es, fr, it, pt, de, ar, zh, ja, ko };

export function getUI(langCode) {
  return UI_STRINGS[langCode] ?? UI_STRINGS.en;
}
