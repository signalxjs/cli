/**
 * `composeProject(spec)` — the pure heart of `sigx create`: resolve the
 * layers a spec needs, fold their overlays and fragments into one virtual
 * file tree, and render the managed files last. No disk writes; the caller
 * decides where the tree lands (`writeTree`).
 */
import { join } from 'node:path';
import type { Layer, LayerContext, ReadmeSection } from './layer.js';
import { resolveFragment } from './layer.js';
import { layersFor } from './layers/index.js';
import { pmCommands } from './postinstall/pm.js';
import type { ProjectSpec } from './spec.js';
import { readOverlay, templatesRoot, type VirtualFileTree } from './tree.js';
import { PackageJsonBuilder } from './builders/package-json.js';
import { ViteConfigBuilder } from './builders/vite-config.js';
import { TsconfigBuilder } from './builders/tsconfig.js';
import { ReadmeBuilder } from './builders/readme.js';

/** Files only the builders may produce (for non-raw layers). */
export const MANAGED_FILES: ReadonlySet<string> = new Set([
    'package.json',
    'pnpm-workspace.yaml',
    'vite.config.ts',
    'tsconfig.json',
    'src/env.d.ts',
    '.gitignore',
    'README.md',
]);

export interface ComposeOptions {
    /** Override the shipped `templates/` directory (tests). */
    templatesRoot?: string;
}

export interface ComposedProject {
    tree: VirtualFileTree;
    layers: string[];
    nextSteps: string[];
}

/**
 * The names `@sigx:if` markers can test: kind, render, target, styling-<x>,
 * each feature, and two derived ones — `server-fns` (the build carries a
 * server-function registry: resumable pages, the server-fn feature, actors)
 * and `fetch-entry` (the target runs a WinterCG `{ fetch }` entry).
 */
export function conditionsFor(spec: ProjectSpec): Set<string> {
    const set = new Set<string>([spec.kind, `styling-${spec.styling}`, ...spec.features]);
    if (spec.render) set.add(spec.render);
    if (spec.target) set.add(spec.target);
    if (spec.render === 'resume' || spec.features.has('server-fn') || spec.features.has('actors')) set.add('server-fns');
    return set;
}

export function composeProject(spec: ProjectSpec, opts: ComposeOptions = {}): ComposedProject {
    const root = opts.templatesRoot ?? templatesRoot();
    const layers = layersFor(spec);
    const ctx: LayerContext = { spec, pm: pmCommands(spec.pm) };
    const conditions = conditionsFor(spec);

    const tree: VirtualFileTree = new Map();
    const pkg = new PackageJsonBuilder(spec.name);
    const vite = new ViteConfigBuilder();
    const ts = new TsconfigBuilder();
    const readme = new ReadmeBuilder(ctx);
    const envTypes: string[] = [];
    const gitignore: Array<{ layer: string; lines: string[] }> = [];
    const allowBuilds: string[] = [];
    const nextSteps: string[] = [];
    const raw = layers.some((l) => l.raw);

    for (const layer of layers) {
        applyOverlay(tree, layer, root, spec.name, conditions);
        for (const [path, content] of Object.entries(layer.files?.(ctx) ?? {})) tree.set(path, content);
        pkg.merge(resolveFragment(layer.packageJson, ctx));
        vite.merge(resolveFragment(layer.vite, ctx));
        ts.merge(layer.tsconfig);
        for (const line of layer.envTypes ?? []) if (!envTypes.includes(line)) envTypes.push(line);
        if (layer.gitignore?.length) gitignore.push({ layer: layer.name, lines: layer.gitignore });
        for (const b of layer.allowBuilds ?? []) if (!allowBuilds.includes(b)) allowBuilds.push(b);
        readme.add(resolveFragment<ReadmeSection[]>(layer.readme, ctx));
        nextSteps.push(...(layer.nextSteps?.(ctx) ?? []));
    }

    for (const layer of layers) layer.finalize?.(tree, ctx);

    if (!raw) {
        tree.set('package.json', pkg.render());
        if (vite.hasContent()) tree.set('vite.config.ts', vite.render());
        tree.set('tsconfig.json', ts.render());
        if (envTypes.length) tree.set('src/env.d.ts', renderEnvTypes(envTypes));
        tree.set('.gitignore', renderGitignore(gitignore));
        if (spec.pm === 'pnpm' && allowBuilds.length) {
            tree.set('pnpm-workspace.yaml', renderPnpmWorkspace(allowBuilds));
        }
        tree.set('README.md', readme.render({ has: (n) => pkg.hasScript(n) }));
    }

    return { tree, layers: layers.map((l) => l.name), nextSteps };
}

function applyOverlay(tree: VirtualFileTree, layer: Layer, root: string, projectName: string, conditions: Set<string>): void {
    const overlays = typeof layer.overlay === 'string' ? [layer.overlay] : (layer.overlay ?? []);
    for (const dir of overlays) {
        const overlay = readOverlay(join(root, ...dir.split('/')), { projectName, conditions });
        for (const [path, content] of overlay) {
            if (!layer.raw && MANAGED_FILES.has(path)) {
                throw new Error(`[sigx create] overlay "${dir}" ships managed file ${path}; contribute a fragment instead`);
            }
            tree.set(path, content);
        }
    }
}

function renderEnvTypes(lines: string[]): string {
    const refs = lines.filter((l) => l.startsWith('///'));
    const rest = lines.filter((l) => !l.startsWith('///'));
    return [...refs, ...(rest.length ? ['', ...rest] : [])].join('\n') + '\n';
}

function renderPnpmWorkspace(allowBuilds: string[]): string {
    return [
        '# pnpm settings for this project (a single-package "workspace").',
        '# Dependencies allowed to run install scripts — pnpm ignores them otherwise',
        '# (and pnpm 11 fails the install). Both spellings: pnpm 11 reads allowBuilds,',
        '# older pnpm 10 reads onlyBuiltDependencies.',
        'allowBuilds:',
        ...allowBuilds.map((b) => `  ${b}: true`),
        'onlyBuiltDependencies:',
        ...allowBuilds.map((b) => `  - ${b}`),
        '',
    ].join('\n');
}

function renderGitignore(sections: Array<{ layer: string; lines: string[] }>): string {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const { layer, lines } of sections) {
        const fresh = lines.filter((l) => !seen.has(l));
        if (!fresh.length) continue;
        fresh.forEach((l) => seen.add(l));
        if (out.length) out.push('');
        out.push(`# ${layer}`, ...fresh);
    }
    return out.join('\n') + '\n';
}
