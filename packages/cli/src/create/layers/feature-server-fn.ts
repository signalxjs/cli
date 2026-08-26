import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * `@sigx/server`: a typed server function in `src/api/hello.server.ts`,
 * read with `useData` from a component. During SSR it is a direct call;
 * in the browser the same import is a fetch stub. The endpoint is composed
 * into the platform entry by the target layer (`@sigx:if server-fns`).
 */
export const featureServerFn: Layer = {
    name: 'feature:server-fn',
    overlay: 'features/server-fn',
    packageJson: { dependencies: deps('@sigx/server') },
    vite: {
        // No `call`: a render layer that already configured sigxServer()
        // (resume's renderBoundaries) keeps its call; otherwise the default.
        plugins: [{ name: 'sigxServer', from: '@sigx/vite/server', importKind: 'named', order: 20 }],
        family: ['@sigx/server'],
    },
    readme: [
        {
            title: 'Server functions',
            order: 27,
            body: [
                'A `*.server.ts` module only ever runs on the server — the client build swaps it for typed fetch stubs, so database clients and secrets never ship. `src/api/hello.server.ts` declares one with `serverFn({ allowAnonymous: true, handler })`; `src/components/ServerGreeting.tsx` reads it with `useData`. Every server function is a public endpoint: validate inputs and declare `authorize` (or `allowAnonymous`) on each.',
                '',
                'Docs: https://sigx.dev/core/docs/server-functions/',
            ].join('\n'),
        },
    ],
};
