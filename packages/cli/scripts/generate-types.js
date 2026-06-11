/**
 * Generate .d.ts files for the CLI package exports.
 * Since we use Vite (not tsc) for building, declarations must be generated separately.
 * We copy the source .ts files and strip the implementations.
 *
 * KEEP IN LOCKSTEP with src/plugin.ts and src/shell/ — these are hand-written.
 */
import { writeFileSync, mkdirSync } from 'fs';

// plugin.d.ts — the plugin interface that other packages import
const pluginDts = `\
export interface ArgDef {
    type: 'string' | 'boolean';
    description?: string;
    default?: string | boolean;
}
export interface CommandContext {
    cwd: string;
    args: Record<string, unknown>;
    logger: Logger;
    /** All plugins discovered for this project (for runShell({ plugins })). */
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
    exit: (code?: number) => void;
}
export interface TuiContribution {
    tabs?: ShellTab[];
    commands?: SlashCommand[];
    shortcuts?: Shortcut[];
    status?: () => StatusItem[];
}
export interface SigxPlugin {
    name: string;
    detect: (cwd: string) => boolean;
    commands: Record<string, PluginCommand>;
    /** Optional TUI contributions merged into any plugin-hosted shell. */
    tui?: TuiContribution;
}
export declare function definePlugin(plugin: SigxPlugin): SigxPlugin;
`;

// index.d.ts — public API re-exports
const indexDts = `\
export { definePlugin } from './plugin.js';
export type { SigxPlugin, PluginCommand, CommandContext, ArgDef, Logger, ShellNode, StatusItem, ShellTab, SlashCommand, Shortcut, ShellLogStore, ShellHandle, TuiContribution } from './plugin.js';
`;

// commands/create.d.ts
const createDts = `\
export declare function runCreate(): Promise<void>;
`;

// shell/index.d.ts — the shell runtime surface
const shellDts = `\
import type { SigxPlugin, ShellTab, SlashCommand, Shortcut, StatusItem, ShellHandle, TuiContribution, Logger } from '../plugin.js';
export type { ShellTab, SlashCommand, Shortcut, StatusItem, ShellHandle, TuiContribution } from '../plugin.js';
export interface ShellConfig {
    /** 'fullscreen': alt-screen dashboard (title bar, tabs, palette);
     *  'inline' (default): transcript shape with bottom-anchored input. */
    mode?: 'inline' | 'fullscreen';
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
writeFileSync('dist/plugin.d.ts', pluginDts);
writeFileSync('dist/index.d.ts', indexDts);
writeFileSync('dist/commands/create.d.ts', createDts);
writeFileSync('dist/shell/index.d.ts', shellDts);

console.log('✓ Type declarations generated');
