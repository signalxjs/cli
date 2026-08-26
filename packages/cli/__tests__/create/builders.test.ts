import { describe, it, expect } from 'vitest';
import { PackageJsonBuilder } from '../../src/create/builders/package-json.js';
import { ViteConfigBuilder } from '../../src/create/builders/vite-config.js';
import { TsconfigBuilder } from '../../src/create/builders/tsconfig.js';

describe('PackageJsonBuilder', () => {
    it('orders scripts conventionally and sorts deps sigx → @sigx/* → others', () => {
        const b = new PackageJsonBuilder('demo');
        b.merge({ scripts: { test: 'vitest', build: 'vite build', 'build:cf': 'x', dev: 'vite' } });
        b.merge({ dependencies: { express: '^5', '@sigx/server-renderer': '^0.15.0', sigx: '^0.15.0' } });
        b.merge({ devDependencies: { vite: '^8', '@sigx/vite': '^0.15.0' } });
        const json = b.toJSON() as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
        expect(Object.keys(json.scripts)).toEqual(['dev', 'build', 'build:cf', 'test']);
        expect(Object.keys(json.dependencies)).toEqual(['sigx', '@sigx/server-renderer', 'express']);
        expect(Object.keys(json.devDependencies)).toEqual(['@sigx/vite', 'vite']);
        expect(b.render().endsWith('}\n')).toBe(true);
    });

    it('later scripts win, runtime beats dev, conflicting ranges throw', () => {
        const b = new PackageJsonBuilder('demo');
        b.merge({ scripts: { dev: 'a' }, devDependencies: { vite: '^8' } });
        b.merge({ scripts: { dev: 'b' }, dependencies: { vite: '^8' } });
        const json = b.toJSON() as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
        expect(json.scripts.dev).toBe('b');
        expect(json.dependencies.vite).toBe('^8');
        expect(json.devDependencies.vite).toBeUndefined();
        expect(() => b.merge({ dependencies: { vite: '^9' } })).toThrow(/conflicting ranges for vite/);
    });
});

describe('ViteConfigBuilder', () => {
    it('renders the object form for a SPA', () => {
        const b = new ViteConfigBuilder();
        b.merge({ plugins: [{ name: 'sigx', from: '@sigx/vite', order: 0 }] });
        b.merge({ plugins: [{ name: 'tailwindcss', from: '@tailwindcss/vite', order: 50 }] });
        const out = b.render();
        expect(out).toContain("import sigx from '@sigx/vite';");
        expect(out).toContain('export default defineConfig({');
        expect(out).toMatch(/plugins: \[\n\s+sigx\(\),\n\s+tailwindcss\(\)\n\s+\]/);
        expect(out).toContain("importSource: 'sigx'");
    });

    it('renders the function form with SIGX_FAMILY and ssr options for SSR', () => {
        const b = new ViteConfigBuilder();
        b.merge({
            plugins: [{ name: 'sigx', from: '@sigx/vite', order: 0 }],
            ssr: { entry: `'src/entry-server.tsx'` },
            family: ['sigx', '@sigx/server-renderer'],
        });
        b.merge({ ssr: { adapter: 'cloudflare()' }, plugins: [{ name: 'cloudflare', from: '@sigx/cloudflare', importKind: 'named', order: 5, call: '' }] });
        const out = b.render();
        expect(out).toContain('export default defineConfig(({ command }) => ({');
        expect(out).toContain("const SIGX_FAMILY = ['sigx', '@sigx/server-renderer'];");
        expect(out).toContain("sigx({ ssr: { entry: 'src/entry-server.tsx', adapter: cloudflare() } })");
        expect(out).toContain("...(command === 'serve' && {\n        ssr: { external: SIGX_FAMILY }\n    })");
        expect(out).toContain("import { cloudflare } from '@sigx/cloudflare';");
    });

    it('sorts plugins by order regardless of merge order', () => {
        const b = new ViteConfigBuilder();
        b.merge({ plugins: [{ name: 'tailwindcss', from: '@tailwindcss/vite', order: 50 }] });
        b.merge({ plugins: [{ name: 'sigx', from: '@sigx/vite', order: 0 }] });
        expect(b.render().indexOf('sigx()')).toBeLessThan(b.render().indexOf('tailwindcss()'));
    });
});

describe('TsconfigBuilder', () => {
    it('deep-merges compilerOptions and unions include/types', () => {
        const b = new TsconfigBuilder();
        b.merge({ types: ['vite/client'] });
        b.merge({ compilerOptions: { jsxImportSource: '@sigx/terminal' }, types: ['node', 'vite/client'], include: ['src', 'test'] });
        const json = JSON.parse(b.render());
        expect(json.compilerOptions.jsxImportSource).toBe('@sigx/terminal');
        expect(json.compilerOptions.strict).toBe(true);
        expect(json.compilerOptions.types).toEqual(['vite/client', 'node']);
        expect(json.include).toEqual(['src', 'test']);
    });
});
