import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { copyDirectory, isTextExtension, patchWorkspaceDeps } from '../src/commands/scaffold.js';

describe('scaffold helpers', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'sigx-scaffold-'));
    });
    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('copies a template tree with {{projectName}} substitution', () => {
        const src = join(dir, 'tpl');
        mkdirSync(join(src, 'src'), { recursive: true });
        writeFileSync(join(src, 'package.json'), '{"name":"{{projectName}}"}');
        writeFileSync(join(src, 'src', 'main.ts'), 'console.log("{{projectName}}");');

        const dest = join(dir, 'out');
        copyDirectory(src, dest, 'my-app');

        expect(readFileSync(join(dest, 'package.json'), 'utf-8')).toContain('"my-app"');
        expect(readFileSync(join(dest, 'src', 'main.ts'), 'utf-8')).toContain('my-app');
    });

    it('renames template gitignore to .gitignore', () => {
        const src = join(dir, 'tpl');
        mkdirSync(src, { recursive: true });
        writeFileSync(join(src, 'gitignore'), 'node_modules\n');

        const dest = join(dir, 'out');
        copyDirectory(src, dest, 'x');

        expect(existsSync(join(dest, '.gitignore'))).toBe(true);
        expect(existsSync(join(dest, 'gitignore'))).toBe(false);
    });

    it('copies binary files byte-verbatim', () => {
        const src = join(dir, 'tpl');
        mkdirSync(src, { recursive: true });
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        writeFileSync(join(src, 'logo.png'), png);

        const dest = join(dir, 'out');
        copyDirectory(src, dest, 'x');

        expect(readFileSync(join(dest, 'logo.png'))).toEqual(png);
    });

    it('classifies text extensions including dotfiles', () => {
        expect(isTextExtension('main.ts')).toBe(true);
        expect(isTextExtension('.gitignore')).toBe(true);
        expect(isTextExtension('logo.png')).toBe(false);
    });

    it('patches @sigx deps to workspace:* only inside a pnpm workspace', () => {
        const ws = join(dir, 'ws');
        const proj = join(ws, 'apps', 'demo');
        mkdirSync(proj, { recursive: true });
        writeFileSync(join(ws, 'pnpm-workspace.yaml'), 'packages: []\n');
        writeFileSync(join(proj, 'package.json'), JSON.stringify({
            dependencies: { '@sigx/terminal': '^0.5.0', citty: '^0.1.0' },
        }));

        patchWorkspaceDeps(proj);
        const pkg = JSON.parse(readFileSync(join(proj, 'package.json'), 'utf-8'));
        expect(pkg.dependencies['@sigx/terminal']).toBe('workspace:*');
        expect(pkg.dependencies.citty).toBe('^0.1.0');

        // Outside a workspace: untouched.
        const lone = join(dir, 'lone');
        mkdirSync(lone, { recursive: true });
        const orig = JSON.stringify({ dependencies: { '@sigx/terminal': '^0.5.0' } });
        writeFileSync(join(lone, 'package.json'), orig);
        patchWorkspaceDeps(lone);
        // tmpdir ancestry shouldn't contain a pnpm-workspace.yaml; if the CI
        // runner does, this assertion is the canary.
        expect(readFileSync(join(lone, 'package.json'), 'utf-8')).toBe(orig);
    });
});
