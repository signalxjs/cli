/**
 * The spec matrix: every combination the generator supports, composed to a
 * virtual tree and snapshotted. Snapshots replace the catalog's core range
 * with `<core>` so `pnpm sync:core` does not churn them; the versions-vs-
 * catalog rule itself lives in versions.test.ts.
 *
 * Beyond the snapshot, each tree is checked for the things that used to rot
 * silently in static templates (#50, #91): no leaked placeholders or
 * conditional markers, a parseable package.json whose scripts only run
 * files the tree ships, and local imports that resolve inside the tree.
 */
import { describe, it, expect } from 'vitest';
import { composeProject } from '../../src/create/compose.js';
import { normalizeSpec, type SpecInput } from '../../src/create/spec.js';
import { SIGX_CORE } from '../../src/create/versions.js';

const MATRIX: Array<[string, Omit<SpecInput, 'name'>]> = [
    ['spa', { kind: 'spa' }],
    ['spa-tailwind', { kind: 'spa', styling: 'tailwind' }],
    ['spa-daisyui-npm', { kind: 'spa', styling: 'daisyui', pm: 'npm' }],
    ['ssr-node', { kind: 'ssr' }],
    ['ssr-node-tailwind-bun', { kind: 'ssr', styling: 'tailwind', pm: 'bun' }],
    ['ssr-node-daisyui', { kind: 'ssr', styling: 'daisyui' }],
    ['ssr-node-islands', { kind: 'ssr', render: 'islands' }],
    ['ssr-node-resume', { kind: 'ssr', render: 'resume' }],
    ['ssr-cloudflare', { kind: 'ssr', target: 'cloudflare' }],
    ['ssr-cloudflare-resume-tailwind', { kind: 'ssr', target: 'cloudflare', render: 'resume', styling: 'tailwind' }],
    ['ssr-bun-islands', { kind: 'ssr', target: 'bun', render: 'islands', pm: 'bun' }],
    ['ssr-bun-resume', { kind: 'ssr', target: 'bun', render: 'resume' }],
    ['ssr-deno', { kind: 'ssr', target: 'deno', pm: 'deno' }],
    ['ssr-deno-resume', { kind: 'ssr', target: 'deno', render: 'resume' }],
    ['ssr-vercel', { kind: 'ssr', target: 'vercel' }],
    ['ssr-vercel-edge-resume', { kind: 'ssr', target: 'vercel-edge', render: 'resume' }],
    ['ssr-netlify-islands', { kind: 'ssr', target: 'netlify', render: 'islands', pm: 'npm' }],
    ['ssg', { kind: 'ssg' }],
    ['ssg-daisyui-yarn', { kind: 'ssg', styling: 'daisyui', pm: 'yarn' }],
    ['terminal', { kind: 'terminal' }],
    ['lynx', { kind: 'lynx' }],
    ['lynx-tailwind', { kind: 'lynx', styling: 'tailwind' }],
];

function compose(input: Omit<SpecInput, 'name'>) {
    return composeProject(normalizeSpec({ name: 'my-app', ...input }));
}

function text(content: string | Uint8Array): string | null {
    return typeof content === 'string' ? content : null;
}

describe('composeProject', () => {
    describe.each(MATRIX)('%s', (_label, input) => {
        const { tree, layers } = compose(input);
        const files = [...tree.keys()].sort();

        it('matches the snapshot', () => {
            const snapshot = files.map((path) => {
                const content = tree.get(path)!;
                const body = typeof content === 'string'
                    ? content.split(SIGX_CORE).join('<core>')
                    : `<binary ${content.byteLength} bytes>`;
                return `==> ${path} <==\n${body}`;
            });
            expect({ layers, files: snapshot }).toMatchSnapshot();
        });

        it('leaks no placeholders or conditional markers', () => {
            for (const path of files) {
                const body = text(tree.get(path)!);
                if (body === null) continue;
                expect(body, path).not.toContain('{{projectName}}');
                expect(body, path).not.toMatch(/@sigx:(if|endif)/);
            }
        });

        it('writes a package.json whose scripts only run shipped files', () => {
            const pkg = JSON.parse(text(tree.get('package.json')!)!);
            expect(pkg.name).toBe('my-app');
            for (const [script, cmd] of Object.entries<string>(pkg.scripts ?? {})) {
                for (const match of cmd.matchAll(/(?:^|\s)node\s+(\S+\.[cm]?js)/g)) {
                    expect(tree.has(match[1]), `"${script}" runs ${match[1]}, not in tree`).toBe(true);
                }
            }
            for (const section of ['dependencies', 'devDependencies'] as const) {
                for (const [dep, range] of Object.entries<string>(pkg[section] ?? {})) {
                    expect(range, `${section}.${dep}`).toMatch(/^(?:[\^~]?\d|>=\d)/);
                }
            }
        });

        it('resolves every relative import inside the tree', () => {
            for (const path of files) {
                if (!/\.(tsx?|mjs|mdx)$/.test(path)) continue;
                const body = text(tree.get(path)!)!;
                const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
                for (const m of body.matchAll(/from\s+'(\.[^']*)'|import\s+'(\.[^']*)'|import\(\s*'(\.[^']*)'/g)) {
                    const spec = (m[1] ?? m[2] ?? m[3]).replace(/\.js$/, '');
                    if (spec.startsWith('./dist/')) continue; // build output
                    const target = normalize(dir, spec);
                    const candidates = [target, `${target}.ts`, `${target}.tsx`, `${target}.mdx`, `${target}/index.ts`];
                    expect(candidates.some((c) => tree.has(c)), `${path} imports ${spec}`).toBe(true);
                }
            }
        });
    });

    it('overrides earlier layers with later ones (styling replaces the kind stylesheet)', () => {
        const plain = text(compose({ kind: 'spa' }).tree.get('src/styles.css')!)!;
        const tailwind = text(compose({ kind: 'spa', styling: 'tailwind' }).tree.get('src/styles.css')!)!;
        expect(plain).not.toContain('@import "tailwindcss"');
        expect(tailwind).toContain('@import "tailwindcss"');
    });

    it('applies conditionals from the spec (daisyUI @source only with @sigx/daisyui)', () => {
        const spa = text(compose({ kind: 'spa', styling: 'daisyui' }).tree.get('src/styles.css')!)!;
        const ssg = text(compose({ kind: 'ssg', styling: 'daisyui' }).tree.get('src/styles/global.css')!)!;
        expect(spa).toContain('@source');
        expect(ssg).not.toContain('@source');
    });

    it('does not generate managed files for raw (lynx) overlays', () => {
        const { tree } = compose({ kind: 'lynx' });
        expect(text(tree.get('package.json')!)).toContain('@sigx/lynx');
        expect(tree.has('vite.config.ts')).toBe(false);
        expect(tree.has('README.md')).toBe(true); // shipped by the overlay itself
    });

    it('rejects features that are not available yet', () => {
        expect(() => compose({ kind: 'spa', features: ['router'] })).toThrow(/not available yet/);
    });

    it('wires server functions into every entry only when the build carries a registry', () => {
        const hydrate = text(compose({ kind: 'ssr', target: 'cloudflare' }).tree.get('src/entry.cloudflare.ts')!)!;
        const resume = text(compose({ kind: 'ssr', target: 'cloudflare', render: 'resume' }).tree.get('src/entry.cloudflare.ts')!)!;
        expect(hydrate).not.toContain('matchesServerFn');
        expect(hydrate).toContain("import { createApp } from './entry-server';");
        expect(resume).toContain('matchesServerFn(request, serverFnBase)');
        expect(resume).toContain('renderBoundaries');
        expect(resume).toContain("import { createApp, refreshComponents } from './entry-server';");
        expect(resume).not.toContain("import { createApp } from './entry-server';");

        const node = text(compose({ kind: 'ssr', render: 'resume' }).tree.get('server.mjs')!)!;
        expect(node).toContain('createServerFnHandler');
        expect(node).toContain('createBoundaryRefresh');
        expect(text(compose({ kind: 'ssr' }).tree.get('server.mjs')!)).not.toContain('createServerFnHandler');
    });

    it('renders the adapter into vite.config.ts and the platform config next to it', () => {
        const cf = compose({ kind: 'ssr', target: 'cloudflare' }).tree;
        expect(text(cf.get('vite.config.ts')!)).toContain("adapter: cloudflare()");
        expect(text(cf.get('vite.config.ts')!)).toContain("import { cloudflare } from '@sigx/cloudflare';");
        expect(text(cf.get('wrangler.jsonc')!)).toContain('"main": "dist/server/entry.cloudflare.js"');
        expect(text(cf.get('wrangler.jsonc')!)).toContain('"name": "my-app"');

        const edge = compose({ kind: 'ssr', target: 'vercel-edge' }).tree;
        expect(text(edge.get('vite.config.ts')!)).toContain("adapter: vercel({ runtime: 'edge' })");
        expect(text(compose({ kind: 'ssr', target: 'netlify' }).tree.get('netlify.toml')!)).toContain('publish = "dist/client"');
        expect(text(compose({ kind: 'ssr', target: 'deno' }).tree.get('deno.json')!)).toContain('"start"');
        expect(JSON.parse(text(compose({ kind: 'ssr', target: 'deno' }).tree.get('tsconfig.json')!)!).exclude).toEqual(['src/entry.deno.ts']);
        expect(JSON.parse(text(compose({ kind: 'ssr', target: 'bun' }).tree.get('tsconfig.json')!)!).include).not.toContain('server.bun.ts');
    });

    it('keeps express as a dev-only dependency on non-node targets', () => {
        const pkg = JSON.parse(text(compose({ kind: 'ssr', target: 'cloudflare' }).tree.get('package.json')!)!);
        expect(pkg.dependencies.express).toBeUndefined();
        expect(pkg.devDependencies.express).toBeDefined();
        expect(pkg.scripts.dev).toBe('node server.mjs');
        expect(pkg.scripts.deploy).toBe('wrangler deploy');
    });
});

function normalize(dir: string, spec: string): string {
    const parts = dir ? dir.split('/') : [];
    for (const seg of spec.split('/')) {
        if (seg === '.' || seg === '') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
    }
    return parts.join('/');
}

describe('pnpm build allow-list', () => {
    it('emits pnpm-workspace.yaml only for pnpm users of layers that need install scripts', () => {
        expect(compose({ kind: 'ssg' }).tree.get('pnpm-workspace.yaml')).toContain('esbuild: true');
        expect(compose({ kind: 'terminal' }).tree.has('pnpm-workspace.yaml')).toBe(true);
        expect(compose({ kind: 'ssg', pm: 'npm' }).tree.has('pnpm-workspace.yaml')).toBe(false);
        expect(compose({ kind: 'spa' }).tree.has('pnpm-workspace.yaml')).toBe(false);
    });
});
