/**
 * audioCapture — Web Audio API microphone capture with energy-based VAD.
 * ======================================================================
 * Captures audio from the microphone, detects voice activity via RMS energy,
 * and produces 16 kHz mono Float32Array buffers suitable for Whisper.
 *
 * LIFECYCLE:
 *   const cap = createAudioCapture({ onVoiceStart, onVoiceEnd, onAudioData });
 *   await cap.start();         // request mic + begin processing
 *   cap.stop();                // release mic
 *   cap.getRecordingBuffer();  // get accumulated Float32Array
 *
 * DESIGN NOTES:
 *   • Uses ScriptProcessorNode (widely supported) with 4096-sample buffers.
 *     Migrate to AudioWorklet for lower latency when Safari baseline improves.
 *   • Energy VAD: RMS > threshold = speech. Debounced with trailing silence
 *     window to avoid chopping mid-sentence pauses.
 *   • The 16 kHz resampling is done via OfflineAudioContext for accuracy.
 */

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULTS = {
  sampleRate:       16000,     // Whisper expects 16 kHz
  energyThreshold:  0.015,     // RMS above this = speech detected
  silenceTimeout:   1500,      // ms of silence after speech → voiceEnd
  maxRecordingMs:   15000,     // hard cap on recording length
  bufferSize:       4096,      // ScriptProcessorNode buffer size
};

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {() => void}           [opts.onVoiceStart]   — fired when speech detected
 * @param {(buffer: Float32Array) => void} [opts.onVoiceEnd] — fired when silence detected after speech
 * @param {(rms: number) => void} [opts.onEnergy]       — per-frame energy level (0–1)
 * @param {number} [opts.energyThreshold]
 * @param {number} [opts.silenceTimeout]
 * @param {number} [opts.maxRecordingMs]
 */
export function createAudioCapture(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  let stream         = null;
  let audioCtx       = null;
  let sourceNode     = null;
  let processorNode  = null;
  let recording      = false;
  let voiceActive    = false;
  let silenceTimer   = null;
  let maxTimer       = null;
  const chunks       = [];     // Float32Array segments (native sample rate)

  // ── start ─────────────────────────────────────────────────────────────────

  async function start() {
    if (stream) return; // already running

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
        channelCount:     1,
      },
    });

    audioCtx      = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode    = audioCtx.createMediaStreamSource(stream);
    processorNode = audioCtx.createScriptProcessor(cfg.bufferSize, 1, 1);

    processorNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const rms   = computeRMS(input);

      opts.onEnergy?.(rms);

      if (rms > cfg.energyThreshold) {
        if (!voiceActive) {
          voiceActive = true;
          recording   = true;
          chunks.length = 0;
          opts.onVoiceStart?.();

          // Hard-stop safety
          clearTimeout(maxTimer);
          maxTimer = setTimeout(() => finishRecording(), cfg.maxRecordingMs);
        }
        // Reset silence debounce
        clearTimeout(silenceTimer);
        silenceTimer = null;
      } else if (voiceActive && !silenceTimer) {
        // Start silence countdown
        silenceTimer = setTimeout(() => finishRecording(), cfg.silenceTimeout);
      }

      if (recording) {
        chunks.push(new Float32Array(input)); // copy
      }
    };

    sourceNode.connect(processorNode);
    // Connect through a silent gain node to avoid audible echo/feedback.
    // Direct connection to destination would play mic audio through speakers.
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    processorNode.connect(silentGain);
    silentGain.connect(audioCtx.destination); // required for onaudioprocess to fire
  }

  // ── stop (release mic) ────────────────────────────────────────────────────

  function stop() {
    clearTimeout(silenceTimer);
    clearTimeout(maxTimer);
    silenceTimer = null;
    maxTimer     = null;
    recording    = false;
    voiceActive  = false;

    processorNode?.disconnect();
    sourceNode?.disconnect();
    audioCtx?.close().catch(() => {});

    stream?.getTracks().forEach(t => t.stop());
    stream        = null;
    audioCtx      = null;
    sourceNode    = null;
    processorNode = null;
  }

  // ── Force finish current recording ────────────────────────────────────────

  function finishRecording() {
    clearTimeout(silenceTimer);
    clearTimeout(maxTimer);
    silenceTimer = null;
    maxTimer     = null;

    const wasRecording = recording;
    recording   = false;
    voiceActive = false;

    if (wasRecording && chunks.length > 0) {
      // Merge & resample, then fire callback
      const nativeSR = audioCtx?.sampleRate ?? 44100;
      mergeAndResample(chunks, nativeSR, cfg.sampleRate).then(buffer => {
        opts.onVoiceEnd?.(buffer);
      });
    }
  }

  // ── Manual stop recording (user taps "Done") ─────────────────────────────

  function stopRecording() {
    finishRecording();
  }

  // ── Get accumulated buffer synchronously (fallback) ───────────────────────

  function getRecordingBuffer() {
    if (chunks.length === 0) return new Float32Array(0);
    return mergeChunks(chunks);
  }

  function isRecording() { return recording; }
  function isActive()    { return !!stream; }

  return { start, stop, stopRecording, getRecordingBuffer, isRecording, isActive };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function computeRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function mergeChunks(chunks) {
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const out = new Float32Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Resample raw audio from `fromRate` to `toRate` using OfflineAudioContext.
 * Returns a Float32Array at the target sample rate.
 */
async function mergeAndResample(chunks, fromRate, toRate) {
  const raw = mergeChunks(chunks);

  if (fromRate === toRate) return raw;

  const duration   = raw.length / fromRate;
  const numSamples = Math.ceil(duration * toRate);
  const offlineCtx = new OfflineAudioContext(1, numSamples, toRate);
  const buffer     = offlineCtx.createBuffer(1, raw.length, fromRate);

  buffer.getChannelData(0).set(raw);

  const src = offlineCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(offlineCtx.destination);
  src.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
