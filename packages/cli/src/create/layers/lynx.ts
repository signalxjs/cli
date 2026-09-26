import type { Layer } from '../layer.js';
import type { Styling } from '../spec.js';

/**
 * Lynx ships a complete overlay per styling (rspeedy config, native
 * assets, its own package.json on the Lynx release line). Nothing is
 * generated; `{{projectName}}` and `{{dep:<name>}}` (a range from the
 * generated versions.ts) are substituted.
 */
export function lynx(styling: Styling): Layer {
    const dir = styling === 'none' ? 'lynx' : `lynx-${styling}`;
    return {
        name: `lynx:${dir}`,
        raw: true,
        overlay: `lynx/${dir}`,
        // esbuild (signalx.config.ts loading) and sharp (icon/splash
        // generation) ship native binaries via install scripts.
        allowBuilds: ['esbuild', 'sharp'],
        // `sigx` is a local devDependency, so a bare `sigx …` only resolves
        // with a global install — go through the package manager instead.
        nextSteps: ({ spec, pm }) => [
            `cd ${spec.name}`,
            ...(spec.install ? [] : [pm.install]),
            `${pm.exec('sigx')} doctor   # checks Node, JDK, Android SDK, emulators`,
            `${pm.run('run:android')}   # build + launch on an emulator/device (run:ios on macOS, run:web in the browser)`,
        ],
    };
}
