import { paintToken } from '@sigx/terminal';
import type { Logger, ShellHandle } from '../plugin.js';

/**
 * Bridge an existing `Logger`-shaped code path (e.g. a dev server that takes
 * `{ logger }`) into a running shell's transcript.
 */
export function createShellLogger(shell: ShellHandle): Logger {
    return {
        log: (msg: string) => shell.say(msg),
        warn: (msg: string) => shell.say(paintToken(msg, 'warn')),
        error: (msg: string) => shell.say(paintToken(msg, 'danger')),
    };
}
