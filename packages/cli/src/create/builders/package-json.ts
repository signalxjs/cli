/**
 * Merges package.json fragments in layer order and renders the result with
 * a stable shape: scripts in a conventional order, `sigx` first among
 * dependencies, `@sigx/*` next, the rest alphabetical. Two layers asking for
 * the same dependency with different ranges is a bug in the layers, so it
 * throws instead of letting one silently win.
 */
import type { PackageJsonFragment } from '../layer.js';

const SCRIPT_ORDER = ['dev', 'build', 'start', 'preview', 'deploy', 'test', 'test:watch', 'lint', 'lint:fix', 'typecheck'];

function scriptRank(name: string): number {
    const i = SCRIPT_ORDER.indexOf(name);
    if (i !== -1) return i * 10;
    // `build:cloudflare` sorts right after `build`.
    const base = name.split(':')[0];
    const j = SCRIPT_ORDER.indexOf(base);
    return j !== -1 ? j * 10 + 5 : SCRIPT_ORDER.length * 10;
}

function depRank(name: string): [number, string] {
    if (name === 'sigx') return [0, name];
    if (name.startsWith('@sigx/')) return [1, name];
    return [2, name];
}

function sortDeps(deps: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(deps).sort(([a], [b]) => {
            const [ra, na] = depRank(a);
            const [rb, nb] = depRank(b);
            return ra - rb || na.localeCompare(nb);
        }),
    );
}

export class PackageJsonBuilder {
    private scripts: Record<string, string> = {};
    private dependencies: Record<string, string> = {};
    private devDependencies: Record<string, string> = {};
    private extra: Record<string, unknown> = {};

    constructor(private readonly name: string) {}

    merge(fragment: PackageJsonFragment | undefined): void {
        if (!fragment) return;
        Object.assign(this.scripts, fragment.scripts);
        this.mergeDeps(this.dependencies, fragment.dependencies, 'dependencies');
        this.mergeDeps(this.devDependencies, fragment.devDependencies, 'devDependencies');
        Object.assign(this.extra, fragment.extra);
    }

    private mergeDeps(into: Record<string, string>, from: Record<string, string> | undefined, section: string): void {
        for (const [dep, range] of Object.entries(from ?? {})) {
            const existing = this.dependencies[dep] ?? this.devDependencies[dep];
            if (existing && existing !== range) {
                throw new Error(`[sigx create] conflicting ranges for ${dep}: "${existing}" vs "${range}" (${section})`);
            }
            // A dependency declared as both runtime and dev stays runtime.
            if (section === 'devDependencies' && this.dependencies[dep]) continue;
            if (section === 'dependencies') delete this.devDependencies[dep];
            into[dep] = range;
        }
    }

    hasScript(name: string): boolean {
        return name in this.scripts;
    }

    toJSON(): Record<string, unknown> {
        const scripts = Object.fromEntries(
            Object.entries(this.scripts).sort(([a], [b]) => scriptRank(a) - scriptRank(b)),
        );
        return {
            name: this.name,
            version: '0.1.0',
            private: true,
            type: 'module',
            scripts,
            dependencies: sortDeps(this.dependencies),
            devDependencies: sortDeps(this.devDependencies),
            ...this.extra,
        };
    }

    render(): string {
        return JSON.stringify(this.toJSON(), null, 4) + '\n';
    }
}
