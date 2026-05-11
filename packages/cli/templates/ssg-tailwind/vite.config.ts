import { defineConfig } from 'vite';
import { sigxPlugin } from '@sigx/vite';
import { ssgPlugin } from '@sigx/ssg/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sigxPlugin(),
        ssgPlugin()
    ],
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'sigx'
        }
    }
});
