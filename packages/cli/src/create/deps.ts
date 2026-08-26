/**
 * `dep(name)` — the one way a layer asks for a version range. Core packages
 * share the catalog's core line, companions have their own lines, third
 * parties are pinned in scripts/lib/template-versions.json; all three land
 * in the generated versions.ts. An unknown name throws at compose time (and
 * therefore in the snapshot tests), never a silent `undefined` in a
 * scaffolded package.json.
 */
import { SIGX_CLI, SIGX_COMPANIONS, SIGX_CORE, SIGX_CORE_PACKAGES, THIRD_PARTY } from './versions.js';

export function dep(name: string): string {
    if (name === '@sigx/cli') return SIGX_CLI;
    if (SIGX_CORE_PACKAGES.has(name)) return SIGX_CORE;
    const companion = SIGX_COMPANIONS[name];
    if (companion) return companion;
    const third = THIRD_PARTY[name];
    if (third) return third;
    throw new Error(`[sigx create] no pinned version for "${name}" — add it to the pnpm catalog or scripts/lib/template-versions.json`);
}

/** `{ name: range }` for a list of names — the shape package.json fragments take. */
export function deps(...names: string[]): Record<string, string> {
    return Object.fromEntries(names.map((n) => [n, dep(n)]));
}
