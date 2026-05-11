import { defineCommand } from 'citty';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function getVersion(cmd: string): string | null {
    try {
        return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch {
        return null;
    }
}

export const infoCommand = defineCommand({
    meta: {
        name: 'info',
        description: 'Print environment and project info',
    },
    run() {
        const cwd = process.cwd();

        console.log('\n  \x1b[1msigx environment info\x1b[0m\n');
        console.log(`  Platform:      ${process.platform} ${process.arch}`);
        console.log(`  Node:          ${process.version}`);

        // Package manager
        const pnpmVer = getVersion('pnpm --version');
        if (pnpmVer) console.log(`  pnpm:          v${pnpmVer}`);
        else {
            const npmVer = getVersion('npm --version');
            if (npmVer) console.log(`  npm:           v${npmVer}`);
        }

        // Project info
        const pkgPath = join(cwd, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                console.log(`  Project:       ${pkg.name || '(unnamed)'} v${pkg.version || '0.0.0'}`);

                // Detect sigx packages
                const allDeps: Record<string, string> = {
                    ...pkg.dependencies,
                    ...pkg.devDependencies,
                };
                const sigxPkgs = Object.entries(allDeps)
                    .filter(([name]) => name.startsWith('@sigx/') || name === 'sigx')
                    .map(([name, version]) => `${name}@${version}`);

                if (sigxPkgs.length > 0) {
                    console.log(`  Sigx packages:`);
                    for (const p of sigxPkgs) {
                        console.log(`    - ${p}`);
                    }
                }
            } catch {
                // ignore parse errors
            }
        } else {
            console.log('  Project:       (no package.json found)');
        }

        // Config files
        const configs = [
            { file: 'sigx.lynx.config.ts', label: 'Lynx' },
            { file: 'sigx.lynx.config.js', label: 'Lynx' },
            { file: 'lynx.config.ts', label: 'Lynx (rspeedy)' },
            { file: 'lynx.config.js', label: 'Lynx (rspeedy)' },
            { file: 'ssg.config.ts', label: 'SSG' },
            { file: 'vite.config.ts', label: 'Vite' },
        ];
        const detected = configs.filter(c => existsSync(join(cwd, c.file)));
        if (detected.length > 0) {
            console.log(`  Config files:`);
            for (const c of detected) {
                console.log(`    - ${c.file} (${c.label})`);
            }
        }

        // Lynx-specific info
        const isLynx = detected.some(c => c.label.includes('Lynx'));
        if (isLynx) {
            console.log('');
            console.log('  \x1b[1mLynx Environment\x1b[0m');

            // rspeedy
            const rspeedyVer = getVersion('npx rspeedy --version 2>&1');
            if (rspeedyVer) console.log(`  rspeedy:       v${rspeedyVer.trim()}`);

            // Android SDK
            const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
            if (androidHome) {
                console.log(`  Android SDK:   ${androidHome}`);
            }

            // JDK
            const javaVer = getVersion('java -version 2>&1');
            if (javaVer) {
                const match = javaVer.match(/version "([^"]+)"/);
                if (match) console.log(`  JDK:           ${match[1]}`);
            }

            // ADB + devices
            try {
                const adbVer = getVersion('adb version');
                if (adbVer) {
                    const verMatch = adbVer.match(/version ([\d.]+)/);
                    console.log(`  ADB:           ${verMatch ? `v${verMatch[1]}` : 'available'}`);

                    const devOutput = execSync('adb devices -l', { stdio: 'pipe', encoding: 'utf-8' });
                    const devices = devOutput.split('\n')
                        .slice(1)
                        .filter(l => l.trim().length > 0)
                        .map(l => {
                            const modelMatch = l.match(/model:(\S+)/);
                            return modelMatch ? modelMatch[1].replace(/_/g, ' ') : l.split(/\s+/)[0];
                        });

                    if (devices.length > 0) {
                        console.log(`  Devices:       ${devices.join(', ')}`);
                    }
                }
            } catch {
                // ADB not available
            }

            // Xcode (macOS only)
            if (process.platform === 'darwin') {
                const xcodeVer = getVersion('xcodebuild -version 2>/dev/null');
                if (xcodeVer) console.log(`  Xcode:         ${xcodeVer.split('\n')[0]}`);

                const podVer = getVersion('pod --version');
                if (podVer) console.log(`  CocoaPods:     v${podVer}`);
            }
        }

        console.log('');
    },
});
