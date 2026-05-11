/**
 * Generate .d.ts files for the CLI package exports.
 * Since we use Vite (not tsc) for building, declarations must be generated separately.
 * We copy the source .ts files and strip the implementations.
 */
import { writeFileSync } from 'fs';

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
export interface SigxPlugin {
    name: string;
    detect: (cwd: string) => boolean;
    commands: Record<string, PluginCommand>;
}
export declare function definePlugin(plugin: SigxPlugin): SigxPlugin;
`;

// index.d.ts — public API re-exports
const indexDts = `\
export { definePlugin } from './plugin.js';
export type { SigxPlugin, PluginCommand, CommandContext, ArgDef, Logger } from './plugin.js';
`;

// commands/create.d.ts
const createDts = `\
export declare function runCreate(): void;
`;

writeFileSync('dist/plugin.d.ts', pluginDts);
writeFileSync('dist/index.d.ts', indexDts);
writeFileSync('dist/commands/create.d.ts', createDts);

console.log('✓ Type declarations generated');
