/**
 * Test fixture mirroring the arg shapes @sigx/lynx-cli declares in the wild:
 * kebab-cased flags, literal `no-*` booleans (which must NOT be treated as
 * negations of undeclared flags), defaults, aliases, and a rest builder.
 * Handlers record the ctx they received so tests can assert on parsing.
 */
import { a, definePlugin, type CommandContext } from '../../src/plugin.js';

export const received: { command: string; ctx: CommandContext }[] = [];

export function resetReceived(): void {
    received.length = 0;
}

export const lynxLikePlugin = definePlugin({
    name: 'lynx-like',
    detect: () => true,
    commands: {
        dev: {
            description: 'Start dev server (fixture)',
            args: {
                port: a.string().describe('Port number'),
                ios: a.boolean().default(false).describe('Target iOS only'),
                'no-device-logs': a.boolean().default(false).describe('Suppress device logs'),
                'reset-cache': a.boolean().default(false).describe('Clear build caches'),
                variant: a.string().describe('Build variant'),
            },
            run: async (ctx) => {
                received.push({ command: 'dev', ctx });
            },
        },
        add: {
            description: 'Add native modules (fixture)',
            args: {
                modules: a.rest().describe('Modules to add'),
                caret: a.boolean().default(false).describe('Use caret ranges'),
            },
            run: async (ctx) => {
                received.push({ command: 'add', ctx });
            },
        },
        serve: {
            description: 'Serve with a short port alias (fixture)',
            args: {
                port: a.number().alias('p').default(8788).describe('Port to listen on'),
            },
            run: async (ctx) => {
                received.push({ command: 'serve', ctx });
            },
        },
    },
});
