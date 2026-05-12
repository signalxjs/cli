/** @jsxImportSource @sigx/terminal */
import { signal, component, defineApp, Input, Button, ProgressBar, Select } from '@sigx/terminal';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Step = 'name' | 'type' | 'styling' | 'creating' | 'done';
type ProjectType = 'basic' | 'ssr' | 'ssg' | 'lynx';
type Styling = 'none' | 'tailwind' | 'daisyui';

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

const projectTypeOptions = [
    { value: 'basic' as ProjectType, label: 'Basic SPA', description: 'Simple single-page application (web)' },
    { value: 'ssr' as ProjectType, label: 'SSR', description: 'Server-side rendering with Express (web)' },
    { value: 'ssg' as ProjectType, label: 'SSG', description: 'Static site with file-based routing & MDX (web)' },
    { value: 'lynx' as ProjectType, label: 'Lynx', description: 'Native mobile app with Lynx runtime' },
];

const webStylingOptions = [
    { value: 'none' as Styling, label: 'None', description: 'No CSS framework' },
    { value: 'tailwind' as Styling, label: 'Tailwind CSS', description: 'Utility-first CSS framework' },
    { value: 'daisyui' as Styling, label: 'Tailwind + Daisy UI', description: 'Tailwind with component library' },
];

const lynxStylingOptions = [
    { value: 'none' as Styling, label: 'None', description: 'No CSS framework' },
    { value: 'tailwind' as Styling, label: 'Tailwind CSS', description: 'Tailwind with Lynx preset' },
    { value: 'daisyui' as Styling, label: 'Tailwind + Daisy UI', description: 'Lynx + @sigx/lynx-daisyui components' },
];

const TEXT_EXTS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
    'json', 'json5', 'jsonc',
    'md', 'mdx', 'txt',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'yml', 'yaml', 'toml', 'xml', 'svg',
    'gitignore', 'gitattributes', 'editorconfig', 'npmrc', 'nvmrc', 'env',
]);

function isTextExtension(filename: string): boolean {
    // Dotfiles: name after leading dot (.gitignore → "gitignore").
    const ext = filename.startsWith('.')
        ? filename.slice(1).toLowerCase()
        : filename.split('.').pop()?.toLowerCase() ?? '';
    return TEXT_EXTS.has(ext);
}

function copyDirectory(src: string, dest: string, projectName: string) {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);
    for (const entry of entries) {
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        const stat = statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath, projectName);
        } else if (isTextExtension(entry)) {
            let content = readFileSync(srcPath, 'utf-8');
            content = content.replace(/\{\{projectName\}\}/g, projectName);
            writeFileSync(destPath, content);
        } else {
            // Binary asset — copy bytes verbatim. Reading as UTF-8 would corrupt
            // non-ASCII bytes (e.g. PNG magic 0x89 → U+FFFD).
            writeFileSync(destPath, readFileSync(srcPath));
        }
    }
}

/**
 * Detect if the target directory is inside a pnpm workspace that includes @sigx packages.
 * If so, rewrite @sigx/* dependency versions to workspace:* in package.json.
 */
function patchWorkspaceDeps(targetDir: string) {
    const pkgPath = join(targetDir, 'package.json');
    if (!existsSync(pkgPath)) return;

    // Walk up to find pnpm-workspace.yaml
    let dir = dirname(targetDir);
    let isWorkspace = false;
    for (let i = 0; i < 10; i++) {
        if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
            isWorkspace = true;
            break;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    if (!isWorkspace) return;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    for (const section of ['dependencies', 'devDependencies'] as const) {
        if (!pkg[section]) continue;
        for (const dep of Object.keys(pkg[section])) {
            if (dep.startsWith('@sigx/')) {
                pkg[section][dep] = 'workspace:*';
            }
        }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
}

function scaffoldProject(opts: {
    projectName: string;
    projectType: ProjectType;
    styling: Styling;
}): { ok: true } | { ok: false; error: string } {
    const targetDir = resolve(process.cwd(), opts.projectName);
    let templateName: string;
    if (opts.projectType === 'lynx') {
        templateName = opts.styling !== 'none' ? `lynx-${opts.styling}` : 'lynx';
    } else {
        templateName = opts.styling !== 'none' ? `${opts.projectType}-${opts.styling}` : opts.projectType;
    }
    const templateDir = resolve(__dirname, '..', 'templates', templateName);
    if (existsSync(targetDir)) return { ok: false, error: `Directory "${opts.projectName}" already exists!` };
    if (!existsSync(templateDir)) return { ok: false, error: `Template "${templateName}" not found at ${templateDir}` };
    copyDirectory(templateDir, targetDir, opts.projectName);
    patchWorkspaceDeps(targetDir);
    return { ok: true };
}

const CreateSigx = component(() => {
    const state = signal({
        step: 'name' as Step,
        projectName: argProjectName || 'my-sigx-app',
        projectType: 'basic' as ProjectType,
        styling: 'none' as Styling,
        progress: 0,
        error: '',
    });

    const createProject = () => {
        state.step = 'creating';
        state.progress = 30;
        const result = scaffoldProject({
            projectName: state.projectName,
            projectType: state.projectType,
            styling: state.styling,
        });
        if (!result.ok) {
            state.error = result.error;
            return;
        }
        state.progress = 100;
        state.step = 'done';
    };

    const handleNameSubmit = () => {
        if (state.projectName.trim()) {
            state.step = 'type';
        }
    };

    const handleTypeSubmit = () => {
        state.step = 'styling';
    };

    const handleStylingSubmit = () => {
        createProject();
    };

    const handleExit = () => {
        process.exit(0);
    };

    return () => {
        if (state.error) {
            return (
                <box border="double" borderColor="red" label=" Error ">
                    <text color="red">  {state.error}</text>
                    <br />
                    <br />
                    <Button label="Exit" onClick={handleExit} />
                </box>
            );
        }

        const projectTypeLabel = (t: ProjectType) => {
            switch (t) {
                case 'basic': return 'Basic SPA';
                case 'ssr': return 'SSR';
                case 'ssg': return 'SSG';
                case 'lynx': return 'Lynx (Native)';
            }
        };

        const stylingLabel = (s: Styling) => {
            switch (s) {
                case 'none': return 'None';
                case 'tailwind': return 'Tailwind CSS';
                case 'daisyui': return 'Tailwind + Daisy UI';
            }
        };

        // Render step-specific content as a single element to avoid
        // multiple conditional children causing duplicate nodes
        const stepContent = (() => {
            switch (state.step) {
                case 'name':
                    return (
                        <box>
                            <text color="gray">  Step 1 of 3</text>
                            <br />
                            <br />
                            <text color="white">  What is your project called?</text>
                            <br />
                            <br />
                            <Input
                                model={() => state.projectName}
                                label=" Project Name "
                                placeholder="my-sigx-app"
                                autofocus
                                onSubmit={handleNameSubmit}
                            />
                            <br />
                            <text color="gray">  Press Enter to continue</text>
                        </box>
                    );
                case 'type':
                    return (
                        <box>
                            <text color="gray">  Step 2 of 3</text>
                            <br />
                            <br />
                            <text color="white">  What type of project?</text>
                            <br />
                            <br />
                            <Select
                                model={() => state.projectType}
                                label=" Project Type "
                                options={projectTypeOptions}
                                showDescription
                                autofocus
                                onSubmit={handleTypeSubmit}
                            />
                            <br />
                            <text color="gray">  ↑/↓ navigate · Enter select</text>
                        </box>
                    );
                case 'styling':
                    return (
                        <box>
                            <text color="gray">  Step 3 of 3</text>
                            <br />
                            <br />
                            <text color="white">  Choose a styling approach:</text>
                            <br />
                            <br />
                            <Select
                                model={() => state.styling}
                                label=" Styling "
                                options={state.projectType === 'lynx' ? lynxStylingOptions : webStylingOptions}
                                showDescription
                                autofocus
                                onSubmit={handleStylingSubmit}
                            />
                            <br />
                            <text color="gray">  ↑/↓ navigate · Enter select</text>
                        </box>
                    );
                case 'creating':
                    return (
                        <box>
                            <br />
                            <text color="yellow">  Creating project...</text>
                            <br />
                            <ProgressBar value={state.progress} max={100} width={40} color="green" />
                        </box>
                    );
                case 'done':
                    return (
                        <box>
                            <br />
                            <text color="green">  ✓ Project "{state.projectName}" created!</text>
                            <br />
                            <br />
                            <text color="gray">  Type:    {projectTypeLabel(state.projectType)}</text>
                            <br />
                            <text color="gray">  Styling: {stylingLabel(state.styling)}</text>
                            <br />
                            <br />
                            <text color="white">  Next steps:</text>
                            <br />
                            <br />
                            <text color="cyan">    cd {state.projectName}</text>
                            <br />
                            <text color="cyan">    pnpm install</text>
                            <br />
                            <text color="cyan">    {state.projectType === 'lynx' ? 'sigx dev' : 'pnpm dev'}</text>
                            <br />
                            <br />
                            <Button label="Exit" onClick={handleExit} />
                        </box>
                    );
            }
        })();

        return (
            <box>
                <text color="cyan">  ⚡ Create SignalX App</text>
                <br />
                {stepContent}
            </box>
        );
    };
});

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

export function runCreate() {
    if (isNonInteractive) {
        process.exit(runHeadless());
    }
    defineApp(<CreateSigx />).mount({ clearConsole: true });
    // Keep process alive for TUI
    setInterval(() => { }, 10000);
}
