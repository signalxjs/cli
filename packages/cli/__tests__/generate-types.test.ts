import { describe, expect, it, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The published .d.ts files are hand-maintained strings in
// scripts/generate-types.js ("KEEP IN LOCKSTEP with src/plugin.ts").
// This locks the generated declarations to the current plugin contract so a
// source change without the matching d.ts update fails here instead of
// shipping stale types (as @sigx/cli@0.4.0 did — see #55).
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function dts(file: string): string {
    return readFileSync(join(pkgDir, 'dist', file), 'utf-8');
}

beforeAll(() => {
    execSync('node scripts/generate-types.js', { cwd: pkgDir, stdio: 'pipe' });
});

describe('generated type declarations', () => {
    it('plugin.d.ts re-exports the fluent arg builders from @sigx/args', () => {
        const plugin = dts('plugin.d.ts');
        expect(plugin).toContain("from '@sigx/args'");
        expect(plugin).toMatch(/export \{ a \}/);
        expect(plugin).toContain('ArgsShape');
        // The pre-0.4.0 object-literal arg defs are gone.
        expect(plugin).not.toContain('interface ArgDef');
    });

    it('plugin.d.ts carries the typed plugin contract', () => {
        const plugin = dts('plugin.d.ts');
        expect(plugin).toContain('export type PluginArgs<S>');
        expect(plugin).toContain('export type TypedCommandContext<S = ArgsShape>');
        expect(plugin).toContain('export interface PluginCommand<S = ArgsShape>');
        // run must be METHOD syntax (bivariant), not a property function type.
        expect(plugin).toMatch(/run\(ctx: TypedCommandContext<S>\): Promise<void>;/);
        expect(plugin).toContain('aliases?: string[]');
        expect(plugin).toContain('hidden?: boolean');
        expect(plugin).toContain('allowUnknownFlags?: boolean');
        expect(plugin).toContain('unknownFlags?: string[]');
        expect(plugin).toContain('commands: Record<string, PluginCommand<any>>');
        expect(plugin).toContain('export interface PluginSpec<T extends Record<string, unknown>');
        expect(plugin).toMatch(
            /definePlugin<T extends Record<string, unknown>>\(plugin: PluginSpec<T>\): SigxPlugin/,
        );
        expect(plugin).toMatch(/defineCommand<S extends ArgsShape = ArgsShape>\(cmd: PluginCommand<S>\): PluginCommand<S>/);
    });

    it('index.d.ts re-exports a and the builder types', () => {
        const index = dts('index.d.ts');
        expect(index).toMatch(/export \{ definePlugin, defineCommand, a \}/);
        expect(index).toContain('ArgsShape');
        expect(index).toContain('PluginArgs');
        expect(index).toContain('TypedCommandContext');
        expect(index).not.toContain('ArgDef');
    });

    it('create.d.ts declares runCreate(opts?: CreateOptions)', () => {
        const create = dts('commands/create.d.ts');
        expect(create).toContain('CreateOptions');
        expect(create).toMatch(/runCreate\(opts\?: CreateOptions\)/);
    });
});
