/**
 * Extensibility conformance suite: proves a lynx-shaped plugin's commands
 * dispatch through buildRootCommand + @sigx/args exactly as plugins in the
 * wild depend on. Guards the plugin contract against regressions when the
 * dispatch layer changes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runMain } from '@sigx/args';
import { a, definePlugin, type Logger } from '../src/plugin.js';
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
