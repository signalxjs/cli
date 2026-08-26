import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * Node target: `server.mjs` is Express in two modes — Vite middleware +
 * `createDevRequestHandler` in dev, static assets + `createRequestHandler`
 * over `dist/` in production.
 */
export const targetNode: Layer = {
    name: 'target:node',
    overlay: 'targets/node',
    packageJson: {
        scripts: {
            dev: 'node server.mjs',
            start: 'cross-env NODE_ENV=production node --conditions production server.mjs',
        },
        dependencies: deps('express'),
        devDependencies: deps('@types/express', 'cross-env'),
    },
    readme: ({ pm }) => [
        {
            title: 'Deploy (Node)',
            order: 40,
            body: [
                `\`${pm.run('build')}\` writes \`dist/client\` (static assets) and \`dist/server\` (the externalized server build). Run it with:`,
                '',
                '```sh',
                'NODE_ENV=production node --conditions production server.mjs',
                '```',
                '',
                'Any host that runs Node works — copy `dist/`, `server.mjs`, `package.json` and install production dependencies. `PORT` sets the port (default 3000).',
            ].join('\n'),
        },
    ],
};
