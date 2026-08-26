import { describe, it, expect } from 'vitest';
import { hasSpecFlags, renderList, resolveKind, specFromOptions } from '../../src/create/headless.js';

const defaults = { name: 'my-sigx-app', pm: 'pnpm' as const, install: false, git: false };

describe('resolveKind', () => {
    it('maps --type, prefers --kind, rejects disagreement', () => {
        expect(resolveKind({ type: 'basic' })).toEqual({ kind: 'spa' });
        expect(resolveKind({ kind: 'ssr' })).toEqual({ kind: 'ssr' });
        expect(resolveKind({ kind: 'ssr', type: 'ssr' })).toEqual({ kind: 'ssr' });
        expect(resolveKind({ kind: 'spa', type: 'ssr' }).error).toMatch(/disagree/);
        expect(resolveKind({ type: 'nope' }).error).toMatch(/--type must be one of/);
        expect(resolveKind({})).toEqual({ kind: undefined });
    });
});

describe('specFromOptions', () => {
    it('fills defaults from the environment', () => {
        const r = specFromOptions({}, defaults);
        expect(r.ok && r.spec).toMatchObject({ name: 'my-sigx-app', kind: 'spa', pm: 'pnpm', install: false, git: false });
    });

    it('applies the quick preset unless a flag overrides it', () => {
        const r = specFromOptions({ preset: 'quick', styling: 'daisyui' }, defaults);
        expect(r.ok && r.spec).toMatchObject({ kind: 'spa', styling: 'daisyui' });
        expect(r.ok && [...r.spec.features]).toEqual(['router', 'testing']);
        const r2 = specFromOptions({ preset: 'quick', features: 'testing' }, defaults);
        expect(r2.ok && [...r2.spec.features]).toEqual(['testing']);
        expect(specFromOptions({ preset: 'fast' }, defaults)).toMatchObject({ ok: false, errors: ['--preset must be "quick"'] });
    });

    it('validates every flag with the flag name in the message', () => {
        const bad = specFromOptions({ render: 'x' as never, target: 'y' as never, styling: 'z' as never, pm: 'w' as never, features: 'q' }, defaults);
        expect(bad.ok).toBe(false);
        if (!bad.ok) {
            expect(bad.errors.join('\n')).toMatch(/--render/);
            expect(bad.errors.join('\n')).toMatch(/--target/);
            expect(bad.errors.join('\n')).toMatch(/--styling/);
            expect(bad.errors.join('\n')).toMatch(/--pm/);
            expect(bad.errors.join('\n')).toMatch(/--features/);
        }
        expect(specFromOptions({ kind: 'spa', render: 'islands' }, defaults)).toMatchObject({ ok: false, errors: ['--render and --target apply to --kind ssr only'] });
        expect(specFromOptions({ kind: 'terminal', styling: 'tailwind' }, defaults).ok).toBe(true); // forced to none
    });

    it('honours --install/--git over the defaults', () => {
        const r = specFromOptions({ install: true, git: false }, { ...defaults, git: true });
        expect(r.ok && r.spec).toMatchObject({ install: true, git: false });
    });
});

describe('hasSpecFlags / renderList', () => {
    it('counts only flags that shape the project', () => {
        expect(hasSpecFlags({ name: 'x', pm: 'npm', install: true })).toBe(false);
        expect(hasSpecFlags({ features: 'router' })).toBe(true);
        expect(hasSpecFlags({ type: 'basic' })).toBe(true);
    });

    it('lists everything this build can generate', () => {
        const out = renderList();
        for (const s of ['spa', 'ssr', 'terminal', 'lynx', 'islands', 'resume', 'cloudflare', 'netlify', 'daisyui', 'router', 'server-fn', '--no-install', 'quick']) {
            expect(out).toContain(s);
        }
        expect(out).not.toContain('actors');
    });
});
