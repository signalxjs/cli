import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * Resumable: zero JavaScript on load. Event handlers are extracted into
 * tiny chunks that load on first interaction; a component's own chunk
 * loads only when a write upgrades it. Server functions ride the same
 * endpoint (`@sigx/server`), which is why `sigxServer()` is part of this
 * layer.
 */
export const renderResume: Layer = {
    name: 'render:resume',
    overlay: 'render/resume',
    packageJson: { dependencies: deps('@sigx/resume', '@sigx/server') },
    vite: {
        plugins: [
            { name: 'sigxResume', from: '@sigx/vite/resume', importKind: 'named', order: 10 },
            {
                name: 'sigxServer',
                from: '@sigx/vite/server',
                importKind: 'named',
                order: 20,
                // Dev half of single-flight boundary refresh: the module's
                // `renderBoundaries` export reaches the dev fn endpoint.
                call: `sigxServer({ renderBoundaries: '/src/dev-refresh.ts' })`,
            },
        ],
        family: ['@sigx/resume', '@sigx/server'],
    },
    readme: [
        {
            title: 'Resumability',
            order: 20,
            body: [
                'The page ships **no JavaScript** except a <1 kB event loader. A click loads only the handler chunk for that event; a write to a signal then loads the component chunk and hydrates that one boundary ("upgrade-on-write").',
                '',
                '- `src/resume/` — resumable components. Handlers may capture only named signals, props and imports (the transform extracts them into chunks).',
                '- `*.server.ts` — server functions (`serverFn`), callable from handlers and during SSR; the module never ships to the browser.',
                '- `src/entry-server.tsx` — `refreshComponents`, the registry for single-flight boundary refresh after a mutation.',
                '',
                'Docs: https://sigx.dev/core/docs/resume/',
            ].join('\n'),
        },
    ],
};
