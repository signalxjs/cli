import { describe, it, expect, vi } from 'vitest';
import { collectTuiContributions, mergeShellConfig } from '../src/shell/contributions.js';
import type { SigxPlugin } from '../src/plugin.js';
import type { ShellConfig } from '../src/shell/types.js';

const noop = () => { };
const plugin = (name: string, tui?: SigxPlugin['tui']): SigxPlugin => ({
    name,
    detect: () => true,
    commands: {},
    tui,
});

const baseConfig = (): ShellConfig => ({
    title: 'host',
    tabs: [{ id: 'home', label: 'Home', render: () => null }],
    commands: [{ name: '/reload', description: 'host reload', run: noop }],
    shortcuts: [{ key: 'r', label: 'reload', run: noop }],
    status: () => [{ label: 'port', value: '8788' }],
});

describe('TUI contributions', () => {
    it('plugins without tui are fine and contribute nothing', () => {
        expect(collectTuiContributions([plugin('a'), plugin('b')])).toEqual([]);
    });

    it('merges tabs/commands/shortcuts in discovery order after the host', () => {
        const merged = mergeShellConfig(baseConfig(), collectTuiContributions([
            plugin('vite', { tabs: [{ id: 'assets', label: 'Assets', render: () => null }] }),
            plugin('ssg', { commands: [{ name: '/routes', description: '', run: noop }] }),
        ]));
        expect(merged.tabs.map((t) => t.id)).toEqual(['home', 'assets']);
        expect(merged.commands!.map((c) => c.name)).toEqual(['/reload', '/routes']);
    });

    it('host wins conflicts; duplicates warn and are skipped', () => {
        const warn = vi.fn();
        const logger = { log: noop, warn, error: noop };
        const hostReload = baseConfig().commands![0];
        const merged = mergeShellConfig(baseConfig(), collectTuiContributions([
            plugin('rogue', {
                tabs: [{ id: 'home', label: 'Fake Home', render: () => null }],
                commands: [{ name: '/reload', description: 'rogue', run: noop }],
                shortcuts: [{ key: 'r', label: 'rogue', run: noop }],
            }),
        ]), logger);
        expect(merged.tabs).toHaveLength(1);
        expect(merged.tabs[0].label).toBe('Home');
        expect(merged.commands!.find((c) => c.name === '/reload')!.description).toBe(hostReload.description);
        expect(merged.shortcuts!.map((s) => s.label)).toEqual(['reload']);
        expect(warn).toHaveBeenCalledTimes(3);
    });

    it('status providers concatenate', () => {
        const merged = mergeShellConfig(baseConfig(), collectTuiContributions([
            plugin('lynx', { status: () => [{ label: 'devices', value: '2', tone: 'success' }] }),
        ]));
        expect(merged.status!()).toEqual([
            { label: 'port', value: '8788' },
            { label: 'devices', value: '2', tone: 'success' },
        ]);
    });
});
