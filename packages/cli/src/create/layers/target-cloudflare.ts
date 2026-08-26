import type { Layer } from '../layer.js';
import { deps } from '../deps.js';
import { NODE_DEV_OVERLAY, nodeDevServer } from './node-dev.js';

/** Any string → a wrangler-safe worker name. */
function workerName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'sigx-app';
}

/**
 * Cloudflare Workers: the adapter turns the server build into one bundled,
 * workerd-conditioned worker; wrangler serves `dist/client` as static
 * assets before the worker runs.
 */
export const targetCloudflare: Layer = {
    name: 'target:cloudflare',
    overlay: [NODE_DEV_OVERLAY, 'targets/cloudflare'],
    files: ({ spec }) => ({
        'wrangler.jsonc': `{
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": "${workerName(spec.name)}",
    "main": "dist/server/entry.cloudflare.js",
    "compatibility_date": "2026-08-01",
    // node:async_hooks carries the request into server functions called during SSR.
    "compatibility_flags": ["nodejs_compat"],
    "assets": {
        "directory": "dist/client",
        // Never serve the raw index.html template — the worker renders the document.
        "html_handling": "none"
    }
}
`,
    }),
    packageJson: () => {
        const base = nodeDevServer({ production: false });
        return {
            scripts: { ...base.scripts, preview: 'wrangler dev', deploy: 'wrangler deploy' },
            devDependencies: { ...base.devDependencies, ...deps('@sigx/cloudflare', 'wrangler', '@cloudflare/workers-types') },
        };
    },
    vite: {
        imports: [{ names: '{ cloudflare }', from: '@sigx/cloudflare' }],
        ssr: { adapter: 'cloudflare()' },
    },
    tsconfig: { types: ['@cloudflare/workers-types'] },
    // wrangler's workerd binary and esbuild need their install scripts (pnpm).
    allowBuilds: ['esbuild', 'workerd'],
    gitignore: ['.wrangler', '.dev.vars'],
    readme: ({ pm }) => [
        {
            title: 'Deploy (Cloudflare Workers)',
            order: 40,
            body: [
                '```sh',
                `${pm.run('build')}      # dist/server/entry.cloudflare.js + dist/client`,
                `${pm.run('preview')}    # wrangler dev — run the built worker locally`,
                `${pm.run('deploy')}     # wrangler deploy (run \`${pm.exec('wrangler')} login\` once)`,
                '```',
                '',
                '`wrangler.jsonc` is yours: add bindings (KV, D1, R2, Durable Objects) there and read them from `env` in `src/entry.cloudflare.ts`. Day-to-day development uses the Vite dev server (`' + pm.run('dev') + '`); `wrangler dev` runs the real worker over the production build.',
            ].join('\n'),
        },
    ],
    nextSteps: ({ pm }) => [`${pm.run('build')} && ${pm.run('deploy')}   # when you are ready to ship`],
};
