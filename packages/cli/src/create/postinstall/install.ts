/**
 * `<pm> install` after scaffolding. Interactive runs capture the output
 * under the spinner and surface the tail on failure; headless runs inherit
 * stdio. An install failure never fails the scaffold — the project is
 * complete on disk and the next steps say how to retry.
 */
import { spawn } from 'node:child_process';
import type { PackageManager } from '../spec.js';

export interface RunResult {
    ok: boolean;
    code: number | null;
    /** Captured stdout+stderr (empty when inherited). */
    output: string;
}

export interface InstallOptions {
    cwd: string;
    pm: PackageManager;
    /** Capture output (spinner) instead of inheriting stdio. */
    captured: boolean;
}

/** The install command per manager. */
export function installCommand(pm: PackageManager): [string, string[]] {
    switch (pm) {
        case 'yarn': return ['yarn', []];
        case 'deno': return ['deno', ['install']];
        default: return [pm, ['install']];
    }
}

export function runInstall(opts: InstallOptions): Promise<RunResult> {
    const [cmd, args] = installCommand(opts.pm);
    return runCommand(cmd, args, opts.cwd, opts.captured);
}

export function runCommand(cmd: string, args: string[], cwd: string, captured: boolean): Promise<RunResult> {
    return new Promise((resolve) => {
        const child = spawn(cmd, args, {
            cwd,
            // Windows resolves `pnpm` to `pnpm.cmd` only through a shell.
            shell: process.platform === 'win32',
            stdio: captured ? ['ignore', 'pipe', 'pipe'] : 'inherit',
            env: process.env,
        });
        let output = '';
        child.stdout?.on('data', (d) => { output += String(d); });
        child.stderr?.on('data', (d) => { output += String(d); });
        child.on('error', (err) => resolve({ ok: false, code: null, output: output + err.message }));
        child.on('close', (code) => resolve({ ok: code === 0, code, output }));
    });
}

/** The last `n` non-empty lines of a captured output, for failure notes. */
export function tailLines(output: string, n = 20): string {
    return output.split(/\r?\n/).filter((l) => l.trim()).slice(-n).join('\n');
}
