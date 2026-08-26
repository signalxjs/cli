/**
 * `sigx create` — the thin command: flags → spec (headless) or the wizard
 * (interactive), then scaffold → install → git → next steps.
 *
 * Two entry paths share this module: the sigx CLI passes args it already
 * parsed with @sigx/args (`runCreate(ctx.args)`), while the bare
 * `runCreate()` call from the `@sigx/create` shim (`pnpm create @sigx …`)
 * falls back to parsing `process.argv` itself.
 */
import { resolve } from 'node:path';
import { a, parseArgs, ParseError } from '@sigx/args';
import { intro, note, outro, spinner } from '@sigx/terminal';
import { renderList, specFromOptions, type CreateOptions } from '../create/headless.js';
import { gitAvailable, initGitRepo, insideGitRepo } from '../create/postinstall/git.js';
import { runInstall, tailLines } from '../create/postinstall/install.js';
import { detectPackageManager, pmCommands } from '../create/postinstall/pm.js';
import { describeSpec, type PackageManager, type ProjectSpec } from '../create/spec.js';
import { runWizard } from '../create/wizard.js';
import { scaffoldSpec } from './scaffold.js';

export type { CreateOptions };

const shimArgsShape = {
    name: a.positional().describe('Project name'),
    kind: a.string().describe('Project kind: spa | ssr | ssg | terminal | lynx'),
    type: a.string().describe('Deprecated alias of --kind (basic = spa)'),
    render: a.string().describe('SSR render mode: hydrate | islands | resume'),
    target: a.string().describe('SSR deploy target: node | cloudflare | bun | deno | vercel | vercel-edge | netlify'),
    styling: a.string().describe('Styling: none | tailwind | daisyui'),
    features: a.string().describe('Extras, comma-separated: router, i18n, testing, server-fn'),
    pm: a.string().describe('Package manager: pnpm | npm | yarn | bun | deno'),
    install: a.boolean().describe('Install dependencies after scaffolding (--no-install to skip)'),
    git: a.boolean().describe('Initialize a git repository (--no-git to skip)'),
    preset: a.string().describe('Preset: quick'),
    yes: a.boolean().alias('y').default(false).describe('Skip prompts (headless mode)'),
    list: a.boolean().default(false).describe('List kinds, render modes, targets and extras'),
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
        return args as CreateOptions;
    } catch (err) {
        if (err instanceof ParseError) {
            console.error(`Error: ${err.message}`);
            process.exit(2);
        }
        throw err;
    }
}

async function runHeadless(opts: CreateOptions, detectedPm: PackageManager): Promise<number> {
    // Headless never installs or touches git unless asked — CI-safe defaults.
    const result = specFromOptions(opts, { name: 'my-sigx-app', pm: detectedPm, install: false, git: false });
    if (!result.ok) {
        for (const e of result.errors) console.error(`Error: ${e}`);
        return 2;
    }
    const { spec } = result;
    console.log(`\n  ⚡ Creating SignalX app "${spec.name}"`);
    console.log(`     ${describeSpec(spec)}`);
    console.log(`     package manager: ${spec.pm}\n`);

    const scaffolded = scaffoldSpec(spec);
    if (!scaffolded.ok) {
        console.error(`Error: ${scaffolded.error}`);
        return 1;
    }
    console.log(`  ✓ Project created (${scaffolded.files} files)`);

    const dir = resolve(process.cwd(), spec.name);
    if (spec.install) {
        const r = await runInstall({ cwd: dir, pm: spec.pm, captured: false });
        console.log(r.ok ? '  ✓ Dependencies installed' : `  ✗ Install failed (${pmCommands(spec.pm).install} to retry)`);
    }
    if (spec.git) {
        const r = initGitRepo(dir);
        console.log(r.ok ? '  ✓ Git repository initialized' : `  ✗ ${r.output}`);
    }

    console.log(`\n  Next steps:`);
    for (const step of scaffolded.nextSteps) console.log(`    ${step}`);
    console.log('');
    return 0;
}

async function runInteractive(spec: ProjectSpec): Promise<number> {
    const s = spinner();
    s.start(`Scaffolding ${spec.name}`);
    const scaffolded = scaffoldSpec(spec);
    if (!scaffolded.ok) {
        s.stop(scaffolded.error, 'error');
        return 1;
    }
    s.stop(`Created ${spec.name} (${describeSpec(spec)}, ${scaffolded.files} files)`);

    const dir = resolve(process.cwd(), spec.name);
    const pm = pmCommands(spec.pm);
    const steps = [...scaffolded.nextSteps];

    if (spec.install) {
        const i = spinner();
        i.start(`Installing dependencies (${pm.install})`);
        const r = await runInstall({ cwd: dir, pm: spec.pm, captured: true });
        if (r.ok) {
            i.stop('Dependencies installed');
        } else {
            i.stop('Install failed — the project is ready, run the install yourself', 'error');
            const tail = tailLines(r.output);
            if (tail) note(tail, `${pm.install} output`);
            if (!steps.includes(pm.install)) steps.splice(1, 0, pm.install);
        }
    }

    if (spec.git) {
        const g = spinner();
        g.start('Initializing git repository');
        const r = initGitRepo(dir);
        if (r.ok) g.stop('Git repository initialized with a first commit');
        else g.stop(`Git skipped: ${r.output}`, 'error');
    }

    note(steps.join('\n'), 'Next steps');
    outro('Happy hacking!');
    return 0;
}

export async function runCreate(opts?: CreateOptions): Promise<void> {
    const options = opts ?? parseArgvFallback();
    if (options.list) {
        console.log(renderList());
        process.exit(0);
    }

    const detectedPm = detectPackageManager();
    const kindGiven = options.kind !== undefined || options.type !== undefined || options.preset !== undefined;
    const isNonInteractive =
        !process.stdout.isTTY || !process.stdin.isTTY || Boolean(options.yes) || (kindGiven && Boolean(options.name));

    if (isNonInteractive) {
        process.exit(await runHeadless(options, detectedPm));
    }

    intro('⚡ Create SignalX App');
    const spec = await runWizard({
        options,
        detectedPm,
        insideGitRepo: gitAvailable() && insideGitRepo(process.cwd()),
        cwd: process.cwd(),
    });
    if (spec.git && !gitAvailable()) {
        note('git is not installed — skipping the repository init.', 'Heads-up');
        spec.git = false;
    }
    process.exit(await runInteractive(spec));
}
