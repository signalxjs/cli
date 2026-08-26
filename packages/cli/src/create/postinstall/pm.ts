/**
 * Package-manager detection and command spelling. The manager that ran
 * `create` announces itself in `npm_config_user_agent`
 * ("pnpm/10.33.4 npm/? node/v22.0.0 …"); failing that, a lockfile in the
 * working directory or its parents; failing that, pnpm.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageManager } from '../spec.js';

const LOCKFILES: Array<[string, PackageManager]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['deno.lock', 'deno'],
    ['package-lock.json', 'npm'],
];

export function detectPackageManager(
    env: NodeJS.ProcessEnv = process.env,
    cwd: string = process.cwd(),
): PackageManager {
    const m = /^(pnpm|npm|yarn|bun|deno)\//.exec(env.npm_config_user_agent ?? '');
    if (m) return m[1] as PackageManager;
    let dir = cwd;
    for (let i = 0; i < 10; i++) {
        for (const [file, pm] of LOCKFILES) {
            if (existsSync(join(dir, file))) return pm;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return 'pnpm';
}

export interface PmCommands {
    name: PackageManager;
    /** `pnpm install` */
    install: string;
    /** `pnpm dev` / `npm run dev` / `deno task dev` */
    run(script: string): string;
    /** `pnpm exec wrangler` / `npx wrangler` / `bunx wrangler` */
    exec(bin: string): string;
    /** `pnpm add -D x` */
    addDev(...pkgs: string[]): string;
}

export function pmCommands(pm: PackageManager): PmCommands {
    switch (pm) {
        case 'npm':
            return {
                name: pm,
                install: 'npm install',
                run: (s) => `npm run ${s}`,
                exec: (b) => `npx ${b}`,
                addDev: (...p) => `npm install -D ${p.join(' ')}`,
            };
        case 'yarn':
            return {
                name: pm,
                install: 'yarn',
                run: (s) => `yarn ${s}`,
                exec: (b) => `yarn ${b}`,
                addDev: (...p) => `yarn add -D ${p.join(' ')}`,
            };
        case 'bun':
            return {
                name: pm,
                install: 'bun install',
                run: (s) => `bun run ${s}`,
                exec: (b) => `bunx ${b}`,
                addDev: (...p) => `bun add -d ${p.join(' ')}`,
            };
        case 'deno':
            return {
                name: pm,
                install: 'deno install',
                run: (s) => `deno task ${s}`,
                exec: (b) => `deno run -A npm:${b}`,
                addDev: (...p) => `deno add -D ${p.map((x) => `npm:${x}`).join(' ')}`,
            };
        case 'pnpm':
        default:
            return {
                name: 'pnpm',
                install: 'pnpm install',
                run: (s) => `pnpm ${s}`,
                exec: (b) => `pnpm exec ${b}`,
                addDev: (...p) => `pnpm add -D ${p.join(' ')}`,
            };
    }
}
