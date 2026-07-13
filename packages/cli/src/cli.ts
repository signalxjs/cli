#!/usr/bin/env node

/**
 * sigx CLI — unified command-line tool for SignalX projects.
 *
 * Core commands (always available):
 *   sigx create     — scaffold a new project
 *   sigx info       — print environment info
 *
 * Plugin commands (auto-discovered from installed packages):
 *   sigx dev        — start dev server
 *   sigx build      — production build
 *   sigx preview    — preview build (SSG)
 *   sigx prebuild   — generate native project files (Lynx)
 *   sigx run:android / run:ios  — build + launch on device (Lynx)
 */

import { runMain } from '@sigx/args';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPlugins } from './discover.js';
import { createLogger } from './utils/logger.js';
import { buildRootCommand } from './root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const logger = createLogger();

async function main() {
    const cwd = process.cwd();
    const plugins = await discoverPlugins(cwd, { cliVersion: pkg.version, logger });
    await runMain(buildRootCommand({ plugins, version: pkg.version, logger }));
}

main().catch((err) => {
    logger.error(err.message || String(err));
    process.exit(1);
});
