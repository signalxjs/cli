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

    // Register plugin commands, in two phases.
    //
    // Phase 1 — probe each command's args schema (a bad schema in one plugin
    // must not take down the whole CLI) and reserve the direct names of the
    // commands that will actually register. Direct names always beat aliases
    // at resolution and @sigx/args does not collision-check aliases across a
    // subcommand map, so ALL surviving names — including later plugins' —
    // must be known before any alias is accepted; a skipped-as-invalid
    // command must NOT reserve its token.
    const registrable: { plugin: SigxPlugin; name: string; cmd: PluginCommand }[] = [];
    for (const plugin of plugins) {
        for (const [name, cmd] of Object.entries(plugin.commands)) {
            try {
                command(name).args(cmd.args ?? {});
            } catch (err) {
                if (err instanceof DefinitionError) {
                    logger.warn(`Plugin "${plugin.name}" command "${name}" has an invalid args schema: ${err.message}`);
                    continue;
                }
                throw err;
            }
            registrable.push({ plugin, name, cmd });
        }
    }
    const claimed = new Map<string, string>();
    for (const name of Object.keys(subCommands)) claimed.set(name, `core command "${name}"`);
    for (const { plugin, name } of registrable) {
        claimed.set(name, `command "${name}" (plugin "${plugin.name}")`);
    }

    // Phase 2 — drop colliding aliases (a registered-but-shadowed alias
    // would still render in help, advertising a name that doesn't resolve),
    // then wrap and register.
    for (const { plugin, name, cmd } of registrable) {
        const aliases: string[] = [];
        for (const alias of new Set(cmd.aliases ?? [])) {
            // An alias matching the command's own name is caught by the
            // up-front direct-name claims like any other collision.
            const owner = claimed.get(alias);
            if (owner) {
                logger.warn(
                    `Plugin "${plugin.name}" command "${name}" alias "${alias}" collides with ${owner} — the alias will not resolve`,
                );
                continue;
            }
            aliases.push(alias);
        }
        if (subCommands[name]) {
            // Command conflict — last plugin wins, but warn
            logger.warn(`Plugin "${plugin.name}" overrides command "${name}"`);
        }
        subCommands[name] = wrapPluginCommand(name, { ...cmd, aliases }, opts);
        for (const alias of aliases) {
            claimed.set(alias, `alias of command "${name}" (plugin "${plugin.name}")`);
        }
    }

    return command('sigx').version(version).describe('SignalX CLI').subcommands(subCommands);
}
