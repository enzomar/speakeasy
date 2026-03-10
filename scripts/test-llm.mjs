#!/usr/bin/env node
/**
 * test-llm.mjs — CLI script to test the SpeakEasy LLM pipeline standalone.
 *
 * Pipeline: POS-aware heuristic templates → synonym swaps → LLM grammar correction
 *
 * Usage:
 *   node scripts/test-llm.mjs                         # defaults: keyword=water, lang=en, model=fast
 *   node scripts/test-llm.mjs --keyword eat --modifier hot --lang es --category actions
 *   node scripts/test-llm.mjs --keyword felice --lang it --category feelings
 *   node scripts/test-llm.mjs --model quality --keyword school --category places
 *   node scripts/test-llm.mjs --presence 2.0 --repetition 1.1
 *   node scripts/test-llm.mjs --keyword cibo --modifier mela --lang it --category food
 *   node scripts/test-llm.mjs --no-llm --keyword food  # heuristic-only, no LLM
 *
 * Requires: Node 20+ (for top-level await).
 */

import { CreateMLCEngine } from "@mlc-ai/web-llm";

// ───────────────────────────────────────────────────────────────────────────────
// Inline the pipeline from src/prompts/intentPrompt.js  +  src/data/posLookup.js
// ───────────────────────────────────────────────────────────────────────────────

// ── 0. POS lookup (inlined from posLookup.js) ─────────────────────────────────

const CATEGORY_TO_POS = {
  feelings: "adjective",
  food:     "noun",
  actions:  "verb",
  people:   "noun",
  social:   "noun",
  places:   "noun",
};
function getPOS(categoryId) { return CATEGORY_TO_POS[categoryId] ?? "noun"; }

// ── 1. POS-aware sentence templates ──────────────────────────────────────────

const POS_TEMPLATES = {
  adjective: {
    en: {
      positive:  ["I am {keyword} {modifier}",          "I feel {keyword} {modifier}"],
      question:  ["Am I {keyword} {modifier}?",         "Do you feel {keyword}?"],
      negative:  ["I am not {keyword} {modifier}",      "I don't feel {keyword} {modifier}"],
      request:   ["I want to be {keyword} {modifier}",  "Make me feel {keyword}"],
      variation: ["I feel very {keyword} {modifier}",   "Today I am {keyword}"],
    },
    es: {
      positive:  ["Estoy {keyword} {modifier}",         "Me siento {keyword} {modifier}"],
      question:  ["¿Estoy {keyword} {modifier}?",       "¿Te sientes {keyword}?"],
      negative:  ["No estoy {keyword} {modifier}",      "No me siento {keyword} {modifier}"],
      request:   ["Quiero estar {keyword} {modifier}",  "Quiero sentirme {keyword}"],
      variation: ["Me siento muy {keyword} {modifier}",  "Hoy estoy {keyword}"],
    },
    fr: {
      positive:  ["Je suis {keyword} {modifier}",       "Je me sens {keyword} {modifier}"],
      question:  ["Suis-je {keyword} {modifier}?",      "Tu te sens {keyword}?"],
      negative:  ["Je ne suis pas {keyword} {modifier}", "Je ne me sens pas {keyword}"],
      request:   ["Je veux être {keyword} {modifier}",  "Je voudrais me sentir {keyword}"],
      variation: ["Je me sens très {keyword} {modifier}", "Aujourd'hui je suis {keyword}"],
    },
    it: {
      positive:  ["Sono {keyword} {modifier}",          "Mi sento {keyword} {modifier}"],
      question:  ["Sei {keyword} {modifier}?",          "Ti senti {keyword} {modifier}?"],
      negative:  ["Non sono {keyword} {modifier}",      "Non mi sento {keyword} {modifier}"],
      request:   ["Voglio essere {keyword} {modifier}", "Fammi sentire {keyword}"],
      variation: ["Oggi mi sento {keyword}",            "Sono davvero {keyword} {modifier}"],
    },
    pt: {
      positive:  ["Estou {keyword} {modifier}",         "Me sinto {keyword} {modifier}"],
      question:  ["Estou {keyword} {modifier}?",        "Você se sente {keyword}?"],
      negative:  ["Não estou {keyword} {modifier}",     "Não me sinto {keyword} {modifier}"],
      request:   ["Quero ficar {keyword} {modifier}",   "Quero me sentir {keyword}"],
      variation: ["Me sinto muito {keyword} {modifier}", "Hoje estou {keyword}"],
    },
    de: {
      positive:  ["Ich bin {keyword} {modifier}",           "Ich fühle mich {keyword} {modifier}"],
      question:  ["Bin ich {keyword} {modifier}?",          "Fühlst du dich {keyword}?"],
      negative:  ["Ich bin nicht {keyword} {modifier}",     "Ich fühle mich nicht {keyword}"],
      request:   ["Ich möchte {keyword} sein {modifier}",   "Ich will mich {keyword} fühlen"],
      variation: ["Ich fühle mich sehr {keyword} {modifier}", "Heute bin ich {keyword}"],
    },
  },
  noun: {
    en: {
      positive:  ["I need {keyword} {modifier}",            "I want {keyword} {modifier}"],
      question:  ["Can I have {keyword} {modifier}?",       "Do you have {keyword}?"],
      negative:  ["I don't want {keyword} {modifier}",      "I don't need {keyword}"],
      request:   ["Give me {keyword} {modifier} please",    "I would like {keyword} please"],
      variation: ["I really want {keyword} {modifier}",     "I need {keyword} now"],
    },
    es: {
      positive:  ["Necesito {keyword} {modifier}",          "Quiero {keyword} {modifier}"],
      question:  ["¿Tienes {keyword} {modifier}?",          "¿Puedo tener {keyword}?"],
      negative:  ["No quiero {keyword} {modifier}",         "No necesito {keyword}"],
      request:   ["Dame {keyword} {modifier} por favor",    "Quiero {keyword} por favor"],
      variation: ["Realmente quiero {keyword} {modifier}",  "Necesito {keyword} ahora"],
    },
    fr: {
      positive:  ["J'ai besoin de {keyword} {modifier}",    "Je veux {keyword} {modifier}"],
      question:  ["Tu as {keyword} {modifier}?",            "Je peux avoir {keyword}?"],
      negative:  ["Je ne veux pas {keyword} {modifier}",    "Je n'ai pas besoin de {keyword}"],
      request:   ["Donne-moi {keyword} {modifier} s'il te plaît", "Je voudrais {keyword} s'il te plaît"],
      variation: ["Je veux vraiment {keyword} {modifier}",  "J'ai besoin de {keyword} maintenant"],
    },
    it: {
      positive:  ["Ho bisogno di {keyword} {modifier}",     "Voglio {keyword} {modifier}"],
      question:  ["Hai {keyword} {modifier}?",              "Posso avere {keyword}?"],
      negative:  ["Non voglio {keyword} {modifier}",        "Non ho bisogno di {keyword}"],
      request:   ["Dammi {keyword} {modifier} per favore",  "Vorrei {keyword} per favore"],
      variation: ["Voglio davvero {keyword} {modifier}",    "Ho bisogno di {keyword} adesso"],
    },
    pt: {
      positive:  ["Preciso de {keyword} {modifier}",        "Quero {keyword} {modifier}"],
      question:  ["Você tem {keyword} {modifier}?",         "Posso ter {keyword}?"],
      negative:  ["Não quero {keyword} {modifier}",         "Não preciso de {keyword}"],
      request:   ["Me dê {keyword} {modifier} por favor",   "Quero {keyword} por favor"],
      variation: ["Quero muito {keyword} {modifier}",       "Preciso de {keyword} agora"],
    },
    de: {
      positive:  ["Ich brauche {keyword} {modifier}",       "Ich möchte {keyword} {modifier}"],
      question:  ["Hast du {keyword} {modifier}?",          "Kann ich {keyword} haben?"],
      negative:  ["Ich will kein {keyword} {modifier}",     "Ich brauche kein {keyword}"],
      request:   ["Gib mir bitte {keyword} {modifier}",     "Ich hätte gerne {keyword}"],
      variation: ["Ich brauche wirklich {keyword} {modifier}", "Ich möchte {keyword} jetzt"],
    },
  },
  verb: {
    en: {
      positive:  ["I want to {keyword} {modifier}",    "I like to {keyword} {modifier}"],
      question:  ["Can I {keyword} {modifier}?",       "Do you want to {keyword}?"],
      negative:  ["I don't want to {keyword} {modifier}", "I can't {keyword} {modifier}"],
      request:   ["Help me {keyword} {modifier}",      "Let me {keyword} {modifier}"],
      variation: ["I need to {keyword} {modifier}",    "I would like to {keyword}"],
    },
    es: {
      positive:  ["Quiero {keyword} {modifier}",       "Me gusta {keyword} {modifier}"],
      question:  ["¿Puedo {keyword} {modifier}?",      "¿Quieres {keyword}?"],
      negative:  ["No quiero {keyword} {modifier}",    "No puedo {keyword} {modifier}"],
      request:   ["Ayúdame a {keyword} {modifier}",    "Déjame {keyword} {modifier}"],
      variation: ["Necesito {keyword} {modifier}",     "Me gustaría {keyword}"],
    },
    fr: {
      positive:  ["Je veux {keyword} {modifier}",      "J'aime {keyword} {modifier}"],
      question:  ["Je peux {keyword} {modifier}?",     "Tu veux {keyword}?"],
      negative:  ["Je ne veux pas {keyword} {modifier}", "Je ne peux pas {keyword}"],
      request:   ["Aide-moi à {keyword} {modifier}",   "Laisse-moi {keyword} {modifier}"],
      variation: ["J'ai besoin de {keyword} {modifier}", "Je voudrais {keyword}"],
    },
    it: {
      positive:  ["Voglio {keyword} {modifier}",       "Mi piace {keyword} {modifier}"],
      question:  ["Posso {keyword} {modifier}?",       "Vuoi {keyword} {modifier}?"],
      negative:  ["Non voglio {keyword} {modifier}",   "Non posso {keyword} {modifier}"],
      request:   ["Aiutami a {keyword} {modifier}",    "Lasciami {keyword} {modifier}"],
      variation: ["Devo {keyword} {modifier}",         "Vorrei {keyword}"],
    },
    pt: {
      positive:  ["Quero {keyword} {modifier}",        "Gosto de {keyword} {modifier}"],
      question:  ["Posso {keyword} {modifier}?",       "Você quer {keyword}?"],
      negative:  ["Não quero {keyword} {modifier}",    "Não posso {keyword} {modifier}"],
      request:   ["Me ajude a {keyword} {modifier}",   "Deixe-me {keyword} {modifier}"],
      variation: ["Preciso {keyword} {modifier}",      "Gostaria de {keyword}"],
    },
    de: {
      positive:  ["Ich will {keyword} {modifier}",     "Ich mag {keyword} {modifier}"],
      question:  ["Kann ich {keyword} {modifier}?",    "Willst du {keyword}?"],
      negative:  ["Ich will nicht {keyword} {modifier}", "Ich kann nicht {keyword}"],
      request:   ["Hilf mir {keyword} {modifier}",     "Lass mich {keyword} {modifier}"],
      variation: ["Ich muss {keyword} {modifier}",     "Ich möchte {keyword}"],
    },
  },
};

const HEURISTIC_SWAPS = {
  en: [["I am","I feel"],["I am not","I don't feel"],["I need","I want"],["Give me","Can I have"],["I want to","I need to"],["Help me","Let me"]],
  es: [["Estoy","Me siento"],["Necesito","Quiero"],["Ayúdame a","Déjame"],["Dame","Quiero"]],
  fr: [["Je suis","Je me sens"],["J'ai besoin de","Je voudrais"],["Aide-moi à","Laisse-moi"],["Donne-moi","Je voudrais"]],
  it: [["Sono","Mi sento"],["Ho bisogno di","Voglio"],["Aiutami a","Lasciami"],["Dammi","Vorrei"]],
  pt: [["Estou","Me sinto"],["Preciso de","Quero"],["Me ajude a","Deixe-me"],["Me dê","Quero"]],
  de: [["Ich bin","Ich fühle mich"],["Ich brauche","Ich möchte"],["Hilf mir","Lass mich"],["Gib mir","Ich hätte gerne"]],
};

// ── 2. Generate heuristic candidates (POS-aware) ─────────────────────────────

function generateCandidates(keyword, modifier, langCode, categoryId) {
  const pos  = getPOS(categoryId);
  const lang = POS_TEMPLATES[pos]?.[langCode]
            ?? POS_TEMPLATES[pos]?.en
            ?? POS_TEMPLATES.noun[langCode]
            ?? POS_TEMPLATES.noun.en;
  const mod  = modifier || "";

  const base = Object.values(lang)
    .map(arr => arr[0])
    .map(t => t.replace(/\{keyword\}/g, keyword).replace(/\{modifier\}/g, mod).replace(/\s+/g, " ").trim());

  const extras = Object.values(lang)
    .map(arr => arr[1]).filter(Boolean)
    .map(t => t.replace(/\{keyword\}/g, keyword).replace(/\{modifier\}/g, mod).replace(/\s+/g, " ").trim());

  const swaps = HEURISTIC_SWAPS[langCode] ?? [];
  const swapped = [];
  for (const s of base) {
    for (const [from, to] of swaps) {
      if (s.includes(from)) swapped.push(s.replace(from, to));
    }
  }

  return [...new Set([...base, ...extras, ...swapped])].filter(s => {
    const wc = s.split(/\s+/).length;
    return wc >= 2 && wc <= 8;
  });
}

// ── 3. LLM prompt builders (grammar-corrector role) ──────────────────────────

const LANG_NAMES = {
  en: "English", es: "español", fr: "français",
  it: "italiano", pt: "português", de: "Deutsch",
};

function buildSystemPrompt(langCode, keyword) {
  const lang = LANG_NAMES[langCode] ?? "English";
  return `You are a ${lang} grammar corrector for AAC communication.
- Fix grammar and naturalness only
- Never change the meaning
- Keep keyword "${keyword}" in every sentence
- Each sentence 3–6 words
- Output EXACTLY 5 sentences, one per line
- No numbers, labels, explanations, or extra text`;
}

function buildUserPrompt(keyword, modifier, langCode, candidates) {
  const lang = LANG_NAMES[langCode] ?? "English";
  const parts = [];
  parts.push("/no_think");
  parts.push(`Correct these ${lang} sentences:`);
  candidates.slice(0, 8).forEach(s => parts.push(s));
  return parts.join("\n");
}

// ── 4. Output parser (mirrors useAIPrediction parseIntentOutput) ──────────────

function parseIntentOutput(raw) {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/<think>[\s\S]*/gi, "").trim();

  try {
    const start = text.indexOf("[");
    const end   = text.lastIndexOf("]");
    if (start !== -1 && end > start) {
      const arr = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(arr)) {
        return arr
          .filter(s => typeof s === "string" && s.trim().length >= 4)
          .map(s => s.trim().replace(/[.!?…]+$/, "") + ".")
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .slice(0, 5);
      }
    }
  } catch { /* not JSON */ }

  const LABEL_RE = /^[\s]*(?:\d+[.):\-\s]+|(?:line|sentence)\s*\d+[.:)?\s]+|(?:positive|affirmation|question|negative|varied|request|wish|exclamation|observation)\s*\d*[.:)?\s]+)/i;

  return text
    .split(/\n+/)
    .map(s => s.replace(LABEL_RE, "").trim())
    .map(s => s.replace(/^['"""''`]+|['"""''`]+$/g, "").trim())
    .map(s => s.replace(/…$/, "").trim())
    .filter(s => {
      if (!s || s.length < 4 || s.length > 150) return false;
      if (/[\[\]{}<>\\|@#]/.test(s)) return false;
      if (/^(?:note|output|result|example|here|these|the following)/i.test(s)) return false;
      return s.split(/\s+/).length >= 2;
    })
    .map(s => {
      const clean = s.charAt(0).toUpperCase() + s.slice(1);
      return /[.!?]$/.test(clean) ? clean : clean + ".";
    })
    .slice(0, 5);
}

// ── CLI arg parser ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    keyword:    "water",
    modifier:   null,
    lang:       "en",
    model:      "fast",   // "fast" | "quality" | "gemma" | "qwen25"
    category:   null,     // feelings|food|actions|people|social|places → POS
    presence:   1.5,
    repetition: 1.0,
    runs:       1,        // number of consecutive inferences
    noLlm:      false,    // skip LLM, show heuristic only
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--keyword":  case "-k": opts.keyword    = args[++i]; break;
      case "--modifier": case "-m": opts.modifier   = args[++i]; break;
      case "--lang":     case "-l": opts.lang       = args[++i]; break;
      case "--model":               opts.model      = args[++i]; break;
      case "--category": case "-c": opts.category   = args[++i]; break;
      case "--presence":            opts.presence   = parseFloat(args[++i]); break;
      case "--repetition":          opts.repetition = parseFloat(args[++i]); break;
      case "--runs":     case "-n": opts.runs       = parseInt(args[++i], 10); break;
      case "--no-llm":              opts.noLlm      = true; break;
      case "--help": case "-h":
        console.log(`
SpeakEasy AAC Test — heuristic templates + LLM refinement

Usage:
  node scripts/test-llm.mjs [options]

Options:
  --keyword, -k   <word>     Keyword (L2)                          (default: water)
  --modifier, -m  <word>     Modifier (L3)                         (default: none)
  --lang, -l      <code>     Language: en|es|fr|it|pt|de           (default: en)
  --model         <key>      fast|quality|gemma|qwen25             (default: fast)
  --category, -c  <cat>      feelings|food|actions|people|social|places (→ POS)
  --presence      <float>    presence_penalty 0–3                   (default: 1.5)
  --repetition    <float>    repetition_penalty 0.5–2               (default: 1.0)
  --runs, -n      <int>      Run LLM inference N times              (default: 1)
  --no-llm                   Skip LLM, show heuristic candidates only
  --help, -h                 Show this help
`);
        process.exit(0);
      default:
        if (i === 0 && !args[i].startsWith("-")) { opts.keyword = args[i]; break; }
        console.error(`Unknown flag: ${args[i]}. Use --help.`);
        process.exit(1);
    }
  }
  return opts;
}

// ── Model IDs ─────────────────────────────────────────────────────────────────

const MODEL_IDS = {
  fast:    "Qwen3-0.6B-q4f16_1-MLC",
  quality: "Qwen3-1.7B-q4f16_1-MLC",
  gemma:   "gemma-3-1b-it-q4f16_1-MLC",
  qwen25:  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
};

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  yellow: "\x1b[33m",
  green:  "\x1b[32m",
  magenta:"\x1b[35m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
};

function header(label) { return `${C.bold}${C.cyan}── ${label} ${"─".repeat(Math.max(1, 60 - label.length))}${C.reset}`; }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const modelId = MODEL_IDS[opts.model] ?? MODEL_IDS.fast;

  console.log(`\n${C.bold}${C.magenta}SpeakEasy AAC Test${C.reset}`);
  console.log(`${C.dim}Language: ${opts.lang}${C.reset}`);
  console.log(`${C.dim}Keyword:  ${opts.keyword}${C.reset}`);
  console.log(`${C.dim}Modifier: ${opts.modifier || "(none)"}${C.reset}`);
  console.log(`${C.dim}Category: ${opts.category || "(none)"} → POS: ${getPOS(opts.category)}${C.reset}`);
  if (!opts.noLlm) {
    console.log(`${C.dim}Model:    ${modelId}${C.reset}`);
    console.log(`${C.dim}Presence: ${opts.presence}  Repetition: ${opts.repetition}${C.reset}`);
    console.log(`${C.dim}Runs:     ${opts.runs}${C.reset}`);
  } else {
    console.log(`${C.dim}Mode:     heuristic only (--no-llm)${C.reset}`);
  }
  console.log();

  // ── Step 1: Heuristic candidates ────────────────────────────────────
  const candidates = generateCandidates(opts.keyword, opts.modifier, opts.lang, opts.category);

  console.log(header("HEURISTIC CANDIDATES"));
  candidates.forEach((s, i) => {
    console.log(`  ${C.yellow}${i + 1}.${C.reset} ${s}`);
  });
  console.log();

  // Stop here if --no-llm
  if (opts.noLlm) {
    console.log(`${C.green}${C.bold}Done (heuristic only).${C.reset}\n`);
    process.exit(0);
  }

  // ── Step 2: Build LLM refinement prompts ────────────────────────────
  const systemPrompt = buildSystemPrompt(opts.lang, opts.keyword);
  const userPrompt   = buildUserPrompt(opts.keyword, opts.modifier, opts.lang, candidates);

  console.log(header("SYSTEM PROMPT"));
  console.log(`${C.dim}${systemPrompt}${C.reset}\n`);

  console.log(header("USER PROMPT"));
  console.log(`${C.yellow}${userPrompt}${C.reset}\n`);

  const genConfig = {
    max_tokens:         150,
    temperature:        0.7,
    top_p:              0.8,
    presence_penalty:   opts.presence,
    frequency_penalty:  0.0,
    repetition_penalty: opts.repetition,
    stream:             false,
  };

  console.log(header("GENERATION CONFIG"));
  console.log(`${C.dim}${JSON.stringify(genConfig, null, 2)}${C.reset}\n`);

  // ── Step 3: Load model ──────────────────────────────────────────────
  console.log(header("LOADING MODEL"));
  const t0 = Date.now();

  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (progress) => {
      const pct = progress.progress != null
        ? `${(progress.progress * 100).toFixed(0)}%`
        : "";
      process.stdout.write(`\r  ${C.dim}${progress.text || ""} ${pct}${C.reset}    `);
    },
  });

  const loadMs = Date.now() - t0;
  console.log(`\n  ${C.green}✓ Model loaded in ${(loadMs / 1000).toFixed(1)}s${C.reset}\n`);

  // ── Step 4: LLM refinement ─────────────────────────────────────────
  for (let run = 1; run <= opts.runs; run++) {
    if (opts.runs > 1) {
      console.log(`${C.bold}${C.blue}── Run ${run}/${opts.runs} ────────────────────────${C.reset}`);
    }

    const t1 = Date.now();
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system",  content: systemPrompt },
        { role: "user",    content: userPrompt   },
      ],
      ...genConfig,
    });
    const inferMs = Date.now() - t1;

    const raw = reply.choices[0]?.message?.content ?? "";

    console.log(header("RAW LLM OUTPUT"));
    console.log(raw || `${C.red}(empty)${C.reset}`);
    console.log();

    const parsed = parseIntentOutput(raw);

    console.log(header("REFINED SENTENCES"));
    if (parsed.length === 0) {
      console.log(`${C.red}  (no sentences parsed — using heuristic fallback)${C.reset}`);
      candidates.slice(0, 5).forEach((s, i) => {
        console.log(`  ${C.yellow}${i + 1}.${C.reset} ${s}`);
      });
    } else {
      parsed.forEach((s, i) => {
        console.log(`  ${C.green}${i + 1}.${C.reset} ${s}`);
      });
    }

    const usage = reply.usage;
    console.log(`\n${C.dim}  Inference: ${inferMs}ms`);
    if (usage) {
      const tokSec = usage.completion_tokens / (inferMs / 1000);
      console.log(`  Tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
      console.log(`  Speed:  ${tokSec.toFixed(1)} tok/s`);
    }
    console.log(`${C.reset}`);

    if (opts.runs > 1 && run < opts.runs) {
      await engine.resetChat();
    }
  }

  console.log(`${C.green}${C.bold}Done.${C.reset}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(`${C.red}Fatal: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
