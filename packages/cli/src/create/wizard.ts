/**
 * The interactive flow, on the @sigx/terminal prompt kit. Linear prompts
 * (no step machine): each answer collapses to a transcript line, Esc or
 * Ctrl+C at any prompt cancels with exit 130. Returns a validated spec; the
 * caller writes it.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cancel, confirm, isCancel, multiselect, note, select, text } from '@sigx/terminal';
import {
    deployTargetOptions,
    extraOptions,
    parseFeatures,
    QUICK_PRESET,
    renderModeOptions,
    resolveKind,
    type CreateOptions,
    hasSpecFlags,
} from './headless.js';
import {
    describeSpec,
    featureSupported,
    kindOptions,
    lynxStylingOptions,
    normalizeSpec,
    PACKAGE_MANAGERS,
    packageManagerOptions,
    STYLINGS,
    validateSpec,
    webStylingOptions,
    type Feature,
    type Kind,
    type PackageManager,
    type ProjectSpec,
    type Render,
    type Styling,
    type Target,
} from './spec.js';

export interface WizardContext {
    options: CreateOptions;
    detectedPm: PackageManager;
    /** The target's parent is already a git work tree — default git init off. */
    insideGitRepo: boolean;
    cwd: string;
}

function bail(): never {
    cancel('Cancelled — nothing was created.');
    process.exit(130);
}

/** A flag the wizard cannot honour: same exit code as headless validation. */
function fail(message: string): never {
    cancel(message);
    process.exit(2);
}

/** Cancel (Esc / Ctrl+C) at any prompt exits 130; otherwise the answer. */
function unwrap<T>(value: T): Exclude<T, symbol> {
    if (isCancel(value)) bail();
    return value as Exclude<T, symbol>;
}

export async function runWizard(ctx: WizardContext): Promise<ProjectSpec> {
    const { options } = ctx;
    // Flags are validated up front, exactly as headless does — an invalid
    // value is an error (exit 2), not a silently ignored initial value.
    const { error } = resolveKind(options);
    if (error) fail(error);
    if (options.preset !== undefined && options.preset !== 'quick') fail('--preset must be "quick"');
    if (options.pm !== undefined && !PACKAGE_MANAGERS.includes(options.pm)) fail(`--pm must be one of ${PACKAGE_MANAGERS.join(', ')}`);
    if (options.render !== undefined && !renderModeOptions.some((o) => o.value === options.render)) {
        fail(`--render must be one of ${renderModeOptions.map((o) => o.value).join(', ')}`);
    }
    if (options.target !== undefined && !deployTargetOptions.some((o) => o.value === options.target)) {
        fail(`--target must be one of ${deployTargetOptions.map((o) => o.value).join(', ')}`);
    }
    if (options.styling !== undefined && !STYLINGS.includes(options.styling)) fail(`--styling must be one of ${STYLINGS.join(', ')}`);

    const name = unwrap(
        await text({
            message: 'Project name',
            placeholder: 'my-sigx-app',
            initialValue: options.name || 'my-sigx-app',
            validate: (v: string) => {
                const trimmed = v.trim();
                if (!trimmed) return 'Project name is required';
                if (/[\\/]/.test(trimmed)) return 'Use a directory name, not a path';
                if (existsSync(resolve(ctx.cwd, trimmed))) return `"${trimmed}" already exists here`;
                return undefined;
            },
        }),
    ).trim();

    for (let attempt = 0; ; attempt++) {
        const shape = await askShape(options);
        const pm = options.pm ?? unwrap(
            await select<PackageManager>({
                message: 'Package manager',
                initialValue: ctx.detectedPm,
                options: packageManagerOptions,
            }),
        );
        const install = options.install ?? unwrap(await confirm({ message: `Install dependencies with ${pm}?`, initialValue: true }));
        const git = options.git ?? unwrap(
            await confirm({
                message: ctx.insideGitRepo ? 'Initialize a git repository? (already inside one)' : 'Initialize a git repository?',
                initialValue: !ctx.insideGitRepo,
            }),
        );

        const spec = normalizeSpec({ name, ...shape, pm, install, git });
        const problems = validateSpec(spec);
        if (problems.length) {
            note(problems.join('\n'), 'That combination does not work');
            if (attempt) bail();
            continue;
        }

        note(summary(spec), 'Summary');
        const go = unwrap(await confirm({ message: `Create ${spec.name}?`, initialValue: true }));
        if (go) return spec;
        if (attempt) bail();
        // One more round from the top of the shape questions.
    }
}

interface Shape {
    kind: Kind;
    render?: Render;
    target?: Target;
    styling: Styling;
    features: Feature[];
}

async function askShape(options: CreateOptions): Promise<Shape> {
    const { kind: flagKind } = resolveKind(options);
    if (!hasSpecFlags(options)) {
        const start = unwrap(
            await select<'quick' | 'custom'>({
                message: 'How do you want to start?',
                initialValue: 'quick',
                options: [
                    { value: 'quick', label: 'Quick start', description: 'Web app (SPA) + Tailwind + router + tests — a good default' },
                    { value: 'custom', label: 'Customize', description: 'Pick the kind, rendering, deploy target, styling and extras' },
                ],
            }),
        );
        if (start === 'quick') return { ...QUICK_PRESET, features: [...QUICK_PRESET.features] };
    } else if (options.preset === 'quick') {
        return { ...QUICK_PRESET, features: [...QUICK_PRESET.features] };
    }

    const kind = unwrap(await select<Kind>({ message: 'What are you building?', initialValue: flagKind ?? 'spa', options: kindOptions }));

    let render: Render | undefined;
    let target: Target | undefined;
    if (kind === 'ssr') {
        render = unwrap(await select<Render>({ message: 'Rendering', initialValue: options.render ?? 'hydrate', options: renderModeOptions }));
        target = unwrap(await select<Target>({ message: 'Deploy target', initialValue: options.target ?? 'node', options: deployTargetOptions }));
        if (target === 'vercel-edge') {
            note('Edge runtime: Web APIs only — no Node built-ins or filesystem in server code.', 'Heads-up');
        }
    }

    let styling: Styling = 'none';
    if (kind !== 'terminal') {
        styling = unwrap(
            await select<Styling>({
                message: 'Styling',
                initialValue: options.styling ?? 'none',
                options: kind === 'lynx' ? lynxStylingOptions : webStylingOptions,
            }),
        );
    }

    let features: Feature[] = parseFeatures(options.features);
    // Flags are validated like in headless mode: an unknown extra, or one the
    // chosen kind/render/target cannot take, is an error — not silently dropped.
    const validFeatures = extraOptions.map((o) => o.value);
    const available = extraOptions.filter((o) => featureSupported(o.value, { kind, render, target }));
    for (const f of features) {
        if (!validFeatures.includes(f)) fail(`--features must be a comma-separated list of ${validFeatures.join(', ')}`);
        if (!available.some((o) => o.value === f)) fail(`feature "${f}" is not available for ${kind}${render ? ` (${render})` : ''}${target ? ` on ${target}` : ''}`);
    }
    if (available.length) {
        features = unwrap(
            await multiselect<Feature>({
                message: 'Extras',
                initialValues: features.filter((f) => available.some((o) => o.value === f)),
                options: available,
            }),
        );
    } else {
        features = [];
    }

    return { kind, render, target, styling, features };
}

function summary(spec: ProjectSpec): string {
    const rows: Array<[string, string]> = [
        ['Project', spec.name],
        ['Setup', describeSpec(spec)],
        ['Package manager', spec.pm],
        ['Install', spec.install ? 'yes' : 'no'],
        ['Git', spec.git ? 'init + first commit' : 'no'],
    ];
    return rows.map(([k, v]) => `${k.padEnd(16)} ${v}`).join('\n');
}
