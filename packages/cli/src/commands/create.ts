/**
 * `sigx create` — interactive scaffolder on the @sigx/terminal prompt kit,
 * with a flag-driven headless mode for CI (`--type`, `--styling`, `--yes`,
 * or any non-TTY stdio).
 *
 * Two entry paths share this module: the sigx CLI passes args it already
 * parsed with @sigx/args (`runCreate(ctx.args)`), while the bare
 * `runCreate()` call from the `@sigx/create` shim (`pnpm create @sigx …`)
 * falls back to parsing `process.argv` itself.
 */
import { a, parseArgs, ParseError } from '@sigx/args';
import { intro, outro, note, cancel, isCancel, text, select, multiselect, spinner } from '@sigx/terminal';
import { featureSupported, LEGACY_TYPE_MAP } from '../create/spec.js';
import {
    scaffoldProject,
    projectTypeOptions,
    webStylingOptions,
    lynxStylingOptions,
    renderModeOptions,
    deployTargetOptions,
    extraOptions,
    type ProjectType,
    type Styling,
    type Render,
    type Target,
    type Feature,
} from './scaffold.js';

export interface CreateOptions {
    /** Project name (positional). */
    name?: string;
    type?: ProjectType;
    styling?: Styling;
    /** SSR render mode (`--type ssr` only). */
    render?: Render;
    /** SSR deploy target (`--type ssr` only). */
    target?: Target;
    /** Extras, comma-separated on the command line (`--features router,testing`). */
    features?: string;
    /** Skip prompts (headless mode). */
    yes?: boolean;
}

const shimArgsShape = {
    name: a.positional().describe('Project name'),
    type: a.string().describe('Project type'),
    styling: a.string().describe('Styling setup'),
    render: a.string().describe('SSR render mode: hydrate | islands | resume'),
    target: a.string().describe('SSR deploy target: node | cloudflare | bun | deno | vercel | vercel-edge | netlify'),
    features: a.string().describe('Extras, comma-separated: router, i18n, testing, server-fn'),
    yes: a.boolean().alias('y').default(false).describe('Skip prompts (headless mode)'),
};

/** Fallback argv parsing for the `@sigx/create` shim, which has no parser of its own. */
function parseArgvFallback(): CreateOptions {
    const raw = process.argv.slice(2);
    // Some invocations pass a leading literal 'create' command token
    // (npx @sigx/create create …); drop only that leading token so
    // "create" stays valid as a project name or flag value elsewhere.
    const argv = raw[0] === 'create' ? raw.slice(1) : raw;
    try {
        // allowUnknownFlags: package managers may append flags of their own
        // (--registry, …) — collect them instead of failing the scaffold.
        const { args } = parseArgs(argv, shimArgsShape, { allowUnknownFlags: true, commandPath: ['create'] });
        return {
            name: args.name,
            type: args.type as ProjectType | undefined,
            styling: args.styling as Styling | undefined,
            render: args.render as Render | undefined,
            target: args.target as Target | undefined,
            features: args.features,
            yes: args.yes,
        };
    } catch (err) {
        if (err instanceof ParseError) {
            console.error(`Error: ${err.message}`);
            process.exit(2);
        }
        throw err;
    }
}

function runHeadless(opts: CreateOptions): number {
    const validTypes = projectTypeOptions.map((o) => o.value);
    const validStyling = [...new Set([...webStylingOptions, ...lynxStylingOptions].map((o) => o.value))];

    const projectName = opts.name || 'my-sigx-app';
    const projectType: ProjectType = opts.type ?? 'basic';
    const styling: Styling = opts.styling ?? 'none';

    if (!validTypes.includes(projectType)) {
        console.error(`Error: --type must be one of ${validTypes.join(', ')}`);
        return 2;
    }
    if (!validStyling.includes(styling)) {
        console.error(`Error: --styling must be one of ${validStyling.join(', ')}`);
        return 2;
    }
    const validRenders = renderModeOptions.map((o) => o.value);
    const validTargets = deployTargetOptions.map((o) => o.value);
    if (opts.render !== undefined && !validRenders.includes(opts.render)) {
        console.error(`Error: --render must be one of ${validRenders.join(', ')}`);
        return 2;
    }
    if (opts.target !== undefined && !validTargets.includes(opts.target)) {
        console.error(`Error: --target must be one of ${validTargets.join(', ')}`);
        return 2;
    }
    if ((opts.render !== undefined || opts.target !== undefined) && projectType !== 'ssr') {
        console.error('Error: --render and --target apply to --type ssr only');
        return 2;
    }
    const features = parseFeatures(opts.features);
    const validFeatures = extraOptions.map((o) => o.value);
    for (const f of features) {
        if (!validFeatures.includes(f)) {
            console.error(`Error: --features must be a comma-separated list of ${validFeatures.join(', ')}`);
            return 2;
        }
        if (!featureSupported(f, { kind: LEGACY_TYPE_MAP[projectType], render: opts.render, target: opts.target })) {
            console.error(`Error: feature "${f}" is not available for this project type / render mode / target`);
            return 2;
        }
    }

    console.log(`\n  ⚡ Creating SignalX app "${projectName}"`);
    console.log(`     type:    ${projectType}`);
    if (projectType === 'ssr') {
        console.log(`     render:  ${opts.render ?? 'hydrate'}`);
        console.log(`     target:  ${opts.target ?? 'node'}`);
    }
    if (features.length) console.log(`     extras:  ${features.join(', ')}`);
    console.log(`     styling: ${styling}\n`);

    const result = scaffoldProject({ projectName, projectType, styling, render: opts.render, target: opts.target, features });
    if (!result.ok) {
        console.error(`Error: ${result.error}`);
        return 1;
    }

    console.log(`  ✓ Project created (${result.files} files)\n`);
    console.log(`  Next steps:`);
    for (const step of result.nextSteps) console.log(`    ${step}`);
    console.log('');
    return 0;
}

function parseFeatures(raw: string | undefined): Feature[] {
    return (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Feature[];
}

function bail(): never {
    cancel('Cancelled — nothing was created.');
    process.exit(130);
}

export async function runCreate(opts?: CreateOptions): Promise<void> {
    const options = opts ?? parseArgvFallback();
    const isNonInteractive =
        !process.stdout.isTTY || !process.stdin.isTTY || Boolean(options.yes) || Boolean(options.type && options.name);

    if (isNonInteractive) {
        process.exit(runHeadless(options));
    }

    intro('⚡ Create SignalX App');

    const projectName = await text({
        message: 'Project name',
        placeholder: 'my-sigx-app',
        initialValue: options.name || 'my-sigx-app',
        validate: (v: string) => (v.trim() ? undefined : 'Project name is required'),
    });
    if (isCancel(projectName)) bail();

    const projectType = await select<ProjectType>({
        message: 'Project type',
        initialValue: options.type ?? 'basic',
        options: projectTypeOptions,
    });
    if (isCancel(projectType)) bail();

    let render: Render | undefined;
    let target: Target | undefined;
    if (projectType === 'ssr') {
        const pickedRender = await select<Render>({
            message: 'Rendering',
            initialValue: options.render ?? 'hydrate',
            options: renderModeOptions,
        });
        if (isCancel(pickedRender)) bail();
        render = pickedRender;

        const pickedTarget = await select<Target>({
            message: 'Deploy target',
            initialValue: options.target ?? 'node',
            options: deployTargetOptions,
        });
        if (isCancel(pickedTarget)) bail();
        target = pickedTarget;
        if (target === 'vercel-edge') {
            note('Edge runtime: Web APIs only — no Node built-ins or filesystem in server code.', 'Heads-up');
        }
    }

    let styling: Styling = 'none';
    if (projectType !== 'terminal') {
        const picked = await select<Styling>({
            message: 'Styling',
            initialValue: options.styling ?? 'none',
            options: projectType === 'lynx' ? lynxStylingOptions : webStylingOptions,
        });
        if (isCancel(picked)) bail();
        styling = picked;
    }

    let features: Feature[] = parseFeatures(options.features);
    // Flags are validated like in headless mode: an unknown extra, or one the
    // chosen kind/render/target cannot take, is an error — not silently dropped.
    const validFeatures = extraOptions.map((o) => o.value);
    const available = extraOptions.filter((o) =>
        featureSupported(o.value, { kind: LEGACY_TYPE_MAP[projectType], render, target }),
    );
    for (const f of features) {
        if (!validFeatures.includes(f)) {
            cancel(`--features must be a comma-separated list of ${validFeatures.join(', ')}`);
            process.exit(2);
        }
        if (!available.some((o) => o.value === f)) {
            cancel(`feature "${f}" is not available for this project type / render mode / target`);
            process.exit(2);
        }
    }
    if (available.length) {
        const picked = await multiselect<Feature>({
            message: 'Extras',
            initialValues: features.filter((f) => available.some((o) => o.value === f)),
            options: available,
        });
        if (isCancel(picked)) bail();
        features = picked;
    }

    const s = spinner();
    s.start(`Scaffolding ${projectName}`);
    const result = scaffoldProject({ projectName, projectType, styling, render, target, features });
    if (!result.ok) {
        s.stop(result.error, 'error');
        process.exit(1);
    }
    const summary = [
        projectType,
        ...(projectType === 'ssr' ? [render, target] : []),
        ...(styling !== 'none' ? [styling] : []),
        ...features,
    ].join(' + ');
    s.stop(`Created ${projectName} (${summary}, ${result.files} files)`);

    note(result.nextSteps.join('\n'), 'Next steps');
    outro('Happy hacking!');
    process.exit(0);
}
