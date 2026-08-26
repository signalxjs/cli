#!/usr/bin/env node
/**
 * check-catalog.mjs — CI guard (`pnpm verify:catalog`). Fails if:
 *   1. any workspace package declares a CORE dep with an inline version instead
 *      of `"catalog:"` (drift — the whole point is one source of truth), or
 *   2. a `catalog:` core entry is NOT a single-minor caret `^X.Y.0`
 *      (a wider range like `>=0.11 <0.13` re-opens the two-copies hazard).
 *
 * Wire into ci.yml. Generalises lynx's check-versions.js to the catalog model.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_PACKAGES, findInlineCoreDeps, formatInlineCoreDeps } from './lib/core-deps.mjs';
import { readCatalog } from './lib/catalog.mjs';

const SINGLE_MINOR = /^\^\d+\.\d+\.0$/; // ^X.Y.0 — one minor

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

// 1. Every core dep in every package.json must be exactly "catalog:".
errors.push(...formatInlineCoreDeps(findInlineCoreDeps(repoRoot)));

// 2. Catalog core entries must be single-minor caret. (Parsing lives in
//    lib/catalog.mjs, shared with gen-versions.mjs so the guard and the
//    scaffolder read the same entries.) A repo with no workspace file has no
//    catalog to police — readCatalog returns {} and part 2 is a no-op.
for (const [name, ver] of Object.entries(readCatalog(repoRoot))) {
    if (CORE_PACKAGES.has(name) && !SINGLE_MINOR.test(ver)) {
        errors.push(`catalog["${name}"] = "${ver}" (must be single-minor ^X.Y.0 to keep one copy hoisted)`);
    }
}

if (errors.length) {
    console.error('verify:catalog FAILED:\n' + errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
}
console.log('verify:catalog OK — all core deps go through a single-minor catalog.');
