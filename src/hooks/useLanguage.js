/**
 * useLanguage — persists four independent language dimensions:
 *   • uiLang     — interface language (buttons, labels, navigation strings)
 *   • typeLang   — symbol board language (symbol labels, categories)
 *   • ttsLang    — text-to-speech voice language
 *   • listenLang — speech recognition language (Listen Mode / wake word)
 *
 * typeLang and ttsLang can optionally be linked so they stay in sync.
 * uiLang and listenLang are always independent.
 */

import { useState, useCallback } from "react";
import { LANGUAGES, LANG_MAP }   from "../data/languages";

const KEY_UI     = "speakeasy_uilang_v1";
const KEY_TYPE   = "speakeasy_typelang_v1";
const KEY_TTS    = "speakeasy_ttslang_v1";
const KEY_LISTEN = "speakeasy_listenlang_v1";
const KEY_LINKED = "speakeasy_langs_linked_v1";

function detect() {
  const nav = navigator.language?.slice(0, 2) ?? "en";
  return LANG_MAP[nav] ? nav : "en";
}

function load(key) {
  try {
    const v = localStorage.getItem(key);
    if (v && LANG_MAP[v]) return v;
  } catch { /* ignore */ }
  return null;
}

function save(key, val) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function useLanguage() {
  const detected = detect();

  // Interface language — fully independent
  const [uiLangCode,     setUiLangCode]     = useState(() => load(KEY_UI)     ?? load(KEY_TYPE) ?? detected);
  // Symbol board language
  const [typeLangCode,   setTypeLangCode]   = useState(() => load(KEY_TYPE)   ?? detected);
  // TTS voice language
  const [ttsLangCode,    setTtsLangCode]    = useState(() => load(KEY_TTS)    ?? load(KEY_TYPE) ?? detected);
  // Speech recognition language (Listen Mode)
  const [listenLangCode, setListenLangCode] = useState(() => load(KEY_LISTEN) ?? load(KEY_TYPE) ?? detected);

  const [langsLinked,  setLangsLinked]  = useState(() => {
    try { return localStorage.getItem(KEY_LINKED) !== "false"; } catch { return true; }
  });

  // UI and symbol language are always kept in sync.
  const setUiLang = useCallback((code) => {
    save(KEY_UI, code);
    setUiLangCode(code);
    save(KEY_TYPE, code);
    setTypeLangCode(code);
    if (langsLinked) {
      save(KEY_TTS, code);
      setTtsLangCode(code);
      save(KEY_LISTEN, code);
      setListenLangCode(code);
    }
  }, [langsLinked]);

  // Alias — changing symbol language also updates the UI language.
  const setTypeLang = useCallback((code) => {
    save(KEY_TYPE, code);
    setTypeLangCode(code);
    save(KEY_UI, code);
    setUiLangCode(code);
    if (langsLinked) {
      save(KEY_TTS, code);
      setTtsLangCode(code);
    }
  }, [langsLinked]);

  const setTtsLang = useCallback((code) => {
    save(KEY_TTS, code);
    setTtsLangCode(code);
  }, []);

  const setListenLang = useCallback((code) => {
    save(KEY_LISTEN, code);
    setListenLangCode(code);
  }, []);

  const setLinked = useCallback((linked) => {
    save(KEY_LINKED, linked ? "true" : "false");
    setLangsLinked(linked);
    if (linked) {
      // Sync ttsLang → typeLang when re-linking
      setTtsLangCode(() => {
        save(KEY_TTS, typeLangCode);
        return typeLangCode;
      });
    }
  }, [typeLangCode]);

  return {
    // interface / UI language
    uiLangCode,
    uiLang: LANG_MAP[uiLangCode],
    setUiLang,
    // symbol board language
    typeLangCode,
    typeLang: LANG_MAP[typeLangCode],
    setTypeLang,
    // tts voice language
    ttsLangCode,
    ttsLang: LANG_MAP[ttsLangCode],
    setTtsLang,
    // speech recognition language
    listenLangCode,
    listenLang: LANG_MAP[listenLangCode],
    setListenLang,
    // link toggle (symbol ↔ voice)
    langsLinked,
    setLinked,
    // full list for pickers
    LANGUAGES,
  };
}
