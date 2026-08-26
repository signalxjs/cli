/**
 * The virtual file tree a composed project is built in — a Map from
 * posix-style relative path to content — plus the two ways files get into
 * it (overlay folders, generated strings) and the one way it leaves
 * (`writeTree`). Composition never touches the disk, so every combination
 * is snapshot-testable and identical on Windows and POSIX.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type FileContent = string | Uint8Array;
export type VirtualFileTree = Map<string, FileContent>;

const TEXT_EXTS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
    'json', 'json5', 'jsonc',
    'md', 'mdx', 'txt',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'yml', 'yaml', 'toml', 'xml', 'svg',
    'gitignore', 'gitattributes', 'editorconfig', 'npmrc', 'nvmrc', 'env',
]);

/** Text files get `{{projectName}}` substitution and conditionals; anything else is copied byte-for-byte. */
export function isTextExtension(filename: string): boolean {
    // Dotfiles: name after leading dot (.gitignore → "gitignore").
    const ext = filename.startsWith('.')
        ? filename.slice(1).toLowerCase()
        : filename.split('.').pop()?.toLowerCase() ?? '';
    return TEXT_EXTS.has(ext);
}

export function toPosix(path: string): string {
    return path.split(sep).join('/');
}

export function substitute(content: string, projectName: string): string {
    return content.replace(/\{\{projectName\}\}/g, projectName);
}

/**
 * Conditional blocks inside overlay files:
 *
 *     // @sigx:if server-fn
 *     …kept only when "server-fn" is an active condition…
 *     // @sigx:endif
 *
 * `!name` negates. The marker may sit behind `//`, `#`, `<!-- -->` or
 * `/* *\/` so the overlay stays a valid file of its type (and typechecks in
 * this repo). Blocks nest. Marker lines are always removed.
 */
const MARKER = /^[ \t]*(?:\/\/|#|<!--|\/\*)\s*@sigx:(if\s+(!?)([\w:-]+)|endif)\s*(?:-->|\*\/)?[ \t]*$/;

export function applyConditionals(content: string, conditions: ReadonlySet<string>): string {
    const out: string[] = [];
    // Stack of "currently emitting" flags; a block emits only when all enclosing blocks do.
    const stack: boolean[] = [];
    for (const line of content.split('\n')) {
        const m = MARKER.exec(line.replace(/\r$/, ''));
        if (m) {
            if (m[1] === 'endif') {
                if (!stack.length) throw new Error('[sigx create] @sigx:endif without @sigx:if');
                stack.pop();
            } else {
                const active = conditions.has(m[3]) !== (m[2] === '!');
                stack.push((stack.length ? stack[stack.length - 1] : true) && active);
            }
            continue;
        }
        if (!stack.length || stack[stack.length - 1]) out.push(line);
    }
    if (stack.length) throw new Error('[sigx create] unterminated @sigx:if block');
    return out.join('\n');
}

export interface OverlayOptions {
    projectName: string;
    conditions?: ReadonlySet<string>;
}

/**
 * Read a template overlay folder into a tree. Templates ship `gitignore`
 * (no leading dot) because npm strips `.gitignore` from published tarballs;
 * it is renamed here so the generated project has a real `.gitignore`.
 */
export function readOverlay(dir: string, opts: OverlayOptions): VirtualFileTree {
    const tree: VirtualFileTree = new Map();
    const conditions = opts.conditions ?? new Set<string>();
    const walk = (abs: string, rel: string) => {
        for (const entry of readdirSync(abs).sort()) {
            const srcPath = join(abs, entry);
            const destName = entry === 'gitignore' ? '.gitignore' : entry;
            const relPath = rel ? `${rel}/${destName}` : destName;
            if (statSync(srcPath).isDirectory()) {
                walk(srcPath, relPath);
            } else if (isTextExtension(entry)) {
                const raw = readFileSync(srcPath, 'utf-8');
                tree.set(relPath, applyConditionals(substitute(raw, opts.projectName), conditions));
            } else {
                // Binary asset — bytes verbatim. Reading as UTF-8 would corrupt
                // non-ASCII bytes (e.g. PNG magic 0x89 → U+FFFD).
                tree.set(relPath, readFileSync(srcPath));
            }
        }
    };
    walk(dir, '');
    return tree;
}

/** Write a tree under `dir`, creating directories as needed. Returns the file count. */
export function writeTree(tree: VirtualFileTree, dir: string): number {
    const paths = [...tree.keys()].sort();
    for (const rel of paths) {
        const dest = resolve(dir, ...rel.split('/'));
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, tree.get(rel)!);
    }
    return paths.length;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The shipped `templates/` directory. The bundle may place this module in
 * `dist/`, `dist/commands/` or a shared chunk directory, so walk up until
 * the folder appears.
 */
export function templatesRoot(): string {
    let dir = __dirname;
    for (let i = 0; i < 4; i++) {
        const candidate = join(dir, 'templates');
        if (existsSync(candidate)) return candidate;
        dir = dirname(dir);
    }
    throw new Error(`[sigx create] templates directory not found near ${__dirname}`);
}
