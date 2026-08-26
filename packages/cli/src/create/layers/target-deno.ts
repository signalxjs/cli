import type { Layer } from '../layer.js';
import { NODE_DEV_OVERLAY, nodeDevServer } from './node-dev.js';

/**
 * Deno / Deno Deploy: an inline adapter bundles the server with the `deno`
 * condition, leaving `jsr:` imports for the runtime; `src/entry.deno.ts`
 * serves statics with `@std/http`'s `serveDir`.
 */
export const targetDeno: Layer = {
    name: 'target:deno',
    overlay: [NODE_DEV_OVERLAY, 'targets/deno'],
    files: () => ({
        'deno.json': `{
    "nodeModulesDir": "auto",
    "tasks": {
        "dev": "node server.mjs",
        "build": "vite build --app",
        "start": "deno run --allow-net --allow-read --allow-env dist/server/entry.deno.js",
        "deploy": "deno deploy"
    }
}
`,
    }),
    packageJson: () => {
        const base = nodeDevServer({ production: false });
        return {
            scripts: {
                ...base.scripts,
                start: 'deno run --allow-net --allow-read --allow-env dist/server/entry.deno.js',
                deploy: 'deno deploy',
            },
            devDependencies: base.devDependencies,
        };
    },
    vite: {
        ssr: {
            adapter: `{
                    name: 'deno',
                    serverBuild: 'bundled',
                    conditions: ['deno'],
                    runtimeExternal: [/^jsr:/],
                    entry: 'src/entry.deno.ts'
                }`,
        },
    },
    // The Deno entry uses `Deno.*` and a `jsr:` import — typed by Deno, not tsc.
    tsconfig: { exclude: ['src/entry.deno.ts'] },
    envTypes: [
        `declare module 'jsr:@std/http@^1.0.0/file-server' {
    export function serveDir(
        request: Request,
        options?: { fsRoot?: string; urlRoot?: string; quiet?: boolean; showIndex?: boolean }
    ): Promise<Response>;
}`,
    ],
    readme: ({ pm }) => [
        {
            title: 'Deploy (Deno / Deno Deploy)',
            order: 40,
            body: [
                '```sh',
                `${pm.run('build')}`,
                'deno run --allow-net --allow-read --allow-env dist/server/entry.deno.js',
                'deno deploy      # Deno Deploy',
                '```',
                '',
                'The server build is fully bundled with the `deno` condition; only `jsr:` imports stay external and resolve at runtime. `deno.json` carries the same tasks for Deno users; day-to-day development runs on the Vite dev server (`' + pm.run('dev') + '`).',
            ].join('\n'),
        },
    ],
};
