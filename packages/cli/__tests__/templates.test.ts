/**
 * Guards against template rot (signalxjs/cli#50, #91). Templates are now
 * overlays composed by src/create — most managed files (package.json,
 * vite.config.ts, …) are generated, so the version checks that used to run
 * per template folder live in create/compose.test.ts and
 * create/versions.test.ts. What is still checked here, per overlay:
 *
 *   - a non-Lynx overlay never ships a managed file (it must contribute a
 *     fragment instead, or the builders silently overwrite it);
 *   - Lynx overlays (raw, complete projects) pin real ranges, never
 *     "latest", ship every file their scripts run with node, and ship no
 *     .npmrc (npm strips it anyway; legacy-peer-deps would mask a broken set).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { MANAGED_FILES } from '../src/create/compose.js';

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');

function dirs(path: string): string[] {
    return readdirSync(path).filter((e) => statSync(join(path, e)).isDirectory());
}

/** Leaf overlay folders: `<group>/<name>` for every group but `lynx`. */
const overlays = dirs(templatesDir)
    .filter((g) => g !== 'lynx')
    .flatMap((g) => (g === 'base' ? ['base'] : dirs(join(templatesDir, g)).map((n) => `${g}/${n}`)));
const lynxTemplates = dirs(join(templatesDir, 'lynx')).map((n) => `lynx/${n}`);

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function readPkg(template: string): {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
} {
    return JSON.parse(readFileSync(join(templatesDir, template, 'package.json'), 'utf-8'));
}

describe('template overlays', () => {
    it('finds overlay and lynx directories', () => {
        expect(overlays).toContain('kinds/spa');
        expect(overlays).toContain('targets/node');
        expect(lynxTemplates).toContain('lynx/lynx');
    });

    it.each(overlays)('%s: ships no managed files', (name) => {
        const root = join(templatesDir, name);
        const files = walk(root).map((f) => relative(root, f).split('\\').join('/'));
        const managed = files.filter((f) => MANAGED_FILES.has(f === 'gitignore' ? '.gitignore' : f));
        expect(managed, `${name} must contribute fragments for ${managed.join(', ')}`).toEqual([]);
    });
});

describe('lynx templates', () => {
    it.each(lynxTemplates)('%s: pins real version ranges, never "latest"', (name) => {
        const pkg = readPkg(name);
        for (const section of ['dependencies', 'devDependencies'] as const) {
            for (const [dep, range] of Object.entries(pkg[section] ?? {})) {
                expect(range, `${name} ${section}.${dep} must pin a version range`).not.toBe('latest');
            }
        }
    });

    it.each(lynxTemplates)('%s: ships every local file its scripts run with node', (name) => {
        const pkg = readPkg(name);
        for (const [script, cmd] of Object.entries(pkg.scripts ?? {})) {
            for (const match of cmd.matchAll(/(?:^|\s)node\s+(\S+\.[cm]?js)/g)) {
                expect(
                    existsSync(join(templatesDir, name, match[1])),
                    `${name} "${script}" script runs ${match[1]}, which the template does not ship`,
                ).toBe(true);
            }
        }
    });

    it.each(lynxTemplates)('%s: does not ship an .npmrc', (name) => {
        expect(existsSync(join(templatesDir, name, '.npmrc'))).toBe(false);
    });
});
