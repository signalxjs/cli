/**
 * The write side of `sigx create`: `scaffoldSpec` validates a `ProjectSpec`
 * (built by src/create/headless.ts or the wizard), composes it
 * (src/create/compose.ts), writes the tree, and patches `@sigx/*` deps to
 * `workspace:*` when scaffolding inside a pnpm workspace.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { composeProject } from '../create/compose.js';
import { validateSpec, type ProjectSpec } from '../create/spec.js';
import { readOverlay, writeTree } from '../create/tree.js';

export { isTextExtension } from '../create/tree.js';

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

/** Write a validated spec to `<cwd>/<name>`. */
export function scaffoldSpec(spec: ProjectSpec): ScaffoldResult {
    const problems = validateSpec(spec);
    if (problems.length) return { ok: false, error: problems.join('; ') };

    const targetDir = resolve(process.cwd(), spec.name);
    if (existsSync(targetDir)) return { ok: false, error: `Directory "${spec.name}" already exists!` };

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
