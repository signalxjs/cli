import { defineConfig } from 'vite';
import { sigxPlugin } from '@sigx/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        sigxPlugin(),
        tailwindcss()
    ],
    build: {
        outDir: 'dist/client'
    },
    // Vite 8 uses oxc instead of esbuild for JSX transforms
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'sigx'
        }
    }
});
