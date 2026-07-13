/**
 * Builds the root `sigx` command: core commands (info, create) plus every
 * discovered plugin's commands, wrapped onto @sigx/args. Extracted from
 * cli.ts so dispatch is testable — cli.ts stays the thin bin entry that
 * discovers plugins and hands the result to runMain.
 */

import { a, command, DefinitionError, type AnyCommand } from '@sigx/args';
import { infoCommand } from './commands/info.js';
import type { Logger, PluginCommand, SigxPlugin } from './plugin.js';

export interface RootCommandOptions {
    plugins: SigxPlugin[];
    version: string;
    logger: Logger;
    /** ctx.cwd for plugin commands — injectable for tests. Default: process.cwd(). */
    cwd?: string;
}

export function wrapPluginCommand(name: string, cmd: PluginCommand, opts: RootCommandOptions): AnyCommand {
    let builder = command(name).describe(cmd.description);
    if (cmd.aliases?.length) builder = builder.aliases(...cmd.aliases);
    if (cmd.hidden) builder = builder.hidden();
    if (cmd.allowUnknownFlags) builder = builder.allowUnknownFlags();
    return builder
        .args(cmd.args ?? {})
        .run(async ({ args, unknownFlags }) => {
            // `plugins` lets a shell-hosting command (e.g. lynx dev) merge
            // peer plugins' TUI contributions via runShell({ plugins }).
            await cmd.run({
                cwd: opts.cwd ?? process.cwd(),
                args,
                logger: opts.logger,
                plugins: opts.plugins,
                cliVersion: opts.version,
                ...(cmd.allowUnknownFlags ? { unknownFlags } : {}),
            });
        });
}

export function buildRootCommand(opts: RootCommandOptions): AnyCommand {
    const { plugins, version, logger } = opts;

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

    // Register plugin commands. `claimed` tracks command names AND aliases:
    // @sigx/args resolves direct names before aliases but does not
    // collision-check aliases across a subcommand map, so warn here.
    const claimed = new Map<string, string>();
    for (const name of Object.keys(subCommands)) claimed.set(name, `core command "${name}"`);
    for (const plugin of plugins) {
        for (const [name, cmd] of Object.entries(plugin.commands)) {
            let wrapped: AnyCommand;
            try {
                wrapped = wrapPluginCommand(name, cmd, opts);
            } catch (err) {
                // A bad schema in one plugin must not take down the whole CLI.
                if (err instanceof DefinitionError) {
                    logger.warn(`Plugin "${plugin.name}" command "${name}" has an invalid args schema: ${err.message}`);
                    continue;
                }
                throw err;
            }
            if (subCommands[name]) {
                // Command conflict — last plugin wins, but warn
                logger.warn(`Plugin "${plugin.name}" overrides command "${name}"`);
            }
            subCommands[name] = wrapped;
            claimed.set(name, `command "${name}" (plugin "${plugin.name}")`);
            for (const alias of cmd.aliases ?? []) {
                const owner = claimed.get(alias);
                if (owner) {
                    logger.warn(
                        `Plugin "${plugin.name}" command "${name}" alias "${alias}" collides with ${owner} — the alias will not resolve`,
                    );
                    continue;
                }
                claimed.set(alias, `alias of command "${name}" (plugin "${plugin.name}")`);
            }
        }
    }

    return command('sigx').version(version).describe('SignalX CLI').subcommands(subCommands);
}
