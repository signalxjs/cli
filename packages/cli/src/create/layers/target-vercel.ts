import type { Layer } from '../layer.js';
import { deps } from '../deps.js';
import { NODE_DEV_OVERLAY, nodeDevServer } from './node-dev.js';

/**
 * Vercel: the adapter emits the Build Output API v3 layout
 * (`.vercel/output`) — one bundled function plus `static/` — so
 * `vercel deploy --prebuilt` uploads exactly what the build produced.
 */
export function targetVercel(runtime: 'node' | 'edge'): Layer {
    const edge = runtime === 'edge';
    return {
        name: edge ? 'target:vercel-edge' : 'target:vercel',
        overlay: [NODE_DEV_OVERLAY, 'targets/vercel'],
        packageJson: () => {
            const base = nodeDevServer({ production: false });
            return {
                scripts: { ...base.scripts, deploy: 'vercel deploy --prebuilt' },
                devDependencies: { ...base.devDependencies, ...deps('@sigx/vercel') },
            };
        },
        vite: {
            imports: [{ names: '{ vercel }', from: '@sigx/vercel' }],
            ssr: { adapter: edge ? `vercel({ runtime: 'edge' })` : 'vercel()' },
        },
        gitignore: ['.vercel'],
        readme: ({ pm }) => [
            {
                title: `Deploy (Vercel${edge ? ', Edge runtime' : ''})`,
                order: 40,
                body: [
                    '```sh',
                    `${pm.run('build')}                # writes .vercel/output (Build Output API v3)`,
                    `${pm.exec('vercel')} link          # once`,
                    `${pm.run('deploy')}               # vercel deploy --prebuilt`,
                    '```',
                    '',
                    edge
                        ? 'The function runs on the Edge runtime (`edge-light` + `worker` conditions): no Node built-ins, no filesystem — keep server code to Web APIs.'
                        : 'The function runs on the Node runtime; switch to `vercel({ runtime: \'edge\' })` in `vite.config.ts` for the Edge runtime.',
                    '',
                    'Day-to-day development runs on the Vite dev server (`' + pm.run('dev') + '`).',
                ].join('\n'),
            },
        ],
    };
}
