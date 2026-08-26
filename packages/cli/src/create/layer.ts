/**
 * A layer is one composable slice of a project: a kind (spa, ssr, …), a
 * render mode, a deploy target, a styling choice or a feature. Each
 * contributes files (from an overlay folder and/or generated strings) plus
 * *fragments* of the managed files — package.json, vite.config.ts,
 * tsconfig.json, src/env.d.ts, .gitignore, README.md — which the builders
 * merge in layer order. Layers never write the managed files themselves.
 */
import type { ProjectSpec } from './spec.js';
import type { PmCommands } from './postinstall/pm.js';
import type { VirtualFileTree } from './tree.js';

export interface PackageJsonFragment {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    /** Extra top-level fields (`engines`, …). */
    extra?: Record<string, unknown>;
}

export interface VitePluginEntry {
    /** Local identifier, e.g. `sigx` or `tailwindcss`. */
    name: string;
    from: string;
    /** `default` → `import name from` ; `named` → `import { name } from`. */
    importKind?: 'default' | 'named';
    /** The call expression to place in `plugins: []` — defaults to `name()`. */
    call?: string;
    /** Sort key: sigx() 0, render packs 10, sigxServer() 20, styling 50, features 60. */
    order: number;
}

export interface ViteConfigFragment {
    plugins?: VitePluginEntry[];
    /** Keys of `sigx({ ssr: { … } })`, as raw TS expressions. */
    ssr?: Record<string, string>;
    /** Other keys of `sigx({ … })`, as raw TS expressions. */
    sigxOptions?: Record<string, string>;
    /** Packages externalized from the dev-server module graph (SSR). */
    family?: string[];
    /** Top-level `defineConfig` keys, as raw TS expressions. */
    topLevel?: Record<string, string>;
    /** Keys applied only under `vite` (dev) — rendered inside `...(command === 'serve' && { … })`. */
    serveOnly?: Record<string, string>;
    /** Extra imports, rendered verbatim as `import <names> from '<from>'`. */
    imports?: Array<{ names: string; from: string }>;
}

export interface TsconfigFragment {
    compilerOptions?: Record<string, unknown>;
    include?: string[];
    types?: string[];
}

export interface ReadmeSection {
    title: string;
    body: string;
    /** Lower renders first; defaults to 50. */
    order?: number;
}

export interface LayerContext {
    spec: ProjectSpec;
    pm: PmCommands;
}

type Resolvable<T> = T | ((ctx: LayerContext) => T);

export interface Layer {
    name: string;
    /**
     * The overlay ships a complete project (Lynx): copy it, substitute
     * `{{projectName}}`, and skip every builder.
     */
    raw?: boolean;
    /** Overlay folder, relative to `templates/`. */
    overlay?: string;
    /** Generated files: path → content. */
    files?: (ctx: LayerContext) => Record<string, string>;
    packageJson?: Resolvable<PackageJsonFragment>;
    vite?: Resolvable<ViteConfigFragment>;
    tsconfig?: TsconfigFragment;
    /** Lines for `src/env.d.ts` (`/// <reference types="…" />` first, then declarations). */
    envTypes?: string[];
    gitignore?: string[];
    /**
     * Dependencies whose install scripts must run (pnpm ≥10 ignores them by
     * default and pnpm 11 fails the install). Written to the generated
     * `pnpm-workspace.yaml` as `onlyBuiltDependencies` for pnpm users.
     */
    allowBuilds?: string[];
    readme?: Resolvable<ReadmeSection[]>;
    /** Commands printed under "Next steps", after the base `cd`/install/dev lines. */
    nextSteps?: (ctx: LayerContext) => string[];
    /**
     * Runs once every layer's files are in the tree, before the managed
     * files are rendered — for a kind that needs a file another layer
     * contributed somewhere else (SSG's stylesheet path, say).
     */
    finalize?: (tree: VirtualFileTree, ctx: LayerContext) => void;
}

export function resolveFragment<T>(value: Resolvable<T> | undefined, ctx: LayerContext): T | undefined {
    return typeof value === 'function' ? (value as (ctx: LayerContext) => T)(ctx) : value;
}
