/**
 * Generate .d.ts files for the CLI package exports.
 * Since we use Vite (not tsc) for building, declarations must be generated separately.
 * We copy the source .ts files and strip the implementations.
 *
 * KEEP IN LOCKSTEP with src/plugin.ts, src/index.ts, and src/shell/ — these
 * are hand-written. __tests__/plugin-dts.test.ts type-checks a consumer of
 * the emitted plugin.d.ts to catch semantic drift.
 */
import { writeFileSync, mkdirSync } from 'fs';

// plugin.d.ts — the plugin interface that other packages import
const pluginDts = `\
import type { ArgsShape, InferArgs } from '@sigx/args';
export { a } from '@sigx/args';
export type { AnyArg, ArgsShape, InferArgs } from '@sigx/args';
/** Exact InferArgs<S> for an inferred builders shape; the legacy record for
 *  the default, unknown (arg-less commands), or anything non-shape. */
export type PluginArgs<S> = ArgsShape extends S ? Record<string, unknown> : S extends ArgsShape ? InferArgs<S> : Record<string, unknown>;
export interface CommandContext {
    cwd: string;
    /** Parsed args per the command's builders; args._ = post-'--' tokens. */
    args: Record<string, unknown>;
    logger: Logger;
    /** All plugins discovered for this project (for runShell({ plugins })). */
    plugins?: SigxPlugin[];
    /** The running CLI binary's version — for plugin feature detection. */
    cliVersion?: string;
    /** Unknown flag tokens — only when the command sets allowUnknownFlags. */
    unknownFlags?: string[];
}
/** CommandContext with args narrowed to the command's inferred shape.
 *  Intersection (not a generic member) so it stays assignable to CommandContext. */
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
    /** Fluent arg builders, e.g. { port: a.number().default(8788) }. */
    args?: S;
    /** Alternate command names. Collisions warn; direct names beat aliases. */
    aliases?: string[];
    /** Hide from 'sigx --help' (still dispatchable). */
    hidden?: boolean;
    /** Collect unknown flags into ctx.unknownFlags instead of erroring. */
    allowUnknownFlags?: boolean;
    run(ctx: TypedCommandContext<S>): Promise<void>;
}
/** Opaque renderable returned by a tab's render() — author with JSX. */
export type ShellNode = unknown;
export interface StatusItem {
    label: string;
    value: string;
    /** Theme token, e.g. 'success' | 'warn' | 'danger' | 'dim' | 'accent' */
    tone?: string;
}
export interface ShellTab {
    id: string;
    label: string;
    render: () => ShellNode;
}
export interface SlashCommand {
    /** Includes the leading slash, e.g. '/reload'. */
    name: string;
    description: string;
    run: (shell: ShellHandle) => void | Promise<void>;
}
export interface Shortcut {
    /** Single key, active only while the command input is empty. */
    key: string;
    label: string;
    run: (shell: ShellHandle) => void | Promise<void>;
}
export interface ShellLogStore {
    push: (chunk: string) => void;
}
export interface ShellHandle {
    isInteractive: boolean;
    say: (text?: string) => void;
    store: ShellLogStore;
    setStatus: (items: StatusItem[]) => void;
    switchTab: (id: string) => void;
    pushView: (id: string) => void;
    popView: () => void;
    /** Register teardown (runs on exit()/Ctrl+C/SIGTERM/SIGHUP/SIGINT,
     *  after the host's onExit, most-recent-first). Returns unsubscribe. */
    onExit: (cb: () => void | Promise<void>) => () => void;
    exit: (code?: number) => void;
}
export interface TuiContribution {
    tabs?: ShellTab[];
    commands?: SlashCommand[];
    shortcuts?: Shortcut[];
    status?: () => StatusItem[];
    /** Called once when the hosting shell comes up; a returned function is
     *  registered as teardown. Start servers/watchers here. */
    setup?: (shell: ShellHandle) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;
}
export interface SigxPlugin {
    name: string;
    detect: (cwd: string) => boolean;
    /** PluginCommand<any> so typed defineCommand results slot in. */
    commands: Record<string, PluginCommand<any>>;
    /** Optional TUI contributions merged into any plugin-hosted shell. */
    tui?: TuiContribution;
}
/** definePlugin input: commands is a reverse mapped type so each command's
 *  args shape infers per key and types that command's run(ctx). */
export interface PluginSpec<T extends Record<string, unknown> = Record<string, ArgsShape>> {
    name: string;
    detect: (cwd: string) => boolean;
    commands: { [K in keyof T]: PluginCommand<T[K]> };
    tui?: TuiContribution;
}
export declare function definePlugin<T extends Record<string, unknown>>(plugin: PluginSpec<T>): SigxPlugin;
/** Typed helper for a command authored outside a definePlugin literal. */
export declare function defineCommand<S extends ArgsShape = ArgsShape>(cmd: PluginCommand<S>): PluginCommand<S>;
`;

// index.d.ts — public API re-exports
const indexDts = `\
export { definePlugin, defineCommand, a } from './plugin.js';
export type { SigxPlugin, PluginSpec, PluginCommand, PluginArgs, CommandContext, TypedCommandContext, AnyArg, ArgsShape, InferArgs, Logger, ShellNode, StatusItem, ShellTab, SlashCommand, Shortcut, ShellLogStore, ShellHandle, TuiContribution } from './plugin.js';
`;

// commands/create.d.ts
const createDts = `\
export interface CreateOptions {
    /** Project name (positional). */
    name?: string;
    type?: 'basic' | 'ssr' | 'ssg' | 'lynx';
    styling?: 'none' | 'tailwind' | 'daisyui';
    /** Skip prompts (headless mode). */
    yes?: boolean;
}
export declare function runCreate(opts?: CreateOptions): Promise<void>;
`;

// shell/index.d.ts — the shell runtime surface
const shellDts = `\
import type { SigxPlugin, ShellTab, SlashCommand, Shortcut, StatusItem, ShellHandle, TuiContribution, Logger } from '../plugin.js';
export type { ShellTab, SlashCommand, Shortcut, StatusItem, ShellHandle, TuiContribution } from '../plugin.js';
export interface ShellConfig {
    /** 'fullscreen': alt-screen dashboard (title bar, tabs, palette);
     *  'inline' (default): transcript shape with bottom-anchored input. */
    mode?: 'inline' | 'fullscreen';
    /** Design theme (themed canvas in fullscreen). Default 'obsidian'. */
    theme?: string;
    title: string;
    version?: string;
    logo?: { rows: string[]; palette: Record<string, string> };
    tabs: ShellTab[];
    commands?: SlashCommand[];
    shortcuts?: Shortcut[];
    status?: () => StatusItem[];
    plugins?: SigxPlugin[];
    onReady?: (shell: ShellHandle) => void | Promise<void>;
    onExit?: () => void | Promise<void>;
}
export declare function runShell(config: ShellConfig, opts?: { interactive?: boolean }): Promise<ShellHandle>;
export declare function createShellLogger(shell: ShellHandle): Logger;
export declare function collectTuiContributions(plugins: SigxPlugin[]): TuiContribution[];
export declare function mergeShellConfig(config: ShellConfig, contributions: TuiContribution[], logger?: Logger): ShellConfig;
`;

mkdirSync('dist/shell', { recursive: true });
mkdirSync('dist/commands', { recursive: true });
writeFileSync('dist/plugin.d.ts', pluginDts);
writeFileSync('dist/index.d.ts', indexDts);
writeFileSync('dist/commands/create.d.ts', createDts);
writeFileSync('dist/shell/index.d.ts', shellDts);

console.log('✓ Type declarations generated');
