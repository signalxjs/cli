/**
 * @sigx/cli/shell — the persistent dev-shell runtime plugin commands host
 * their dashboards in. See `runShell` for the frame, `mergeShellConfig` for
 * the cross-plugin contribution model, and `createShellLogger` to route
 * existing Logger-based code paths into the transcript.
 */
export { runShell } from './runShell.js';
export { createShellLogger } from './logger.js';
export { collectTuiContributions, mergeShellConfig } from './contributions.js';
export type { ShellConfig } from './types.js';
export type {
    ShellTab,
    SlashCommand,
    Shortcut,
    StatusItem,
    ShellHandle,
    TuiContribution,
} from '../plugin.js';
