/**
 * Extensibility conformance suite: proves a lynx-shaped plugin's commands
 * dispatch through buildRootCommand + @sigx/args exactly as plugins in the
 * wild depend on. Guards the plugin contract against regressions when the
 * dispatch layer changes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runMain } from '@sigx/args';
import { a, definePlugin, type CommandContext, type Logger } from '../src/plugin.js';
import { buildRootCommand } from '../src/root.js';
import { lynxLikePlugin, received, resetReceived } from './fixtures/lynx-like-plugin.js';

function mockLogger(): Logger & { warns: string[]; errors: string[] } {
    const warns: string[] = [];
    const errors: string[] = [];
    return {
        log: vi.fn(),
        warn: (msg: string) => warns.push(msg),
        error: (msg: string) => errors.push(msg),
        warns,
        errors,
    };
}

interface RunResult {
    stdout: string[];
    stderr: string[];
    logger: ReturnType<typeof mockLogger>;
}

async function dispatch(rawArgs: string[], plugins = [lynxLikePlugin]): Promise<RunResult> {
    const logger = mockLogger();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const cmd = buildRootCommand({ plugins, version: '9.9.9', logger, cwd: '/fake/project' });
    await runMain(cmd, {
        rawArgs,
        stdout: (t) => stdout.push(t),
        stderr: (t) => stderr.push(t),
    });
    return { stdout, stderr, logger };
}

describe('plugin command dispatch', () => {
    beforeEach(() => resetReceived());
    afterEach(() => {
        process.exitCode = undefined;
    });

    it('parses kebab and literal no-* flags verbatim (no negation of undeclared flags)', async () => {
        await dispatch(['dev', '--port', '9000', '--ios', '--no-device-logs', '--reset-cache']);
        expect(received).toHaveLength(1);
        expect(received[0].command).toBe('dev');
        expect(received[0].ctx.args).toEqual({
            port: '9000',
            ios: true,
            'no-device-logs': true,
            'reset-cache': true,
            variant: undefined,
            _: [],
        });
    });

    it('applies declared defaults when flags are absent', async () => {
        await dispatch(['dev']);
        expect(received[0].ctx.args).toEqual({
            port: undefined,
            ios: false,
            'no-device-logs': false,
            'reset-cache': false,
            variant: undefined,
            _: [],
        });
    });

    it('provides cwd, logger, plugins, and cliVersion on ctx', async () => {
        await dispatch(['dev']);
        const ctx = received[0].ctx;
        expect(ctx.cwd).toBe('/fake/project');
        expect(ctx.cliVersion).toBe('9.9.9');
        expect(ctx.plugins).toEqual([lynxLikePlugin]);
        expect(typeof ctx.logger.warn).toBe('function');
    });

    it('binds rest builders to remaining positionals', async () => {
        await dispatch(['add', 'updates', 'haptics', '--caret']);
        expect(received[0].ctx.args).toEqual({
            modules: ['updates', 'haptics'],
            caret: true,
            _: [],
        });
    });

    it('resolves short aliases and coerces numbers', async () => {
        await dispatch(['serve', '-p', '3000']);
        expect(received[0].ctx.args).toEqual({ port: 3000, _: [] });
    });

    it('passes tokens after bare -- through verbatim in args._', async () => {
        await dispatch(['dev', '--ios', '--', '--raw', 'stuff']);
        expect(received[0].ctx.args.ios).toBe(true);
        expect(received[0].ctx.args._).toEqual(['--raw', 'stuff']);
    });

    it('rejects unknown flags with a message and exitCode 1', async () => {
        const { stderr } = await dispatch(['dev', '--bogus']);
        expect(received).toHaveLength(0);
        expect(stderr.join('\n')).toMatch(/unknown flag/i);
        expect(process.exitCode).toBe(1);
    });
});

describe('plugin command capabilities', () => {
    beforeEach(() => resetReceived());
    afterEach(() => {
        process.exitCode = undefined;
    });

    it('dispatches command aliases', async () => {
        await dispatch(['s', '-p', '3000']);
        expect(received.map((r) => r.command)).toEqual(['serve']);
        expect(received[0].ctx.args).toEqual({ port: 3000, _: [] });
    });

    it('hidden commands are still dispatchable', async () => {
        await dispatch(['internal']);
        expect(received.map((r) => r.command)).toEqual(['internal']);
    });

    it('allowUnknownFlags collects unknown flags into ctx.unknownFlags', async () => {
        await dispatch(['passthru', '--target', 'ios', '--whatever', 'v']);
        expect(received).toHaveLength(1);
        expect(received[0].ctx.args.target).toBe('ios');
        expect(received[0].ctx.unknownFlags).toEqual(['--whatever', 'v']);
        expect(process.exitCode ?? 0).toBe(0);
    });

    it('commands without allowUnknownFlags get no unknownFlags key on ctx', async () => {
        await dispatch(['dev']);
        expect('unknownFlags' in received[0].ctx).toBe(false);
    });

    it('warns on alias collisions with commands and other aliases; direct names beat aliases', async () => {
        const clasher = definePlugin({
            name: 'clasher',
            detect: () => true,
            commands: {
                other: {
                    description: 'Aliases collide with core and plugin names',
                    aliases: ['info', 's'],
                    run: async (ctx) => {
                        received.push({ command: 'other', ctx });
                    },
                },
            },
        });

        const { logger } = await dispatch(['other'], [lynxLikePlugin, clasher]);
        const warns = logger.warns.join('\n');
        expect(warns).toMatch(/alias "info" collides with core command "info"/);
        expect(warns).toMatch(/alias "s" collides with alias of command "serve" \(plugin "lynx-like"\)/);
        expect(received.map((r) => r.command)).toEqual(['other']);

        // Direct names always beat aliases — 'info' resolves to the core
        // command, never to the clashing alias.
        resetReceived();
        await dispatch(['info'], [lynxLikePlugin, clasher]);
        expect(received).toHaveLength(0);

        // The earlier owner keeps its alias working.
        resetReceived();
        await dispatch(['s'], [lynxLikePlugin, clasher]);
        expect(received.map((r) => r.command)).toEqual(['serve']);

        // Colliding aliases are not registered at all — they must not render
        // in help ("other, info, s" would advertise names that don't resolve).
        const { stdout } = await dispatch(['--help'], [lynxLikePlugin, clasher]);
        const help = stdout.join('\n');
        expect(help).toContain('serve, s');
        expect(help).toMatch(/^\s{2}other\s{2,}/m);
        expect(help).not.toContain('other, info');
    });

    it('drops an alias shadowed by a LATER plugin command with that direct name', async () => {
        // Direct names beat aliases at resolution, so lynx-like's serve alias
        // 's' is dead the moment a later plugin registers a command named
        // 's' — it must be dropped (with a warning) rather than rendered.
        const stealer = definePlugin({
            name: 'stealer',
            detect: () => true,
            commands: {
                s: {
                    description: 'Direct command occupying the alias token',
                    run: async (ctx) => {
                        received.push({ command: 'stealer-s', ctx });
                    },
                },
            },
        });

        const { logger, stdout } = await dispatch(['--help'], [lynxLikePlugin, stealer]);
        expect(logger.warns.join('\n')).toMatch(
            /Plugin "lynx-like" command "serve" alias "s" collides with command "s" \(plugin "stealer"\)/,
        );
        const help = stdout.join('\n');
        expect(help).not.toContain('serve, s');
        expect(help).toMatch(/^\s{2}serve\s{2,}/m);

        // The token resolves to the direct command.
        resetReceived();
        await dispatch(['s'], [lynxLikePlugin, stealer]);
        expect(received.map((r) => r.command)).toEqual(['stealer-s']);
    });

    it('a schema-invalid command does not reserve its name against earlier aliases', async () => {
        // 'brokenStealer' declares command 's' with an invalid schema: it is
        // skipped, so it must NOT claim the token — lynx-like's serve alias
        // 's' stays live.
        const brokenStealer = definePlugin({
            name: 'broken-stealer',
            detect: () => true,
            commands: {
                s: {
                    description: 'Invalid schema on the alias token',
                    args: { thing: a.string().alias('help') },
                    run: async () => {},
                },
            },
        });

        const { logger, stdout } = await dispatch(['--help'], [lynxLikePlugin, brokenStealer]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "broken-stealer" command "s" has an invalid args schema/);
        expect(logger.warns.join('\n')).not.toMatch(/alias "s" collides/);
        expect(stdout.join('\n')).toContain('serve, s');

        resetReceived();
        await dispatch(['s'], [lynxLikePlugin, brokenStealer]);
        expect(received.map((r) => r.command)).toEqual(['serve']);
    });

    it('an overridden command does not poison the winning command\'s aliases', async () => {
        // Both plugins declare `deploy` with alias 'd'. The later plugin wins
        // the name entirely — the loser's alias must not be claimed, so the
        // winner keeps 'd'.
        const early = definePlugin({
            name: 'early',
            detect: () => true,
            commands: {
                deploy: {
                    description: 'Loser deploy',
                    aliases: ['d'],
                    run: async (ctx) => {
                        received.push({ command: 'early-deploy', ctx });
                    },
                },
            },
        });
        const late = definePlugin({
            name: 'late',
            detect: () => true,
            commands: {
                deploy: {
                    description: 'Winner deploy',
                    aliases: ['d'],
                    run: async (ctx) => {
                        received.push({ command: 'late-deploy', ctx });
                    },
                },
            },
        });

        const { logger, stdout } = await dispatch(['--help'], [early, late]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "late" overrides command "deploy"/);
        expect(logger.warns.join('\n')).not.toMatch(/alias "d" collides/);
        expect(stdout.join('\n')).toContain('deploy, d');

        resetReceived();
        await dispatch(['d'], [early, late]);
        expect(received.map((r) => r.command)).toEqual(['late-deploy']);
    });

    it('supports class-instance commands (run on the prototype)', async () => {
        class InstanceCommand {
            description = 'Class-based command';
            aliases = ['ic'];
            async run(ctx: CommandContext) {
                received.push({ command: 'instance', ctx });
            }
        }
        const classy = definePlugin({
            name: 'classy',
            detect: () => true,
            commands: { instance: new InstanceCommand() },
        });

        await dispatch(['ic'], [classy]);
        expect(received.map((r) => r.command)).toEqual(['instance']);
    });

    it('an overriding command claims aliases at its override position, not the loser\'s', async () => {
        // Load order: A(dev, alias x) → B(build, alias x) → C(dev override,
        // alias x). C wins 'dev' but registers at ITS load position, so B's
        // 'x' (claimed before C loaded) beats C's — not the other way round.
        const mk = (pluginName: string, cmdName: string, tag: string) =>
            definePlugin({
                name: pluginName,
                detect: () => true,
                commands: {
                    [cmdName]: {
                        description: `${tag} command`,
                        aliases: ['x'],
                        run: async (ctx) => {
                            received.push({ command: tag, ctx });
                        },
                    },
                },
            });
        const pluginA = mk('a', 'dev', 'a-dev');
        const pluginB = mk('b', 'build', 'b-build');
        const pluginC = mk('c', 'dev', 'c-dev');

        const { logger, stdout } = await dispatch(['--help'], [pluginA, pluginB, pluginC]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "c" command "dev" alias "x" collides with alias of command "build" \(plugin "b"\)/);
        expect(stdout.join('\n')).toContain('build, x');

        resetReceived();
        await dispatch(['x'], [pluginA, pluginB, pluginC]);
        expect(received.map((r) => r.command)).toEqual(['b-build']);
    });

    it('deduplicates a command\'s own alias list', async () => {
        const dupey = definePlugin({
            name: 'dupey',
            detect: () => true,
            commands: {
                pack: {
                    description: 'Duplicate aliases declared',
                    aliases: ['pk', 'pk'],
                    run: async (ctx) => {
                        received.push({ command: 'pack', ctx });
                    },
                },
            },
        });

        const { stdout, logger } = await dispatch(['--help'], [dupey]);
        expect(stdout.join('\n')).toContain('pack, pk');
        expect(stdout.join('\n')).not.toContain('pk, pk');
        expect(logger.warns).toEqual([]);

        resetReceived();
        await dispatch(['pk'], [dupey]);
        expect(received.map((r) => r.command)).toEqual(['pack']);
    });
});

describe('plugin registration resilience', () => {
    beforeEach(() => resetReceived());
    afterEach(() => {
        process.exitCode = undefined;
    });

    it('isolates a DefinitionError to the offending command — siblings and core survive', async () => {
        const badPlugin = definePlugin({
            name: 'bad',
            detect: () => true,
            commands: {
                broken: {
                    description: 'Declares a reserved alias',
                    // 'help' is reserved by @sigx/args — .args() throws DefinitionError.
                    args: { thing: a.string().alias('help') },
                    run: async () => {},
                },
                healthy: {
                    description: 'Valid sibling command',
                    run: async (ctx) => {
                        received.push({ command: 'healthy', ctx });
                    },
                },
            },
        });

        const { logger } = await dispatch(['healthy'], [badPlugin, lynxLikePlugin]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "bad" command "broken" has an invalid args schema/);
        expect(received.map((r) => r.command)).toEqual(['healthy']);

        // The broken command is absent...
        const { stderr } = await dispatch(['broken'], [badPlugin]);
        expect(stderr.join('\n')).toMatch(/unknown command/i);

        // ...and the other plugin's commands still dispatch.
        resetReceived();
        await dispatch(['dev'], [badPlugin, lynxLikePlugin]);
        expect(received.map((r) => r.command)).toEqual(['dev']);
    });

    it('warns on command collisions and lets the last plugin win', async () => {
        const other = definePlugin({
            name: 'other',
            detect: () => true,
            commands: {
                dev: {
                    description: 'Competing dev command',
                    run: async (ctx) => {
                        received.push({ command: 'other-dev', ctx });
                    },
                },
            },
        });

        const { logger } = await dispatch(['dev'], [lynxLikePlugin, other]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "other" overrides command "dev"/);
        expect(received.map((r) => r.command)).toEqual(['other-dev']);
    });

    it('warns when a plugin overrides a core command', async () => {
        const usurper = definePlugin({
            name: 'usurper',
            detect: () => true,
            commands: {
                info: {
                    description: 'Shadows core info',
                    run: async (ctx) => {
                        received.push({ command: 'usurper-info', ctx });
                    },
                },
            },
        });

        const { logger } = await dispatch(['info'], [usurper]);
        expect(logger.warns.join('\n')).toMatch(/Plugin "usurper" overrides command "info"/);
        expect(received.map((r) => r.command)).toEqual(['usurper-info']);
    });
});
