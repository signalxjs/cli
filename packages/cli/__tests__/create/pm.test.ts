import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectPackageManager, pmCommands } from '../../src/create/postinstall/pm.js';

describe('detectPackageManager', () => {
    let dir: string;
    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sigx-pm-')); });
    afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

    it('reads npm_config_user_agent first', () => {
        expect(detectPackageManager({ npm_config_user_agent: 'pnpm/10.33.4 npm/? node/v22.0.0 win32 x64' }, dir)).toBe('pnpm');
        expect(detectPackageManager({ npm_config_user_agent: 'npm/10.9.0 node/v22.0.0 linux x64' }, dir)).toBe('npm');
        expect(detectPackageManager({ npm_config_user_agent: 'yarn/4.5.0 npm/? node/v22.0.0' }, dir)).toBe('yarn');
        expect(detectPackageManager({ npm_config_user_agent: 'bun/1.2.0 npm/? node/v22.0.0' }, dir)).toBe('bun');
    });

    it('falls back to a lockfile in cwd or a parent', () => {
        const nested = join(dir, 'a', 'b');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(dir, 'yarn.lock'), '');
        expect(detectPackageManager({}, nested)).toBe('yarn');
    });

    it('defaults to pnpm', () => {
        expect(detectPackageManager({}, dir)).toBe('pnpm');
    });
});

describe('pmCommands', () => {
    it('spells commands per manager', () => {
        expect(pmCommands('pnpm').run('dev')).toBe('pnpm dev');
        expect(pmCommands('npm').run('dev')).toBe('npm run dev');
        expect(pmCommands('yarn').install).toBe('yarn');
        expect(pmCommands('bun').exec('wrangler')).toBe('bunx wrangler');
        expect(pmCommands('deno').run('dev')).toBe('deno task dev');
        expect(pmCommands('npm').addDev('vitest', 'oxlint')).toBe('npm install -D vitest oxlint');
    });
});
