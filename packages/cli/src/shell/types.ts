import type {
    ShellTab,
    SlashCommand,
    Shortcut,
    StatusItem,
    ShellHandle,
    SigxPlugin,
    TuiContribution,
} from '../plugin.js';

export type {
    ShellTab,
    SlashCommand,
    Shortcut,
    StatusItem,
    ShellHandle,
    TuiContribution,
};

/** Host configuration for `runShell`. */
export interface ShellConfig {
    /** Shown in the header line (and as the root view title). */
    title: string;
    /** Dim version string next to the title. */
    version?: string;
    /** Optional pixel-art logo printed once above the header. */
    logo?: { rows: string[]; palette: Record<string, string> };
    tabs: ShellTab[];
    commands?: SlashCommand[];
    shortcuts?: Shortcut[];
    status?: () => StatusItem[];
    /**
     * Peer plugins whose `tui` contributions get merged into this shell
     * (host entries win conflicts). Pass `ctx.plugins` from the command.
     */
    plugins?: SigxPlugin[];
    /** Called once the shell is live (or immediately in non-TTY fallback). */
    onReady?: (shell: ShellHandle) => void | Promise<void>;
    /** Called on shell.exit / Ctrl+C, BEFORE the process exits — do cleanup here. */
    onExit?: () => void | Promise<void>;
}
