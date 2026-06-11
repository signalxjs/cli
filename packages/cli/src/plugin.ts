/**
 * Plugin interface for the sigx CLI.
 *
 * Packages that want to extend the CLI declare a `"sigx-cli"` field
 * in their package.json pointing to a module that default-exports
 * a SigxPlugin created with `definePlugin()`.
 *
 * This module is deliberately dependency-free: plugins import it via
 * `@sigx/cli/plugin` without pulling the TUI stack. The TUI types below
 * (`ShellTab`, `ShellHandle`, …) are structural contracts consumed by
 * `runShell` from `@sigx/cli/shell`.
 */

export interface ArgDef {
    type: 'string' | 'boolean';
    description?: string;
    default?: string | boolean;
}

export interface CommandContext {
    cwd: string;
    args: Record<string, unknown>;
    logger: Logger;
    /**
     * All plugins discovered for this project — lets a shell-hosting command
     * (e.g. lynx `dev`) merge peer plugins' TUI contributions via
     * `runShell({ plugins })` from `@sigx/cli/shell`.
     */
    plugins?: SigxPlugin[];
}

export interface Logger {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
}

export interface PluginCommand {
    description: string;
    args?: Record<string, ArgDef>;
    run: (ctx: CommandContext) => Promise<void>;
}

/**
 * Opaque renderable returned by a tab's `render()`. Author it with JSX
 * (`@jsxImportSource @sigx/terminal`); typed as `unknown` so this module
 * stays dependency-free — the shell passes it straight to the renderer.
 */
export type ShellNode = unknown;

/** One entry in the shell's status line. `tone` is a theme token. */
export interface StatusItem {
    label: string;
    value: string;
    /** e.g. 'success' | 'warn' | 'danger' | 'dim' | 'accent' */
    tone?: string;
}

/** A tab in the shell's tab strip. */
export interface ShellTab {
    id: string;
    label: string;
    render: () => ShellNode;
}

/** A `/command` offered in the shell input's intellisense. */
export interface SlashCommand {
    /** Includes the leading slash, e.g. '/reload'. */
    name: string;
    description: string;
    run: (shell: ShellHandle) => void | Promise<void>;
}

/** A single-key shortcut, active only while the command input is empty. */
export interface Shortcut {
    key: string;
    label: string;
    run: (shell: ShellHandle) => void | Promise<void>;
}

/** Structural subset of @sigx/terminal's LogStore — keeps this module dep-free. */
export interface ShellLogStore {
    push: (chunk: string) => void;
}

/**
 * Handle to a running shell, passed to slash commands, shortcuts, and the
 * host's onReady. In non-TTY environments (`isInteractive: false`) the shell
 * never mounts: `say` writes plain lines, the store streams through, and the
 * navigation methods are no-ops — callers keep a single code path.
 */
export interface ShellHandle {
    isInteractive: boolean;
    /** Print a permanent transcript line above the live region. */
    say: (text?: string) => void;
    /** The main streaming log store (feeds the host's Logs tab). */
    store: ShellLogStore;
    setStatus: (items: StatusItem[]) => void;
    switchTab: (id: string) => void;
    pushView: (id: string) => void;
    popView: () => void;
    exit: (code?: number) => void;
}

/**
 * TUI contributions a plugin offers to whichever plugin hosts the shell:
 * tabs, slash commands, shortcuts, and status-line items.
 */
export interface TuiContribution {
    tabs?: ShellTab[];
    commands?: SlashCommand[];
    shortcuts?: Shortcut[];
    status?: () => StatusItem[];
}

export interface SigxPlugin {
    /** Unique plugin name (e.g. 'ssg', 'lynx') */
    name: string;
    /** Return true if this plugin handles the current project */
    detect: (cwd: string) => boolean;
    /** Commands this plugin provides */
    commands: Record<string, PluginCommand>;
    /** Optional TUI contributions merged into any plugin-hosted shell. */
    tui?: TuiContribution;
}

/**
 * Define a sigx CLI plugin. Identity function for type safety.
 */
export function definePlugin(plugin: SigxPlugin): SigxPlugin {
    return plugin;
}
