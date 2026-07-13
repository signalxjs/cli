/**
 * Semantic anti-drift guard for the hand-written published declarations
 * (scripts/generate-types.js). generate-types.test.ts string-matches the
 * output; this test goes further and TYPE-CHECKS a consumer against the
 * emitted dist/plugin.d.ts with the real TypeScript compiler — the failure
 * mode of #55 (runtime exported the new contract, declarations didn't)
 * fails here even if every string assertion is kept in sync.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lives virtually inside the package dir so @sigx/args resolves through the
// normal node_modules chain; never written to disk.
const consumerPath = join(pkgDir, '__dts_consumer__.ts').replace(/\\/g, '/');

const consumerSource = `
import { a, definePlugin, defineCommand, type CommandContext, type SigxPlugin } from './dist/plugin.js';

definePlugin({
    name: 'consumer',
    detect: () => true,
    commands: {
        dev: {
            description: 'typed',
            args: {
                port: a.string(),
                ios: a.boolean().default(false),
                count: a.number().required(),
            },
            aliases: ['d'],
            allowUnknownFlags: true,
            run: async (ctx) => {
                const port: string | undefined = ctx.args.port;
                const ios: boolean = ctx.args.ios;
                const count: number = ctx.args.count;
                const rest: string[] = ctx.args._;
                const unknown: string[] | undefined = ctx.unknownFlags;
                const legacy: CommandContext = ctx;
                void [port, ios, count, rest, unknown, legacy];
            },
        },
        doctor: {
            description: 'arg-less',
            run: async (ctx) => {
                const args: Record<string, unknown> = ctx.args;
                void args;
            },
        },
    },
});

const standalone = defineCommand({
    description: 'standalone',
    args: { out: a.string() },
    run: async (ctx) => {
        const out: string | undefined = ctx.args.out;
        void out;
    },
});

const handBuilt: SigxPlugin = {
    name: 'hand-built',
    detect: () => true,
    commands: { standalone },
};
void handBuilt;
`;

function typecheckConsumer(): ts.Diagnostic[] {
    const options: ts.CompilerOptions = {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
    const host = ts.createCompilerHost(options);
    const origReadFile = host.readFile.bind(host);
    const origFileExists = host.fileExists.bind(host);
    host.readFile = (f) => (f.replace(/\\/g, '/') === consumerPath ? consumerSource : origReadFile(f));
    host.fileExists = (f) => f.replace(/\\/g, '/') === consumerPath || origFileExists(f);
    const program = ts.createProgram([consumerPath], options, host);
    return [...ts.getPreEmitDiagnostics(program)];
}

beforeAll(() => {
    execSync('node scripts/generate-types.js', { cwd: pkgDir, stdio: 'pipe' });
});

describe('published plugin.d.ts semantics', () => {
    it('a typed consumer of dist/plugin.d.ts type-checks with zero diagnostics', () => {
        const diagnostics = typecheckConsumer();
        const messages = diagnostics.map((d) =>
            ts.flattenDiagnosticMessageText(d.messageText, '\n') + (d.file ? ` [${d.file.fileName}:${d.start}]` : ''),
        );
        expect(messages).toEqual([]);
    });
});
