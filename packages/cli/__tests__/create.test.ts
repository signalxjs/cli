/**
 * `runCreate` tests — headless flags and the interactive wizard. The module
 * parses process.argv and TTY-ness at import time, so each test resets
 * modules and stubs the environment before a dynamic import. Scaffolding
 * and the post-steps are mocked: the flow is what is under test here
 * (compose has its own suite).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOutputTarget } from '@sigx/terminal';
import { captureOutput, settle, press, stripAnsi, ESC, ENTER, DOWN } from './harness.js';

const scaffoldSpec = vi.fn();
vi.mock('../src/commands/scaffold.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/commands/scaffold.js')>();
    return { ...real, scaffoldSpec: (spec: unknown) => scaffoldSpec(spec) };
});
const runInstall = vi.fn();
vi.mock('../src/create/postinstall/install.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/create/postinstall/install.js')>();
    return { ...real, runInstall: (o: unknown) => runInstall(o) };
});
const initGitRepo = vi.fn();
vi.mock('../src/create/postinstall/git.js', () => ({
    gitAvailable: () => true,
    insideGitRepo: () => false,
    initGitRepo: (cwd: string) => initGitRepo(cwd),
}));

const ttyRestores: Array<() => void> = [];
function stubTty(on: boolean) {
    for (const stream of [process.stdout, process.stdin] as const) {
        const desc = Object.getOwnPropertyDescriptor(stream, 'isTTY');
        Object.defineProperty(stream, 'isTTY', { value: on, configurable: true });
        ttyRestores.push(() => {
            if (desc) Object.defineProperty(stream, 'isTTY', desc);
            else delete (stream as { isTTY?: boolean }).isTTY;
        });
    }
}

async function importCreate(argv: string[]) {
    vi.resetModules();
    process.argv = ['node', 'sigx', 'create', ...argv];
    return await import('../src/commands/create.js');
}

/** Like importCreate, but without the leading 'create' command token —
 *  the shape `pnpm create @sigx …` actually produces. */
async function importCreateBare(argv: string[]) {
    vi.resetModules();
    process.argv = ['node', 'create-sigx', ...argv];
    return await import('../src/commands/create.js');
}

describe('runCreate', () => {
    let exitCode: number | undefined;
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let logSpy: ReturnType<typeof vi.spyOn>;
    let errSpy: ReturnType<typeof vi.spyOn>;
    const origArgv = process.argv;
    const origUa = process.env.npm_config_user_agent;

    beforeEach(() => {
        exitCode = undefined;
        scaffoldSpec.mockReset().mockReturnValue({ ok: true, files: 7, nextSteps: ['cd my-app', 'pnpm install', 'pnpm dev'] });
        runInstall.mockReset().mockResolvedValue({ ok: true, code: 0, output: '' });
        initGitRepo.mockReset().mockReturnValue({ ok: true, code: 0, output: '' });
        process.env.npm_config_user_agent = 'pnpm/10.0.0 npm/? node/v22.0.0';
        exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
            exitCode = code ?? 0;
            throw new Error('__exit__');
        }) as never);
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        process.argv = origArgv;
        if (origUa === undefined) delete process.env.npm_config_user_agent;
        else process.env.npm_config_user_agent = origUa;
        exitSpy.mockRestore();
        logSpy.mockRestore();
        errSpy.mockRestore();
        for (const r of ttyRestores.splice(0)) r();
        setOutputTarget(undefined);
        vi.useRealTimers();
    });

    /** Runs runCreate and swallows the synthetic exit. */
    async function run(mod: typeof import('../src/commands/create.js'), opts?: Parameters<typeof mod.runCreate>[0]) {
        try {
            await mod.runCreate(opts);
        } catch (err) {
            if (!(err instanceof Error) || err.message !== '__exit__') throw err;
        }
    }
    const transcript = () => logSpy.mock.calls.flat().join('\n');
    const errors = () => errSpy.mock.calls.flat().join('\n');

    describe('headless', () => {
        beforeEach(() => stubTty(false));

        it('scaffolds from --type/--styling (legacy vocabulary) without prompting', async () => {
            await run(await importCreate(['my-app', '--type', 'ssg', '--styling', 'tailwind']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-app', kind: 'ssg', styling: 'tailwind', install: false, git: false }));
            expect(exitCode).toBe(0);
            expect(transcript()).toContain('Creating SignalX app "my-app"');
            expect(transcript()).toContain('cd my-app');
        });

        it('maps basic → spa and ignores package-manager flags (--registry …)', async () => {
            await run(await importCreate(['--registry', 'https://x', 'my-app', '--type', 'basic']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-app', kind: 'spa' }));
            expect(exitCode).toBe(0);
        });

        it('bare shim argv: leading "create" token is dropped, a project may be named create', async () => {
            await run(await importCreateBare(['--registry', 'create', 'my-app', '--type', 'basic']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-app', kind: 'spa' }));
            await run(await importCreate(['create', '--type', 'basic']));
            expect(scaffoldSpec).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'create' }));
        });

        it('-y alone scaffolds the default SPA', async () => {
            await run(await importCreate(['-y']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-sigx-app', kind: 'spa', styling: 'none' }));
            expect(exitCode).toBe(0);
        });

        it('takes the full flag set', async () => {
            await run(await importCreate(['shop', '--kind', 'ssr', '--render', 'resume', '--target', 'cloudflare', '--styling', 'daisyui', '--features', 'server-fn,testing', '--pm', 'npm', '--install', '--git', '-y']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({
                name: 'shop', kind: 'ssr', render: 'resume', target: 'cloudflare', styling: 'daisyui', pm: 'npm', install: true, git: true,
            }));
            const spec = scaffoldSpec.mock.calls[0][0] as { features: Set<string> };
            expect([...spec.features]).toEqual(['server-fn', 'testing']);
            expect(runInstall).toHaveBeenCalledWith(expect.objectContaining({ pm: 'npm', captured: false }));
            expect(initGitRepo).toHaveBeenCalled();
            expect(exitCode).toBe(0);
        });

        it('--preset quick', async () => {
            await run(await importCreate(['--preset', 'quick', '-y']));
            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ kind: 'spa', styling: 'tailwind' }));
            const spec = scaffoldSpec.mock.calls[0][0] as { features: Set<string> };
            expect([...spec.features]).toEqual(['router', 'testing']);
        });

        it('rejects bad values with exit 2 and names the flag', async () => {
            await run(await importCreate(['my-app', '--type', 'nope']));
            expect(exitCode).toBe(2);
            expect(errors()).toMatch(/--type/);
            expect(scaffoldSpec).not.toHaveBeenCalled();

            await run(await importCreate(['my-app', '--kind', 'spa', '--type', 'ssr']));
            expect(exitCode).toBe(2);
            expect(errors()).toMatch(/disagree/);

            await run(await importCreate(['my-app', '--kind', 'spa', '--target', 'cloudflare']));
            expect(exitCode).toBe(2);
            expect(errors()).toMatch(/--kind ssr only/);

            await run(await importCreate(['my-app', '--kind', 'ssg', '--features', 'router']));
            expect(exitCode).toBe(2);
            expect(errors()).toMatch(/"router" is not available for ssg/);
        });

        it('--list prints the matrix and exits 0', async () => {
            await run(await importCreate(['--list']));
            expect(exitCode).toBe(0);
            expect(transcript()).toContain('Kinds (--kind)');
            expect(transcript()).toContain('cloudflare');
            expect(scaffoldSpec).not.toHaveBeenCalled();
        });

        it('a scaffold failure exits 1 with the error', async () => {
            scaffoldSpec.mockReturnValue({ ok: false, error: 'Directory "my-app" already exists!' });
            await run(await importCreate(['my-app', '--type', 'basic']));
            expect(exitCode).toBe(1);
            expect(errors()).toContain('already exists');
        });

        it('an install failure does not fail the run', async () => {
            runInstall.mockResolvedValue({ ok: false, code: 1, output: 'boom' });
            await run(await importCreate(['my-app', '--kind', 'spa', '--install']));
            expect(exitCode).toBe(0);
            expect(transcript()).toContain('Install failed');
        });
    });

    describe('interactive', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            stubTty(true);
        });

        it('quick start: name → preset → pm → install → git → confirm, then scaffold + post-steps', async () => {
            const cap = captureOutput();
            const done = run(await importCreate([]));

            await settle(); // intro + name prompt
            await press(ENTER); // my-sigx-app
            await settle();
            await press(ENTER); // Quick start
            await settle();
            await press(ENTER); // package manager: detected (pnpm)
            await settle();
            await press(ENTER); // install? yes
            await settle();
            await press(ENTER); // git? yes
            await settle();
            await press(ENTER); // create? yes
            await settle(300); // spinners + notes + outro
            await done;

            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({
                name: 'my-sigx-app', kind: 'spa', styling: 'tailwind', pm: 'pnpm', install: true, git: true,
            }));
            expect(runInstall).toHaveBeenCalledWith(expect.objectContaining({ pm: 'pnpm', captured: true }));
            expect(initGitRepo).toHaveBeenCalled();
            expect(exitCode).toBe(0);
            const out = stripAnsi(cap.output());
            expect(out).toContain('Create SignalX App');
            expect(out).toContain('Summary');
            expect(out).toContain('Next steps');
        });

        it('customize: SSR on Cloudflare, styling + extras kept at their defaults', async () => {
            captureOutput();
            const done = run(await importCreate(['--no-install', '--no-git']));

            await settle();
            await press(ENTER); // name
            await settle();
            await press(DOWN); await press(ENTER); // Customize
            await settle();
            await press(DOWN); await press(ENTER); // kind: ssr
            await settle();
            await press(ENTER); // render: hydrate
            await settle();
            await press(DOWN); await press(ENTER); // target: cloudflare
            await settle();
            await press(ENTER); // styling: none
            await settle();
            await press(ENTER); // extras: none
            await settle();
            await press(ENTER); // pm
            await settle();
            await press(ENTER); // create? yes
            await settle(300);
            await done;

            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({
                kind: 'ssr', render: 'hydrate', target: 'cloudflare', styling: 'none', install: false, git: false,
            }));
            expect(runInstall).not.toHaveBeenCalled();
            expect(initGitRepo).not.toHaveBeenCalled();
            expect(exitCode).toBe(0);
        });

        it('flags pre-answer the wizard: no preset question, values used as initials', async () => {
            captureOutput();
            const done = run(await importCreate(['--kind', 'terminal', '--no-install', '--no-git']));

            await settle();
            await press(ENTER); // name
            await settle();
            await press(ENTER); // kind: terminal (initial from flag; no preset question)
            await settle();
            await press(ENTER); // pm  (no styling / extras for terminal)
            await settle();
            await press(ENTER); // create? yes
            await settle(300);
            await done;

            expect(scaffoldSpec).toHaveBeenCalledWith(expect.objectContaining({ kind: 'terminal', styling: 'none' }));
            expect(exitCode).toBe(0);
        });

        it('rejects a --features value the chosen kind cannot take (exit 2)', async () => {
            captureOutput();
            const done = run(await importCreate(['--features', 'server-fn', '--no-install', '--no-git']));
            await settle();
            await press(ENTER); // name
            await settle();
            await press(ENTER); // kind: spa (initial) — server-fn needs ssr
            await settle();
            await press(ENTER); // styling
            await settle(200);
            await done;
            expect(exitCode).toBe(2);
            expect(scaffoldSpec).not.toHaveBeenCalled();
        });

        it('Esc cancels with exit 130 and no scaffold', async () => {
            captureOutput();
            const done = run(await importCreate([]));
            await settle();
            await press(ESC);
            await settle();
            await done;
            expect(scaffoldSpec).not.toHaveBeenCalled();
            expect(exitCode).toBe(130);
        });
    });
});

describe('interactive --features validation', () => {
    it('rejects an unknown or unsupported extra with exit 2 instead of dropping it', async () => {
        vi.useFakeTimers();
        let code: number | undefined;
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { code = c ?? 0; throw new Error('__exit__'); }) as never);
        for (const stream of [process.stdout, process.stdin] as const) Object.defineProperty(stream, 'isTTY', { value: true, configurable: true });
        captureOutput();
        vi.resetModules();
        process.argv = ['node', 'sigx', 'create', '--features', 'server-fn'];
        const mod = await import('../src/commands/create.js');
        const done = mod.runCreate().catch((e: Error) => { if (e.message !== '__exit__') throw e; });
        await settle();
        await press(ENTER); // name
        await settle();
        await press(ENTER); // type: basic — server-fn needs ssr
        await settle();
        await press(ENTER); // styling
        await settle(200);
        await done;
        expect(code).toBe(2);
        exitSpy.mockRestore();
        setOutputTarget(undefined);
        vi.useRealTimers();
    });
});
