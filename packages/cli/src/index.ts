/**
 * @sigx/cli public API
 *
 * Re-exports the plugin interface so that plugin packages
 * can import { definePlugin, a, SigxPlugin } from '@sigx/cli/plugin'
 */
export { definePlugin, defineCommand, a } from './plugin.js';
export type {
    SigxPlugin,
    PluginSpec,
    PluginCommand,
    PluginArgs,
    CommandContext,
    TypedCommandContext,
    AnyArg,
    ArgsShape,
    InferArgs,
    Logger,
} from './plugin.js';
