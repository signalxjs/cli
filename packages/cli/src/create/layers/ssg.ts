import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

export const ssg: Layer = {
    name: 'ssg',
    overlay: 'kinds/ssg',
    files: ({ spec }) => ({
        'ssg.config.ts': `import { defineSSGConfig } from '@sigx/ssg';

export default defineSSGConfig({
    site: {
        title: '${spec.name}',
        description: 'A SignalX static site',
        url: 'https://example.com',
        favicon: '/favicon.svg',
    },
    // Built-in search index over the rendered pages.
    search: true,
    markdown: {
        shiki: {
            light: 'github-light',
            dark: 'github-dark',
        },
    },
});
`,
    }),
    packageJson: {
        scripts: { dev: 'sigx dev', build: 'sigx build', preview: 'sigx preview' },
        dependencies: deps('sigx', '@sigx/ssg', '@sigx/router', '@sigx/server-renderer'),
        devDependencies: deps('@sigx/cli', '@sigx/vite', 'vite'),
    },
    vite: {
        plugins: [
            { name: 'sigx', from: '@sigx/vite', order: 0 },
            { name: 'ssgPlugin', from: '@sigx/ssg/vite', importKind: 'named', order: 10 },
        ],
    },
    tsconfig: { types: ['vite/client', '@sigx/ssg/virtual'] },
    // @sigx/ssg depends on esbuild, whose postinstall pnpm must be allowed to run.
    allowBuilds: ['esbuild'],
    // Every kind's overlays (and the styling overlays) ship `src/styles.css`;
    // ssg auto-imports `src/styles/global.css` into its generated client entry.
    finalize: (tree) => {
        const css = tree.get('src/styles.css');
        if (css !== undefined) {
            tree.delete('src/styles.css');
            tree.set('src/styles/global.css', css);
        }
    },
    envTypes: ['/// <reference types="vite/client" />'],
    readme: [
        {
            title: 'Project layout',
            order: 10,
            body: [
                '- `src/pages/` — every `.mdx` or `.tsx` file is a route (`index.mdx` → `/`, `about.mdx` → `/about`)',
                '- `src/layouts/default.tsx` — the page frame',
                '- `src/styles/global.css` — global styles (auto-imported by the generated client entry)',
                '- `ssg.config.ts` — site metadata, search, markdown options',
                '',
                'Interactive components inside MDX hydrate with `client:*` directives, e.g. `<Counter client:load />`.',
            ].join('\n'),
        },
        {
            title: 'Deploy',
            order: 40,
            body: 'The build renders every route to `dist/` as static HTML (plus `sitemap.xml`, `robots.txt` and the search index). Upload `dist/` to any static host — Cloudflare Pages, Netlify, Vercel, GitHub Pages, S3.',
        },
    ],
};
