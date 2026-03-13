#!/usr/bin/env node
/**
 * test-grid-combinations.mjs
 * ==========================
 * Iterates ALL grid combinations (L1 → L2, L1 → L2 → L3) from the active
 * HIERARCHY data and generates sentences via:
 *   • Heuristic templates (generateCandidates + fixGender)
 *   • Deterministic engine (generateSync via conceptIds)
 *
 * The script is ADAPTIVE: it reads HIERARCHY dynamically, so any change to
 * hierarchy.js is automatically covered on the next run.
 *
 * Output: one file per L1 category in scripts/output-test-grid/
 *   e.g.  output-test-grid/feel.txt, output-test-grid/need.txt, …
 *
 * Usage:
 *   node scripts/test-grid-combinations.mjs                  # en / male
 *   node scripts/test-grid-combinations.mjs --lang it        # Italian
 *   node scripts/test-grid-combinations.mjs --gender female  # female morphology
 *   node scripts/test-grid-combinations.mjs --lang es --gender female --top 8
 *   node scripts/test-grid-combinations.mjs --dir my-output  # custom output dir
 *
 * Requires: Node 20+ (ESM, JSON import assertions).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Source imports (adaptive to any hierarchy/template changes) ──────────────
import { HIERARCHY } from "../src/data/hierarchy.js";
import {
  generateCandidates,
  fixGender,
  dedupeAndMerge,
  getPOS,
} from "../src/prompts/intentPrompt.js";
import {
  detectIntent,
  detectEmotion,
} from "../src/prompts/intentEmotionEngine.js";

// Engine imports — may fail if JSON assertions aren't supported; we degrade gracefully
let tapContextToConceptIds = null;
let generateSync = null;
let engineAvailable = false;

try {
  const bridge = await import("../src/engine/hierarchyBridge.js");
  const orch   = await import("../src/engine/sentenceOrchestrator.js");
  tapContextToConceptIds = bridge.tapContextToConceptIds;
  generateSync           = orch.generateSync;
  engineAvailable        = true;
} catch (e) {
  console.warn("⚠ Engine modules unavailable (JSON import issue?) — heuristic-only mode.");
  console.warn("  Hint: run with  node --experimental-json-modules scripts/test-grid-combinations.mjs");
}

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const langCode  = arg("lang", "en");
const gender    = arg("gender", "male");
const topN      = parseInt(arg("top", "8"), 10);
const outDir    = arg("dir", "output-test-grid");
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDirPath = resolve(__dirname, outDir);

// Create output directory
mkdirSync(outDirPath, { recursive: true });

// ── Global counters ──────────────────────────────────────────────────────────
let totalCombinations = 0;
let totalSentences    = 0;
let totalCategories   = 0;
let totalL2           = 0;
let totalL3           = 0;

const timestamp = new Date().toISOString();
const writtenFiles = [];

// ── Helper: generate sentences for one L2 item (±L3 modifier) ────────────────
function generateForTap(category, item, mod = null) {
  const { pos } = getPOS(item.label);
  const intent  = detectIntent(pos, category.mapTo, false, mod?.label ?? null);
  const emotion = detectEmotion(item.label, mod?.label ?? null, category.mapTo);

  const heuristic = generateCandidates(
    item.label, mod?.label ?? null, langCode, gender, item.label,
    category.mapTo, intent, emotion, mod?.label ?? null,
  )
    .slice(0, topN)
    .map((s) => fixGender(s, langCode, gender));

  let engineText = null;
  let engineConf = null;
  let conceptIds = [];
  if (engineAvailable) {
    const tapCtx = mod
      ? { l2Canon: item.label, l3Canon: mod.label }
      : { l2Canon: item.label };
    conceptIds = tapContextToConceptIds([], tapCtx);
    if (conceptIds.length >= 2) {
      try {
        const r = generateSync(conceptIds, langCode);
        engineText = r?.text ?? null;
        engineConf = r?.confidence?.overall ?? null;
      } catch { /* engine failure — skip */ }
    }
  }

  return { pos, intent, emotion, heuristic, engineText, engineConf, conceptIds };
}

// ── Iterate by L1 category (one file each) ───────────────────────────────────
for (const [catId, category] of Object.entries(HIERARCHY)) {
  totalCategories++;

  const lines = [];
  const log = (...a) => lines.push(a.join(" "));

  let catCombinations = 0;
  let catSentences    = 0;
  let catL2           = 0;
  let catL3           = 0;

  log("=".repeat(72));
  log(`  SpeakEasy — Grid Combination Report: ${category.emoji}  ${category.label}`);
  log("=".repeat(72));
  log(`  Category : ${catId}  (mapTo=${category.mapTo})`);
  log(`  Language : ${langCode}`);
  log(`  Gender   : ${gender}`);
  log(`  Top N    : ${topN} heuristic sentences per cell`);
  log(`  Engine   : ${engineAvailable ? "active (deterministic + confidence)" : "unavailable (heuristic only)"}`);
  log(`  Generated: ${timestamp}`);
  log("=".repeat(72));

  log("");
  log("━".repeat(72));
  log(`  L1 CATEGORY: ${category.emoji}  ${category.label}  (${catId})`);
  log(`  ${category.items.length} items, color=${category.color}`);
  log("━".repeat(72));

  for (const item of category.items) {
    catL2++;

    // ── L2-only tap ─────────────────────────────────────────────────────
    const r = generateForTap(category, item);

    catCombinations++;
    catSentences += r.heuristic.length + (r.engineText ? 1 : 0);

    log("");
    log(`  L2: ${item.emoji}  ${item.label}  (${item.id})`);
    log(`      pos=${r.pos}  intent=${r.intent}  emotion=${r.emotion}`);
    if (r.engineText) {
      log(`      ENGINE: "${r.engineText}"  conf=${(r.engineConf * 100).toFixed(0)}%  [${r.conceptIds.join(" → ")}]`);
    }
    r.heuristic.forEach((s, i) => log(`      ${String(i + 1).padStart(2)}. ${s}`));

    // ── L2 + L3 combinations ────────────────────────────────────────────
    const l3List = item.l3 ?? [];
    for (const mod of l3List) {
      catL3++;

      const mr = generateForTap(category, item, mod);

      catCombinations++;
      catSentences += mr.heuristic.length + (mr.engineText ? 1 : 0);

      log("");
      log(`    L3: ${mod.emoji}  ${mod.label}  (${mod.id})  type=${mod.type ?? "auto"}`);
      log(`        intent=${mr.intent}  emotion=${mr.emotion}`);
      if (mr.engineText) {
        log(`        ENGINE: "${mr.engineText}"  conf=${(mr.engineConf * 100).toFixed(0)}%  [${mr.conceptIds.join(" → ")}]`);
      }
      mr.heuristic.forEach((s, i) => log(`        ${String(i + 1).padStart(2)}. ${s}`));
    }
  }

  // ── Per-category summary ────────────────────────────────────────────────
  log("");
  log("─".repeat(72));
  log(`  SUMMARY for ${category.label}`);
  log("─".repeat(72));
  log(`  Items (L2):              ${catL2}`);
  log(`  Modifiers (L3):          ${catL3}`);
  log(`  Total cell combinations: ${catCombinations}`);
  log(`  Total sentences:         ${catSentences}`);
  log(`  Avg sentences / cell:    ${(catSentences / catCombinations).toFixed(1)}`);
  log("─".repeat(72));

  // ── Write per-category file ─────────────────────────────────────────────
  const filePath = resolve(outDirPath, `${catId}.txt`);
  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  writtenFiles.push({ catId, label: category.label, filePath, catCombinations, catSentences });

  totalL2           += catL2;
  totalL3           += catL3;
  totalCombinations += catCombinations;
  totalSentences    += catSentences;
}

// ── Console summary ──────────────────────────────────────────────────────────
console.log(`\n✅  Reports written to ${outDirPath}/`);
console.log(`    ${totalCategories} categories · ${totalL2} L2 items · ${totalL3} L3 modifiers`);
console.log(`    ${totalCombinations} combinations · ${totalSentences} sentences\n`);
for (const f of writtenFiles) {
  console.log(`    ${f.label.padEnd(12)} → ${f.catId}.txt  (${f.catCombinations} combos, ${f.catSentences} sentences)`);
}
