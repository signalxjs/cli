/**
 * `git init` + first commit after scaffolding. Skipped when git is not
 * installed or the project lands inside an existing repository (the parent
 * repo owns history then). A missing user identity does not block the
 * commit — a scaffold-only identity is passed with `-c`, never written to
 * the user's config.
 */
import { spawnSync } from 'node:child_process';
import type { RunResult } from './install.js';

function git(args: string[], cwd: string): { ok: boolean; stdout: string; stderr: string } {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
    return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export function gitAvailable(): boolean {
    return git(['--version'], process.cwd()).ok;
}

/** True when `dir` (which may not exist yet — its parent is checked) is inside a git work tree. */
export function insideGitRepo(dir: string): boolean {
    const r = git(['rev-parse', '--is-inside-work-tree'], dir);
    return r.ok && r.stdout.trim() === 'true';
}

export function initGitRepo(cwd: string): RunResult {
    const steps: Array<string[]> = [['init', '-q'], ['add', '-A']];
    for (const args of steps) {
        const r = git(args, cwd);
        if (!r.ok) return { ok: false, code: 1, output: `git ${args.join(' ')}: ${r.stderr || r.stdout}`.trim() };
    }
    const hasIdentity = git(['config', 'user.name'], cwd).ok && git(['config', 'user.email'], cwd).ok;
    const identity = hasIdentity
        ? []
        : ['-c', 'user.name=sigx', '-c', 'user.email=sigx@users.noreply.github.com'];
    const commit = git([...identity, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'Initial commit from create-sigx'], cwd);
    if (!commit.ok) return { ok: false, code: 1, output: `git commit: ${commit.stderr || commit.stdout}`.trim() };
    return { ok: true, code: 0, output: '' };
}
