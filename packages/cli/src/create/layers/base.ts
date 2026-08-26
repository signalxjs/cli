import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/** Every non-Lynx project: TypeScript, a favicon, the common ignores, the `cd`/install/dev next steps. */
export const base: Layer = {
    name: 'base',
    overlay: 'base',
    packageJson: { devDependencies: deps('typescript') },
    gitignore: ['node_modules', 'dist', 'dist-*', '*.local', '.env', '.env.*', '!.env.example', '.DS_Store', 'npm-debug.log*', 'pnpm-debug.log*', 'yarn-error.log*'],
    nextSteps: ({ spec, pm }) => [`cd ${spec.name}`, ...(spec.install ? [] : [pm.install]), pm.run('dev')],
};
