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
    packageManagerOptions,
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

/** Cancel (Esc / Ctrl+C) at any prompt exits 130; otherwise the answer. */
function unwrap<T>(value: T): Exclude<T, symbol> {
    if (isCancel(value)) bail();
    return value as Exclude<T, symbol>;
}

export async function runWizard(ctx: WizardContext): Promise<ProjectSpec> {
    const { options } = ctx;

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
                options: packageManagerOptions.filter((o) => o.value !== 'deno' || shape.target === 'deno'),
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
    const available = extraOptions.filter((o) => featureSupported(o.value, { kind, render, target }));
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
