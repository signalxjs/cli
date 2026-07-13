/**
 * Golden-output tests for `sigx --help` / `--version` / `<cmd> --help`.
 * The version is injected as a fixed 9.9.9 so release bumps never churn
 * the snapshots — these pin the rendered help surface plugins and users see.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { runMain } from '@sigx/args';
import type { Logger } from '../src/plugin.js';
import { buildRootCommand } from '../src/root.js';
import { lynxLikePlugin } from './fixtures/lynx-like-plugin.js';

const silentLogger: Logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

async function capture(rawArgs: string[]): Promise<string> {
    const out: string[] = [];
    const cmd = buildRootCommand({
        plugins: [lynxLikePlugin],
        version: '9.9.9',
        logger: silentLogger,
        cwd: '/fake/project',
    });
    await runMain(cmd, {
        rawArgs,
        stdout: (t) => out.push(t),
        stderr: (t) => out.push(t),
    });
    return out.join('\n');
}

describe('help and version output', () => {
    afterEach(() => {
        process.exitCode = undefined;
    });

    it('sigx --version prints the injected version exactly', async () => {
        expect(await capture(['--version'])).toBe('9.9.9');
    });

    it('sigx --help lists core and plugin commands', async () => {
        const help = await capture(['--help']);
        expect(help).toMatchInlineSnapshot(`
          "sigx — SignalX CLI (v9.9.9)

          USAGE
            sigx <command> [options]

          OPTIONS
            -h, --help      Show help
                --version   Show version

          COMMANDS
            info     Print environment and project info
            create   Scaffold a new SignalX project
            dev      Start dev server (fixture)
            add      Add native modules (fixture)
            serve    Serve with a short port alias (fixture)

          Run 'sigx <command> --help' for details on a command."
        `);
    });

    it('sigx dev --help renders kebab flags, defaults, and descriptions', async () => {
        const help = await capture(['dev', '--help']);
        expect(help).toMatchInlineSnapshot(`
          "sigx dev — Start dev server (fixture)

          USAGE
            sigx dev [options]

          OPTIONS
                --port <port>         Port number
                --ios                 Target iOS only (default: false)
                --no-device-logs      Suppress device logs (default: false)
                --reset-cache         Clear build caches (default: false)
                --variant <variant>   Build variant
            -h, --help                Show help"
        `);
    });

    it('sigx serve --help renders aliases and default values', async () => {
        const help = await capture(['serve', '--help']);
        expect(help).toMatchInlineSnapshot(`
          "sigx serve — Serve with a short port alias (fixture)

          USAGE
            sigx serve [options]

          OPTIONS
            -p, --port <port>   Port to listen on (default: 8788)
            -h, --help          Show help"
        `);
    });
});
