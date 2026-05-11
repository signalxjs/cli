import { defineSSGConfig } from '@sigx/ssg';

export default defineSSGConfig({
    pages: 'src/pages',
    layouts: 'src/layouts',
    outDir: 'dist',

    site: {
        title: '{{projectName}}',
        description: 'A SignalX static site',
        url: 'https://example.com',
    },

    markdown: {
        shiki: {
            light: 'github-light',
            dark: 'github-dark',
        },
    },
});
