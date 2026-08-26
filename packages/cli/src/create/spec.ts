/**
 * The project spec — what `sigx create` builds — and the vocabulary around
 * it: kinds, render modes, deploy targets, styling, features, and which
 * combinations exist. Every prompt list, every headless flag, and `--list`
 * read from the option arrays here, so the wizard and the flags cannot
 * disagree about what is available.
 */

export type Kind = 'spa' | 'ssr' | 'ssg' | 'terminal' | 'lynx';
export type Render = 'hydrate' | 'islands' | 'resume';
export type Target = 'node' | 'cloudflare' | 'bun' | 'deno' | 'vercel' | 'vercel-edge' | 'netlify';
export type Styling = 'none' | 'tailwind' | 'daisyui';
export type Feature = 'router' | 'i18n' | 'testing' | 'actors' | 'server-fn';
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'deno';

export interface ProjectSpec {
    /** Directory + package name. */
    name: string;
    kind: Kind;
    /** SSR only. */
    render?: Render;
    /** SSR only. */
    target?: Target;
    styling: Styling;
    features: ReadonlySet<Feature>;
    pm: PackageManager;
    /** Run `<pm> install` after scaffolding. */
    install: boolean;
    /** `git init` + first commit after scaffolding. */
    git: boolean;
}

/** Loose input for `normalizeSpec` — everything but the name is optional. */
export interface SpecInput {
    name: string;
    kind?: Kind;
    render?: Render;
    target?: Target;
    styling?: Styling;
    features?: Iterable<Feature>;
    pm?: PackageManager;
    install?: boolean;
    git?: boolean;
}

/** Prompt-shaped option; the same shape `@sigx/terminal`'s select/multiselect take. */
export interface Option<T> {
    value: T;
    label: string;
    description?: string;
    group?: string;
}

export const kindOptions: Option<Kind>[] = [
    { value: 'spa', label: 'Web app (SPA)', description: 'Client-rendered single-page app on Vite' },
    { value: 'ssr', label: 'Web app (SSR)', description: 'Server-rendered — streaming, islands or resumable; deploy anywhere' },
    { value: 'ssg', label: 'Static site (SSG)', description: 'File-based routing, MDX, built-in search' },
    { value: 'terminal', label: 'Terminal app (TUI)', description: 'Text UI with TSX + signals, HMR dev runner' },
    { value: 'lynx', label: 'Native mobile (Lynx)', description: 'iOS & Android from one component tree' },
];

export const renderOptions: Option<Render>[] = [
    { value: 'hydrate', label: 'Hydrate', description: 'Streaming SSR, full client hydration (the classic shape)' },
    { value: 'islands', label: 'Islands', description: 'Server-only page, selective hydration via client:* directives' },
    { value: 'resume', label: 'Resumable', description: 'Zero JS on load, handlers load on first interaction' },
];

export const targetOptions: Option<Target>[] = [
    { value: 'node', label: 'Node', description: 'Express server — any host that runs Node' },
    { value: 'cloudflare', label: 'Cloudflare Workers', description: 'Bundled worker + static assets via wrangler' },
    { value: 'bun', label: 'Bun', description: 'Bun.serve over the Node build' },
    { value: 'deno', label: 'Deno / Deno Deploy', description: 'Bundled Deno entry, deno.json tasks' },
    { value: 'vercel', label: 'Vercel', description: 'Build Output API, Node runtime' },
    { value: 'vercel-edge', label: 'Vercel Edge', description: 'Build Output API, Edge runtime (no Node built-ins)' },
    { value: 'netlify', label: 'Netlify', description: 'Frameworks API function + CDN statics' },
];

export const webStylingOptions: Option<Styling>[] = [
    { value: 'none', label: 'Plain CSS', description: 'A small stylesheet, no framework' },
    { value: 'tailwind', label: 'Tailwind CSS', description: 'Tailwind 4 via @tailwindcss/vite' },
    { value: 'daisyui', label: 'Tailwind + daisyUI', description: 'Tailwind 4, daisyUI 5 themes, @sigx/daisyui components' },
];

export const lynxStylingOptions: Option<Styling>[] = [
    { value: 'none', label: 'None', description: 'No CSS framework' },
    { value: 'tailwind', label: 'Tailwind CSS', description: 'Tailwind with the Lynx preset' },
    { value: 'daisyui', label: 'Tailwind + daisyUI', description: 'Lynx + @sigx/lynx-daisyui components' },
];

export const featureOptions: Option<Feature>[] = [
    { value: 'router', label: 'Router', description: '@sigx/router with Home/About pages', group: 'App' },
    { value: 'i18n', label: 'i18n', description: '@sigx/i18n with locale detection', group: 'App' },
    { value: 'testing', label: 'Vitest + oxlint', description: 'test and lint scripts with a sample test', group: 'Quality' },
    { value: 'server-fn', label: 'Server functions', description: 'A typed serverFn called from a component', group: 'Server' },
    { value: 'actors', label: 'Actors', description: 'A counter actor (@sigx/actors)', group: 'Server' },
];

export const packageManagerOptions: Option<PackageManager>[] = [
    { value: 'pnpm', label: 'pnpm' },
    { value: 'npm', label: 'npm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'bun', label: 'bun' },
    { value: 'deno', label: 'deno' },
];

export const KINDS = kindOptions.map((o) => o.value);
export const RENDERS = renderOptions.map((o) => o.value);
export const TARGETS = targetOptions.map((o) => o.value);
export const STYLINGS = webStylingOptions.map((o) => o.value);
export const FEATURES = featureOptions.map((o) => o.value);
export const PACKAGE_MANAGERS = packageManagerOptions.map((o) => o.value);

/** The pre-0.11 `--type` vocabulary. */
export const LEGACY_TYPE_MAP: Readonly<Record<string, Kind>> = {
    basic: 'spa',
    ssr: 'ssr',
    ssg: 'ssg',
    lynx: 'lynx',
    terminal: 'terminal',
};

/** Where each feature makes sense. `targets` restricts SSR further. */
export const FEATURE_SUPPORT: Readonly<Record<Feature, { kinds: readonly Kind[]; targets?: readonly Target[] }>> = {
    router: { kinds: ['spa', 'ssr'] },
    i18n: { kinds: ['spa', 'ssr', 'ssg', 'terminal'] },
    testing: { kinds: ['spa', 'ssr', 'ssg', 'terminal'] },
    'server-fn': { kinds: ['ssr'] },
    actors: { kinds: ['spa', 'ssr'], targets: ['node', 'cloudflare', 'bun'] },
};

export function featureSupported(feature: Feature, spec: { kind: Kind; target?: Target }): boolean {
    const support = FEATURE_SUPPORT[feature];
    if (!support.kinds.includes(spec.kind)) return false;
    if (support.targets && spec.kind === 'ssr' && !support.targets.includes(spec.target ?? 'node')) return false;
    return true;
}

/** Fill defaults. Does not validate — see `validateSpec`. */
export function normalizeSpec(input: SpecInput): ProjectSpec {
    const kind = input.kind ?? 'spa';
    const spec: ProjectSpec = {
        name: input.name,
        kind,
        styling: kind === 'terminal' ? 'none' : (input.styling ?? 'none'),
        features: new Set(input.features ?? []),
        pm: input.pm ?? 'pnpm',
        install: input.install ?? false,
        git: input.git ?? false,
    };
    if (kind === 'ssr') {
        spec.render = input.render ?? 'hydrate';
        spec.target = input.target ?? 'node';
    }
    return spec;
}

/** Human-readable problems; empty when the spec is buildable. */
export function validateSpec(spec: ProjectSpec): string[] {
    const errors: string[] = [];
    if (!spec.name.trim()) errors.push('Project name is required');
    else if (/[\\/]/.test(spec.name)) errors.push('Project name must not contain path separators');
    if (!KINDS.includes(spec.kind)) errors.push(`kind must be one of ${KINDS.join(', ')}`);
    if (spec.kind === 'ssr') {
        if (spec.render && !RENDERS.includes(spec.render)) errors.push(`render must be one of ${RENDERS.join(', ')}`);
        if (spec.target && !TARGETS.includes(spec.target)) errors.push(`target must be one of ${TARGETS.join(', ')}`);
    } else {
        if (spec.render) errors.push('render mode only applies to SSR projects');
        if (spec.target) errors.push('deploy target only applies to SSR projects');
    }
    if (!STYLINGS.includes(spec.styling)) errors.push(`styling must be one of ${STYLINGS.join(', ')}`);
    if (spec.kind === 'terminal' && spec.styling !== 'none') errors.push('terminal apps have no styling option');
    for (const feature of spec.features) {
        if (!FEATURES.includes(feature)) errors.push(`unknown feature "${feature}" (valid: ${FEATURES.join(', ')})`);
        else if (!featureSupported(feature, spec)) {
            const where = spec.kind === 'ssr' ? `${spec.kind} on ${spec.target}` : spec.kind;
            errors.push(`feature "${feature}" is not available for ${where}`);
        }
    }
    if (!PACKAGE_MANAGERS.includes(spec.pm)) errors.push(`pm must be one of ${PACKAGE_MANAGERS.join(', ')}`);
    return errors;
}

/** One-line description of a spec, for spinners and summaries. */
export function describeSpec(spec: ProjectSpec): string {
    const parts: string[] = [spec.kind];
    if (spec.kind === 'ssr') parts.push(spec.render ?? 'hydrate', spec.target ?? 'node');
    if (spec.styling !== 'none') parts.push(spec.styling);
    parts.push(...spec.features);
    return parts.join(' + ');
}
