/**
 * Plugin interface for the sigx CLI.
 *
 * Packages that want to extend the CLI declare a `"sigx-cli"` field
 * in their package.json pointing to a module that default-exports
 * a SigxPlugin created with `definePlugin()`.
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
    /** Unique plugin name (e.g. 'ssg', 'lynx') */
    name: string;
    /** Return true if this plugin handles the current project */
    detect: (cwd: string) => boolean;
    /** Commands this plugin provides */
    commands: Record<string, PluginCommand>;
}

/**
 * Define a sigx CLI plugin. Identity function for type safety.
 */
export function definePlugin(plugin: SigxPlugin): SigxPlugin {
    return plugin;
}
