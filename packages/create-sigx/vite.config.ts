import { defineLibConfig } from '@sigx/vite/lib';

// create-sigx CLI scaffolder — thin shim into @sigx/cli
export default defineLibConfig({
    entry: 'src/index.ts',
    external: [
        'fs', 'path', 'url', 'child_process',
        /@sigx\/.*/
    ],
    banner: '#!/usr/bin/env node',
    platform: 'node'
});
