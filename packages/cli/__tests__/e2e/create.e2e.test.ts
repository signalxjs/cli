/**
 * Opt-in end-to-end proof that scaffolded projects actually install and
 * build against the published @sigx packages. Off by default (network,
 * minutes); CI runs it in its own job:
 *
 *     SIGX_E2E=1 pnpm test -- e2e
 *
 * Requires `pnpm build` first — it drives the built CLI (`dist/cli.js`)
 * exactly the way `npm create @sigx` does.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enabled = process.env.SIGX_E2E === '1';
const cliDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = join(cliDir, 'dist', 'cli.js');
const isWin = process.platform === 'win32';

const SPECS: Array<[string, string[], { build?: boolean; artifacts: string[] }]> = [
    ['spa-tailwind', ['--type', 'basic', '--styling', 'tailwind'], { build: true, artifacts: ['dist/index.html'] }],
    ['ssr-node', ['--type', 'ssr'], { build: true, artifacts: ['dist/server/sigx-app.js', 'dist/server/entry-server.js', 'dist/client/index.html'] }],
    ['ssr-cloudflare-resume', ['--type', 'ssr', '--target', 'cloudflare', '--render', 'resume'], { build: true, artifacts: ['dist/server/entry.cloudflare.js', 'dist/client/index.html'] }],
    ['ssg', ['--type', 'ssg'], { build: true, artifacts: ['dist/index.html', 'dist/sitemap.xml'] }],
    ['terminal', ['--type', 'terminal'], { build: false, artifacts: [] }],
];

function run(cmd: string, args: string[], cwd: string): string {
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: isWin, env: { ...process.env, CI: '1' } });
    if (r.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})\n${r.stdout}\n${r.stderr}`);
    }
    return r.stdout;
}

describe.skipIf(!enabled)('create e2e (SIGX_E2E=1)', () => {
    let root: string;
    beforeAll(() => {
        expect(existsSync(cli), 'run `pnpm build` first').toBe(true);
        // realpath: on Windows runners the temp dir is an 8.3 short path
        // (RUNNER~1), and a build root that differs from its resolved form
        // makes rolldown compute asset names that escape the root.
        root = realpathSync.native(mkdtempSync(join(tmpdir(), 'sigx-e2e-')));
    });
    // Removing five installed projects takes a while (and Windows holds
    // handles briefly) — well past vitest's default 10 s hook timeout.
    afterAll(() => {
        if (root) rmSync(root, { recursive: true, force: true, maxRetries: 5 });
    }, 120_000);

    it.each(SPECS)('%s: scaffold → install → typecheck → build', (name, flags, opts) => {
        const out = execFileSync(process.execPath, [cli, 'create', name, ...flags, '-y'], { cwd: root, encoding: 'utf8' });
        expect(out).toContain('Project created');
        const dir = join(root, name);
        expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name).toBe(name);

        run('pnpm', ['install', '--reporter=silent'], dir);
        run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], dir);
        if (opts.build) run('pnpm', ['build'], dir);
        for (const artifact of opts.artifacts) {
            expect(existsSync(join(dir, artifact)), `${name}: ${artifact}`).toBe(true);
        }
    }, 10 * 60_000);
});
