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
import { intro, outro, note, cancel, isCancel, text, select, spinner } from '@sigx/terminal';
import {
    scaffoldProject,
    projectTypeOptions,
    webStylingOptions,
    lynxStylingOptions,
    type ProjectType,
    type Styling,
} from './scaffold.js';

export interface CreateOptions {
    /** Project name (positional). */
    name?: string;
    type?: ProjectType;
    styling?: Styling;
    /** Skip prompts (headless mode). */
    yes?: boolean;
}

const shimArgsShape = {
    name: a.positional().describe('Project name'),
    type: a.string().describe('Project type'),
    styling: a.string().describe('Styling setup'),
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

    console.log(`\n  ⚡ Creating SignalX app "${projectName}"`);
    console.log(`     type:    ${projectType}`);
    console.log(`     styling: ${styling}\n`);

    const result = scaffoldProject({ projectName, projectType, styling });
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

    const s = spinner();
    s.start(`Scaffolding ${projectName}`);
    const result = scaffoldProject({ projectName, projectType, styling });
    if (!result.ok) {
        s.stop(result.error, 'error');
        process.exit(1);
    }
    s.stop(`Created ${projectName} (${projectType}${styling !== 'none' ? ` + ${styling}` : ''}, ${result.files} files)`);

    note(result.nextSteps.join('\n'), 'Next steps');
    outro('Happy hacking!');
    process.exit(0);
}
