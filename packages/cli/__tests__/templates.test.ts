/**
 * Guards against the template rot behind signalxjs/cli#50: `latest` pins
 * scaffold mismatched @sigx core/companion sets the moment versions drift,
 * scripts referenced files the template didn't ship, and template `.npmrc`
 * files (stripped by `npm publish` anyway) masked broken peer sets with
 * `legacy-peer-deps`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const templates = readdirSync(templatesDir).filter((entry) =>
    statSync(join(templatesDir, entry)).isDirectory(),
);

function readPkg(template: string): {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
} {
    return JSON.parse(readFileSync(join(templatesDir, template, 'package.json'), 'utf-8'));
}

describe('templates', () => {
    it('finds the template directories', () => {
        expect(templates.length).toBeGreaterThan(0);
    });

    it.each(templates)('%s: pins real version ranges, never "latest"', (name) => {
        const pkg = readPkg(name);
        for (const section of ['dependencies', 'devDependencies'] as const) {
            for (const [dep, range] of Object.entries(pkg[section] ?? {})) {
                expect(range, `${name} ${section}.${dep} must pin a version range`).not.toBe('latest');
            }
        }
    });

    it.each(templates)('%s: ships every local file its scripts run with node', (name) => {
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

    it.each(templates)('%s: does not ship an .npmrc', (name) => {
        // npm strips .npmrc from published tarballs, so one here is dead weight at
        // best — and `legacy-peer-deps=true` would only mask a broken peer set.
        expect(existsSync(join(templatesDir, name, '.npmrc'))).toBe(false);
    });
});
