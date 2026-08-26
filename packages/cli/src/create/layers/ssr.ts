import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * The SSR kind: one `vite build --app` produces the client and the
 * (externalized) server build; `src/entry-server.tsx` exports the
 * per-request app factory both request handlers consume. Which server
 * runs it is the target layer's business.
 */
export const ssr: Layer = {
    name: 'ssr',
    overlay: 'kinds/ssr',
    packageJson: {
        scripts: { build: 'vite build --app' },
        dependencies: deps('sigx', '@sigx/server-renderer'),
        devDependencies: deps('@sigx/vite', 'vite', '@types/node'),
    },
    vite: {
        plugins: [{ name: 'sigx', from: '@sigx/vite', order: 0 }],
        ssr: { entry: `'src/entry-server.tsx'` },
        family: ['sigx', '@sigx/server-renderer', '@sigx/runtime-core', '@sigx/runtime-dom', '@sigx/reactivity'],
    },
    tsconfig: { types: ['node'] },
    envTypes: ['/// <reference types="vite/client" />', '/// <reference types="@sigx/vite/client" />'],
    readme: [
        {
            title: 'Project layout',
            order: 10,
            body: [
                '- `src/App.tsx` — the root component, rendered on the server and hydrated in the browser',
                '- `src/entry-server.tsx` — `createApp(url)`, the per-request app factory (no shared state between requests)',
                '- `src/entry-client.tsx` — hydrates the server HTML',
                '- `src/styles.css` — global styles',
            ].join('\n'),
        },
    ],
};
