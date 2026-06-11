/** @jsxImportSource @sigx/terminal */
/**
 * The persistent dev-shell runtime — the Claude-Code-shaped app frame that
 * plugin commands (e.g. lynx `dev`) host their dashboards in:
 *
 * - header (logo/title) printed ONCE into native scrollback
 * - transcript via `shell.say` (permanent lines above the live region)
 * - tab strip + active tab body (host + peer-plugin contributions)
 * - status line, growing `/`-command input with intellisense, key hints
 * - single-key shortcuts while the input is empty; 1–9 switch tabs
 * - Esc pops pushed views; Ctrl+C runs onExit cleanup before exiting
 *
 * In non-TTY environments nothing mounts: callers get a plain handle whose
 * `say` writes lines and whose store streams through — one code path.
 */
import {
    defineApp, component, signal, onMounted, onUnmounted, terminalMount, exitTerminal,
    TextArea, SuggestionList, Tabs, Divider, KeyHints, Text, Col, Spacer, Row,
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
        const offs: Array<() => void> = [];

        const submit = (text: string) => {
            const trimmed = text.trim();
            input.value = '';
            if (!trimmed) return;
            if (trimmed.startsWith('/')) {
                void runCommand(trimmed.split(/\s/)[0]);
                return;
            }
            say(paintToken(`type / for commands (Esc to dismiss)`, 'dim'));
        };

        onMounted(() => {
            // Header — once, into scrollback.
            if (merged.logo) say(renderPixelArt(merged.logo.rows, merged.logo.palette).join('\n'));
            say(`${paintToken(merged.title, 'accent')}${merged.version ? ` ${paintToken(merged.version, 'dim')}` : ''}`);
            say('');

            // Esc pops pushed views.
            offs.push(onKey((key) => {
                if (isEsc(key) && views.depth() > 1) {
                    views.pop();
                    return true;
                }
            }, { layer: 'view' }));

            // Single-key shortcuts + 1–9 tab switching. Overlay layer so they
            // run BEFORE the TextArea (which consumes printables) — but only
            // while the input is empty, so once you've started typing (`/re…`)
            // every key falls through to the editor.
            offs.push(onKey((key) => {
                if (input.value !== '') return;
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

        return () => {
            const { columns: cols, rows } = getTerminalSize();
            const innerWidth = Math.max(4, Math.max(20, cols - 4) - 2);
            const inputRows = Math.min(MAX_INPUT_ROWS, layoutText(input.value, innerWidth).rows.length);
            const suggestions = input.value.startsWith('/')
                ? allCommands()
                    .filter((c) => c.name.startsWith(input.value.trim().split(/\s/)[0]))
                    .map((c) => ({ value: c.name, label: c.name, description: c.description }))
                : [];

            const statusItems = [
                ...(merged.status?.() ?? []),
                ...status.items,
            ];

            // A pushed view renders the matching tab's body alone (modal-ish,
            // Esc pops back); the root view renders the full dashboard frame.
            const viewId = views.current();
            const activeTab = viewId !== 'shell'
                ? merged.tabs.find((t) => t.id === viewId)
                : merged.tabs.find((t) => t.id === tab.active);

            const hints = [
                ...(merged.shortcuts ?? []).map((s) => ({ key: s.key, label: s.label })),
                { key: '/', label: 'commands' },
                { key: '^C', label: 'quit' },
            ];

            // Bottom anchor: chrome = status + tabs strip + body is variable,
            // so anchor only the input block; the dashboard naturally sits at
            // the top after the header.
            const chrome = 1 /* divider */ + inputRows + suggestions.length + 1 /* hints */;
            const bodyLines = 1 /* status */ + 1 /* tabs */ + 16 /* nominal body */;
            const filler = Math.max(0, rows - transcript.lines - bodyLines - chrome - 1);

            return (
                <Col>
                    {statusItems.length > 0 && (
                        <box>
                            {statusItems.flatMap((s, i) => [
                                ...(i > 0 ? [<Text color="dim"> · </Text>] : []),
                                <Text color="dim">{s.label} </Text>,
                                <Text color={s.tone ?? 'fg'}>{s.value}</Text>,
                            ])}
                        </box>
                    )}
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
                    <KeyHints hints={hints} />
                </Col>
            );
        };
    }, { name: 'ShellApp' });

    defineApp(<ShellApp />).mount(
        { mode: 'inline', clearConsole: true, exitOnCtrlC: false },
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
