/** @jsxImportSource @sigx/terminal */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOutputTarget, Text } from '@sigx/terminal';
import { captureOutput, settle, press, type, stripAnsi, ESC } from './harness.js';
import { runShell } from '../src/shell/runShell.js';
import type { ShellHandle } from '../src/plugin.js';
import type { ShellConfig } from '../src/shell/types.js';
import type { SigxPlugin } from '../src/plugin.js';

const config = (over: Partial<ShellConfig> = {}): ShellConfig => ({
    title: 'sigx dev',
    version: 'v0.3.0',
    tabs: [
        { id: 'home', label: 'Home', render: () => <Text color="fg">home body</Text> },
        { id: 'logs', label: 'Logs', render: () => <Text color="fg">logs body</Text> },
    ],
    ...over,
});

describe('runShell', () => {
    let shell: ShellHandle | null = null;
    let exitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.useFakeTimers();
        exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    });
    afterEach(async () => {
        shell?.exit(0);
        await settle();
        shell = null;
        exitSpy.mockRestore();
        setOutputTarget(undefined);
        vi.useRealTimers();
    });

    it('prints the header once and renders the first tab', async () => {
        const cap = captureOutput();
        shell = await runShell(config(), { interactive: true });
        await settle();
        const out = stripAnsi(cap.output());
        expect(out).toContain('sigx dev');
        expect(out).toContain('v0.3.0');
        expect(out).toContain('home body');
        expect(out).toContain('Home');
        expect(out).toContain('Logs');
    });

    it('say() lands in the transcript; switchTab switches the body', async () => {
        const cap = captureOutput();
        shell = await runShell(config(), { interactive: true });
        await settle();
        shell.say('server ready on :8788');
        await settle();
        expect(stripAnsi(cap.output())).toContain('server ready on :8788');

        shell.switchTab('logs');
        await settle();
        const frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('logs body');
    });

    it('slash input opens intellisense over merged commands and runs them', async () => {
        const ran: string[] = [];
        const plugins: SigxPlugin[] = [{
            name: 'lynx',
            detect: () => true,
            commands: {},
            tui: { commands: [{ name: '/reload', description: 'reload bundle', run: () => { ran.push('reload'); } }] },
        }];
        const cap = captureOutput();
        shell = await runShell(config({ plugins }), { interactive: true });
        await settle();

        await type('/rel');
        const frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('/reload');
        expect(frame).toContain('reload bundle');

        await press('\r'); // accept suggestion
        await settle();
        expect(ran).toEqual(['reload']);
    });

    it('single-key shortcuts fire only while the input is empty', async () => {
        const fired: string[] = [];
        shell = await runShell(config({
            shortcuts: [{ key: 'r', label: 'reload', run: () => { fired.push('r'); } }],
        }), { interactive: true });
        await settle();

        await press('r');
        expect(fired).toEqual(['r']);

        await type('/re'); // now the input is non-empty
        await press('r');  // must type into the input, not fire the shortcut
        expect(fired).toEqual(['r']);
        await press(ESC); // dismiss suggestions
    });

    it('digits switch tabs; pushed views render alone and Esc pops back', async () => {
        const cap = captureOutput();
        shell = await runShell(config(), { interactive: true });
        await settle();

        await press('2');
        let frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('logs body');

        shell.pushView('home');
        await settle();
        frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('home body');

        await press(ESC);
        frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('logs body');
    });

    it('Ctrl+C runs onExit before exiting with 130', async () => {
        const order: string[] = [];
        exitSpy.mockImplementation(((code: number) => { order.push(`exit:${code}`); }) as never);
        captureOutput();
        shell = await runShell(config({
            onExit: () => { order.push('cleanup'); },
        }), { interactive: true });
        await settle();

        await press(String.fromCharCode(3));
        await settle();
        expect(order).toEqual(['cleanup', 'exit:130']);
        shell = null; // already exited
    });

    it('fullscreen: alt-screen frame with title bar, tabs, and key hints', async () => {
        const cap = captureOutput();
        shell = await runShell(config({ mode: 'fullscreen' }), { interactive: true });
        await settle();
        const raw = cap.chunks.join('');
        expect(raw).toContain('\x1b[?1049h'); // alt screen entered
        const out = stripAnsi(cap.output());
        expect(out).toContain('sigx dev');
        expect(out).toContain('Home');
        expect(out).toContain('home body');
        expect(out).toContain('commands'); // key hints visible (no permanent input)
    });

    it('fullscreen: / opens the palette, runs a command, Esc closes it', async () => {
        const ran: string[] = [];
        const cap = captureOutput();
        shell = await runShell(config({
            mode: 'fullscreen',
            commands: [{ name: '/reload', description: 'reload bundle', run: () => { ran.push('reload'); } }],
        }), { interactive: true });
        await settle();

        await press('/');
        let frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('command'); // palette divider label

        await settle(); // past the TextArea's 50ms post-mount key cooldown
        await type('/rel');
        frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('reload bundle'); // intellisense
        await press('\r'); // accept
        await settle();
        expect(ran).toEqual(['reload']);

        // Palette closed again — shortcuts/hints visible, digit switches tabs.
        await press('2');
        frame = stripAnsi(cap.chunks[cap.chunks.length - 1] ?? '');
        expect(frame).toContain('logs body');
    });

    it('fullscreen: shortcuts fire while the palette is closed, not while open', async () => {
        const fired: string[] = [];
        shell = await runShell(config({
            mode: 'fullscreen',
            shortcuts: [{ key: 'r', label: 'reload', run: () => { fired.push('r'); } }],
        }), { interactive: true });
        await settle();

        await press('r');
        expect(fired).toEqual(['r']);

        await press('/'); // open palette
        await settle(); // past the TextArea key cooldown
        await press('r'); // types into the palette input
        expect(fired).toEqual(['r']);
        await press(ESC); // close
        await press('r');
        expect(fired).toEqual(['r', 'r']);
    });

    it('fullscreen: say() lands in the log store (live) for the Logs tab', async () => {
        captureOutput();
        shell = await runShell(config({ mode: 'fullscreen' }), { interactive: true });
        await settle();
        const seen: string[] = [];
        const store = shell.store as unknown as { tail: (n: number) => string[] };
        shell.say('build finished');
        await settle();
        seen.push(...store.tail(5));
        expect(seen.join('\n')).toContain('build finished');
    });

    it('non-TTY: plain handle, no ANSI frames, onReady still runs', async () => {
        const ready = vi.fn();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const cap = captureOutput({ isTTY: false });
        shell = await runShell(config({ onReady: ready }), { interactive: false });
        expect(shell.isInteractive).toBe(false);
        shell.say('plain line');
        expect(ready).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith('plain line');
        expect(cap.chunks.join('')).not.toContain('\x1b[');
        logSpy.mockRestore();
        shell = null; // nothing mounted
    });
});
