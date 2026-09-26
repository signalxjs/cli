/**
 * Opt-in end-to-end proof that scaffolded projects actually install and
 * build against the published @sigx packages. Off by default (network,
 * minutes); CI runs it in its own job:
 *
 *     SIGX_E2E=1 pnpm test -- e2e
 *
 * Requires `pnpm build` first — it drives the built CLI (`dist/cli.js`)
 * exactly the way `npm create @sigx` does.
 *
 * In-repo packages a scaffold pins (`@sigx/cli`, for templates whose
 * scripts run `sigx`) are NOT installed from npm: they are `pnpm pack`ed
 * from this checkout and forced in with a pnpm `overrides` entry. On a
 * release PR the pinned version exists only after the tag publishes, so an
 * npm install could never pass there (#118) — and on every other PR the
 * tarball is the CLI under review, not the last published one. The pin TEXT
 * the generator stamped is asserted separately, before the override.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dep } from '../../src/create/deps.js';

const enabled = process.env.SIGX_E2E === '1';
const cliDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = join(cliDir, 'dist', 'cli.js');
const isWin = process.platform === 'win32';
const packagesDir = join(cliDir, '..');

const SPECS: Array<[string, string[], { build?: boolean; test?: boolean; artifacts: string[] }]> = [
    ['spa-tailwind', ['--type', 'basic', '--styling', 'tailwind', '--features', 'router,i18n,testing'], { build: true, test: true, artifacts: ['dist/index.html'] }],
    ['ssr-node', ['--type', 'ssr', '--features', 'router,i18n,testing,server-fn'], { build: true, test: true, artifacts: ['dist/server/sigx-app.js', 'dist/server/entry-server.js', 'dist/server/sigx-server-fns.js', 'dist/client/index.html'] }],
    ['ssr-cloudflare-resume', ['--type', 'ssr', '--target', 'cloudflare', '--render', 'resume'], { build: true, artifacts: ['dist/server/entry.cloudflare.js', 'dist/client/index.html'] }],
    ['ssg', ['--type', 'ssg', '--features', 'testing'], { build: true, test: true, artifacts: ['dist/index.html', 'dist/sitemap.xml'] }],
    ['terminal', ['--type', 'terminal'], { build: false, artifacts: [] }],
    // Lynx: the JS bundle only — native builds need an Android SDK / Xcode.
    // Guards the template's version pins (signalxjs/lynx#1147: a stale
    // @sigx/runtime-core pin broke every new app at startup).
    ['lynx-daisyui', ['--kind', 'lynx', '--styling', 'daisyui'], { build: true, artifacts: ['dist/main.lynx.bundle'] }],
];

function run(cmd: string, args: string[], cwd: string): string {
    // Drop vitest's NODE_ENV=test: tools that key off NODE_ENV (rspeedy's
    // build mode) would otherwise build the scaffold in development mode.
    const { NODE_ENV: _vitestNodeEnv, ...env } = process.env;
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: isWin, env: { ...env, CI: '1' } });
    if (r.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})\n${r.stdout}\n${r.stderr}`);
    }
    return r.stdout;
}

/** This repo's publishable packages: name → { version, dir }. */
function localPackages(): Map<string, { version: string; dir: string }> {
    const out = new Map<string, { version: string; dir: string }>();
    for (const entry of readdirSync(packagesDir)) {
        const dir = join(packagesDir, entry);
        const manifest = join(dir, 'package.json');
        if (!existsSync(manifest)) continue;
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
        if (!pkg.private) out.set(pkg.name, { version: pkg.version, dir });
    }
    return out;
}

/**
 * Point every in-repo package the scaffold pins at its local tarball.
 * `overrides` (not a rewritten dependency range) so a transitive request
 * resolves to it too — @sigx/ssg peer-depends on @sigx/cli. Written to
 * pnpm-workspace.yaml (the settings file pnpm 11 still reads): appended
 * when the scaffold generated one, created when it did not.
 */
function overrideLocalPackages(dir: string, tarballs: Map<string, string>): string[] {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const pinned = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    const names = Object.keys(pinned).filter((n) => tarballs.has(n));
    if (!names.length) return names;
    const lines = names.map((n) => `  '${n}': 'file:${tarballs.get(n)!.replace(/\\/g, '/')}'`);
    const ws = join(dir, 'pnpm-workspace.yaml');
    const existing = existsSync(ws) ? readFileSync(ws, 'utf8') : '';
    expect(existing, 'scaffold already declares overrides — merge instead of appending').not.toMatch(/^overrides:/m);
    const block = ['', '# e2e only: in-repo packages from their local tarballs (#118)', 'overrides:', ...lines, ''].join('\n');
    writeFileSync(ws, (existing && !existing.endsWith('\n') ? existing + '\n' : existing) + block);
    return names;
}

describe.skipIf(!enabled)('create e2e (SIGX_E2E=1)', () => {
    let root: string;
    // Filled in beforeAll, not at collection: a skipped suite does no fs work.
    let local = new Map<string, { version: string; dir: string }>();
    const tarballs = new Map<string, string>();
    beforeAll(() => {
        expect(existsSync(cli), 'run `pnpm build` first').toBe(true);
        // realpath: on Windows runners the temp dir is an 8.3 short path
        // (RUNNER~1), and a build root that differs from its resolved form
        // makes rolldown compute asset names that escape the root.
        root = realpathSync.native(mkdtempSync(join(tmpdir(), 'sigx-e2e-')));
        // Pack the built in-repo packages once; scaffolds install from these.
        local = localPackages();
        const packs = join(root, '_packs');
        mkdirSync(packs);
        for (const [name, { dir }] of local) {
            const before = new Set(readdirSync(packs));
            run('pnpm', ['pack', '--pack-destination', packs], dir);
            const made = readdirSync(packs).filter((f) => f.endsWith('.tgz') && !before.has(f));
            expect(made, `pnpm pack ${name}`).toHaveLength(1);
            tarballs.set(name, join(packs, made[0]));
        }
    }, 120_000);
    // Removing five installed projects takes a while (and Windows holds
    // handles briefly) — well past vitest's default 10 s hook timeout.
    afterAll(() => {
        if (root) rmSync(root, { recursive: true, force: true, maxRetries: 5 });
    }, 120_000);

    it.each(SPECS)('%s: scaffold → install → typecheck → build', (name, flags, opts) => {
        const out = execFileSync(process.execPath, [cli, 'create', name, ...flags, '-y'], { cwd: root, encoding: 'utf8' });
        expect(out).toContain('Project created');
        const dir = join(root, name);
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        expect(pkg.name).toBe(name);

        // The stamped pin text: the generator's range, on this checkout's
        // major.minor — the version a release PR is about to publish.
        const pinned = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
        for (const [pkgName, { version }] of local) {
            if (!(pkgName in pinned)) continue;
            expect(pinned[pkgName], `${name}: ${pkgName} pin`).toBe(dep(pkgName));
            const [major, minor] = version.split('.');
            expect(pinned[pkgName].startsWith(`^${major}.${minor}.`), `${name}: ${pkgName} pin ${pinned[pkgName]} is not on ${version}'s line`).toBe(true);
        }
        overrideLocalPackages(dir, tarballs);

        run('pnpm', ['install', '--reporter=silent'], dir);
        run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], dir);
        if (opts.test) run('pnpm', ['test'], dir);
        if (opts.build) run('pnpm', ['build'], dir);
        for (const artifact of opts.artifacts) {
            expect(existsSync(join(dir, artifact)), `${name}: ${artifact}`).toBe(true);
        }
    }, 10 * 60_000);
});
