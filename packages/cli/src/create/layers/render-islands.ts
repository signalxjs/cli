import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * Islands: the page is server-only HTML; components hydrate individually
 * on the schedule their `client:*` directive declares. The client ships
 * no page code — just the ~2 kB boundary scheduler plus per-island chunks.
 */
export const renderIslands: Layer = {
    name: 'render:islands',
    overlay: 'render/islands',
    packageJson: { dependencies: deps('@sigx/ssr-islands') },
    vite: {
        plugins: [{ name: 'sigxIslands', from: '@sigx/vite/islands', importKind: 'named', order: 10 }],
        family: ['@sigx/ssr-islands'],
    },
    readme: [
        {
            title: 'Islands',
            order: 20,
            body: [
                'The page is static HTML; only components used with a `client:*` directive ship JavaScript, each hydrating on its own schedule:',
                '',
                '```tsx',
                '<Counter client:load />          // hydrate immediately',
                '<Counter client:visible />       // when scrolled into view',
                '<Counter client:idle />          // when the browser is idle',
                '<Counter client:interaction />   // on first pointer/key/focus',
                '<Counter client:media="(min-width: 768px)" />',
                '<Counter client:only />          // skip SSR, mount fresh on the client',
                '```',
                '',
                'Island components live in `src/islands/`. Docs: https://sigx.dev/core/docs/islands/',
            ].join('\n'),
        },
    ],
};
