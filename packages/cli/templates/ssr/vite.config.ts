import { defineConfig } from 'vite';
import { sigxPlugin } from '@sigx/vite';

export default defineConfig({
    plugins: [
        sigxPlugin()
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
