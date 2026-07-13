/**
 * `runCreate` tests. The module parses process.argv and TTY-ness at import
 * time, so each test resets modules and stubs the environment before a
 * dynamic import.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOutputTarget } from '@sigx/terminal';
import { captureOutput, settle, press, type, stripAnsi, ESC, ENTER } from './harness.js';

const scaffoldProject = vi.fn();
vi.mock('../src/commands/scaffold.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/commands/scaffold.js')>();
    return { ...real, scaffoldProject: (opts: unknown) => scaffoldProject(opts) };
});

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

    beforeEach(() => {
        exitCode = undefined;
        scaffoldProject.mockReset().mockReturnValue({ ok: true });
        exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
            exitCode = code ?? 0;
            throw new Error('__exit__');
        }) as never);
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        process.argv = origArgv;
        while (ttyRestores.length) ttyRestores.pop()!();
        exitSpy.mockRestore();
        logSpy.mockRestore();
        errSpy.mockRestore();
        setOutputTarget(undefined);
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const run = async (mod: { runCreate: () => Promise<void> }) =>
        mod.runCreate().catch((e: Error) => { if (e.message !== '__exit__') throw e; });

    it('headless: flags scaffold without prompting, exit 0', async () => {
        stubTty(false);
        const mod = await importCreate(['my-app', '--type', 'ssg', '--styling', 'tailwind']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'my-app', projectType: 'ssg', styling: 'tailwind' });
        expect(exitCode).toBe(0);
        const transcript = logSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
        expect(transcript).toContain('Creating SignalX app "my-app"');
        expect(transcript).toContain('cd my-app');
    });

    it('headless: invalid --type exits 2 without scaffolding', async () => {
        stubTty(false);
        const mod = await importCreate(['my-app', '--type', 'bogus']);
        await run(mod);
        expect(scaffoldProject).not.toHaveBeenCalled();
        expect(exitCode).toBe(2);
    });

    it('headless: unknown flag values do not leak into positionals', async () => {
        // `pnpm create @sigx --registry https://x my-app` must scaffold
        // "my-app", not a project named "https://x".
        stubTty(false);
        const mod = await importCreate(['--registry', 'https://x', 'my-app', '--type', 'basic']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'my-app', projectType: 'basic', styling: 'none' });
        expect(exitCode).toBe(0);
    });

    it('headless: -y short alias skips prompts', async () => {
        stubTty(false);
        const mod = await importCreate(['my-app', '-y']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'my-app', projectType: 'basic', styling: 'none' });
        expect(exitCode).toBe(0);
    });

    it('headless: --type=value equals form parses', async () => {
        stubTty(false);
        const mod = await importCreate(['my-app', '--type=ssg', '--styling=tailwind']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'my-app', projectType: 'ssg', styling: 'tailwind' });
        expect(exitCode).toBe(0);
    });

    it('headless: --type with no value exits 2 with a message', async () => {
        stubTty(false);
        const mod = await importCreate(['my-app', '--type']);
        await run(mod);
        expect(scaffoldProject).not.toHaveBeenCalled();
        expect(exitCode).toBe(2);
        expect(errSpy.mock.calls.flat().join('\n')).toMatch(/--type/);
    });

    it('headless: a project can literally be named "create"', async () => {
        // argv is ['create', 'create', ...] — only the first (command) token
        // is the shim invocation; the second is the project name.
        stubTty(false);
        const mod = await importCreate(['create', '--type', 'basic']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'create', projectType: 'basic', styling: 'none' });
        expect(exitCode).toBe(0);
    });

    it('headless: only a LEADING create token is stripped — "create" stays valid as a flag value', async () => {
        // Without the leading command token, an unknown flag whose value is
        // literally "create" must keep that value; stripping it would make
        // --registry swallow the project name instead.
        stubTty(false);
        const mod = await importCreateBare(['--registry', 'create', 'my-app', '--type', 'basic']);
        await run(mod);
        expect(scaffoldProject).toHaveBeenCalledWith({ projectName: 'my-app', projectType: 'basic', styling: 'none' });
        expect(exitCode).toBe(0);
    });

    it('headless: scaffold failure exits 1', async () => {
        stubTty(false);
        scaffoldProject.mockReturnValue({ ok: false, error: 'Directory "my-app" already exists!' });
        const mod = await importCreate(['my-app', '--type', 'basic']);
        await run(mod);
        expect(exitCode).toBe(1);
        expect(errSpy.mock.calls.flat().join('\n')).toContain('already exists');
    });

    it('interactive: prompts collapse to a transcript and scaffold runs', async () => {
        vi.useFakeTimers();
        stubTty(true);
        const cap = captureOutput();
        const mod = await importCreate([]);
        const done = run(mod);

        await settle(); // intro + name prompt ready
        await press(ENTER); // accept default name my-sigx-app
        await settle();
        await press(ENTER); // project type: basic (initial)
        await settle();
        await press(ENTER); // styling: none (initial)
        await settle(200); // spinner + note + outro
        await done;

        expect(scaffoldProject).toHaveBeenCalledWith({
            projectName: 'my-sigx-app', projectType: 'basic', styling: 'none',
        });
        expect(exitCode).toBe(0);
        const out = stripAnsi(cap.output());
        expect(out).toContain('Create SignalX App');
        expect(out).toContain('Next steps');
    });

    it('interactive: Esc cancels with exit 130 and no scaffold', async () => {
        vi.useFakeTimers();
        stubTty(true);
        captureOutput();
        const mod = await importCreate([]);
        const done = run(mod);

        await settle();
        await press(ESC);
        await settle();
        await done;

        expect(scaffoldProject).not.toHaveBeenCalled();
        expect(exitCode).toBe(130);
    });
});
