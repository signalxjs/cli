/**
 * Compile-time contract tests for the typed plugin API. These are enforced
 * by `pnpm typecheck` (tsgo covers __tests__) — the expectTypeOf assertions
 * and @ts-expect-error markers fail the build on contract drift; the single
 * runtime test just keeps vitest from reporting an empty suite.
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import {
    a,
    defineCommand,
    definePlugin,
    type CommandContext,
    type PluginCommand,
    type SigxPlugin,
    type TypedCommandContext,
} from '../src/plugin.js';

describe('plugin contract types', () => {
    it('definePlugin returns a SigxPlugin at runtime (identity)', () => {
        const p = definePlugin({
            name: 't',
            detect: () => true,
            commands: { noop: { description: 'noop', run: async () => {} } },
        });
        expect(p.name).toBe('t');
        expect(Object.keys(p.commands)).toEqual(['noop']);
    });
});

// --- Inference inside a definePlugin literal (the lynx dev shape) ---------

definePlugin({
    name: 'typed',
    detect: () => true,
    commands: {
        dev: {
            description: 'typed dev',
            args: {
                port: a.string().describe('Port'),
                ios: a.boolean().default(false),
                'no-device-logs': a.boolean().default(false),
                variant: a.string(),
                count: a.number().alias('c').required(),
                mode: a.enum(['debug', 'release']).default('debug'),
                entries: a.rest(),
            },
            run: async (ctx) => {
                expectTypeOf(ctx.args.port).toEqualTypeOf<string | undefined>();
                expectTypeOf(ctx.args.ios).toEqualTypeOf<boolean>();
                expectTypeOf(ctx.args['no-device-logs']).toEqualTypeOf<boolean>();
                expectTypeOf(ctx.args.variant).toEqualTypeOf<string | undefined>();
                expectTypeOf(ctx.args.count).toEqualTypeOf<number>();
                expectTypeOf(ctx.args.mode).toEqualTypeOf<'debug' | 'release'>();
                expectTypeOf(ctx.args.entries).toEqualTypeOf<string[]>();
                expectTypeOf(ctx.args._).toEqualTypeOf<string[]>();

                // @ts-expect-error — typo'd arg keys are compile errors on typed commands
                void ctx.args.prot;

                // The lynx-cli 0.11 cast style must keep compiling unchanged.
                void (ctx.args.ios as boolean);
                void (ctx.args.port as string | undefined);

                // A typed ctx must flow into legacy helpers taking CommandContext.
                const takeLegacy = (c: CommandContext) => c.args;
                takeLegacy(ctx);
            },
        },
        // Arg-less command: ctx.args falls back to the legacy record.
        doctor: {
            description: 'no args',
            run: async (ctx) => {
                expectTypeOf(ctx.args).toEqualTypeOf<Record<string, unknown>>();
            },
        },
    },
});

// --- Legacy plugins keep compiling unchanged ------------------------------

// 1. A fully hand-annotated 0.4-style plugin object typed as SigxPlugin.
const legacyPlugin: SigxPlugin = {
    name: 'legacy',
    detect: () => true,
    commands: {
        build: {
            description: 'legacy build',
            args: { out: a.string() },
            run: (ctx: CommandContext) => {
                void (ctx.args.out as string | undefined);
                return Promise.resolve();
            },
        },
    },
};
definePlugin(legacyPlugin);

// 2. A typed defineCommand result must slot into a hand-built SigxPlugin
//    (pins SigxPlugin.commands being Record<string, PluginCommand<any>> —
//    with the default instantiation the conditional PluginArgs makes
//    specific PluginCommands incomparable).
const typedCommand = defineCommand({
    description: 'typed standalone',
    args: { port: a.number().default(8788) },
    run: async (ctx) => {
        expectTypeOf(ctx.args.port).toEqualTypeOf<number>();
    },
});
const handBuilt: SigxPlugin = {
    name: 'hand-built',
    detect: () => true,
    commands: { typed: typedCommand },
};
void handBuilt;

// Type-only assertions over declared (runtime-less) values — never invoked.
export function _typeOnlyAssertions(
    // The legacy default form participates in the same record as typed commands.
    untypedCommand: PluginCommand,
    typedCtx: TypedCommandContext<{ port: ReturnType<typeof a.number> }>,
): void {
    const mixed: SigxPlugin['commands'] = { typed: typedCommand, untyped: untypedCommand };
    void mixed;

    // 3. TypedCommandContext<S> is assignable to plain CommandContext.
    const asBase: CommandContext = typedCtx;
    void asBase;

    // 4. unknownFlags is available on both context forms.
    expectTypeOf(typedCtx.unknownFlags).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(asBase.unknownFlags).toEqualTypeOf<string[] | undefined>();
}
