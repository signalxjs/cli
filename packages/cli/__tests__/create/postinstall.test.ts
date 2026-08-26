import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const spawn = vi.fn();
const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({ spawn: (...a: unknown[]) => spawn(...a), spawnSync: (...a: unknown[]) => spawnSync(...a) }));

import { installCommand, runInstall, tailLines } from '../../src/create/postinstall/install.js';
import { gitAvailable, initGitRepo, insideGitRepo } from '../../src/create/postinstall/git.js';

function fakeChild(code: number, out = '', err = '') {
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
        if (out) child.stdout.emit('data', out);
        if (err) child.stderr.emit('data', err);
        child.emit('close', code);
    });
    return child;
}

describe('install', () => {
    beforeEach(() => { spawn.mockReset(); });

    it('spells the install command per manager', () => {
        expect(installCommand('pnpm')).toEqual(['pnpm', ['install']]);
        expect(installCommand('yarn')).toEqual(['yarn', []]);
        expect(installCommand('bun')).toEqual(['bun', ['install']]);
        expect(installCommand('deno')).toEqual(['deno', ['install']]);
    });

    it('captures output and reports the exit code', async () => {
        spawn.mockReturnValueOnce(fakeChild(0, 'Done in 2s\n'));
        const r = await runInstall({ cwd: '/p', pm: 'pnpm', captured: true });
        expect(r).toEqual({ ok: true, code: 0, output: 'Done in 2s\n' });
        expect(spawn).toHaveBeenCalledWith('pnpm', ['install'], expect.objectContaining({ cwd: '/p', stdio: ['ignore', 'pipe', 'pipe'] }));

        // Inherited stdio: nothing to capture — only the exit code is reported.
        spawn.mockReturnValueOnce(fakeChild(1));
        const f = await runInstall({ cwd: '/p', pm: 'npm', captured: false });
        expect(f).toMatchObject({ ok: false, code: 1 });
        expect(spawn).toHaveBeenLastCalledWith('npm', ['install'], expect.objectContaining({ stdio: 'inherit' }));
    });

    it('turns a spawn error into a failed result', async () => {
        const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        spawn.mockReturnValueOnce(child);
        queueMicrotask(() => child.emit('error', new Error('ENOENT')));
        const r = await runInstall({ cwd: '/p', pm: 'pnpm', captured: true });
        expect(r.ok).toBe(false);
        expect(r.output).toContain('ENOENT');
    });

    it('tailLines keeps the last non-empty lines', () => {
        expect(tailLines('a\n\nb\nc\n', 2)).toBe('b\nc');
    });
});

describe('git', () => {
    beforeEach(() => { spawnSync.mockReset(); });
    const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    const fail = (stderr = 'nope') => ({ status: 1, stdout: '', stderr });

    it('detects availability and an enclosing work tree', () => {
        spawnSync.mockReturnValueOnce(ok('git version 2.45'));
        expect(gitAvailable()).toBe(true);
        spawnSync.mockReturnValueOnce(fail());
        expect(gitAvailable()).toBe(false);
        spawnSync.mockReturnValueOnce(ok('true\n'));
        expect(insideGitRepo('/x')).toBe(true);
        spawnSync.mockReturnValueOnce(fail('fatal: not a git repository'));
        expect(insideGitRepo('/x')).toBe(false);
        // A directory that does not exist yet is checked through its nearest existing parent.
        spawnSync.mockReturnValueOnce(ok('true\n'));
        expect(insideGitRepo(process.cwd() + '/does-not-exist-yet/nested')).toBe(true);
        expect(spawnSync.mock.calls.at(-1)?.[2]).toMatchObject({ cwd: process.cwd() });
    });

    it('init + add + commit, with a fallback identity only when none is configured', () => {
        spawnSync
            .mockReturnValueOnce(ok()) // init
            .mockReturnValueOnce(ok()) // add
            .mockReturnValueOnce(fail()) // config user.name → none
            .mockReturnValueOnce(ok()); // commit
        expect(initGitRepo('/p')).toEqual({ ok: true, code: 0, output: '' });
        const commitArgs = spawnSync.mock.calls[3][1] as string[];
        expect(commitArgs).toContain('user.name=sigx');
        expect(commitArgs).toContain('commit.gpgsign=false');
        expect(commitArgs.slice(-2)).toEqual(['-m', 'Initial commit from create-sigx']);

        spawnSync
            .mockReturnValueOnce(ok()).mockReturnValueOnce(ok())
            .mockReturnValueOnce(ok('Andy')).mockReturnValueOnce(ok('a@b')) // identity present
            .mockReturnValueOnce(ok());
        initGitRepo('/p');
        expect((spawnSync.mock.calls[8][1] as string[]).join(' ')).not.toContain('user.name=');
    });

    it('reports the failing step', () => {
        spawnSync.mockReturnValueOnce(fail('permission denied'));
        expect(initGitRepo('/p')).toEqual({ ok: false, code: 1, output: 'git init -q: permission denied' });
    });
});
