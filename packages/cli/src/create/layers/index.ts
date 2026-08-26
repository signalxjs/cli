/**
 * `layersFor(spec)` — the ordered layer list a spec composes from:
 *
 *     base → kind → render → target → styling → features
 *
 * Order is the conflict rule: a later layer's file overrides an earlier
 * one's. Render modes and deploy targets beyond the defaults, and the
 * feature layers, land in follow-up PRs — asking for one before it exists
 * throws here rather than scaffolding something half-wired.
 */
import type { Layer } from '../layer.js';
import type { Feature, ProjectSpec, Render, Target } from '../spec.js';
import { base } from './base.js';
import { spa } from './spa.js';
import { ssr } from './ssr.js';
import { ssg } from './ssg.js';
import { terminal } from './terminal.js';
import { lynx } from './lynx.js';
import { targetNode } from './target-node.js';
import { stylingTailwind } from './styling-tailwind.js';
import { stylingDaisyui } from './styling-daisyui.js';

const KIND_LAYERS = { spa, ssr, ssg, terminal, lynx } as const;
const RENDER_LAYERS: Partial<Record<Render, Layer>> = { hydrate: undefined };
const TARGET_LAYERS: Partial<Record<Target, Layer>> = { node: targetNode };
const STYLING_LAYERS = { none: undefined, tailwind: stylingTailwind, daisyui: stylingDaisyui } as const;
const FEATURE_LAYERS: Partial<Record<Feature, Layer>> = {};

/** What this build of the CLI can actually generate. */
export const availableRenders: Render[] = ['hydrate'];
export const availableTargets: Target[] = Object.keys(TARGET_LAYERS) as Target[];
export const availableFeatures: Feature[] = Object.keys(FEATURE_LAYERS) as Feature[];

export function layersFor(spec: ProjectSpec): Layer[] {
    const layers: Layer[] = [];
    if (spec.kind === 'lynx') {
        // Lynx ships a complete overlay per styling; no builders.
        return [lynx(spec.styling)];
    }
    layers.push(base, KIND_LAYERS[spec.kind]);
    if (spec.kind === 'ssr') {
        const render = spec.render ?? 'hydrate';
        if (!availableRenders.includes(render)) throw new Error(`render mode "${render}" is not available yet`);
        const renderLayer = RENDER_LAYERS[render];
        if (renderLayer) layers.push(renderLayer);
        const target = spec.target ?? 'node';
        const targetLayer = TARGET_LAYERS[target];
        if (!targetLayer) throw new Error(`deploy target "${target}" is not available yet`);
        layers.push(targetLayer);
    }
    const styling = STYLING_LAYERS[spec.styling];
    if (styling) layers.push(styling);
    for (const feature of spec.features) {
        const layer = FEATURE_LAYERS[feature];
        if (!layer) throw new Error(`feature "${feature}" is not available yet`);
        layers.push(layer);
    }
    return layers;
}
