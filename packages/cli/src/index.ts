/**
 * @sigx/cli public API
 *
 * Re-exports the plugin interface so that plugin packages
 * can import { definePlugin, SigxPlugin } from '@sigx/cli/plugin'
 */
export { definePlugin } from './plugin.js';
export type {
    SigxPlugin,
    PluginCommand,
    CommandContext,
    ArgDef,
    Logger,
} from './plugin.js';
