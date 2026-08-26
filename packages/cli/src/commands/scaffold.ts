/**
 * Scaffolding entry points shared by the interactive and headless `create`
 * paths. The real work is `composeProject` (src/create/compose.ts): this
 * module maps the command's `--type`/`--styling` vocabulary onto a
 * `ProjectSpec`, writes the composed tree, and patches `@sigx/*` deps to
 * `workspace:*` when scaffolding inside a pnpm workspace.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { composeProject } from '../create/compose.js';
import {
    LEGACY_TYPE_MAP,
    lynxStylingOptions,
    normalizeSpec,
    validateSpec,
    webStylingOptions,
    type Kind,
    type Option,
    type Styling,
} from '../create/spec.js';
import { readOverlay, writeTree } from '../create/tree.js';

export { isTextExtension } from '../create/tree.js';
export { webStylingOptions, lynxStylingOptions };
export type { Styling };

/** The `--type` vocabulary (`basic` is the pre-0.11 name for `spa`). */
export type ProjectType = 'basic' | 'ssr' | 'ssg' | 'terminal' | 'lynx';

export const projectTypeOptions: Option<ProjectType>[] = [
    { value: 'basic', label: 'Web app (SPA)', description: 'Client-rendered single-page app on Vite' },
    { value: 'ssr', label: 'Web app (SSR)', description: 'Server-rendered with Express, streaming + hydration' },
    { value: 'ssg', label: 'Static site (SSG)', description: 'File-based routing, MDX, built-in search' },
    { value: 'terminal', label: 'Terminal app (TUI)', description: 'Text UI with TSX + signals, HMR dev runner' },
    { value: 'lynx', label: 'Native mobile (Lynx)', description: 'iOS & Android from one component tree' },
];

/** Copy a template folder to `dest` with `{{projectName}}` substitution and `gitignore` → `.gitignore`. */
export function copyDirectory(src: string, dest: string, projectName: string): void {
    writeTree(readOverlay(src, { projectName }), dest);
}

/** True when an ancestor of `dir` (not `dir` itself) has a pnpm-workspace.yaml. */
export function insidePnpmWorkspace(dir: string): boolean {
    let current = dirname(dir);
    for (let i = 0; i < 10; i++) {
        if (existsSync(join(current, 'pnpm-workspace.yaml'))) return true;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return false;
}

/**
 * Detect if the target directory is inside a pnpm workspace that includes @sigx packages.
 * If so, rewrite @sigx/* dependency versions to workspace:* in package.json.
 */
export function patchWorkspaceDeps(targetDir: string) {
    const pkgPath = join(targetDir, 'package.json');
    if (!existsSync(pkgPath)) return;
    if (!insidePnpmWorkspace(targetDir)) return;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    for (const section of ['dependencies', 'devDependencies'] as const) {
        if (!pkg[section]) continue;
        for (const dep of Object.keys(pkg[section])) {
            if (dep.startsWith('@sigx/')) {
                pkg[section][dep] = 'workspace:*';
            }
        }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
}

export type ScaffoldResult =
    | { ok: true; files: number; nextSteps: string[] }
    | { ok: false; error: string };

export function scaffoldProject(opts: {
    projectName: string;
    projectType: ProjectType;
    styling: Styling;
}): ScaffoldResult {
    const kind: Kind | undefined = LEGACY_TYPE_MAP[opts.projectType];
    if (!kind) return { ok: false, error: `Unknown project type "${opts.projectType}"` };
    const spec = normalizeSpec({ name: opts.projectName, kind, styling: opts.styling });
    const problems = validateSpec(spec);
    if (problems.length) return { ok: false, error: problems.join('; ') };

    const targetDir = resolve(process.cwd(), opts.projectName);
    if (existsSync(targetDir)) return { ok: false, error: `Directory "${opts.projectName}" already exists!` };

    let composed;
    try {
        composed = composeProject(spec);
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    // Inside an existing workspace the parent owns pnpm settings — a nested
    // pnpm-workspace.yaml would make the new project its own workspace root.
    if (insidePnpmWorkspace(targetDir)) composed.tree.delete('pnpm-workspace.yaml');
    const files = writeTree(composed.tree, targetDir);
    patchWorkspaceDeps(targetDir);
    return { ok: true, files, nextSteps: composed.nextSteps };
}
