import { defineLibConfig } from '@sigx/vite/lib';

export default defineLibConfig({
    entry: {
        'cli': 'src/cli.ts',
        'index': 'src/index.ts',
        'plugin': 'src/plugin.ts',
        'commands/create': 'src/commands/create.ts',
        'commands/scaffold': 'src/commands/scaffold.ts',
        'shell/index': 'src/shell/index.ts',
    },
    external: [
        // Node built-ins
        'fs', 'path', 'url', 'child_process', 'os',
        'node:fs', 'node:path', 'node:url', 'node:module', 'node:os',
        // Runtime deps that will be in node_modules
        'citty',
        /^@sigx\//,
    ],
    platform: 'node',
    minify: false,
});
