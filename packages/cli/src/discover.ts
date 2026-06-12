/**
 * Auto-discover sigx CLI plugins from the project's dependencies.
 *
 * Scans the project's package.json for dependencies that declare
 * a `"sigx-cli"` manifest field:
 *
 *     "sigx-cli": {
 *         "plugin": "./dist/plugin.js",
 *         "requires": ">=0.3.0"        // optional: CLI version range
 *     }
 *
 * Loads each plugin and calls `detect(cwd)` to check if it applies.
 * When `requires` is declared and the RUNNING CLI binary doesn't satisfy
 * it, the plugin still loads (best effort) but a prominent warning tells
 * the user exactly how to update — peerDependencies can't cover this,
 * because the binary that dispatches commands isn't necessarily the
 * install the peer range was resolved against.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SigxPlugin, Logger } from './plugin.js';

interface DepPackageJson {
    'sigx-cli'?: {
        plugin: string;
        /** Semver range of @sigx/cli this plugin needs: '^x.y.z', '>=x.y.z', or exact. */
        requires?: string;
    };
}

interface ParsedVersion { major: number; minor: number; patch: number }

function parseVersion(v: string): ParsedVersion | null {
    const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compare(a: ParsedVersion, b: ParsedVersion): number {
    return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Minimal semver-range check covering the forms plugins actually use:
 * `^x.y.z` (0.x caret = same minor, like npm), `>=x.y.z`, and exact.
 * Unknown/garbled ranges return true — never block on a malformed field.
 */
export function satisfiesCliRange(version: string, range: string): boolean {
    const v = parseVersion(version);
    if (!v) return true;
    const r = range.trim();
    if (r.startsWith('^')) {
        const want = parseVersion(r.slice(1));
        if (!want) return true;
        if (compare(v, want) < 0) return false;
        // Caret: same major; on 0.x the minor acts as the major.
        if (v.major !== want.major) return false;
        if (want.major === 0 && v.minor !== want.minor) return false;
        return true;
    }
    if (r.startsWith('>=')) {
        const want = parseVersion(r.slice(2));
        return !want || compare(v, want) >= 0;
    }
    const want = parseVersion(r);
    return !want || compare(v, want) === 0;
}

export interface DiscoverOptions {
    /** The running CLI's version — enables `requires` compatibility checks. */
    cliVersion?: string;
    /** Where compatibility warnings go. */
    logger?: Logger;
}

export async function discoverPlugins(cwd: string, opts: DiscoverOptions = {}): Promise<SigxPlugin[]> {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return [];

    let pkg: Record<string, unknown>;
    try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
        return [];
    }

    const allDeps: Record<string, string> = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
    };

    const plugins: SigxPlugin[] = [];

    for (const depName of Object.keys(allDeps)) {
        try {
            const depPkgPath = join(cwd, 'node_modules', depName, 'package.json');
            if (!existsSync(depPkgPath)) continue;

            const depPkg: DepPackageJson = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
            const pluginField = depPkg['sigx-cli'];
            if (!pluginField?.plugin) continue;

            const pluginPath = join(cwd, 'node_modules', depName, pluginField.plugin);
            if (!existsSync(pluginPath)) continue;

            if (
                pluginField.requires &&
                opts.cliVersion &&
                !satisfiesCliRange(opts.cliVersion, pluginField.requires)
            ) {
                opts.logger?.warn(
                    `Plugin "${depName}" requires sigx CLI ${pluginField.requires} ` +
                    `but this project runs ${opts.cliVersion} — some commands may misbehave. ` +
                    `Update with: pnpm up @sigx/cli --latest`,
                );
            }

            const mod = await import(pathToFileURL(pluginPath).href);
            const plugin: SigxPlugin = mod.default || mod;

            if (typeof plugin.detect === 'function' && plugin.detect(cwd)) {
                plugins.push(plugin);
            }
        } catch {
            // Not a valid plugin or failed to load — skip silently
        }
    }

    return plugins;
}
