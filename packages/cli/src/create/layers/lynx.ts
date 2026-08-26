import type { Layer } from '../layer.js';
import type { Styling } from '../spec.js';

/**
 * Lynx ships a complete overlay per styling (rspeedy config, native
 * assets, its own package.json on the Lynx release line). Nothing is
 * generated; only `{{projectName}}` is substituted.
 */
export function lynx(styling: Styling): Layer {
    const dir = styling === 'none' ? 'lynx' : `lynx-${styling}`;
    return {
        name: `lynx:${dir}`,
        raw: true,
        overlay: `lynx/${dir}`,
        nextSteps: ({ spec, pm }) => [`cd ${spec.name}`, ...(spec.install ? [] : [pm.install]), 'sigx doctor', 'sigx dev'],
    };
}
