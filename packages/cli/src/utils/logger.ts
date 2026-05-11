import type { Logger } from '../plugin.js';

export function createLogger(prefix = 'sigx'): Logger {
    return {
        log: (msg: string) => console.log(`[${prefix}] ${msg}`),
        warn: (msg: string) => console.warn(`[${prefix}] WARN: ${msg}`),
        error: (msg: string) => console.error(`[${prefix}] ERROR: ${msg}`),
    };
}
