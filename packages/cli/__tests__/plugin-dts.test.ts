/**
 * Semantic anti-drift guard for the hand-written published declarations
 * (scripts/generate-types.js). generate-types.test.ts string-matches the
 * output; this test goes further and TYPE-CHECKS a consumer against the
 * emitted dist/plugin.d.ts with the real TypeScript compiler — the failure
 * mode of #55 (runtime exported the new contract, declarations didn't)
 * fails here even if every string assertion is kept in sync.
 *
 * TypeScript 7 ships no JS compiler API, so the consumer is written to a
 * scratch dir and checked by spawning `tsc`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tscBin = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc');

// Lives inside the package dir so @sigx/args resolves through the normal
// node_modules chain; removed after the run.
let consumerDir: string;

const consumerSource = `
import { a, definePlugin, defineCommand, type CommandContext, type SigxPlugin } from '../dist/plugin.js';

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

function typecheckConsumer(): string {
    writeFileSync(join(consumerDir, 'consumer.ts'), consumerSource);
    writeFileSync(join(consumerDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            types: [],
        },
        files: ['consumer.ts'],
    }));
    const r = spawnSync(process.execPath, [tscBin, '-p', join(consumerDir, 'tsconfig.json'), '--pretty', 'false'], { encoding: 'utf8' });
    return r.status === 0 ? '' : `${r.stdout}${r.stderr}` || `tsc exited with ${r.status}`;
}

beforeAll(() => {
    execSync('node scripts/generate-types.js', { cwd: pkgDir, stdio: 'pipe' });
    consumerDir = mkdtempSync(join(pkgDir, '__dts_consumer_'));
});

afterAll(() => {
    rmSync(consumerDir, { recursive: true, force: true });
});

describe('published plugin.d.ts semantics', () => {
    it('a typed consumer of dist/plugin.d.ts type-checks with zero diagnostics', () => {
        expect(typecheckConsumer()).toBe('');
    });
});
