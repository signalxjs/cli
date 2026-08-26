import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

export const terminal: Layer = {
    name: 'terminal',
    overlay: 'kinds/terminal',
    packageJson: {
        scripts: {
            dev: 'sigx-terminal-dev src/main.tsx',
            start: 'tsx src/main.tsx',
            typecheck: 'tsc --noEmit',
        },
        dependencies: deps('@sigx/terminal'),
        devDependencies: deps('@sigx/terminal-dev', 'tsx', '@types/node'),
    },
    tsconfig: { compilerOptions: { jsxImportSource: '@sigx/terminal' }, types: ['node'] },
    allowBuilds: ['esbuild'],
    readme: [
        {
            title: 'Project layout',
            order: 10,
            body: [
                '- `src/main.tsx` — the mount module (`defineApp(<App />).mount(…, terminalMount)`)',
                '- `src/App.tsx` — the root component; save it and the running TUI updates in place',
                '',
                'Interactive apps need a real terminal (TTY). Piping the output (`| cat`) prints a single plain-text frame instead.',
            ].join('\n'),
        },
    ],
};
