import type { Layer } from '../layer.js';
import { deps } from '../deps.js';
import { NODE_DEV_OVERLAY, nodeDevServer } from './node-dev.js';

/**
 * Bun consumes the same externalized build as Node — `server.bun.ts` is
 * `Bun.serve` with a `Bun.file` static tier in front of the fetch handler.
 */
export const targetBun: Layer = {
    name: 'target:bun',
    overlay: [NODE_DEV_OVERLAY, 'targets/bun'],
    packageJson: () => {
        const base = nodeDevServer({ production: false });
        return {
            scripts: { ...base.scripts, start: 'bun --conditions=production server.bun.ts' },
            devDependencies: { ...base.devDependencies, ...deps('@types/bun') },
        };
    },
    // server.bun.ts imports the build output, so it is not part of the tsc
    // project — Bun typechecks it when it runs; @types/bun keeps editors happy.
    tsconfig: { types: ['bun'] },
    readme: ({ pm }) => [
        {
            title: 'Deploy (Bun)',
            order: 40,
            body: [
                '```sh',
                `${pm.run('build')}`,
                'bun --conditions=production server.bun.ts',
                '```',
                '',
                'Bun runs the same `dist/` build Node would (it resolves `node_modules` and honors export conditions). `server.bun.ts` serves `dist/client` with `Bun.file` and hands everything else to the fetch handler. `PORT` sets the port (default 3000).',
            ].join('\n'),
        },
    ],
};
