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
    TextArea, SuggestionList, Tabs, Divider, KeyHints, Text, Col, Spacer, Box, StatusBar,
    renderPixelArt, createViewStack, onKey, isEsc, printStatic, paintToken,
    getTerminalSize, layoutText, createLogStore, setTheme, listThemes, boxChrome,
} from '@sigx/terminal';
import type { ShellHandle, ShellPane, SlashCommand, StatusItem } from '../plugin.js';
import type { ShellConfig } from './types.js';
import { collectTuiContributions, mergeShellConfig } from './contributions.js';

const CTRL_C = String.fromCharCode(3);
const MAX_INPUT_ROWS = 6;
/** The palette's TextArea is capped at 2 rows (`maxRows` on the element). */
const PALETTE_INPUT_ROWS = 2;
/** `TextArea` spends 2 cells on its `> ` prefix — it draws no border. */
const INPUT_PREFIX_COLS = 2;
/** The title bar: a bordered box around one line — 2 border + 1 content. */
const TITLE_BOX_ROWS = 3;
/**
 * How tall inline assumes a tab body is when deciding how far to push the
 * input down. An assumption is unavoidable — the renderer cannot measure an
 * opaque child — and it only affects where the bottom chrome sits, not what
 * the body is told it may use (that is the pane).
 */
const NOMINAL_INLINE_BODY_ROWS = 16;

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

    // Design theme (the themed canvas paints the whole alt-screen from it).
    const theme = merged.theme ?? 'obsidian';
    if (listThemes().includes(theme)) setTheme(theme);

    const store = createLogStore();
    const status = signal({ items: [] as StatusItem[] });
    const transcript = signal({ lines: 0 });
    const tab = signal({ active: merged.tabs[0]?.id ?? '' });
    const views = createViewStack<string>('shell');

    /**
     * Which tab is on screen. A pushed view displaces the selected tab, so
     * this is NOT `tab.active` — the renderer and `shell.activeTab` both go
     * through here precisely so they cannot disagree about what is visible.
     * `''` when nothing resolves: no tabs, or a view pushed for an id that
     * is not a tab at all (`pushView` accepts any id).
     */
    const currentTabId = (): string => {
        const viewId = views.current();
        const id = viewId !== 'shell' ? viewId : tab.active;
        return merged.tabs.some((t) => t.id === id) ? id : '';
    };

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

    const exitSubs: Array<() => void | Promise<void>> = [];
    let exiting = false;
    const shell: ShellHandle = {
        isInteractive: true,
        say,
        store,
        setStatus: (items) => { status.items = items; },
        // A getter, not a snapshot: the shell's own 1–9 keys and its view
        // stack move this, so a value copied at handle-construction time
        // would be wrong forever.
        get activeTab() { return currentTabId(); },
        switchTab: (id) => {
            if (merged.tabs.some((t) => t.id === id)) tab.active = id;
        },
        pushView: (id) => views.push(id),
        popView: () => views.pop(),
        onExit: (cb) => {
            exitSubs.push(cb);
            return () => {
                const i = exitSubs.indexOf(cb);
                if (i >= 0) exitSubs.splice(i, 1);
            };
        },
        exit: (code = 0) => {
            if (exiting) return;
            exiting = true;
            void (async () => {
                try {
                    await runTeardown(merged, exitSubs);
                } finally {
                    exitTerminal();
                    process.exit(code);
                }
            })();
        },
    };
    wireSignals(shell);

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

        /** Host-provided items plus anything set through `shell.setStatus`. */
        const statusItemList = () => [...(merged.status?.() ?? []), ...status.items];

        const statusLine = () => {
            const items = statusItemList();
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

        const resolveTab = () => merged.tabs.find((t) => t.id === currentTabId());

        const hintList = () => [
            ...(merged.shortcuts ?? []).map((s) => ({ key: s.key, label: s.label })),
            { key: '/', label: 'commands' },
            { key: '^C', label: 'quit' },
        ];

        // ── Fullscreen — the showcase recipe verbatim: bordered title bar,
        //    segmented filled tab strip, labeled rounded panel (drop shadow)
        //    around the body, chip-style StatusBar; `/` palette swaps in
        //    over the bottom chrome.
        const renderFullscreen = () => {
            const { columns: cols, rows } = getTerminalSize();
            const activeTab = resolveTab();
            const suggestions = suggestionsFor(input.value);

            // Segmented strip — filled chips, the showcase look (NOT the
            // bordered Tabs widget).
            const strip = merged.tabs.map((t, i) => {
                const on = t.id === tab.active;
                return (
                    <Text bg={on ? 'accent' : 'accentSoft'} color={on ? 'accentText' : 'dim'}>
                        {' '}{String(i + 1)} {t.label}{' '}
                    </Text>
                );
            });

            const statusItems = statusItemList();
            const barItems = [
                // Status reads as chips too: value chip + dim label.
                ...statusItems.map((s) => ({ key: s.value, label: s.label })),
                ...(merged.shortcuts ?? []).map((s) => ({ key: s.key, label: s.label })),
                ...(merged.tabs.length > 1 ? [{ key: `1-${merged.tabs.length}`, label: 'tabs' }] : []),
                { key: '/', label: 'commands' },
                { key: '^C', label: 'quit' },
            ];

            // What the body has left, charged segment by segment against the
            // JSX below. Every row spent above or under the body is listed
            // here and nowhere else — a guess like `rows - 12` is wrong the
            // moment the chrome changes shape, and it is this function that
            // changes it. The body box's own cost comes from `boxChrome`,
            // which mirrors `drawBox`, so a renderer change moves this number
            // instead of silently misreporting it.
            const footerRows = palette.open
                ? 1 /* divider */
                  + Math.min(PALETTE_INPUT_ROWS, layoutText(input.value, Math.max(1, cols - INPUT_PREFIX_COLS)).rows.length)
                  + suggestions.length
                : 1 /* status bar */;
            const chromeRows =
                TITLE_BOX_ROWS
                + (merged.tabs.length > 1 ? 1 : 0)
                + 1 /* spacer above the body */
                + 1 /* spacer below the body */
                + footerRows;
            const bodyChrome = boxChrome({ border: true, padX: 1, dropShadow: true });
            const pane: ShellPane = {
                width: Math.max(1, cols - bodyChrome.cols),
                height: Math.max(1, rows - chromeRows - bodyChrome.rows),
            };

            return (
                <Col>
                    <Box border="thick" borderColor="accent" padX={1}>
                        <Text color="accent" bold>{merged.title}</Text>
                        {merged.version ? <Text color="dim">{`  ${merged.version}`}</Text> : null}
                    </Box>
                    {merged.tabs.length > 1 && <box>{strip}</box>}
                    <Spacer size={1} />
                    {activeTab ? (
                        <Box border="rounded" borderColor="line" label={activeTab.label} labelColor="accent" padX={1} dropShadow={true}>
                            {activeTab.render(pane) as never}
                        </Box>
                    ) : null}
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
                        <StatusBar items={barItems} />
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
            const tabStripRows = viewId === 'shell' && merged.tabs.length > 1 ? 1 : 0;
            // `statusLine()` renders nothing when there is nothing to show, so
            // the row is only charged when it is actually drawn — a pane that
            // reports the chrome the shell *might* draw is not the contract.
            const statusRows = statusItemList().length > 0 ? 1 : 0;
            const aboveBody = statusRows + tabStripRows;

            // Inline shares the screen with scrollback, so the body's budget is
            // what is left after the transcript and the bottom chrome. The
            // body draws no box here — it is emitted bare into the column — so
            // there is no box chrome to subtract, and the width is the full
            // terminal.
            const pane: ShellPane = {
                width: Math.max(1, cols),
                height: Math.max(1, rows - transcript.lines - aboveBody - chrome - 1),
            };

            // `filler` pushes the input to the bottom when the body underfills
            // its budget. It still has to assume a body height — the renderer
            // has no way to measure an opaque child — but the assumption is
            // now one named constant subtracted from the pane, rather than a
            // second full row-count that has to agree with the first.
            const filler = Math.max(0, pane.height - NOMINAL_INLINE_BODY_ROWS);

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
                    {activeTab ? (activeTab.render(pane) as never) : null}
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

    await runSetups(merged, shell);
    await merged.onReady?.(shell);
    return shell;
}

/** Host onExit first, then subscriber teardowns most-recent-first; failures
 *  in one never block the rest. */
async function runTeardown(merged: ShellConfig, subs: Array<() => void | Promise<void>>): Promise<void> {
    try {
        await merged.onExit?.();
    } catch { /* teardown is best-effort */ }
    for (const cb of [...subs].reverse()) {
        try {
            await cb();
        } catch { /* teardown is best-effort */ }
    }
}

/** Run contributed `setup` lifecycles; returned functions become teardowns. */
async function runSetups(merged: ShellConfig, shell: ShellHandle): Promise<void> {
    for (const plugin of merged.plugins ?? []) {
        const setup = plugin.tui?.setup;
        if (!setup) continue;
        try {
            const teardown = await setup(shell);
            if (typeof teardown === 'function') shell.onExit(teardown);
        } catch (err) {
            shell.say(`plugin ${plugin.name} setup failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/** External signals (kill, CI cancel, closed terminal) must run teardown
 *  too — Ctrl+C only covers the raw-mode keypress path. */
function wireSignals(shell: ShellHandle): void {
    process.once('SIGTERM', () => shell.exit(143));
    process.once('SIGHUP', () => shell.exit(129));
    process.once('SIGINT', () => shell.exit(130));
}

/** Non-TTY fallback: no mount, plain streaming — same handle shape. */
function plainShell(merged: ShellConfig): ShellHandle {
    const store = createLogStore({ passthrough: true });
    const exitSubs: Array<() => void | Promise<void>> = [];
    let exiting = false;
    const shell: ShellHandle = {
        isInteractive: false,
        say: (text = '') => { console.log(text); },
        store,
        setStatus: () => { },
        // Nothing is on screen in the non-TTY fallback, so no tab is active.
        activeTab: '',
        switchTab: () => { },
        pushView: () => { },
        popView: () => { },
        onExit: (cb) => {
            exitSubs.push(cb);
            return () => {
                const i = exitSubs.indexOf(cb);
                if (i >= 0) exitSubs.splice(i, 1);
            };
        },
        exit: (code = 0) => {
            if (exiting) return;
            exiting = true;
            void (async () => {
                try {
                    await runTeardown(merged, exitSubs);
                } finally {
                    process.exit(code);
                }
            })();
        },
    };
    wireSignals(shell);
    void (async () => {
        await runSetups(merged, shell);
        await merged.onReady?.(shell);
    })();
    return shell;
}
