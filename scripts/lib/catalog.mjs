/**
 * catalog.mjs — read the `catalog:` block of pnpm-workspace.yaml.
 *
 * Shared by check-catalog.mjs (the guard) and gen-versions.mjs (the
 * scaffolder's version source). One lenient parser, so the two cannot
 * disagree about what the catalog says: entries are simple
 * `name: ^x.y.z` lines, values may be bare or quoted (a quoted value may
 * contain spaces — a wide range like ">=0.11.0 <0.13.0" must be seen, not
 * skipped), and a column-0 comment does NOT end the block.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const entryRe = /^\s+(["']?)([@a-zA-Z0-9._/-]+)\1\s*:\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/;

/**
 * @param {string} repoRoot
 * @returns {Record<string, string>} package name → range, in file order
 */
export function readCatalog(repoRoot) {
    const wsPath = join(repoRoot, 'pnpm-workspace.yaml');
    const ws = existsSync(wsPath) ? readFileSync(wsPath, 'utf8') : '';
    const catalog = {};
    let inCatalog = false;
    for (const line of ws.split('\n')) {
        if (/^(catalog|catalogs)\s*:/.test(line)) { inCatalog = true; continue; }
        if (inCatalog && line.trim() !== '' && !/^\s*#/.test(line) && /^\S/.test(line)) inCatalog = false;
        if (!inCatalog) continue;
        const m = entryRe.exec(line);
        if (!m) continue;
        catalog[m[2]] = m[3] ?? m[4] ?? m[5];
    }
    return catalog;
}
