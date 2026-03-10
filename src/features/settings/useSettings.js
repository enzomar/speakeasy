/**
 * useSettings — persists user preferences in localStorage.
 *
 * Covers: theme, voice tuning, AI model, handedness, gender, wake keywords.
 * Each piece follows the same pattern:
 *   1. Lazy-initialise from localStorage (with fallback).
 *   2. Return a setter that writes to localStorage + React state atomically.
 */

import { useState, useCallback, useEffect } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const VOICE_SPEED_KEY = "speakeasy_voice_speed_v1";
const VOICE_PITCH_KEY = "speakeasy_voice_pitch_v1";
const VOICE_NAME_KEY  = "speakeasy_voice_name_v1";
const HAND_KEY        = "speakeasy_hand_v1";
const WAKE_KEYS_KEY   = "speakeasy_wake_keywords_v1";
const AI_MODEL_KEY    = "speakeasy_ai_model_v1";
const THEME_KEY       = "speakeasy_theme_v1";
const GENDER_KEY      = "speakeasy_gender_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeAiModel(model) {
  if (model === "none") return "none";
  if (["gemma", "qwen25"].includes(model)) return model;
  return model === "quality" || model === "default" ? "quality" : "fast";
}

function loadNum(key, fallback) {
  try { const v = parseFloat(localStorage.getItem(key)); return isNaN(v) ? fallback : v; }
  catch { return fallback; }
}

function saveItem(key, val) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSettings() {
  // Theme
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) ?? "light"; } catch { return "light"; }
  });
  const setTheme = useCallback((t) => {
    saveItem(THEME_KEY, t);
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice speed & pitch
  const [voiceSpeed, setVoiceSpeedState] = useState(() => loadNum(VOICE_SPEED_KEY, 1.0));
  const [voicePitch, setVoicePitchState] = useState(() => loadNum(VOICE_PITCH_KEY, 1.0));
  const setVoiceSpeed = useCallback((v) => { saveItem(VOICE_SPEED_KEY, v); setVoiceSpeedState(v); }, []);
  const setVoicePitch = useCallback((v) => { saveItem(VOICE_PITCH_KEY, v); setVoicePitchState(v); }, []);

  // AI model
  const [aiModel, setAiModelState] = useState(
    () => normalizeAiModel(localStorage.getItem(AI_MODEL_KEY) ?? "fast")
  );
  const setAiModel = useCallback((model) => {
    const next = normalizeAiModel(model);
    saveItem(AI_MODEL_KEY, next);
    setAiModelState(next);
  }, []);

  // Voice name
  const [voiceName, setVoiceNameState] = useState(() => localStorage.getItem(VOICE_NAME_KEY) ?? "");
  const setVoiceName = useCallback((v) => { saveItem(VOICE_NAME_KEY, v); setVoiceNameState(v); }, []);

  // Handedness
  const [hand, setHandState] = useState(() => localStorage.getItem(HAND_KEY) ?? "right");
  const setHand = useCallback((v) => { saveItem(HAND_KEY, v); setHandState(v); }, []);

  // Gender
  const [gender, setGenderState] = useState(() => localStorage.getItem(GENDER_KEY) ?? "male");
  const setGender = useCallback((v) => { saveItem(GENDER_KEY, v); setGenderState(v); }, []);

  // Wake keywords
  const [wakeKeywords, setWakeKeywordsState] = useState(() => {
    try { return localStorage.getItem(WAKE_KEYS_KEY) ?? "Luma"; }
    catch { return "Luma"; }
  });
  const setWakeKeywords = useCallback((v) => { saveItem(WAKE_KEYS_KEY, v); setWakeKeywordsState(v); }, []);

  return {
    theme, setTheme,
    voiceSpeed, setVoiceSpeed,
    voicePitch, setVoicePitch,
    aiModel, setAiModel,
    voiceName, setVoiceName,
    hand, setHand,
    gender, setGender,
    wakeKeywords, setWakeKeywords,
  };
}
