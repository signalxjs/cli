/**
 * Flags → spec. Shared by the headless path (`-y`, non-TTY, or a kind plus
 * a name on the command line) and by the wizard, which uses the same
 * options as initial values. `--type` is the pre-0.11 vocabulary and stays
 * accepted as an alias of `--kind`.
 */
import { availableFeatures, availableRenders, availableTargets } from './layers/index.js';
import {
    featureOptions,
    kindOptions,
    LEGACY_TYPE_MAP,
    lynxStylingOptions,
    normalizeSpec,
    PACKAGE_MANAGERS,
    renderOptions,
    STYLINGS,
    targetOptions,
    validateSpec,
    webStylingOptions,
    type Feature,
    type Kind,
    type Option,
    type PackageManager,
    type ProjectSpec,
    type Render,
    type Styling,
    type Target,
} from './spec.js';

export interface CreateOptions {
    /** Project name (positional). */
    name?: string;
    kind?: Kind;
    /** Deprecated alias of `kind` (`basic` = `spa`). */
    type?: string;
    render?: Render;
    target?: Target;
    styling?: Styling;
    /** Comma-separated on the command line (`--features router,testing`). */
    features?: string;
    pm?: PackageManager;
    install?: boolean;
    git?: boolean;
    /** `quick`: SPA + Tailwind + router + testing. */
    preset?: string;
    /** Skip prompts (headless mode). */
    yes?: boolean;
    /** Print the kinds / render modes / targets / extras and exit. */
    list?: boolean;
}

export const QUICK_PRESET = {
    kind: 'spa' as Kind,
    styling: 'tailwind' as Styling,
    features: ['router', 'testing'] as Feature[],
};

/** What this build can generate, in prompt shape. */
export const renderModeOptions: Option<Render>[] = renderOptions.filter((o) => availableRenders.includes(o.value));
export const deployTargetOptions: Option<Target>[] = targetOptions.filter((o) => availableTargets.includes(o.value));
export const extraOptions: Option<Feature>[] = featureOptions.filter((o) => availableFeatures.includes(o.value));

export function parseFeatures(raw: string | undefined): Feature[] {
    return (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Feature[];
}

/** `--kind`, or the legacy `--type`; both given and disagreeing is an error. */
export function resolveKind(opts: CreateOptions): { kind?: Kind; error?: string } {
    const fromType = opts.type !== undefined ? LEGACY_TYPE_MAP[opts.type] : undefined;
    if (opts.type !== undefined && !fromType) {
        return { error: `--type must be one of ${Object.keys(LEGACY_TYPE_MAP).join(', ')}` };
    }
    if (opts.kind !== undefined && !kindOptions.some((o) => o.value === opts.kind)) {
        return { error: `--kind must be one of ${kindOptions.map((o) => o.value).join(', ')}` };
    }
    if (opts.kind && fromType && opts.kind !== fromType) {
        return { error: `--kind ${opts.kind} and --type ${opts.type} disagree — use --kind` };
    }
    return { kind: opts.kind ?? fromType };
}

/** True when any flag that shapes the project was given (the wizard then skips its preset question). */
export function hasSpecFlags(opts: CreateOptions): boolean {
    return [opts.kind, opts.type, opts.render, opts.target, opts.styling, opts.features, opts.preset].some((v) => v !== undefined);
}

export type SpecResult = { ok: true; spec: ProjectSpec } | { ok: false; errors: string[] };

/**
 * Build and validate a spec from flags. `defaults` supplies what the
 * environment decides when a flag is absent (name, detected package
 * manager, whether to install / init git).
 */
export function specFromOptions(
    opts: CreateOptions,
    defaults: { name: string; pm: PackageManager; install: boolean; git: boolean },
): SpecResult {
    const errors: string[] = [];
    const { kind, error } = resolveKind(opts);
    if (error) errors.push(error);

    if (opts.preset !== undefined && opts.preset !== 'quick') errors.push('--preset must be "quick"');
    const preset = opts.preset === 'quick' ? QUICK_PRESET : undefined;

    const renderValid = renderModeOptions.map((o) => o.value);
    const targetValid = deployTargetOptions.map((o) => o.value);
    const featureValid = extraOptions.map((o) => o.value);
    if (opts.render !== undefined && !renderValid.includes(opts.render)) errors.push(`--render must be one of ${renderValid.join(', ')}`);
    if (opts.target !== undefined && !targetValid.includes(opts.target)) errors.push(`--target must be one of ${targetValid.join(', ')}`);
    if (opts.styling !== undefined && !STYLINGS.includes(opts.styling)) errors.push(`--styling must be one of ${STYLINGS.join(', ')}`);
    if (opts.pm !== undefined && !PACKAGE_MANAGERS.includes(opts.pm)) errors.push(`--pm must be one of ${PACKAGE_MANAGERS.join(', ')}`);
    const features = opts.features !== undefined ? parseFeatures(opts.features) : (preset?.features ?? []);
    for (const f of features) {
        if (!featureValid.includes(f)) errors.push(`--features must be a comma-separated list of ${featureValid.join(', ')}`);
    }
    if (errors.length) return { ok: false, errors };

    const resolvedKind = kind ?? preset?.kind ?? 'spa';
    if ((opts.render !== undefined || opts.target !== undefined) && resolvedKind !== 'ssr') {
        return { ok: false, errors: ['--render and --target apply to --kind ssr only'] };
    }
    const spec = normalizeSpec({
        name: opts.name ?? defaults.name,
        kind: resolvedKind,
        render: opts.render,
        target: opts.target,
        styling: opts.styling ?? preset?.styling,
        features,
        pm: opts.pm ?? defaults.pm,
        install: opts.install ?? defaults.install,
        git: opts.git ?? defaults.git,
    });
    // validateSpec speaks in spec terms; in headless mode every problem it can
    // still find was caused by a flag, so name it.
    const problems = validateSpec(spec).map((m) => (m.startsWith('feature "') || m.startsWith('unknown feature') ? `--features: ${m}` : m));
    return problems.length ? { ok: false, errors: problems } : { ok: true, spec };
}

/** The `--list` output: everything this build can scaffold. */
export function renderList(): string {
    const section = (title: string, opts: Option<string>[]) =>
        [`${title}`, ...opts.map((o) => `  ${o.value.padEnd(12)} ${o.label}${o.description ? ` — ${o.description}` : ''}`)].join('\n');
    return [
        section('Kinds (--kind)', kindOptions),
        '',
        section('Render modes (--render, SSR only)', renderModeOptions),
        '',
        section('Deploy targets (--target, SSR only)', deployTargetOptions),
        '',
        section('Styling (--styling)', webStylingOptions),
        `  (Lynx: ${lynxStylingOptions.map((o) => o.value).join(', ')})`,
        '',
        section('Extras (--features a,b)', extraOptions),
        '',
        'Package manager (--pm): ' + PACKAGE_MANAGERS.join(', ') + '   Post-steps: --install/--no-install, --git/--no-git',
        'Presets (--preset): quick — SPA + Tailwind + router + testing',
    ].join('\n');
}
