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

    it('rejects render modes, targets and features that are not available yet', () => {
        expect(() => compose({ kind: 'ssr', render: 'resume' })).toThrow(/not available yet/);
        expect(() => compose({ kind: 'ssr', target: 'cloudflare' })).toThrow(/not available yet/);
        expect(() => compose({ kind: 'spa', features: ['router'] })).toThrow(/not available yet/);
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
