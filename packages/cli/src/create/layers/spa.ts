import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

export const spa: Layer = {
    name: 'spa',
    overlay: 'kinds/spa',
    packageJson: {
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: deps('sigx'),
        devDependencies: deps('@sigx/vite', 'vite'),
    },
    vite: { plugins: [{ name: 'sigx', from: '@sigx/vite', order: 0 }] },
    envTypes: ['/// <reference types="vite/client" />'],
    readme: [
        {
            title: 'Project layout',
            order: 10,
            body: [
                '- `src/main.tsx` — mounts the app (`defineApp(<App />).mount(\'#app\')`)',
                '- `src/App.tsx` — the root component; edit it and watch HMR update the page',
                '- `src/styles.css` — global styles',
            ].join('\n'),
        },
    ],
};
