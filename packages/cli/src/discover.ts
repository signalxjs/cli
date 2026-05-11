/**
 * Auto-discover sigx CLI plugins from the project's dependencies.
 *
 * Scans the project's package.json for dependencies that declare
 * a `"sigx-cli": { "plugin": "./path/to/plugin.js" }` field.
 * Loads each plugin and calls `detect(cwd)` to check if it applies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SigxPlugin } from './plugin.js';

interface DepPackageJson {
    'sigx-cli'?: {
        plugin: string;
    };
}

export async function discoverPlugins(cwd: string): Promise<SigxPlugin[]> {
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
