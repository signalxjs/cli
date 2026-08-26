/**
 * The #91 guard: generated projects pin the same @sigx set the catalog
 * does. Static templates drifted several minors behind and a scaffolded app
 * resolved two copies of @sigx/reactivity; now versions.ts is generated from
 * the catalog and this test fails if either side moves without the other.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeProject } from '../../src/create/compose.js';
import { dep } from '../../src/create/deps.js';
import { normalizeSpec } from '../../src/create/spec.js';
import { SIGX_CLI, SIGX_COMPANIONS, SIGX_CORE, SIGX_CORE_PACKAGES } from '../../src/create/versions.js';
// The same parser the guard and the generator use, so the three cannot disagree.
// @ts-expect-error — plain ESM script, no declarations.
import { readCatalog } from '../../../../scripts/lib/catalog.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

describe('versions', () => {
    const catalog: Record<string, string> = readCatalog(repoRoot);

    it('SIGX_CORE is the catalog core line', () => {
        expect(SIGX_CORE).toBe(catalog['@sigx/vite']);
        expect(SIGX_CORE).toMatch(/^\^\d+\.\d+\.0$/);
    });

    it('companions mirror the catalog', () => {
        for (const [name, range] of Object.entries(SIGX_COMPANIONS)) {
            expect(catalog[name], name).toBe(range);
        }
    });

    it('SIGX_CLI is this package\'s single-minor range', () => {
        const pkg = JSON.parse(readFileSync(join(repoRoot, 'packages', 'cli', 'package.json'), 'utf8'));
        const [major, minor] = pkg.version.split('.');
        expect(SIGX_CLI).toBe(`^${major}.${minor}.0`);
    });

    it('versions.ts is not stale (gen-versions --check)', () => {
        expect(() =>
            execFileSync(process.execPath, [join(repoRoot, 'scripts', 'gen-versions.mjs'), '--check'], { stdio: 'pipe' }),
        ).not.toThrow();
    });

    it('dep() throws for unknown packages instead of returning undefined', () => {
        expect(() => dep('left-pad')).toThrow(/no pinned version/);
    });

    it.each([
        ['spa', { kind: 'spa' as const }],
        ['ssr', { kind: 'ssr' as const, styling: 'daisyui' as const }],
        ['ssg', { kind: 'ssg' as const }],
        ['terminal', { kind: 'terminal' as const }],
    ])('%s: every core dep in the generated package.json is on the core line', (_l, input) => {
        const { tree } = composeProject(normalizeSpec({ name: 'x', ...input }));
        const pkg = JSON.parse(tree.get('package.json') as string);
        const all = { ...pkg.dependencies, ...pkg.devDependencies };
        let core = 0;
        for (const [name, range] of Object.entries<string>(all)) {
            if (SIGX_CORE_PACKAGES.has(name)) {
                core++;
                expect(range, name).toBe(SIGX_CORE);
            }
            if (name.startsWith('@sigx/') && !SIGX_CORE_PACKAGES.has(name) && name !== '@sigx/cli') {
                expect(range, name).toBe(SIGX_COMPANIONS[name]);
            }
        }
        if (input.kind !== 'terminal') expect(core).toBeGreaterThan(0);
    });
});
