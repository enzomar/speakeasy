/**
 * useAIPrediction — on-device LLM next-phrase prediction via WebLLM.
 * ===================================================================
 * Uses @mlc-ai/web-llm to run a 4-bit quantised Qwen3 model entirely in
 * the browser via WebGPU (or WASM fallback). Combines:
 *   1. RAG context  — top-k similar past utterances retrieved from ragMemory
 *   2. N-gram model — bigram/trigram fast fallback (no model load latency)
 *   3. LLM output   — parsed into candidate next-word/phrase tokens
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
 *
 * PROMPT FORMAT:
 *   System: AAC communication assistant, suggest short phrases.
 *   RAG context: [top-5 user phrases]
 *   Current: [word1 word2 ...]
 *   Output: comma-separated next word/phrase options, no extra text.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ragQuery }        from "../utils/ragMemory";
import { predictionEngine } from "../utils/predictionEngine";
import { buildSystemPrompt, buildUserPrompt, GENERATION_CONFIG } from "../prompts/intentPrompt";

// ── Model config ──────────────────────────────────────────────────────────────

const MODELS = {
  fast:    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",  // ~300 MB — broadest compat
  quality: "Qwen3-1.7B-Instruct-q4f16_1-MLC",    // ~900 MB — best quality
};

function normalizeModelKey(modelKey) {
  return modelKey === "quality" || modelKey === "default" ? "quality" : "fast";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAIPrediction(modelKey = "fast") {
  const engineRef    = useRef(null);
  const abortRef     = useRef(null);
  const loadingRef   = useRef(false);
  const modelIdRef   = useRef(MODELS.fast);

  const normalizedModelKey = normalizeModelKey(modelKey);
  const activeModelId = MODELS[normalizedModelKey] ?? MODELS.fast;
  modelIdRef.current = activeModelId;

  const [llmStatus, setLlmStatus]   = useState("idle");
  // idle | loading | ready | error | unsupported
  const [loadProgress, setLoadProgress] = useState(0);
  const [suggestions, setSuggestions]   = useState([]);
  const [source, setSource]             = useState("ngram"); // "ngram" | "llm"
  const webGpuSupported = typeof navigator !== "undefined" && "gpu" in navigator;

  useEffect(() => {
    abortRef.current?.abort();
    loadingRef.current = false;

    const currentEngine = engineRef.current;
    engineRef.current = null;

    if (typeof currentEngine?.unload === "function") {
      Promise.resolve(currentEngine.unload()).catch(() => {});
    }

    setLlmStatus("idle");
    setLoadProgress(0);
    setSource("ngram");
  }, [activeModelId]);

  // ── Engine init (lazy, on first prediction request) ──────────────────────

  const initEngine = useCallback(async () => {
    if (engineRef.current || loadingRef.current) return;
    if (!webGpuSupported) {
      setLlmStatus("unsupported");
      return;
    }

    const requestedModelId = modelIdRef.current;
    loadingRef.current = true;
    setLlmStatus("loading");
    setLoadProgress(0);

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(requestedModelId, {
        initProgressCallback: (report) => {
          setLoadProgress(Math.round((report.progress ?? 0) * 100));
        },
      });

      if (modelIdRef.current !== requestedModelId) {
        if (typeof engine?.unload === "function") {
          await Promise.resolve(engine.unload()).catch(() => {});
        }
        return;
      }

      engineRef.current = engine;
      setLlmStatus("ready");
    } catch (err) {
      console.warn("[useAIPrediction] WebLLM init failed:", err);
      setLlmStatus("error");
    } finally {
      if (modelIdRef.current === requestedModelId) {
        loadingRef.current = false;
      }
    }
  }, [webGpuSupported]);

  // ── Prediction ────────────────────────────────────────────────────────────

  /**
   * Compute intent suggestions for the current words.
   * Returns full sentences the user can tap to speak immediately.
   * Falls back to n-gram intent frames while the LLM is loading.
   *
   * @param {string[]} words    - Words currently in the message bar.
   * @param {string}   [langCode="en"] - ISO 639-1 code for output language.
   */
  const predict = useCallback(async (words, langCode = "en") => {
    // ── Fast n-gram intent baseline (always available, instant) ───────────
    const ngramIntents = predictionEngine.predictIntents(words, 4, langCode);
    setSuggestions(ngramIntents);
    setSource("ngram");

    if (!words.length) return;

    // Kick off LLM engine load on first real interaction
    if (!engineRef.current && llmStatus === "idle") {
      initEngine(); // fire-and-forget; next predict() call will use it
      return;
    }
    if (llmStatus !== "ready" || !engineRef.current) return;

    // Cancel any in-flight LLM request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── RAG retrieval ─────────────────────────────────────────────────
      const query   = words.join(" ");
      const ragHits = await ragQuery(query, 5);

      if (controller.signal.aborted) return;

      // ── Prompt construction — INTENT mode ─────────────────────────────
      const currentWords = words.join(" ");
      const userPrompt = buildUserPrompt(currentWords, ragHits, langCode);

      // ── LLM inference ────────────────────────────────────────────────
      const reply = await engineRef.current.chat.completions.create({
        messages: [
          { role: "system",  content: buildSystemPrompt(langCode) },
          { role: "user",    content: userPrompt   },
        ],
        ...GENERATION_CONFIG,
      });

      if (controller.signal.aborted) return;

      const raw = reply.choices[0]?.message?.content ?? "";
      const llmIntents = parseIntentOutput(raw);

      if (llmIntents.length > 0) {
        // Merge: LLM first, then fill remainder with n-gram
        const merged = dedupeAndMerge(llmIntents, ngramIntents, 4);
        setSuggestions(merged);
        setSource("llm");
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.warn("[useAIPrediction] LLM inference error:", err);
      }
      // n-gram results already set — user is unaffected
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

  return {
    suggestions,
    source,       // "ngram" | "llm" — shown as a badge in PredictionBar
    llmStatus,    // "idle" | "loading" | "ready" | "error" | "unsupported"
    loadProgress, // 0-100
    predict,
    initEngine,   // expose so the user can trigger preload from a settings UI
    modelName: activeModelId,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse LLM numbered-list output into clean intent sentences */
function parseIntentOutput(raw) {
  return raw
    .split(/\n+/)
    .map(s => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .map(s => s.replace(/^['"""'']+|['"""'']+$/g, "").trim())
    .filter(s => {
      if (!s || s.length < 3 || s.length > 80) return false;
      if (/[<>\\{}]/.test(s)) return false;
      return s.split(/\s+/).length >= 2;
    })
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 4);
}

/** Deduplicate and merge two suggestion lists, keeping total ≤ n */
function dedupeAndMerge(primary, secondary, n) {
  const seen   = new Set(primary.map(s => s.toLowerCase()));
  const extras = secondary.filter(s => !seen.has(s.toLowerCase()));
  return [...primary, ...extras].slice(0, n);
}
