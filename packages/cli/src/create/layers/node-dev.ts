import type { PackageJsonFragment } from '../layer.js';
import { deps } from '../deps.js';

/**
 * Every SSR target develops on the same Node server: `server.mjs` runs
 * Vite in middleware mode with `createDevRequestHandler`. The node target
 * also runs it in production; the others build a platform entry instead
 * and keep Express as a dev-only dependency.
 */
export const NODE_DEV_OVERLAY = 'targets/node';

export function nodeDevServer(opts: { production: boolean }): PackageJsonFragment {
    return {
        scripts: { dev: 'node server.mjs' },
        ...(opts.production
            ? { dependencies: deps('express'), devDependencies: deps('@types/express', 'cross-env') }
            : { devDependencies: deps('express', '@types/express') }),
    };
}
