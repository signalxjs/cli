import { describe, it, expect } from 'vitest';
import {
    describeSpec,
    featureSupported,
    LEGACY_TYPE_MAP,
    normalizeSpec,
    validateSpec,
} from '../../src/create/spec.js';

describe('normalizeSpec', () => {
    it('defaults to a plain pnpm SPA without install/git', () => {
        expect(normalizeSpec({ name: 'x' })).toEqual({
            name: 'x', kind: 'spa', styling: 'none', features: new Set(), pm: 'pnpm', install: false, git: false,
        });
    });

    it('adds render/target only for ssr', () => {
        expect(normalizeSpec({ name: 'x', kind: 'ssr' })).toMatchObject({ render: 'hydrate', target: 'node' });
        expect(normalizeSpec({ name: 'x', kind: 'spa', render: 'islands' })).not.toHaveProperty('render');
    });

    it('forces styling none for terminal apps', () => {
        expect(normalizeSpec({ name: 'x', kind: 'terminal', styling: 'tailwind' }).styling).toBe('none');
    });

    it('maps the legacy --type vocabulary', () => {
        expect(LEGACY_TYPE_MAP.basic).toBe('spa');
        expect(LEGACY_TYPE_MAP.lynx).toBe('lynx');
    });
});

describe('validateSpec', () => {
    it('accepts a normal spec', () => {
        expect(validateSpec(normalizeSpec({ name: 'my-app', kind: 'ssr', styling: 'tailwind' }))).toEqual([]);
    });

    it('rejects bad names', () => {
        expect(validateSpec(normalizeSpec({ name: '  ' }))).toContain('Project name is required');
        expect(validateSpec(normalizeSpec({ name: 'a/b' }))[0]).toMatch(/path separators/);
    });

    it('rejects features outside their support matrix', () => {
        expect(validateSpec(normalizeSpec({ name: 'x', kind: 'ssg', features: ['router'] }))[0]).toMatch(/"router" is not available for ssg/);
        expect(validateSpec(normalizeSpec({ name: 'x', kind: 'ssr', target: 'vercel-edge', features: ['actors'] }))[0])
            .toMatch(/"actors" is not available for ssr on vercel-edge/);
        expect(validateSpec(normalizeSpec({ name: 'x', kind: 'spa', features: ['nope' as never] }))[0]).toMatch(/unknown feature/);
    });

    it('rejects render/target on non-ssr kinds', () => {
        const spec = { ...normalizeSpec({ name: 'x', kind: 'spa' }), target: 'cloudflare' as const };
        expect(validateSpec(spec)).toContain('deploy target only applies to SSR projects');
    });
});

describe('featureSupported / describeSpec', () => {
    it('checks kind and target', () => {
        expect(featureSupported('server-fn', { kind: 'ssr', target: 'netlify' })).toBe(true);
        expect(featureSupported('server-fn', { kind: 'spa' })).toBe(false);
        expect(featureSupported('actors', { kind: 'ssr', target: 'deno' })).toBe(false);
        expect(featureSupported('actors', { kind: 'spa' })).toBe(true);
    });

    it('describes a spec in one line', () => {
        expect(describeSpec(normalizeSpec({ name: 'x', kind: 'ssr', styling: 'daisyui', features: ['router'] })))
            .toBe('ssr + hydrate + node + daisyui + router');
    });
});
