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
        // Node built-ins — every `node:` specifier, plus the bare names still
        // in use. A built-in missing here is silently replaced by a browser
        // stub (`spawn is not a function` at runtime), so match the prefix.
        /^node:/,
        'fs', 'path', 'url', 'child_process', 'os', 'events',
        // Runtime deps that will be in node_modules
        /^@sigx\//,
    ],
    platform: 'node',
    minify: false,
});
