import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { discoverPlugins, satisfiesCliRange } from '../src/discover.js';

describe('satisfiesCliRange', () => {
    it('caret on 0.x: minor acts as the major', () => {
        expect(satisfiesCliRange('0.3.0', '^0.3.0')).toBe(true);
        expect(satisfiesCliRange('0.3.9', '^0.3.0')).toBe(true);
        expect(satisfiesCliRange('0.4.0', '^0.3.0')).toBe(false);
        expect(satisfiesCliRange('0.2.8', '^0.3.0')).toBe(false);
    });

    it('caret on 1.x: same major, any newer minor/patch', () => {
        expect(satisfiesCliRange('1.4.2', '^1.2.0')).toBe(true);
        expect(satisfiesCliRange('2.0.0', '^1.2.0')).toBe(false);
        expect(satisfiesCliRange('1.1.0', '^1.2.0')).toBe(false);
    });

    it('>= and exact', () => {
        expect(satisfiesCliRange('0.3.0', '>=0.3.0')).toBe(true);
        expect(satisfiesCliRange('1.0.0', '>=0.3.0')).toBe(true);
        expect(satisfiesCliRange('0.2.9', '>=0.3.0')).toBe(false);
        expect(satisfiesCliRange('0.3.0', '0.3.0')).toBe(true);
        expect(satisfiesCliRange('0.3.1', '0.3.0')).toBe(false);
    });

    it('malformed input never blocks', () => {
        expect(satisfiesCliRange('0.3.0', 'banana')).toBe(true);
        expect(satisfiesCliRange('not-a-version', '^0.3.0')).toBe(true);
    });
});

describe('discoverPlugins requires check', () => {
    let dir: string;
    const warn = vi.fn();
    const logger = { log: vi.fn(), warn, error: vi.fn() };

    beforeEach(() => {
        warn.mockClear();
        dir = mkdtempSync(join(tmpdir(), 'sigx-discover-'));
    });
    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    function fakePlugin(requires?: string) {
        writeFileSync(join(dir, 'package.json'), JSON.stringify({
            dependencies: { 'fake-plugin': '1.0.0' },
        }));
        const pluginDir = join(dir, 'node_modules', 'fake-plugin');
        mkdirSync(pluginDir, { recursive: true });
        writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({
            name: 'fake-plugin',
            'sigx-cli': { plugin: './plugin.mjs', ...(requires ? { requires } : {}) },
        }));
        writeFileSync(join(pluginDir, 'plugin.mjs'),
            'export default { name: "fake", detect: () => true, commands: {} };\n');
    }

    it('loads a plugin and stays silent when requires is satisfied', async () => {
        fakePlugin('>=0.3.0');
        const plugins = await discoverPlugins(dir, { cliVersion: '0.3.1', logger });
        expect(plugins.map((p) => p.name)).toEqual(['fake']);
        expect(warn).not.toHaveBeenCalled();
    });

    it('warns with the update command when the CLI is too old — but still loads', async () => {
        fakePlugin('>=99.0.0');
        const plugins = await discoverPlugins(dir, { cliVersion: '0.3.1', logger });
        expect(plugins.map((p) => p.name)).toEqual(['fake']);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('requires sigx CLI >=99.0.0');
        expect(warn.mock.calls[0][0]).toContain('pnpm up @sigx/cli --latest');
    });

    it('no requires field: no check, no warning', async () => {
        fakePlugin();
        const plugins = await discoverPlugins(dir, { cliVersion: '0.3.1', logger });
        expect(plugins).toHaveLength(1);
        expect(warn).not.toHaveBeenCalled();
    });
});
