import type { SigxPlugin, TuiContribution, StatusItem } from '../plugin.js';
import type { ShellConfig } from './types.js';
import type { Logger } from '../plugin.js';

/** Collect the `tui` contributions of every plugin, in discovery order. */
export function collectTuiContributions(plugins: SigxPlugin[]): TuiContribution[] {
    return plugins
        .map((p) => p.tui)
        .filter((t): t is TuiContribution => !!t);
}

/**
 * Merge peer-plugin contributions into the host's config. Host entries come
 * first and win conflicts: a duplicate tab `id`, command `name`, or shortcut
 * `key` from a later contributor is skipped (with a warn when a logger is
 * given). `status` providers concatenate.
 */
export function mergeShellConfig(
    config: ShellConfig,
    contributions: TuiContribution[],
    logger?: Logger,
): ShellConfig {
    const tabs = [...config.tabs];
    const commands = [...(config.commands ?? [])];
    const shortcuts = [...(config.shortcuts ?? [])];
    const statusProviders = config.status ? [config.status] : [];

    const tabIds = new Set(tabs.map((t) => t.id));
    const commandNames = new Set(commands.map((c) => c.name));
    const shortcutKeys = new Set(shortcuts.map((s) => s.key));

    for (const tui of contributions) {
        for (const tab of tui.tabs ?? []) {
            if (tabIds.has(tab.id)) {
                logger?.warn(`shell: duplicate tab "${tab.id}" skipped`);
                continue;
            }
            tabIds.add(tab.id);
            tabs.push(tab);
        }
        for (const cmd of tui.commands ?? []) {
            if (commandNames.has(cmd.name)) {
                logger?.warn(`shell: duplicate command "${cmd.name}" skipped`);
                continue;
            }
            commandNames.add(cmd.name);
            commands.push(cmd);
        }
        for (const sc of tui.shortcuts ?? []) {
            if (shortcutKeys.has(sc.key)) {
                logger?.warn(`shell: duplicate shortcut "${sc.key}" skipped`);
                continue;
            }
            shortcutKeys.add(sc.key);
            shortcuts.push(sc);
        }
        if (tui.status) statusProviders.push(tui.status);
    }

    return {
        ...config,
        tabs,
        commands,
        shortcuts,
        status: statusProviders.length
            ? () => statusProviders.flatMap((s): StatusItem[] => s())
            : undefined,
    };
}
