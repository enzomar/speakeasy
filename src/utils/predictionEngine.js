/**
 * On-device N-gram Prediction Engine
 *
 * Uses bigram + trigram frequency tables built from the user's spoken history.
 * Persists to localStorage so the model improves across sessions.
 *
 * EXTENDING:
 *  • Replace/augment `predict()` with a call to a cloud LLM (e.g. GPT-4o mini)
 *    for richer suggestions — keep `learn()` for local personalisation.
 *  • Add transformer embeddings (e.g. TensorFlow.js) for semantic similarity.
 *  • Support per-user vocabulary profiles for multi-user devices.
 */

const STORAGE_KEY = "speakeasy_ngrams_v1";

export class PredictionEngine {
  constructor() {
    this.unigrams = {}; // word → count
    this.bigrams  = {}; // "w1" → { w2: count }
    this.trigrams = {}; // "w1 w2" → { w3: count }
    this.phrases  = {}; // full phrase → count (phrase-start boost)
  }

  // ── Serialisation ──────────────────────────────────────────────────────────

  /** Save model state to localStorage */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unigrams: this.unigrams,
        bigrams:  this.bigrams,
        trigrams: this.trigrams,
        phrases:  this.phrases,
      }));
    } catch {
      // Quota exceeded — silently skip (model stays in memory)
    }
  }

  /** Load model state from localStorage; returns true if data was found */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.unigrams = data.unigrams || {};
      this.bigrams  = data.bigrams  || {};
      this.trigrams = data.trigrams || {};
      this.phrases  = data.phrases  || {};
      return true;
    } catch {
      return false;
    }
  }

  /** Wipe the stored model (e.g. "reset" in settings) */
  reset() {
    this.unigrams = {};
    this.bigrams  = {};
    this.trigrams = {};
    this.phrases  = {};
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Learning ───────────────────────────────────────────────────────────────

  /**
   * Feed a spoken sentence into the model.
   * Call after every successful TTS utterance.
   */
  learn(sentence) {
    if (!sentence?.trim()) return;
    const words = sentence.trim().toLowerCase().split(/\s+/).filter(Boolean);

    // Phrase-level tracking
    this.phrases[sentence.trim().toLowerCase()] =
      (this.phrases[sentence.trim().toLowerCase()] || 0) + 1;

    words.forEach((w, i) => {
      // Unigram
      this.unigrams[w] = (this.unigrams[w] || 0) + 1;

      // Bigram: previous → current
      if (i > 0) {
        const prev = words[i - 1];
        if (!this.bigrams[prev]) this.bigrams[prev] = {};
        this.bigrams[prev][w] = (this.bigrams[prev][w] || 0) + 1;
      }

      // Trigram: prev-prev prev → current
      if (i > 1) {
        const ctx = `${words[i - 2]} ${words[i - 1]}`;
        if (!this.trigrams[ctx]) this.trigrams[ctx] = {};
        this.trigrams[ctx][w] = (this.trigrams[ctx][w] || 0) + 1;
      }
    });

    this.save();
  }

  // ── Prediction ─────────────────────────────────────────────────────────────

  /**
    * Given the current sentence (array of words), return up to `n` candidate
    * next words or short appendable phrase chunks ranked by combined score.
   *
   * @param {string[]} words - Words spoken so far in the current sentence.
   * @param {number}   n     - Max suggestions to return (default 5).
   * @returns {string[]}
   */
  predict(words, n = 5) {
    const lc = words.map(w => w.toLowerCase());
    const scores = {};

    const bump = (text, amount) => {
      if (!text) return;
      const normalized = text.trim().toLowerCase();
      if (!normalized) return;
      const tapSavingBonus = 1 + ((normalized.split(/\s+/).length - 1) * 0.25);
      scores[normalized] = (scores[normalized] || 0) + (amount * tapSavingBonus);
    };

    // Trigram context (highest weight — 3×)
    if (lc.length >= 2) {
      const ctx = `${lc[lc.length - 2]} ${lc[lc.length - 1]}`;
      const tg = this.trigrams[ctx] || {};
      const total = Object.values(tg).reduce((a, b) => a + b, 0) || 1;
      Object.entries(tg).forEach(([w, c]) => bump(w, (c / total) * 3));
    }

    // Bigram context (medium weight — 2×)
    if (lc.length >= 1) {
      const ctx = lc[lc.length - 1];
      const bg = this.bigrams[ctx] || {};
      const total = Object.values(bg).reduce((a, b) => a + b, 0) || 1;
      Object.entries(bg).forEach(([w, c]) => bump(w, (c / total) * 2));
    }

    // Unigram fallback (low weight — 0.5×)
    const uTotal = Object.values(this.unigrams).reduce((a, b) => a + b, 0) || 1;
    Object.entries(this.unigrams).forEach(([w, c]) => bump(w, (c / uTotal) * 0.5));

    // Phrase-start / phrase-continuation boost
    const currentText = lc.join(" ");

    if (lc.length === 0) {
      Object.entries(this.phrases).forEach(([phrase, count]) => {
        const starter = pickStarterChunk(phrase.split(/\s+/).filter(Boolean));
        if (starter) bump(starter, count * 3);
      });
    } else {
      Object.entries(this.phrases).forEach(([phrase, count]) => {
        if (!phrase.startsWith(currentText + " ")) return;

        const remainderWords = phrase.slice(currentText.length + 1).split(/\s+/).filter(Boolean);
        if (!remainderWords.length) return;

        const nextWord = remainderWords[0];
        const chunk = pickContinuationChunk(remainderWords);

        if (nextWord) bump(nextWord, count * 1.5);
        if (chunk) bump(chunk, count * 2.4);
      });
    }

    // Remove words already at the very end of the sentence
    const lastWord = lc[lc.length - 1] || "";
    delete scores[lastWord];
    delete scores[currentText];

    return Object.entries(scores)
      .sort((a, b) => {
        const scoreDelta = b[1] - a[1];
        if (scoreDelta !== 0) return scoreDelta;

        const aWords = a[0].split(/\s+/).length;
        const bWords = b[0].split(/\s+/).length;
        if (bWords !== aWords) return bWords - aWords;

        return a[0].length - b[0].length;
      })
      .slice(0, n)
      .map(([w]) => w);
  }

  // ── Metadata ───────────────────────────────────────────────────────────────

  hasData() {
    return Object.keys(this.unigrams).length > 0;
  }

  /**
   * Given the tapped core words, suggest full communication intents.
   * E.g. ["water"] → ["I want water", "I'm thirsty", "Can I have water"]
   *
   * Uses stored phrase history to find matching patterns and expands single
   * words into complete sentences using common AAC sentence frames.
   *
   * @param {string[]} words    - Words tapped so far
   * @param {number}   n        - Max intent suggestions (default 4)
   * @param {string}   langCode - ISO 639-1 code for sentence frames (default "en")
   * @returns {string[]}
   */
  predictIntents(words, n = 4, langCode = "en") {
    if (!words.length) return [];

    const currentText = words.map(w => w.toLowerCase()).join(" ");
    const results = [];
    const seen = new Set();

    const add = (text, score) => {
      const key = text.toLowerCase().trim();
      if (!key || seen.has(key)) return;
      // skip if it's exactly what the user already typed
      if (key === currentText) return;
      seen.add(key);
      results.push({ text: key, score });
    };

    // 1. Match from stored phrase history
    Object.entries(this.phrases).forEach(([phrase, count]) => {
      const lower = phrase.toLowerCase();
      // Phrase contains all tapped words
      const phraseWords = lower.split(/\s+/);
      const allMatch = words.every(w => phraseWords.includes(w.toLowerCase()));
      if (allMatch) add(phrase, count * 5);
    });

    // 2. Generate from sentence frames (localised)
    const frames = INTENT_FRAMES_I18N[langCode] ?? INTENT_FRAMES;
    frames.forEach(frame => {
      const sentence = frame.replace("{}", currentText);
      add(sentence, 2);
    });

    // 3. If user typed multiple words, also suggest them as-is (completed)
    if (words.length >= 2) {
      add(currentText, 1);
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(r => r.text.charAt(0).toUpperCase() + r.text.slice(1));
  }

  stats() {
    return {
      vocab:   Object.keys(this.unigrams).length,
      phrases: Object.keys(this.phrases).length,
      bigrams: Object.keys(this.bigrams).length,
    };
  }
}

// Singleton — shared across the whole app
export const predictionEngine = new PredictionEngine();

const GLUE_WORDS = new Set([
  "a", "an", "the", "to", "my", "your", "our", "their",
  "very", "more", "some", "of", "for", "in", "on", "at",
]);

/** Common AAC sentence frames per language — {} is replaced with tapped word(s) */
const INTENT_FRAMES_I18N = {
  en: [
    "I want {}",  "I need {}",  "Can I have {}",  "I feel {}",  "I am {}",
    "Please give me {}",  "I don't want {}",  "Where is {}",  "I like {}",  "Help me with {}",
  ],
  es: [
    "Quiero {}",  "Necesito {}",  "¿Puedo tener {}?",  "Me siento {}",  "Estoy {}",
    "Por favor dame {}",  "No quiero {}",  "¿Dónde está {}?",  "Me gusta {}",  "Ayúdame con {}",
  ],
  fr: [
    "Je veux {}",  "J'ai besoin de {}",  "Puis-je avoir {} ?",  "Je me sens {}",  "Je suis {}",
    "Donne-moi {} s'il te plaît",  "Je ne veux pas {}",  "Où est {} ?",  "J'aime {}",  "Aide-moi avec {}",
  ],
  de: [
    "Ich will {}",  "Ich brauche {}",  "Kann ich {} haben?",  "Ich fühle mich {}",  "Ich bin {}",
    "Bitte gib mir {}",  "Ich will {} nicht",  "Wo ist {}?",  "Ich mag {}",  "Hilf mir mit {}",
  ],
  it: [
    "Voglio {}",  "Ho bisogno di {}",  "Posso avere {}?",  "Mi sento {}",  "Sono {}",
    "Per favore dammi {}",  "Non voglio {}",  "Dov'è {}?",  "Mi piace {}",  "Aiutami con {}",
  ],
  pt: [
    "Eu quero {}",  "Eu preciso de {}",  "Posso ter {}?",  "Eu me sinto {}",  "Eu estou {}",
    "Por favor me dê {}",  "Eu não quero {}",  "Onde está {}?",  "Eu gosto de {}",  "Me ajude com {}",
  ],
  ar: [
    "أريد {}",  "أحتاج {}",  "هل يمكنني الحصول على {}؟",  "أشعر بـ {}",  "أنا {}",
    "أعطني {} من فضلك",  "لا أريد {}",  "أين {}؟",  "أحب {}",  "ساعدني في {}",
  ],
  zh: [
    "我想要{}",  "我需要{}",  "我可以有{}吗？",  "我感觉{}",  "我是{}",
    "请给我{}",  "我不想要{}",  "{}在哪里？",  "我喜欢{}",  "帮我{}",
  ],
  ja: [
    "{}がほしい",  "{}が必要",  "{}をもらえますか？",  "{}と感じる",  "私は{}",
    "{}をください",  "{}はいらない",  "{}はどこ？",  "{}が好き",  "{}を手伝って",
  ],
  ko: [
    "{}을 원해요",  "{}이 필요해요",  "{}을 가질 수 있나요?",  "{}라고 느껴요",  "저는 {}이에요",
    "{}을 주세요",  "{}을 원하지 않아요",  "{}은 어디에 있나요?",  "{}을 좋아해요",  "{}을 도와주세요",
  ],
};

/** Backward-compatible default */
const INTENT_FRAMES = INTENT_FRAMES_I18N.en;

function pickStarterChunk(words) {
  if (!words.length) return "";
  if (words.length === 1) return words[0];
  return words.slice(0, 2).join(" ");
}

function pickContinuationChunk(words) {
  if (!words.length) return "";
  if (words.length === 1) return words[0];

  if (GLUE_WORDS.has(words[0])) {
    return words.slice(0, Math.min(3, words.length)).join(" ");
  }

  if (words.length >= 2 && GLUE_WORDS.has(words[1])) {
    return words.slice(0, Math.min(3, words.length)).join(" ");
  }

  return words.slice(0, Math.min(2, words.length)).join(" ");
}
