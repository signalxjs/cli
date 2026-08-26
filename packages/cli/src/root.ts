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

/**
 * `aliases` overrides `cmd.aliases` (the registration loop passes the
 * collision-filtered list). A separate parameter rather than a `{...cmd}`
 * clone: spread copies only own enumerable props and would drop a `run`
 * defined on a class prototype.
 */
export function wrapPluginCommand(
    name: string,
    cmd: PluginCommand,
    opts: RootCommandOptions,
    aliases: readonly string[] = cmd.aliases ?? [],
): AnyCommand {
    let builder = command(name).describe(cmd.description);
    if (aliases.length) builder = builder.aliases(...aliases);
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
            kind: a.enum(['spa', 'ssr', 'ssg', 'terminal', 'lynx']).describe('Project kind'),
            type: a.enum(['basic', 'ssr', 'ssg', 'terminal', 'lynx']).describe('Deprecated alias of --kind (basic = spa)'),
            render: a.enum(['hydrate', 'islands', 'resume']).describe('SSR render mode'),
            target: a.enum(['node', 'cloudflare', 'bun', 'deno', 'vercel', 'vercel-edge', 'netlify']).describe('SSR deploy target'),
            styling: a.enum(['none', 'tailwind', 'daisyui']).describe('Styling'),
            features: a.string().describe('Extras, comma-separated: router, i18n, testing, server-fn'),
            pm: a.enum(['pnpm', 'npm', 'yarn', 'bun', 'deno']).describe('Package manager for install and next steps'),
            install: a.boolean().describe('Install dependencies after scaffolding (--no-install to skip)'),
            git: a.boolean().describe('Initialize a git repository (--no-git to skip)'),
            preset: a.enum(['quick']).describe('Preset: quick = SPA + Tailwind + router + tests'),
            yes: a.boolean().alias('y').describe('Skip prompts (headless mode)'),
            list: a.boolean().describe('List kinds, render modes, targets and extras'),
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
    // Name conflicts resolve last-plugin-wins (warned) BEFORE any alias is
    // considered, so an overridden command's aliases can't poison the
    // winner's — only winners exist at alias-filtering time.
    const winners = new Map<string, { plugin: SigxPlugin; cmd: PluginCommand }>();
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
            if (winners.has(name) || subCommands[name]) {
                // Command conflict — last plugin wins, but warn. Delete
                // before re-setting: Map.set on an existing key keeps the
                // ORIGINAL iteration position, and alias claiming follows
                // this order — the winner must claim at its own load
                // position, not the loser's.
                logger.warn(`Plugin "${plugin.name}" overrides command "${name}"`);
                winners.delete(name);
            }
            winners.set(name, { plugin, cmd });
        }
    }
    const claimed = new Map<string, string>();
    for (const name of Object.keys(subCommands)) claimed.set(name, `core command "${name}"`);
    for (const [name, { plugin }] of winners) {
        claimed.set(name, `command "${name}" (plugin "${plugin.name}")`);
    }

    // Phase 2 — drop colliding aliases (a registered-but-shadowed alias
    // would still render in help, advertising a name that doesn't resolve),
    // then wrap and register.
    for (const [name, { plugin, cmd }] of winners) {
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
        subCommands[name] = wrapPluginCommand(name, cmd, opts, aliases);
        for (const alias of aliases) {
            claimed.set(alias, `alias of command "${name}" (plugin "${plugin.name}")`);
        }
    }

    return command('sigx').version(version).describe('SignalX CLI').subcommands(subCommands);
}
