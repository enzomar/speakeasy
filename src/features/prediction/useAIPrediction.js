/**
 * useAIPrediction — on-device LLM next-phrase prediction via WebLLM.
 * ===================================================================
 * Uses @mlc-ai/web-llm to run a 4-bit quantised Qwen3 model entirely in
 * the browser via WebGPU (or WASM fallback). Combines:
 *   1. Heuristic templates — instant sentence candidates from per-language templates
 *   2. Gender agreement fixer — rule-based post-processing (no LLM needed)
 *   3. N-gram model — bigram/trigram fast fallback (no model load latency)
 *   4. LLM (Mode B only) — contextual reply generation when a transcript is available
 *
 * MODE A (symbol tap): Heuristic + gender fix → instant, no LLM call.
 * MODE B (transcript):  LLM generates contextual replies to what someone said.
 *
 * MODEL CHOICE & QUANTIZATION NOTES:
 * -----------------------------------
 * Default: Qwen3-1.7B-Instruct-q4f16_1-MLC
 *   • 4-bit float16, MLC-quantised, ~900 MB VRAM
 *   • Works on Chrome 113+ with WebGPU on desktop and high-end Android
 *   • ~15–25 tok/s on M2 MacBook, ~8 tok/s on Snapdragon 8 Gen 2
 *
 * For older/lower-end devices, fall back to:
 *   Qwen2.5-0.5B-Instruct-q4f16_1-MLC  (~300 MB, works on most WebGPU devices)
 *
 * For native mobile (React Native + llama.cpp):
 *   git clone https://github.com/ggerganov/llama.cpp
 *   python convert_hf_to_gguf.py Qwen/Qwen3-1.7B --outtype q4_K_M
 *   Use react-native-llama (iOS Metal) or executorch (Android) as the bridge.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { predictionEngine } from "./predictionEngine";
import {
  generateCandidates,
  applyPrefix,
  buildPrompt,
  detectQuestionIntent,
  getGenerationConfig,
  parseOutput,
  dedupeAndMerge,
  fixGender,
  getPOS,
} from "../../prompts/intentPrompt";
import { detectIntent, detectEmotion } from "../../prompts/intentEmotionEngine";
import { tapContextToConceptIds } from "../../engine/hierarchyBridge.js";
import { generateSync, generate as generateAsync } from "../../engine/sentenceOrchestrator.js";

// ── Model config ──────────────────────────────────────────────────────────────

export const MODEL_INFO = {
  fast: {
    key:         "fast",
    id:          "Qwen3-0.6B-q4f16_1-MLC",
    label:       "Qwen 3 · 0.6B",
    size:        "~400 MB",
    description: "Fast · works on most WebGPU devices",
  },
  quality: {
    key:         "quality",
    id:          "Qwen3-1.7B-q4f16_1-MLC",
    label:       "Qwen 3 · 1.7B",
    size:        "~900 MB",
    description: "Best quality · needs more memory",
  },
  gemma: {
    key:         "gemma",
    id:          "gemma-3-1b-it-q4f16_1-MLC",
    label:       "Gemma 3 · 1B",
    size:        "~600 MB",
    description: "Google · balanced speed & quality",
  },
  qwen25: {
    key:         "qwen25",
    id:          "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label:       "Qwen 2.5 · 0.5B",
    size:        "~300 MB",
    description: "Tiny · fastest download & inference",
  },
  gemini: {
    key:         "gemini",
    id:          null,                 // not a WebLLM model
    label:       "Gemini 2.0 Flash",
    size:        "Cloud API",
    description: "Google · fast cloud replies — needs a free API key",
    cloud:       true,
  },
  none: {
    key:         "none",
    id:          null,
    label:       "None",
    size:        "0 MB",
    description: "No AI — n-gram predictions only",
  },
};

const MODELS = {
  fast:    MODEL_INFO.fast.id,
  quality: MODEL_INFO.quality.id,
  gemma:   MODEL_INFO.gemma.id,
  qwen25:  MODEL_INFO.qwen25.id,
  gemini:  null,   // cloud — no WebLLM engine
  none:    null,
};

// Gemini 2.0 Flash REST endpoint
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
// Built-in key — users can override via Settings → AI Model → Gemini
const GEMINI_BUILT_IN_KEY = "AIzaSyAjeJhA91grQ9Z9ihRfDtDnobOXDAGLM0k";

/** Call Gemini Flash API for Mode-B contextual replies. */
async function callGeminiFlash(apiKey, systemPrompt, userPrompt, signal) {
  const key = apiKey?.trim() || GEMINI_BUILT_IN_KEY;
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature:     0.7,
        topP:            0.9,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

const WIFI_ONLY_KEY = "speakeasy_ai_wifi_only";

function normalizeModelKey(modelKey) {
  if (modelKey === "none")   return "none";
  if (modelKey === "gemini") return "gemini";
  if (["gemma", "qwen25"].includes(modelKey)) return modelKey;
  return modelKey === "quality" || modelKey === "default" ? "quality" : "fast";
}

/**
 * Delete all Cache Storage entries associated with a WebLLM model.
 * WebLLM stores model shards as cached fetch responses; URLs contain the model id.
 */
export async function deleteModelCache(modelId) {
  if (!("caches" in window)) return false;
  let deleted = false;
  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys.map(async (cacheName) => {
      const cache    = await caches.open(cacheName);
      const requests = await cache.keys();
      const matches  = requests.filter(r =>
        r.url.includes(modelId) || r.url.includes(modelId.replace(/-q4f\S+/, ""))
      );
      if (matches.length) {
        await Promise.all(matches.map(r => cache.delete(r)));
        deleted = true;
      }
      // If all entries in this cache were from this model, delete the whole cache
      const remaining = await cache.keys();
      if (!remaining.length) await caches.delete(cacheName);
    })
  );
  return deleted;
}

/**
 * Returns true if the given model appears to be fully (or partially) cached.
 */
export async function isModelCached(modelId) {
  if (!("caches" in window)) return false;
  const cacheKeys = await caches.keys();
  for (const cacheName of cacheKeys) {
    const cache    = await caches.open(cacheName);
    const requests = await cache.keys();
    if (requests.some(r => r.url.includes(modelId))) return true;
  }
  return false;
}

/** True if the device is connected over WiFi (falls back to true when API unavailable). */
function onWifi() {
  const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
  if (!conn) return true; // assume OK — API not available
  return conn.type === "wifi";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAIPrediction(modelKey = "fast", geminiApiKey = "") {
  const engineRef    = useRef(null);
  const abortRef     = useRef(null);
  const loadingRef   = useRef(false);
  const modelIdRef   = useRef(MODELS.fast);
  const pausedRef    = useRef(false);   // pause requested during download
  const initAbortRef = useRef(null);    // AbortController for the current download

  const normalizedModelKey = normalizeModelKey(modelKey);
  const isNoneMode    = normalizedModelKey === "none";
  const isGeminiMode  = normalizedModelKey === "gemini";
  const activeModelId = (isNoneMode || isGeminiMode) ? null : (MODELS[normalizedModelKey] ?? MODELS.fast);
  modelIdRef.current  = activeModelId;

  // Keep refs current so callbacks don't stale-close over gemini values
  const geminiKeyRef  = useRef(geminiApiKey);
  const geminiModeRef = useRef(isGeminiMode);
  useEffect(() => { geminiKeyRef.current  = geminiApiKey;  }, [geminiApiKey]);
  useEffect(() => { geminiModeRef.current = isGeminiMode;  }, [isGeminiMode]);

  const [llmStatus, setLlmStatus]   = useState("idle");
  // idle | loading | ready | error | unsupported | paused
  const [loadProgress, setLoadProgress] = useState(0);
  const [suggestions, setSuggestions]   = useState([]);
  const [source, setSource]             = useState("ngram"); // "ngram" | "llm"
  const [isPaused, setIsPaused]         = useState(false);

  // WiFi-only preference
  const [wifiOnly, setWifiOnlyState] = useState(() => {
    try { return localStorage.getItem(WIFI_ONLY_KEY) === "true"; } catch { return false; }
  });
  const setWifiOnly = useCallback((val) => {
    try { localStorage.setItem(WIFI_ONLY_KEY, String(val)); } catch { /* ignore */ }
    setWifiOnlyState(val);
  }, []);

  const webGpuSupported = typeof navigator !== "undefined" && "gpu" in navigator;
  const prevModelIdRef = useRef(activeModelId);

  // Reset engine state when local WebLLM model changes (skip Cloud/None)
  useEffect(() => {
    if (isGeminiMode || isNoneMode) return; // handled by separate effects below
    prevModelIdRef.current = activeModelId;

    abortRef.current?.abort();
    initAbortRef.current?.abort();
    loadingRef.current = false;
    pausedRef.current  = false;
    setIsPaused(false);

    const currentEngine = engineRef.current;
    engineRef.current = null;

    if (typeof currentEngine?.unload === "function") {
      Promise.resolve(currentEngine.unload()).catch(() => {});
    }

    setLlmStatus("idle");
    setLoadProgress(0);
    setSource("ngram");

    // Auto-start download when user explicitly switches models (skip for "none" / cloud)
    if (isModelSwitch && webGpuSupported && activeModelId) {
      const t = setTimeout(() => {
        if (!engineRef.current && !loadingRef.current) {
          initEngine();
        }
      }, 150);
      return () => clearTimeout(t);
    }
  }, [activeModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status for Gemini cloud model (no download — just needs an API key)
  useEffect(() => {
    if (!isGeminiMode) return;
    abortRef.current?.abort();
    initAbortRef.current?.abort();
    loadingRef.current = false;
    const engine = engineRef.current;
    engineRef.current = null;
    if (typeof engine?.unload === "function") Promise.resolve(engine.unload()).catch(() => {});
    setLoadProgress(0);
    setSource("ngram");
    setIsPaused(false);
    setLlmStatus((geminiApiKey?.trim() || GEMINI_BUILT_IN_KEY) ? "ready" : "needs_key");
  }, [isGeminiMode, geminiApiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status for None mode
  useEffect(() => {
    if (!isNoneMode) return;
    abortRef.current?.abort();
    initAbortRef.current?.abort();
    loadingRef.current = false;
    const engine = engineRef.current;
    engineRef.current = null;
    if (typeof engine?.unload === "function") Promise.resolve(engine.unload()).catch(() => {});
    setLlmStatus("idle");
    setLoadProgress(0);
    setSource("ngram");
    setIsPaused(false);
  }, [isNoneMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Engine init (lazy, on first prediction request) ──────────────────────

  const initEngine = useCallback(async (force = false) => {
    if (isNoneMode || isGeminiMode) return;  // cloud / disabled — no engine needed
    if (engineRef.current || loadingRef.current) return;
    if (!webGpuSupported) {
      setLlmStatus("unsupported");
      return;
    }
    // WiFi-only guard: block download on cellular unless forced
    if (!force && wifiOnly && !onWifi()) {
      setLlmStatus("wifi_blocked");
      return;
    }

    pausedRef.current = false;
    setIsPaused(false);

    const requestedModelId = modelIdRef.current;
    loadingRef.current = true;
    setLlmStatus("loading");
    setLoadProgress(0);

    // Create abort controller for this download session
    const ctrl = new AbortController();
    initAbortRef.current = ctrl;

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(requestedModelId, {
        initProgressCallback: (report) => {
          if (ctrl.signal.aborted) return;
          setLoadProgress(Math.round((report.progress ?? 0) * 100));
        },
      });

      if (ctrl.signal.aborted || modelIdRef.current !== requestedModelId) {
        if (typeof engine?.unload === "function") {
          await Promise.resolve(engine.unload()).catch(() => {});
        }
        return;
      }

      engineRef.current = engine;
      setLlmStatus("ready");
    } catch (err) {
      if (!ctrl.signal.aborted) {
        console.warn("[useAIPrediction] WebLLM init failed:", err);
        setLlmStatus("error");
      } else {
        // Aborted intentionally (pause or model switch)
        setLlmStatus(pausedRef.current ? "paused" : "idle");
      }
    } finally {
      if (modelIdRef.current === requestedModelId) {
        loadingRef.current = false;
      }
    }
  }, [webGpuSupported, wifiOnly, isNoneMode]);

  /** Pause an in-progress download. */
  const pauseDownload = useCallback(() => {
    if (llmStatus !== "loading") return;
    pausedRef.current = true;
    setIsPaused(true);
    initAbortRef.current?.abort();
    loadingRef.current = false;
    setLlmStatus("paused");
  }, [llmStatus]);

  /** Resume a paused download. */
  const resumeDownload = useCallback(() => {
    if (llmStatus !== "paused" && llmStatus !== "wifi_blocked") return;
    pausedRef.current = false;
    setIsPaused(false);
    initEngine(true); // force = true bypasses wifi guard when user explicitly resumes
  }, [llmStatus, initEngine]);

  /** Delete the cached model weights from Cache Storage. */
  const deleteModel = useCallback(async (modelId = activeModelId) => {
    // Unload running engine first if it's the active model
    if (modelId === activeModelId) {
      initAbortRef.current?.abort();
      loadingRef.current = false;
      const engine = engineRef.current;
      engineRef.current = null;
      if (typeof engine?.unload === "function") {
        await Promise.resolve(engine.unload()).catch(() => {});
      }
      setLlmStatus("idle");
      setLoadProgress(0);
      setSource("ngram");
      pausedRef.current = false;
      setIsPaused(false);
    }
    return deleteModelCache(modelId);
  }, [activeModelId]);

  // ── Prediction ────────────────────────────────────────────────────────────

  /**
   * Compute intent suggestions for the current words.
   * Returns full sentences the user can tap to speak immediately.
   *
   * Pipeline:
   *   1. Heuristic templates → 5 candidates shown instantly (0ms)
   *   2. Gender agreement post-fix → rule-based, instant
   *   3. If no transcript, we're done (no LLM call needed)
   *
   * When `transcript` is provided (from Listen Mode Stage 2), switches to
   * Mode B: contextual reply generation based on what the other person said.
   *
   * @param {string[]} words            - Words currently in the message bar.
   * @param {string}   [langCode="en"]  - ISO 639-1 code for output language.
   * @param {string}   [categoryId]     - Active symbol category.
   * @param {object}   [tapContext]     - { l1Label, l2Label, l3Label } hierarchy tap path.
   * @param {string}   [transcript]     - Heard speech from Listen Mode (triggers Mode B).
   * @param {string[]} [messageHistory] - Last 3 spoken messages for context.
   * @param {string}   [gender]         - "male"|"female"|"neutral".
   * @param {string}   [emotionOverride] - Manual emotion override from EmotionStrip (null = auto-detect).
   */
  const predict = useCallback(async (words, langCode = "en", categoryId, tapContext, transcript, messageHistory = [], gender = "male", emotionOverride = null, corePrefixWords = []) => {
    // ── Fast heuristic + n-gram baseline (always available, instant) ──────
    const keyword  = tapContext?.l2Label || words.join(" ") || "";
    const modifier = tapContext?.l3Label || null;
    const l2Canon  = tapContext?.l2Canon || keyword;
    const l3Canon  = tapContext?.l3Canon || null;

    // 2-axis detection: intent from POS/category context, emotion from word semantics
    const { pos } = getPOS(l2Canon);
    const intent  = detectIntent(pos, categoryId, !!transcript, l3Canon);
    const emotion = emotionOverride || detectEmotion(l2Canon, l3Canon, categoryId);

    // Core+fringe integration (Beukelman & Light, 2020):
    // corePrefixWords comes from App.jsx — only words tapped from CoreWordBar
    // (tagged __core). Grid / fringe symbol labels are never included.
    const heuristicIntents = keyword
      ? applyPrefix(
          generateCandidates(keyword, modifier, langCode, gender, l2Canon, categoryId, intent, emotion)
            .slice(0, 13)
            .map(s => fixGender(s, langCode, gender)),
          corePrefixWords,
        )
      : [];
    const ngramIntents = predictionEngine.predictIntents(words, 5, langCode);
    // Show heuristic templates immediately (better than raw n-gram)
    const instantSuggestions = heuristicIntents.length > 0
      ? dedupeAndMerge(heuristicIntents, ngramIntents, 13)
      : ngramIntents;

    // ── Engine integration: grid taps → concept IDs → deterministic sentence + confidence ──
    const conceptIds = tapContextToConceptIds(corePrefixWords, tapContext);
    let engineResult = null;
    if (conceptIds.length >= 2) {
      try { engineResult = generateSync(conceptIds, langCode); } catch (_) { /* engine unavailable */ }
    }

    // Inject engine sentence at top of suggestions when distinct
    let finalSuggestions = instantSuggestions;
    if (engineResult?.text) {
      const engText = engineResult.text;
      const already = instantSuggestions.some(s => s.toLowerCase().trim() === engText.toLowerCase().trim());
      if (!already) finalSuggestions = [engText, ...instantSuggestions].slice(0, 13);
    }

    // ── Prediction log (collapsed by default, open in DevTools to expand) ──
    if (keyword || finalSuggestions.length > 0) {
      const srcIcon = heuristicIntents.length > 0 ? '📋 heuristic' : '🔢 n-gram';
      const finalCount = finalSuggestions.length;
      const confSuffix = engineResult
        ? `  conf ${(engineResult.confidence.overall * 100).toFixed(0)}%`
        : '';
      console.groupCollapsed(
        `[SpeakEasy ✨] predict [${langCode}]  "${keyword || '(empty)'}"` +
        `  →  ${finalCount} suggestion${finalCount !== 1 ? 's' : ''}  (${srcIcon})${confSuffix}`
      );
      console.log('%c context', 'color:#888;font-weight:bold',
        `keyword="${keyword}"  modifier=${modifier ?? 'none'}  intent=${intent}  emotion=${emotion}  gender=${gender}`);
      if (corePrefixWords.length)
        console.log('%c core prefix', 'color:#3B9B8F;font-weight:bold', corePrefixWords);
      if (engineResult) {
        const conf = engineResult.confidence;
        const overallPct = (conf.overall * 100).toFixed(1);
        const confColor = conf.overall >= 0.8 ? '#2EA84F' : conf.overall >= 0.5 ? '#F0A500' : '#FF3B30';
        const aiWould = conf.overall < 0.8 ? '🤖 AI would refine' : '✅ deterministic OK';
        console.log(
          `%c confidence`, `color:${confColor};font-weight:bold`,
          `overall ${overallPct}%  (grammar ${(conf.grammar * 100).toFixed(0)}%  morphology ${(conf.morphology * 100).toFixed(0)}%  prediction ${(conf.prediction * 100).toFixed(0)}%)  ${aiWould}`
        );
        console.log('%c engine ✦', 'color:#7048E8;font-weight:bold',
          engineResult.text || '—', ` [${conceptIds.join(' → ')}]`);
      }
      console.log(
        `%c heuristic (${heuristicIntents.length})`, 'color:#F0A500;font-weight:bold',
        heuristicIntents.length ? heuristicIntents : '—'
      );
      console.log(
        `%c n-gram    (${ngramIntents.length})`, 'color:#666;font-weight:bold',
        ngramIntents.length ? ngramIntents : '—'
      );
      console.log(
        `%c final     (${finalCount})`, 'color:#2EA84F;font-weight:bold',
        finalSuggestions.length ? finalSuggestions : '—'
      );
      console.groupEnd();
    }
    setSuggestions(finalSuggestions);
    setSource(heuristicIntents.length > 0 ? "heuristic" : "ngram");

    // ── Async AI correction: fire-and-forget when confidence < 0.8 ──────────
    // generateSync already gave the instant result. If confidence is low, kick
    // off the full pipeline (cache lookup → LLM) and update suggestions when
    // it resolves — without blocking the UI.
    if (engineResult && engineResult.confidence.overall < 0.8 && conceptIds.length >= 2) {
      const _conceptIds = conceptIds;
      const _langCode   = langCode;
      const _syncText   = engineResult.text;
      generateAsync(_conceptIds, _langCode).then((asyncResult) => {
        if (!asyncResult?.text) return;
        // Only update if AI/cache actually changed the sentence
        if (asyncResult.text.toLowerCase().trim() === _syncText.toLowerCase().trim()) return;
        console.log(
          '%c engine ✦ AI refined', 'color:#7048E8;font-weight:bold',
          `[${asyncResult.source}]  "${_syncText}" → "${asyncResult.text}"`
        );
        // Re-inject the refined sentence at position 0
        setSuggestions(prev => {
          const without = prev.filter(s => s.toLowerCase().trim() !== _syncText.toLowerCase().trim());
          const already = without.some(s => s.toLowerCase().trim() === asyncResult.text.toLowerCase().trim());
          return already ? prev : [asyncResult.text, ...without].slice(0, 13);
        });
      }).catch(() => { /* LLM unavailable — keep sync result */ });
    }

    if (!words.length && !transcript) return;

    // Kick off LLM engine load on first real interaction (local models only)
    if (!geminiModeRef.current) {
      if (!engineRef.current && llmStatus === "idle") {
        initEngine(); // fire-and-forget; next predict() call will use it
        return;
      }
      if (llmStatus !== "ready" || !engineRef.current) return;
    } else {
      // Gemini cloud: skip if no transcript (nothing cloud-worthy to do)
      if (!transcript?.trim()) return;
    }

    // Cancel any in-flight LLM request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── Mode B: Gemini Flash cloud path ───────────────────────────────
      if (transcript?.trim().length > 2 && geminiModeRef.current && (geminiKeyRef.current?.trim() || GEMINI_BUILT_IN_KEY)) {
        console.group("[useAIPrediction] Mode B — Gemini Flash");
        console.log("%cTRANSCRIPT:", "color:#E8973F;font-weight:bold", transcript);

        const { system, user } = buildPrompt({
          symbol:         keyword || "reply",
          modSymbol:      null,
          canonicalLabel: categoryId,
          langCode,
          gender:         gender,
          transcript,
          history:        words,
          candidates:     heuristicIntents,
          messageHistory,
          intent,
          emotion,
        });
        console.groupEnd();

        try {
          const raw = await callGeminiFlash(geminiKeyRef.current, system, user, controller.signal);
          if (controller.signal.aborted) return;
          const parsed = parseOutput(raw);
          console.log("[useAIPrediction] Gemini Mode B parsed:", parsed);
          if (parsed.length > 0) {
            setSuggestions(dedupeAndMerge(parsed, instantSuggestions, 5));
            setSource("llm");
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            console.warn("[useAIPrediction] Gemini API error:", err);
          }
        }
        return;
      }

      // ── Mode B: Local LLM contextual reply ────────────────────────────
      if (transcript?.trim().length > 2) {
        if (llmStatus !== "ready" || !engineRef.current) return;

        console.group("[useAIPrediction] Mode B — contextual reply");
        console.log("%cTRANSCRIPT:", "color:#E8973F;font-weight:bold", transcript);

        const { system, user } = buildPrompt({
          symbol:         keyword || "reply",
          modSymbol:      null,
          canonicalLabel: categoryId,
          langCode,
          gender:         gender,
          transcript,
          history:        words,
          candidates:     heuristicIntents,
          messageHistory,
          intent,
          emotion,
        });

        const genConfig = getGenerationConfig("B");
        console.log("%cSYSTEM:", "color:#3B9B8F;font-weight:bold", system);
        console.log("%cUSER:", "color:#E8973F;font-weight:bold", user);
        console.groupEnd();

        const reply = await engineRef.current.chat.completions.create({
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user   },
          ],
          ...genConfig,
        });

        if (controller.signal.aborted) return;

        const raw = reply.choices[0]?.message?.content ?? "";
        const parsed = parseOutput(raw);
        console.log("[useAIPrediction] Mode B parsed:", parsed);

        if (parsed.length > 0) {
          const merged = dedupeAndMerge(parsed, instantSuggestions, 5);
          setSuggestions(merged);
          setSource("llm");
        }
        return;
      }

      // ── Mode A: heuristic + gender fix (already done above, no LLM needed) ──
      // Suggestions were already set from heuristic templates.
      // LLM is only used for Mode B (transcript-driven contextual replies).
    } catch (err) {
      if (!controller.signal.aborted) {
        console.warn("[useAIPrediction] LLM inference error:", err);
      }
    }
  }, [llmStatus, initEngine]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const currentEngine = engineRef.current;
      if (typeof currentEngine?.unload === "function") {
        Promise.resolve(currentEngine.unload()).catch(() => {});
      }
    };
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSource("ngram");
  }, []);

  return {
    suggestions,
    source,        // "ngram" | "llm" — shown as a badge in PredictionBar
    llmStatus,     // "idle" | "loading" | "ready" | "error" | "unsupported" | "paused" | "wifi_blocked"
    loadProgress,  // 0-100
    isPaused,
    wifiOnly,
    setWifiOnly,
    predict,
    clearSuggestions,
    initEngine,     // expose so the user can trigger preload from a settings UI
    pauseDownload,
    resumeDownload,
    deleteModel,
    modelName:    activeModelId,
    modelKey:     normalizedModelKey,
    webGpuSupported,
  };
}

// ── Helpers (parseRewriteOutput and dedupeAndMerge imported from intentPrompt) ──
