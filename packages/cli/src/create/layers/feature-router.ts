import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * `@sigx/router`: a Home/About route table, `<RouterView />` in the App,
 * `createWebHistory` in the browser and `createMemoryHistory` per request
 * on the server. The kind overlays carry the `@sigx:if router` hooks; this
 * layer adds the router module and the pages.
 */
export const featureRouter: Layer = {
    name: 'feature:router',
    overlay: 'features/router',
    packageJson: { dependencies: deps('@sigx/router') },
    readme: [
        {
            title: 'Routing',
            order: 25,
            body: [
                '`src/router.ts` declares the routes; `src/pages/` holds one component per route. `<Link to="/about">` navigates, `<RouterView />` renders the matched page, `useRoute()` reads the current one.',
                '',
                'Docs: https://sigx.dev/router/',
            ].join('\n'),
        },
    ],
};
