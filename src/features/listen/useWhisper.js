/**
 * useWhisper — On-device Speech-to-Text via Whisper + @xenova/transformers.
 * =========================================================================
 * Loads a quantised Whisper model (tiny/base) entirely in the browser using
 * ONNX Runtime WASM via the Transformers.js library (already a dependency
 * for RAG embeddings).
 *
 * PUBLIC API:
 *   const { transcribe, loading, progress, ready, error } = useWhisper({ lang });
 *   const text = await transcribe(float32Audio);  // 16 kHz mono
 *
 * MODEL NOTES:
 * ─────────────
 * • Xenova/whisper-tiny  (~40 MB)  — fastest, good for short phrases (<15 s)
 * • Xenova/whisper-base  (~75 MB)  — better accuracy, still fast on modern phones
 * • Xenova/whisper-small (~250 MB) — best accuracy, needs ≥4 GB RAM
 *
 * The model is downloaded once and cached in browser storage (Cache API).
 * Subsequent loads are instant.
 *
 * MULTILINGUAL:
 * Pass `lang` to constrain the decoding language. If omitted, Whisper
 * auto-detects. Language codes follow ISO 639-1 (en, es, fr, de, etc.).
 *
 * PRIVACY:
 * Everything runs in the browser. No audio or transcription leaves the device.
 */

import { useState, useCallback, useRef, useEffect } from "react";

// ── Model config ──────────────────────────────────────────────────────────────

const WHISPER_MODELS = {
  tiny: "Xenova/whisper-tiny",
  base: "Xenova/whisper-base",
  small: "Xenova/whisper-small",
};

const DEFAULT_MODEL = "tiny";

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {object}  [opts]
 * @param {"tiny"|"base"|"small"} [opts.model="tiny"] — Whisper model size
 * @param {string}  [opts.lang]   — ISO 639-1 language code for forced decoding
 */
export function useWhisper(opts = {}) {
  const modelSize  = opts.model ?? DEFAULT_MODEL;
  const modelId    = WHISPER_MODELS[modelSize] ?? WHISPER_MODELS.tiny;

  const pipeRef    = useRef(null);
  const loadingRef = useRef(false);

  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready,    setReady]    = useState(false);
  const [error,    setError]    = useState(null);

  // ── Lazy model loader ───────────────────────────────────────────────────

  const ensureLoaded = useCallback(async () => {
    if (pipeRef.current) return pipeRef.current;
    if (loadingRef.current) {
      // Wait for in-flight load (with timeout to avoid infinite loop)
      const MAX_WAIT = 60_000; // 60s max
      let waited = 0;
      while (loadingRef.current && waited < MAX_WAIT) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
      }
      return pipeRef.current;
    }

    loadingRef.current = true;
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const { pipeline, env } = await import("@xenova/transformers");
      // Force all model fetches to HuggingFace CDN.
      // Must be set here (not just in ragMemory.js) in case listen mode
      // activates before the RAG embedder has been loaded.  Without explicit
      // remoteHost/remotePathTemplate, bundlers or Capacitor WebViews can
      // resolve model paths relative to the app origin, causing the Vite SPA
      // fallback to return index.html → JSON.parse crash ("Unexpected token '<'").
      env.allowLocalModels   = false;
      env.allowRemoteModels  = true;
      env.useBrowserCache    = true;
      env.remoteHost         = "https://huggingface.co/";
      env.remotePathTemplate = "{model}/resolve/{revision}/";

      const pipe = await pipeline("automatic-speech-recognition", modelId, {
        progress_callback: (p) => {
          if (p.status === "progress" && p.progress != null) {
            setProgress(Math.round(p.progress));
          }
        },
        // Use WASM backend (works without WebGPU)
        // device: "wasm",
      });

      pipeRef.current = pipe;
      setReady(true);
      return pipe;
    } catch (err) {
      console.error("[useWhisper] Model load failed:", err);
      setError(err.message || "Failed to load Whisper model");
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [modelId]);

  // ── Pre-load on mount (optional — remove if you want on-demand only) ────

  useEffect(() => {
    // Don't auto-load; we lazy-load on first transcribe()
  }, []);

  // ── Transcribe ──────────────────────────────────────────────────────────

  /**
   * Transcribe a Float32Array of 16 kHz mono audio.
   *
   * @param {Float32Array} audio   — 16 kHz mono PCM
   * @param {string}       [lang]  — Override language (ISO 639-1)
   * @returns {Promise<string>}    — Transcribed text (empty string on failure)
   */
  const transcribe = useCallback(async (audio, lang) => {
    if (!audio || audio.length === 0) return "";

    const pipe = await ensureLoaded();
    if (!pipe) return "";

    const language = lang ?? opts.lang;

    try {
      const result = await pipe(audio, {
        language:       language || undefined,
        task:           "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });

      // result.text or result[0].text depending on version
      const text = (typeof result === "string"
        ? result
        : result?.text ?? result?.[0]?.text ?? "").trim();

      return text;
    } catch (err) {
      console.error("[useWhisper] Transcription error:", err);
      return "";
    }
  }, [ensureLoaded, opts.lang]);

  return { transcribe, loading, progress, ready, error };
}
