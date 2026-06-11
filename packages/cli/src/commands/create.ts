/**
 * `sigx create` — interactive scaffolder on the @sigx/terminal prompt kit,
 * with a flag-driven headless mode for CI (`--type`, `--styling`, `--yes`,
 * or any non-TTY stdio).
 */
import { intro, outro, note, cancel, isCancel, text, select, spinner } from '@sigx/terminal';
import {
    scaffoldProject,
    projectTypeOptions,
    webStylingOptions,
    lynxStylingOptions,
    type ProjectType,
    type Styling,
} from './scaffold.js';

// Parse CLI args (supports both interactive default and --flag headless mode).
const rawArgs = process.argv.slice(2);
function getFlag(name: string): string | undefined {
    const eq = rawArgs.find(a => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const idx = rawArgs.indexOf(`--${name}`);
    if (idx !== -1 && rawArgs[idx + 1] && !rawArgs[idx + 1].startsWith('-')) return rawArgs[idx + 1];
    return undefined;
}
function hasFlag(name: string, short?: string): boolean {
    return rawArgs.includes(`--${name}`) || (short ? rawArgs.includes(`-${short}`) : false);
}
const positionalArgs = rawArgs.filter(a => !a.startsWith('-') && a !== 'create');
const argProjectName = positionalArgs[0] || '';
const argType = getFlag('type') as ProjectType | undefined;
const argStyling = getFlag('styling') as Styling | undefined;
const flagYes = hasFlag('yes', 'y');
const isNonInteractive = !process.stdout.isTTY || !process.stdin.isTTY || flagYes
    || Boolean(argType && argProjectName);

function runHeadless(): number {
    const validTypes: ProjectType[] = ['basic', 'ssr', 'ssg', 'lynx'];
    const validStyling: Styling[] = ['none', 'tailwind', 'daisyui'];

    const projectName = argProjectName || 'my-sigx-app';
    const projectType: ProjectType = argType ?? 'basic';
    const styling: Styling = argStyling ?? 'none';

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

    console.log(`  ✓ Project created\n`);
    console.log(`  Next steps:`);
    console.log(`    cd ${projectName}`);
    console.log(`    pnpm install`);
    console.log(`    ${projectType === 'lynx' ? 'sigx dev' : 'pnpm dev'}\n`);
    return 0;
}

function bail(): never {
    cancel('Cancelled — nothing was created.');
    process.exit(130);
}

export async function runCreate(): Promise<void> {
    if (isNonInteractive) {
        process.exit(runHeadless());
    }

    intro('⚡ Create SignalX App');

    const projectName = await text({
        message: 'Project name',
        placeholder: 'my-sigx-app',
        initialValue: argProjectName || 'my-sigx-app',
        validate: (v: string) => (v.trim() ? undefined : 'Project name is required'),
    });
    if (isCancel(projectName)) bail();

    const projectType = await select<ProjectType>({
        message: 'Project type',
        initialValue: argType ?? 'basic',
        options: projectTypeOptions,
    });
    if (isCancel(projectType)) bail();

    const styling = await select<Styling>({
        message: 'Styling',
        initialValue: argStyling ?? 'none',
        options: projectType === 'lynx' ? lynxStylingOptions : webStylingOptions,
    });
    if (isCancel(styling)) bail();

    const s = spinner();
    s.start(`Scaffolding ${projectName}`);
    const result = scaffoldProject({ projectName, projectType, styling });
    if (!result.ok) {
        s.stop(result.error, 'error');
        process.exit(1);
    }
    s.stop(`Created ${projectName} (${projectType}${styling !== 'none' ? ` + ${styling}` : ''})`);

    note(
        `cd ${projectName}\npnpm install\n${projectType === 'lynx' ? 'sigx dev' : 'pnpm dev'}`,
        'Next steps',
    );
    outro('Happy hacking!');
    process.exit(0);
}
