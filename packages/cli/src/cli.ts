#!/usr/bin/env node

/**
 * sigx CLI — unified command-line tool for SignalX projects.
 *
 * Core commands (always available):
 *   sigx create     — scaffold a new project
 *   sigx info       — print environment info
 *
 * Plugin commands (auto-discovered from installed packages):
 *   sigx dev        — start dev server
 *   sigx build      — production build
 *   sigx preview    — preview build (SSG)
 *   sigx prebuild   — generate native project files (Lynx)
 *   sigx run:android / run:ios  — build + launch on device (Lynx)
 */

import { defineCommand, runMain } from 'citty';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPlugins } from './discover.js';
import { infoCommand } from './commands/info.js';
import { createLogger } from './utils/logger.js';
import type { PluginCommand, SigxPlugin } from './plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const logger = createLogger();

function wrapPluginCommand(cmd: PluginCommand, plugins: SigxPlugin[]) {
    return defineCommand({
        meta: { description: cmd.description },
        args: cmd.args as any,
        async run({ args }) {
            // `plugins` lets a shell-hosting command (e.g. lynx dev) merge
            // peer plugins' TUI contributions via runShell({ plugins }).
            await cmd.run({ cwd: process.cwd(), args, logger, plugins });
        },
    });
}

async function main() {
    const cwd = process.cwd();
    const plugins = await discoverPlugins(cwd);

    // Build subcommand map: core + plugin commands
    const subCommands: Record<string, ReturnType<typeof defineCommand>> = {
        info: infoCommand,
    };

    // Lazy-load create command only when needed (it pulls in @sigx/terminal)
    subCommands.create = defineCommand({
        meta: { name: 'create', description: 'Scaffold a new SignalX project' },
        async run() {
            const { runCreate } = await import('./commands/create.js');
            await runCreate();
        },
    });

    // Register plugin commands
    for (const plugin of plugins) {
        for (const [name, cmd] of Object.entries(plugin.commands)) {
            if (subCommands[name]) {
                // Command conflict — last plugin wins, but warn
                logger.warn(`Plugin "${plugin.name}" overrides command "${name}"`);
            }
            subCommands[name] = wrapPluginCommand(cmd, plugins);
        }
    }

    const mainCommand = defineCommand({
        meta: {
            name: 'sigx',
            version: pkg.version,
            description: 'SignalX CLI',
        },
        subCommands,
    });

    await runMain(mainCommand);
}

main().catch((err) => {
    logger.error(err.message || String(err));
    process.exit(1);
});
