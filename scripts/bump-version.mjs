#!/usr/bin/env node
/**
 * bump-version.mjs — Increment the PATCH segment of package.json on every commit.
 *
 * Run automatically via .git/hooks/pre-commit (installed by `make setup-hooks`).
 * Can also be called manually: node scripts/bump-version.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkgPath = new URL("../package.json", import.meta.url).pathname;
const pkg     = JSON.parse(readFileSync(pkgPath, "utf-8"));

const [major, minor, patch] = pkg.version.split(".").map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`📦  Version bumped → ${pkg.version}`);

// Stage the updated package.json so it's included in the commit
try {
  execSync("git add package.json", { stdio: "inherit" });
} catch {
  // Non-fatal — may not be in a git repo during CI
}
