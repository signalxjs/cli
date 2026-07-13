/**
 * Plugin interface for the sigx CLI.
 *
 * Packages that want to extend the CLI declare a `"sigx-cli"` field
 * in their package.json pointing to a module that default-exports
 * a SigxPlugin created with `definePlugin()`.
 *
 * Command args are declared with @sigx/args' fluent `a` builders
 * (re-exported here so plugins keep a single import surface):
 *
 *     args: { port: a.number().alias('p').default(8788), open: a.boolean() }
 *
 * This module pulls in nothing beyond @sigx/args (which is itself
 * zero-dependency): plugins import it via `@sigx/cli/plugin` without the TUI
 * stack. The TUI types below (`ShellTab`, `ShellHandle`, …) are structural
 * contracts consumed by `runShell` from `@sigx/cli/shell`.
 */

import type { ArgsShape, InferArgs } from '@sigx/args';

export { a } from '@sigx/args';
export type { AnyArg, ArgsShape, InferArgs } from '@sigx/args';

/**
 * Parsed-args type for a command. With an inferred builders shape S this is
 * the exact `InferArgs<S>` (e.g. `a.boolean().default(false)` → `boolean`);
 * for everything else — the unconstrained default (legacy/hand-annotated
 * commands), or `unknown` (a command with no `args`, which gives the
 * per-key inference in `definePlugin` no candidate) — it stays the
 * 0.4-contract `Record<string, unknown>` so existing plugins typecheck
 * unchanged. S is deliberately NOT constrained to ArgsShape: constraining
 * it makes one arg-less command collapse the whole plugin's inference to
 * the constraint, untyping every sibling command.
 */
export type PluginArgs<S> = ArgsShape extends S
    ? Record<string, unknown>
    : S extends ArgsShape
      ? InferArgs<S>
      : Record<string, unknown>;

export interface CommandContext {
    cwd: string;
    /**
     * Parsed args, per the command's `args` builders. Declared positionals
     * bind by position; `args._` holds the verbatim tokens after a bare `--`.
     * Use a rest builder (`a.rest()`) for variadic positionals.
     */
    args: Record<string, unknown>;
    logger: Logger;
    /**
     * All plugins discovered for this project — lets a shell-hosting command
     * (e.g. lynx `dev`) merge peer plugins' TUI contributions via
     * `runShell({ plugins })` from `@sigx/cli/shell`.
     */
    plugins?: SigxPlugin[];
    /** The running CLI binary's version — for plugin feature detection. */
    cliVersion?: string;
    /**
     * Unrecognized flag tokens, verbatim — populated only when the command
     * sets `allowUnknownFlags`.
     */
    unknownFlags?: string[];
}

/**
 * `CommandContext` with `args` narrowed to the command's inferred shape —
 * what `run(ctx)` receives inside `definePlugin`/`defineCommand`. Built as
 * an intersection (not a generic interface member) deliberately: a
 * `TypedCommandContext<Specific>` stays assignable to plain
 * `CommandContext`, so helpers typed `(ctx: CommandContext) => …` keep
 * compiling, while `ctx.args.<typo>` is still a compile error.
 */
export type TypedCommandContext<S = ArgsShape> = Omit<CommandContext, 'args'> & {
    args: PluginArgs<S>;
};

export interface Logger {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
}

export interface PluginCommand<S = ArgsShape> {
    description: string;
    /** Fluent arg builders, e.g. `{ port: a.number().default(8788) }`. */
    args?: S;
    /** Alternate command names, e.g. `['d']`. Collisions warn at startup; direct names beat aliases. */
    aliases?: string[];
    /** Hide from `sigx --help` (still dispatchable). */
    hidden?: boolean;
    /** Collect unknown flags into `ctx.unknownFlags` instead of erroring. */
    allowUnknownFlags?: boolean;
    // Method syntax (NOT a property function type) — deliberately bivariant,
    // so differently-shaped PluginCommand instantiations stay mutually
    // assignable under strictFunctionTypes (e.g. a hand-annotated legacy
    // run(ctx: CommandContext) still satisfies a typed PluginCommand<S>).
    run(ctx: TypedCommandContext<S>): Promise<void>;
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
    /**
     * Register teardown to run BEFORE the process exits — on `exit()`,
     * Ctrl+C/q, and external SIGTERM/SIGHUP/SIGINT. Subscribers run after
     * the host's onExit, most-recently-registered first. Returns an
     * unsubscribe. Use this for servers, watchers, locks.
     */
    onExit: (cb: () => void | Promise<void>) => () => void;
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
    /**
     * Lifecycle: called once when the hosting shell comes up (interactive or
     * plain). Start servers/watchers here; an optionally returned function is
     * registered as teardown (equivalent to `shell.onExit(fn)`).
     */
    setup?: (shell: ShellHandle) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;
}

export interface SigxPlugin {
    /** Unique plugin name (e.g. 'ssg', 'lynx') */
    name: string;
    /** Return true if this plugin handles the current project */
    detect: (cwd: string) => boolean;
    /**
     * Commands this plugin provides. `PluginCommand<any>` (not the default
     * `PluginCommand`) so a typed `PluginCommand<Specific>` — e.g. a
     * `defineCommand` result — is assignable into a hand-built SigxPlugin;
     * the conditional in `PluginArgs` makes specific instantiations
     * otherwise incomparable.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Record<string, PluginCommand<any>>;
    /** Optional TUI contributions merged into any plugin-hosted shell. */
    tui?: TuiContribution;
}

/**
 * `definePlugin` input. `commands` is a reverse (homomorphic) mapped type
 * over T, so TypeScript infers each command's args shape per key from its
 * `args` property and contextually types that command's `run(ctx)` with it —
 * `ctx.args` needs no casts inside a definePlugin literal. T's values are
 * unconstrained on purpose: an arg-less command has no inference site, and
 * with a `Record<string, ArgsShape>` constraint that single `unknown` key
 * would fail the constraint and collapse EVERY command's inference to
 * untyped. Unconstrained, the arg-less key infers `unknown` and
 * `PluginArgs<unknown>` resolves to the legacy record for just that command.
 */
export interface PluginSpec<T extends Record<string, unknown> = Record<string, ArgsShape>> {
    name: string;
    detect: (cwd: string) => boolean;
    commands: { [K in keyof T]: PluginCommand<T[K]> };
    tui?: TuiContribution;
}

/**
 * Define a sigx CLI plugin. Runtime identity; the generic infers each
 * command's args shape so `run(ctx)` receives typed `ctx.args`.
 */
export function definePlugin<T extends Record<string, unknown>>(plugin: PluginSpec<T>): SigxPlugin {
    // The conditional PluginArgs<T[K]> can't be compared while T is unresolved;
    // the runtime is an identity and PluginSpec is structurally a SigxPlugin
    // for every concrete T, so widen through unknown.
    return plugin as unknown as SigxPlugin;
}

/**
 * Typed helper for a command authored outside a `definePlugin` literal
 * (e.g. its own file) — preserves the args shape for `ctx.args` inference.
 */
export function defineCommand<S extends ArgsShape = ArgsShape>(cmd: PluginCommand<S>): PluginCommand<S> {
    return cmd;
}
