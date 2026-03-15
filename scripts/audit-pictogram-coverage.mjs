#!/usr/bin/env node
/**
 * audit-pictogram-coverage.mjs
 *
 * Audits every hierarchy item (L1 categories, L2 items, L3 modifiers) against
 * the ARASAAC pictogram manifest to identify IDs without pictogram mappings.
 *
 * Usage:
 *   node scripts/audit-pictogram-coverage.mjs [--check-files]
 *
 * Options:
 *   --check-files   Also verify that referenced PNG files exist on disk.
 *
 * Output:
 *   - Summary of total items, covered, and missing
 *   - List of missing IDs grouped by category
 *   - Optional file-existence audit
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, "..");

// ── Load hierarchy (dynamic import to handle ESM) ─────────────────────────

const { HIERARCHY }     = await import(resolve(ROOT, "src/data/hierarchy.js"));
const pictogramManifest = JSON.parse(
  readFileSync(resolve(ROOT, "src/data/arasaac-pictograms.json"), "utf-8")
);

const checkFiles = process.argv.includes("--check-files");

// ── Collect every unique ID from the hierarchy ────────────────────────────

const allIds   = new Set();
const idByLevel = { L1: [], L2: [], L3: [] };

for (const [catId, cat] of Object.entries(HIERARCHY)) {
  // L1 category IDs
  allIds.add(catId);
  idByLevel.L1.push(catId);

  for (const item of cat.items) {
    // L2 item IDs
    allIds.add(item.id);
    idByLevel.L2.push(item.id);

    if (item.l3) {
      for (const mod of item.l3) {
        // L3 modifier IDs (may repeat across L2s, Set deduplicates)
        allIds.add(mod.id);
        if (!idByLevel.L3.includes(mod.id)) idByLevel.L3.push(mod.id);
      }
    }
  }
}

// ── Cross-reference against manifest ──────────────────────────────────────

const covered = [];
const missing = [];

for (const id of allIds) {
  if (pictogramManifest[id]) {
    covered.push(id);
  } else {
    missing.push(id);
  }
}

// ── Optional: verify PNG files exist on disk ──────────────────────────────

const brokenFiles = [];
if (checkFiles) {
  for (const entry of Object.values(pictogramManifest)) {
    if (entry.localPath) {
      const full = resolve(ROOT, "public", entry.localPath.replace(/^\//, ""));
      if (!existsSync(full)) {
        brokenFiles.push({ id: entry.id, localPath: entry.localPath });
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════");
console.log("  ARASAAC Pictogram Coverage Audit");
console.log("═══════════════════════════════════════════════\n");

console.log(`  Hierarchy IDs:  ${allIds.size} total`);
console.log(`    L1 categories: ${idByLevel.L1.length}`);
console.log(`    L2 items:      ${idByLevel.L2.length}`);
console.log(`    L3 modifiers:  ${idByLevel.L3.length} (unique)`);
console.log();
console.log(`  Manifest entries: ${Object.keys(pictogramManifest).length}`);
console.log(`  Covered:          ${covered.length} / ${allIds.size}  (${((covered.length / allIds.size) * 100).toFixed(1)}%)`);
console.log(`  Missing:          ${missing.length}`);
console.log();

if (missing.length) {
  // Group missing by prefix
  const groups = {};
  for (const id of missing.sort()) {
    const prefix = id.includes("_") ? id.split("_")[0] + "_" : "(no prefix)";
    (groups[prefix] ??= []).push(id);
  }
  console.log("  ── Missing IDs by prefix ──\n");
  for (const [prefix, ids] of Object.entries(groups).sort()) {
    console.log(`    ${prefix}  (${ids.length}):`);
    for (const id of ids) {
      console.log(`      - ${id}`);
    }
  }
  console.log();
}

if (checkFiles) {
  if (brokenFiles.length) {
    console.log(`  ── Broken file references: ${brokenFiles.length} ──\n`);
    for (const { id, localPath } of brokenFiles) {
      console.log(`    ${id} → ${localPath}`);
    }
  } else {
    console.log("  ✔ All referenced PNG files exist on disk.");
  }
  console.log();
}

if (missing.length === 0) {
  console.log("  ✅ 100% pictogram coverage — all hierarchy IDs are mapped!\n");
} else {
  console.log(`  ⚠️  ${missing.length} hierarchy IDs need pictogram mappings.\n`);
}

process.exit(missing.length > 0 ? 1 : 0);
