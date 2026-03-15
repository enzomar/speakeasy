#!/usr/bin/env node
/**
 * Audit board contextualization.
 * Checks that l3Filter IDs are valid, onlyL2/priorityL2 reference real items,
 * and prints a summary of what each board exposes per category.
 */

import { getHierarchy } from "../src/data/hierarchy.js";
import BOARDS, {
  getContextualHierarchy,
  validateBoard,
} from "../src/data/boards/index.js";

const issues = [];
const info = [];

for (const board of BOARDS) {
  const bid = board.id;
  info.push("");
  info.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  info.push(`BOARD: ${bid} (${board.label})`);
  info.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Validate structure
  const v = validateBoard(board);
  if (!v.valid) issues.push(...v.errors.map((e) => `${bid}: ${e}`));
  if (v.warnings.length)
    issues.push(...v.warnings.map((w) => `${bid} WARN: ${w}`));

  // 2. Check onlyL2/priorityL2 IDs actually exist
  for (const [catId, l2Ids] of Object.entries(board.onlyL2 || {})) {
    const cat = getHierarchy(catId);
    if (!cat) {
      issues.push(`${bid}: onlyL2 references missing category "${catId}"`);
      continue;
    }
    const validIds = new Set(cat.items.map((i) => i.id));
    for (const id of l2Ids) {
      if (!validIds.has(id))
        issues.push(
          `${bid}: onlyL2[${catId}] references non-existent L2 "${id}"`
        );
    }
  }
  for (const [catId, l2Ids] of Object.entries(board.priorityL2 || {})) {
    const cat = getHierarchy(catId);
    if (!cat) {
      issues.push(
        `${bid}: priorityL2 references missing category "${catId}"`
      );
      continue;
    }
    const validIds = new Set(cat.items.map((i) => i.id));
    for (const id of l2Ids) {
      if (!validIds.has(id))
        issues.push(
          `${bid}: priorityL2[${catId}] references non-existent L2 "${id}"`
        );
    }
  }

  // 3. Check that l3Filter references are valid
  for (const [l2Id, l3Ids] of Object.entries(board.l3Filter || {})) {
    // Find which category contains this L2
    let foundItem = null;
    for (const catId of board.categories.filter(
      (c) => !["quick", "favorites"].includes(c)
    )) {
      const cat = getHierarchy(catId);
      if (!cat) continue;
      const item = cat.items.find((i) => i.id === l2Id);
      if (item) {
        foundItem = item;
        break;
      }
    }
    if (!foundItem) {
      issues.push(
        `${bid}: l3Filter["${l2Id}"] references L2 not in any board category`
      );
      continue;
    }
    const validL3 = new Set((foundItem.l3 || []).map((o) => o.id));
    for (const l3id of l3Ids) {
      if (!validL3.has(l3id)) {
        issues.push(
          `${bid}: l3Filter["${l2Id}"] → L3 "${l3id}" NOT in ${l2Id}'s hierarchy l3 options`
        );
      }
    }
  }

  // 4. Summary per category
  const SOFT = new Set(["quick", "favorites"]);
  for (const catId of board.categories.filter((c) => !SOFT.has(c))) {
    const ctx = getContextualHierarchy(catId, bid);
    if (!ctx) {
      info.push(`  [${catId}] ❌ MISSING from hierarchy`);
      continue;
    }
    const l2list = ctx.items.map((i) => {
      const l3c = (i.l3 || []).length;
      return `${i.id}(${l3c})`;
    });
    info.push(
      `  [${catId}] ${ctx.items.length} L2s: ${l2list.join(", ")}`
    );

    // Flag L2s with 0 L3 options (may be intentional but worth noting)
    for (const item of ctx.items) {
      if (!item.l3 || item.l3.length === 0) {
        info.push(`    ⚠️  ${item.id} has 0 L3 modifiers`);
      }
    }
  }
}

console.log("\n═══════ BOARD CONTEXTUALIZATION AUDIT ═══════\n");

if (issues.length) {
  console.log(`⚠️  ISSUES FOUND: ${issues.length}\n`);
  for (const iss of issues) console.log(`  • ${iss}`);
  console.log("");
} else {
  console.log("✅ No structural issues found\n");
}

for (const line of info) console.log(line);

process.exit(issues.length > 0 ? 1 : 0);
