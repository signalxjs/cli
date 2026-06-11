/** @jsxImportSource @sigx/terminal */
/**
 * The persistent dev-shell runtime plugin commands host their dashboards in.
 *
 * Two layouts:
 *
 * - `mode: 'fullscreen'` (dashboards — k9s/showcase shape): alt-screen app
 *   with a title bar, segmented tab strip, full-height tab body, and a
 *   pinned status/hints line. `/` summons a command-palette overlay with
 *   intellisense. `say()` streams into the log store (visible live in a
 *   Logs tab) AND queues into the normal terminal buffer, so quitting
 *   leaves a post-mortem trail in real scrollback.
 *
 * - `mode: 'inline'` (default — transcript shape): header printed once into
 *   scrollback, permanent transcript via `say`, tabs + bottom-anchored
 *   `/`-command input. The conversation IS the terminal scrollback.
 *
 * Both: plugin-contributed tabs/commands/shortcuts/status (mergeShellConfig),
 * single-key shortcuts, 1–9 tab switching, Esc-pop views, and Ctrl+C that
 * runs onExit cleanup BEFORE exiting. In non-TTY environments nothing
 * mounts — callers get a plain streaming handle with the same shape.
 */
import {
    defineApp, component, signal, onMounted, onUnmounted, terminalMount, exitTerminal,
    TextArea, SuggestionList, Tabs, Divider, KeyHints, Text, Col, Spacer, Box,
    renderPixelArt, createViewStack, onKey, isEsc, printStatic, paintToken,
    getTerminalSize, layoutText, createLogStore,
} from '@sigx/terminal';
import type { ShellHandle, SlashCommand, StatusItem } from '../plugin.js';
import type { ShellConfig } from './types.js';
import { collectTuiContributions, mergeShellConfig } from './contributions.js';

const CTRL_C = String.fromCharCode(3);
const MAX_INPUT_ROWS = 6;

export async function runShell(
    config: ShellConfig,
    opts: { interactive?: boolean } = {},
): Promise<ShellHandle> {
    const merged = mergeShellConfig(
        config,
        collectTuiContributions(config.plugins ?? []),
    );
    const fullscreen = merged.mode === 'fullscreen';

    const interactive = opts.interactive ?? (!!process.stdout.isTTY && !!process.stdin.isTTY);
    if (!interactive) {
        return plainShell(merged);
    }

    const store = createLogStore();
    const status = signal({ items: [] as StatusItem[] });
    const transcript = signal({ lines: 0 });
    const tab = signal({ active: merged.tabs[0]?.id ?? '' });
    const views = createViewStack<string>('shell');

    const say = (text = '') => {
        if (fullscreen) {
            // Live: into the log store (a Logs tab shows it immediately).
            // Permanent: printStatic queues fullscreen statics and flushes
            // them into the normal buffer on exit — the post-mortem trail.
            store.push(text + '\n');
            printStatic(text);
            return;
        }
        // ORDER MATTERS: bump the counter first — the signal write re-renders
        // synchronously, so printStatic's immediate repaint uses the shrunk
        // filler and the bottom anchor never overflows the viewport.
        transcript.lines += text.split('\n').length;
        printStatic(text);
    };

    let exiting = false;
    const shell: ShellHandle = {
        isInteractive: true,
        say,
        store,
        setStatus: (items) => { status.items = items; },
        switchTab: (id) => {
            if (merged.tabs.some((t) => t.id === id)) tab.active = id;
        },
        pushView: (id) => views.push(id),
        popView: () => views.pop(),
        exit: (code = 0) => {
            if (exiting) return;
            exiting = true;
            void (async () => {
                try {
                    await merged.onExit?.();
                } finally {
                    exitTerminal();
                    process.exit(code);
                }
            })();
        },
    };

    const builtins: SlashCommand[] = [
        {
            name: '/help',
            description: 'list available commands',
            run: () => {
                say('');
                for (const c of allCommands()) {
                    say(`  ${paintToken(c.name, 'accent')}  ${paintToken(c.description, 'dim')}`);
                }
            },
        },
        { name: '/quit', description: 'exit', run: () => shell.exit(0) },
    ];
    const allCommands = (): SlashCommand[] => [...(merged.commands ?? []), ...builtins];

    const runCommand = async (name: string) => {
        const cmd = allCommands().find((c) => c.name === name);
        if (!cmd) {
            say(paintToken(`unknown command ${name} — try /help`, 'dim'));
            return;
        }
        try {
            await cmd.run(shell);
        } catch (err) {
            say(paintToken(`${name} failed: ${err instanceof Error ? err.message : String(err)}`, 'danger'));
        }
    };

    const ShellApp = component(() => {
        const input = signal({ value: '' });
        // Fullscreen: the command input is a summoned palette, not permanent
        // chrome. `/` opens it; Esc / submit closes it.
        const palette = signal({ open: false });
        const offs: Array<() => void> = [];

        const inputActive = () => (fullscreen ? palette.open : input.value !== '');

        const closePalette = () => {
            palette.open = false;
            input.value = '';
        };

        const submit = (text: string) => {
            const trimmed = text.trim();
            input.value = '';
            if (fullscreen) palette.open = false;
            if (!trimmed) return;
            if (trimmed.startsWith('/')) {
                void runCommand(trimmed.split(/\s/)[0]);
                return;
            }
            say(paintToken(`type / for commands`, 'dim'));
        };

        onMounted(() => {
            if (!fullscreen) {
                // Header — once, into scrollback. (Fullscreen renders the
                // title bar inside the frame instead.)
                if (merged.logo) say(renderPixelArt(merged.logo.rows, merged.logo.palette).join('\n'));
                say(`${paintToken(merged.title, 'accent')}${merged.version ? ` ${paintToken(merged.version, 'dim')}` : ''}`);
                say('');
            }

            // Esc: close the palette first; then pop pushed views.
            offs.push(onKey((key) => {
                if (!isEsc(key)) return;
                if (fullscreen && palette.open) {
                    closePalette();
                    return true;
                }
                if (views.depth() > 1) {
                    views.pop();
                    return true;
                }
            }, { layer: 'view' }));

            // `/` summons the palette (fullscreen); single-key shortcuts +
            // 1–9 tab switching. Overlay layer so they run BEFORE the
            // TextArea — inactive whenever the input owns the keyboard.
            offs.push(onKey((key) => {
                if (inputActive()) return;
                if (fullscreen && key === '/') {
                    palette.open = true;
                    return true;
                }
                const digit = key.length === 1 ? key.charCodeAt(0) - 48 : 0;
                if (digit >= 1 && digit <= Math.min(9, merged.tabs.length)) {
                    tab.active = merged.tabs[digit - 1].id;
                    return true;
                }
                const sc = (merged.shortcuts ?? []).find((s) => s.key === key);
                if (sc) {
                    void Promise.resolve(sc.run(shell)).catch((err) => {
                        say(paintToken(`${sc.label} failed: ${err instanceof Error ? err.message : String(err)}`, 'danger'));
                    });
                    return true;
                }
            }, { layer: 'overlay' }));

            // Ctrl+C → cleanup, then exit (mount has exitOnCtrlC: false).
            offs.push(onKey((key) => {
                if (key === CTRL_C) {
                    shell.exit(130);
                    return true;
                }
            }, { layer: 'global' }));
        });
        onUnmounted(() => { for (const off of offs) off(); });

        const suggestionsFor = (value: string) => (value.startsWith('/')
            ? allCommands()
                .filter((c) => c.name.startsWith(value.trim().split(/\s/)[0]))
                .map((c) => ({ value: c.name, label: c.name, description: c.description }))
            : []);

        const statusLine = () => {
            const items = [...(merged.status?.() ?? []), ...status.items];
            if (items.length === 0) return null;
            return (
                <box>
                    {items.flatMap((s, i) => [
                        ...(i > 0 ? [<Text color="dim"> · </Text>] : []),
                        <Text color="dim">{s.label} </Text>,
                        <Text color={s.tone ?? 'fg'}>{s.value}</Text>,
                    ])}
                </box>
            );
        };

        const resolveTab = () => {
            const viewId = views.current();
            return viewId !== 'shell'
                ? merged.tabs.find((t) => t.id === viewId)
                : merged.tabs.find((t) => t.id === tab.active);
        };

        const hintList = () => [
            ...(merged.shortcuts ?? []).map((s) => ({ key: s.key, label: s.label })),
            { key: '/', label: 'commands' },
            { key: '^C', label: 'quit' },
        ];

        // ── Fullscreen (showcase shape): title bar, tab strip, full-height
        //    body, status + hints; `/` palette overlays the bottom.
        const renderFullscreen = () => {
            const { columns: cols } = getTerminalSize();
            const activeTab = resolveTab();
            const suggestions = suggestionsFor(input.value);
            return (
                <Col>
                    <Box border="thick" borderColor="accent" padX={1}>
                        <Text color="accent" bold>{merged.title}</Text>
                        {merged.version ? <Text color="dim">{`  ${merged.version}`}</Text> : null}
                    </Box>
                    {merged.tabs.length > 1 && (
                        <Tabs
                            options={merged.tabs.map((t) => ({ value: t.id, label: t.label }))}
                            model={() => tab.active}
                            onChange={(id: string) => { tab.active = id; }}
                        />
                    )}
                    {activeTab ? (activeTab.render() as never) : null}
                    <Spacer size={1} />
                    {palette.open ? (
                        <Col>
                            <Divider width={Math.min(cols, 120)} label="command" />
                            <TextArea
                                autofocus
                                model={() => input.value}
                                placeholder="/command"
                                maxRows={2}
                                onSubmit={submit}
                            />
                            {suggestions.length > 0 && <SuggestionList
                                items={suggestions}
                                onAccept={(name: string) => { closePalette(); void runCommand(name); }}
                                onDismiss={closePalette}
                            />}
                        </Col>
                    ) : (
                        <Col>
                            {statusLine()}
                            <KeyHints hints={hintList()} />
                        </Col>
                    )}
                </Col>
            );
        };

        // ── Inline (transcript shape): bottom-anchored input + tabs.
        const renderInline = () => {
            const { columns: cols, rows } = getTerminalSize();
            const innerWidth = Math.max(4, Math.max(20, cols - 4) - 2);
            const inputRows = Math.min(MAX_INPUT_ROWS, layoutText(input.value, innerWidth).rows.length);
            const suggestions = suggestionsFor(input.value);
            const viewId = views.current();
            const activeTab = resolveTab();

            const chrome = 1 /* divider */ + inputRows + suggestions.length + 1 /* hints */;
            const bodyLines = 1 /* status */ + 1 /* tabs */ + 16 /* nominal body */;
            const filler = Math.max(0, rows - transcript.lines - bodyLines - chrome - 1);

            return (
                <Col>
                    {statusLine()}
                    {viewId === 'shell' && merged.tabs.length > 1 && (
                        <Tabs
                            options={merged.tabs.map((t) => ({ value: t.id, label: t.label }))}
                            model={() => tab.active}
                            onChange={(id: string) => { tab.active = id; }}
                        />
                    )}
                    {activeTab ? (activeTab.render() as never) : null}
                    {filler > 0 && <Spacer size={filler} />}
                    <Divider width={Math.min(cols, 120)} />
                    <TextArea
                        autofocus
                        model={() => input.value}
                        placeholder="/ for commands"
                        maxRows={MAX_INPUT_ROWS}
                        onSubmit={submit}
                    />
                    {suggestions.length > 0 && <SuggestionList
                        items={suggestions}
                        onAccept={(name: string) => { input.value = ''; void runCommand(name); }}
                        onDismiss={() => { input.value = ''; }}
                    />}
                    <KeyHints hints={hintList()} />
                </Col>
            );
        };

        return () => (fullscreen ? renderFullscreen() : renderInline());
    }, { name: 'ShellApp' });

    defineApp(<ShellApp />).mount(
        fullscreen
            ? { mode: 'fullscreen', exitOnCtrlC: false }
            : { mode: 'inline', clearConsole: true, exitOnCtrlC: false },
        terminalMount,
    );

    await merged.onReady?.(shell);
    return shell;
}

/** Non-TTY fallback: no mount, plain streaming — same handle shape. */
function plainShell(merged: ShellConfig): ShellHandle {
    const store = createLogStore({ passthrough: true });
    const shell: ShellHandle = {
        isInteractive: false,
        say: (text = '') => { console.log(text); },
        store,
        setStatus: () => { },
        switchTab: () => { },
        pushView: () => { },
        popView: () => { },
        exit: (code = 0) => {
            void (async () => {
                try {
                    await merged.onExit?.();
                } finally {
                    process.exit(code);
                }
            })();
        },
    };
    void merged.onReady?.(shell);
    return shell;
}
