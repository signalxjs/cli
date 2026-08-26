/**
 * `layersFor(spec)` — the ordered layer list a spec composes from:
 *
 *     base → kind → render → target → styling → features
 *
 * Order is the conflict rule: a later layer's file overrides an earlier
 * one's. A feature whose layer does not exist yet (actors) throws here
 * rather than scaffolding something half-wired.
 */
import type { Layer } from '../layer.js';
import type { Feature, ProjectSpec, Render, Target } from '../spec.js';
import { base } from './base.js';
import { spa } from './spa.js';
import { ssr } from './ssr.js';
import { ssg } from './ssg.js';
import { terminal } from './terminal.js';
import { lynx } from './lynx.js';
import { renderIslands } from './render-islands.js';
import { renderResume } from './render-resume.js';
import { targetNode } from './target-node.js';
import { targetCloudflare } from './target-cloudflare.js';
import { targetBun } from './target-bun.js';
import { targetDeno } from './target-deno.js';
import { targetVercel } from './target-vercel.js';
import { targetNetlify } from './target-netlify.js';
import { stylingTailwind } from './styling-tailwind.js';
import { stylingDaisyui } from './styling-daisyui.js';
import { featureRouter } from './feature-router.js';
import { featureI18n } from './feature-i18n.js';
import { featureTesting } from './feature-testing.js';
import { featureServerFn } from './feature-server-fn.js';

const KIND_LAYERS = { spa, ssr, ssg, terminal, lynx } as const;
const RENDER_LAYERS: Record<Render, Layer | undefined> = {
    hydrate: undefined,
    islands: renderIslands,
    resume: renderResume,
};
const TARGET_LAYERS: Record<Target, Layer> = {
    node: targetNode,
    cloudflare: targetCloudflare,
    bun: targetBun,
    deno: targetDeno,
    vercel: targetVercel('node'),
    'vercel-edge': targetVercel('edge'),
    netlify: targetNetlify,
};
const STYLING_LAYERS = { none: undefined, tailwind: stylingTailwind, daisyui: stylingDaisyui } as const;
const FEATURE_LAYERS: Partial<Record<Feature, Layer | ((spec: ProjectSpec) => Layer)>> = {
    router: featureRouter,
    i18n: featureI18n,
    testing: featureTesting,
    'server-fn': featureServerFn,
};

/** What this build of the CLI can actually generate. */
export const availableRenders: Render[] = Object.keys(RENDER_LAYERS) as Render[];
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
        if (!(render in RENDER_LAYERS)) throw new Error(`render mode "${render}" is not available yet`);
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
        if (!(feature in FEATURE_LAYERS)) throw new Error(`feature "${feature}" is not available yet`);
    }
    // Feature order is fixed (the FEATURE_LAYERS key order), not the order
    // the user listed them, so overrides are deterministic.
    for (const feature of Object.keys(FEATURE_LAYERS) as Feature[]) {
        if (!spec.features.has(feature)) continue;
        const entry = FEATURE_LAYERS[feature]!;
        layers.push(typeof entry === 'function' ? entry(spec) : entry);
    }
    return layers;
}
