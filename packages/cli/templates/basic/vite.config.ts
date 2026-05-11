import { defineConfig } from 'vite';
import { sigxPlugin } from '@sigx/vite';

export default defineConfig({
    plugins: [
        sigxPlugin()
    ],
    // Vite 8 uses oxc instead of esbuild for JSX transforms
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'sigx'
        }
    }
});
