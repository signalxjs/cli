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

import { a, command, runMain, DefinitionError, type AnyCommand } from '@sigx/args';
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

function wrapPluginCommand(name: string, cmd: PluginCommand, plugins: SigxPlugin[]): AnyCommand {
    return command(name)
        .describe(cmd.description)
        .args(cmd.args ?? {})
        .run(async ({ args }) => {
            // `plugins` lets a shell-hosting command (e.g. lynx dev) merge
            // peer plugins' TUI contributions via runShell({ plugins }).
            await cmd.run({ cwd: process.cwd(), args, logger, plugins, cliVersion: pkg.version });
        });
}

async function main() {
    const cwd = process.cwd();
    const plugins = await discoverPlugins(cwd, { cliVersion: pkg.version, logger });

    // Build subcommand map: core + plugin commands
    const subCommands: Record<string, AnyCommand> = {
        info: infoCommand,
    };

    // Lazy-load create command only when needed (it pulls in @sigx/terminal)
    subCommands.create = command('create')
        .describe('Scaffold a new SignalX project')
        .args({
            name: a.positional().describe('Project name'),
            type: a.enum(['basic', 'ssr', 'ssg', 'lynx']).describe('Project type'),
            styling: a.enum(['none', 'tailwind', 'daisyui']).describe('Styling setup'),
            yes: a.boolean().alias('y').describe('Skip prompts (headless mode)'),
        })
        .run(async ({ args }) => {
            const { runCreate } = await import('./commands/create.js');
            await runCreate(args);
        });

    // Register plugin commands
    for (const plugin of plugins) {
        for (const [name, cmd] of Object.entries(plugin.commands)) {
            if (subCommands[name]) {
                // Command conflict — last plugin wins, but warn
                logger.warn(`Plugin "${plugin.name}" overrides command "${name}"`);
            }
            try {
                subCommands[name] = wrapPluginCommand(name, cmd, plugins);
            } catch (err) {
                // A bad schema in one plugin must not take down the whole CLI.
                if (err instanceof DefinitionError) {
                    logger.warn(`Plugin "${plugin.name}" command "${name}" has an invalid args schema: ${err.message}`);
                    continue;
                }
                throw err;
            }
        }
    }

    const mainCommand = command('sigx').version(pkg.version).describe('SignalX CLI').subcommands(subCommands);

    await runMain(mainCommand);
}

main().catch((err) => {
    logger.error(err.message || String(err));
    process.exit(1);
});
