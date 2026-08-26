import type { Layer } from '../layer.js';
import { deps } from '../deps.js';
import { NODE_DEV_OVERLAY, nodeDevServer } from './node-dev.js';

/**
 * Netlify: the adapter writes the Frameworks API function
 * (`.netlify/v1/functions/sigx-ssr`); `netlify.toml` publishes
 * `dist/client` so CDN files win before the catch-all runs.
 */
export const targetNetlify: Layer = {
    name: 'target:netlify',
    overlay: [NODE_DEV_OVERLAY, 'targets/netlify'],
    files: ({ pm }) => ({
        'netlify.toml': `# The SSR function needs no entry here: it ships through the Frameworks API
# channel (.netlify/v1/functions, written by the build).
[build]
  publish = "dist/client"
  command = "${pm.run('build')}"
`,
    }),
    packageJson: () => {
        const base = nodeDevServer({ production: false });
        return {
            scripts: { ...base.scripts, deploy: 'netlify deploy --prod --no-build' },
            devDependencies: { ...base.devDependencies, ...deps('@sigx/netlify') },
        };
    },
    vite: {
        imports: [{ names: '{ netlify }', from: '@sigx/netlify' }],
        ssr: { adapter: 'netlify()' },
    },
    gitignore: ['.netlify'],
    readme: ({ pm }) => [
        {
            title: 'Deploy (Netlify)',
            order: 40,
            body: [
                '```sh',
                `${pm.run('build')}                # dist/client + .netlify/v1/functions/sigx-ssr`,
                `${pm.exec('netlify')} link        # once`,
                `${pm.run('deploy')}               # netlify deploy --prod --no-build`,
                '```',
                '',
                'Or connect the repository in Netlify — `netlify.toml` already sets the build command and publish directory. Day-to-day development runs on the Vite dev server (`' + pm.run('dev') + '`).',
            ].join('\n'),
        },
    ],
};
