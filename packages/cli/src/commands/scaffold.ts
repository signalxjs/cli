/**
 * Pure scaffolding helpers shared by the interactive and headless `create`
 * paths — template copy with `{{projectName}}` substitution, gitignore
 * rename, binary-safe asset copy, and workspace dependency patching.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ProjectType = 'basic' | 'ssr' | 'ssg' | 'lynx';
export type Styling = 'none' | 'tailwind' | 'daisyui';

export const projectTypeOptions = [
    { value: 'basic' as ProjectType, label: 'Basic SPA', description: 'Simple single-page application (web)' },
    { value: 'ssr' as ProjectType, label: 'SSR', description: 'Server-side rendering with Express (web)' },
    { value: 'ssg' as ProjectType, label: 'SSG', description: 'Static site with file-based routing & MDX (web)' },
    { value: 'lynx' as ProjectType, label: 'Lynx', description: 'Native mobile app with Lynx runtime' },
];

export const webStylingOptions = [
    { value: 'none' as Styling, label: 'None', description: 'No CSS framework' },
    { value: 'tailwind' as Styling, label: 'Tailwind CSS', description: 'Utility-first CSS framework' },
    { value: 'daisyui' as Styling, label: 'Tailwind + Daisy UI', description: 'Tailwind with component library' },
];

export const lynxStylingOptions = [
    { value: 'none' as Styling, label: 'None', description: 'No CSS framework' },
    { value: 'tailwind' as Styling, label: 'Tailwind CSS', description: 'Tailwind with Lynx preset' },
    { value: 'daisyui' as Styling, label: 'Tailwind + Daisy UI', description: 'Lynx + @sigx/lynx-daisyui components' },
];

const TEXT_EXTS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
    'json', 'json5', 'jsonc',
    'md', 'mdx', 'txt',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'yml', 'yaml', 'toml', 'xml', 'svg',
    'gitignore', 'gitattributes', 'editorconfig', 'npmrc', 'nvmrc', 'env',
]);

export function isTextExtension(filename: string): boolean {
    // Dotfiles: name after leading dot (.gitignore → "gitignore").
    const ext = filename.startsWith('.')
        ? filename.slice(1).toLowerCase()
        : filename.split('.').pop()?.toLowerCase() ?? '';
    return TEXT_EXTS.has(ext);
}

export function copyDirectory(src: string, dest: string, projectName: string) {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);
    for (const entry of entries) {
        const srcPath = join(src, entry);
        // Templates ship `gitignore` (no leading dot) because npm strips
        // `.gitignore` from the published tarball. Rename on copy so the
        // generated project has a real `.gitignore`.
        const destName = entry === 'gitignore' ? '.gitignore' : entry;
        const destPath = join(dest, destName);
        const stat = statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath, projectName);
        } else if (isTextExtension(entry)) {
            let content = readFileSync(srcPath, 'utf-8');
            content = content.replace(/\{\{projectName\}\}/g, projectName);
            writeFileSync(destPath, content);
        } else {
            // Binary asset — copy bytes verbatim. Reading as UTF-8 would corrupt
            // non-ASCII bytes (e.g. PNG magic 0x89 → U+FFFD).
            writeFileSync(destPath, readFileSync(srcPath));
        }
    }
}

/**
 * Detect if the target directory is inside a pnpm workspace that includes @sigx packages.
 * If so, rewrite @sigx/* dependency versions to workspace:* in package.json.
 */
export function patchWorkspaceDeps(targetDir: string) {
    const pkgPath = join(targetDir, 'package.json');
    if (!existsSync(pkgPath)) return;

    // Walk up to find pnpm-workspace.yaml
    let dir = dirname(targetDir);
    let isWorkspace = false;
    for (let i = 0; i < 10; i++) {
        if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
            isWorkspace = true;
            break;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    if (!isWorkspace) return;

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

export function scaffoldProject(opts: {
    projectName: string;
    projectType: ProjectType;
    styling: Styling;
}): { ok: true } | { ok: false; error: string } {
    const targetDir = resolve(process.cwd(), opts.projectName);
    let templateName: string;
    if (opts.projectType === 'lynx') {
        templateName = opts.styling !== 'none' ? `lynx-${opts.styling}` : 'lynx';
    } else {
        templateName = opts.styling !== 'none' ? `${opts.projectType}-${opts.styling}` : opts.projectType;
    }
    const templateDir = resolve(__dirname, '..', 'templates', templateName);
    if (existsSync(targetDir)) return { ok: false, error: `Directory "${opts.projectName}" already exists!` };
    if (!existsSync(templateDir)) return { ok: false, error: `Template "${templateName}" not found at ${templateDir}` };
    copyDirectory(templateDir, targetDir, opts.projectName);
    patchWorkspaceDeps(targetDir);
    return { ok: true };
}
