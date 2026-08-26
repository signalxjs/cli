import type { Layer } from '../layer.js';
import { deps } from '../deps.js';
import type { ProjectSpec } from '../spec.js';

/**
 * Vitest (happy-dom) + oxlint, with one sample test that mounts the App —
 * or, on a static site, the Counter island — and reads the DOM.
 */
export function featureTesting(spec: ProjectSpec): Layer {
    return {
        name: 'feature:testing',
        overlay: ['features/testing/base', spec.kind === 'ssg' ? 'features/testing/ssg' : 'features/testing/web'],
        files: () => ({
            'vitest.config.ts': spec.kind === 'ssg'
                ? `import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Vite 8 transforms JSX with oxc; point it at sigx's runtime like vite.config.ts does.
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'sigx'
        }
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.{ts,tsx}']
    }
});
`
                : `import { defineConfig, mergeConfig, type ConfigEnv } from 'vitest/config';
import viteConfig from './vite.config';

// Tests run through the same Vite plugins as the app (JSX runtime, and the
// sigx transforms that server functions and islands rely on).
export default defineConfig(async (env) => {
    const base = typeof viteConfig === 'function'
        ? await (viteConfig as (env: ConfigEnv) => Promise<object> | object)(env)
        : viteConfig;
    return mergeConfig(base as Record<string, unknown>, {
        test: {
            environment: 'happy-dom',
            include: ['src/**/*.test.{ts,tsx}']
        }
    });
});
`,
        }),
        packageJson: {
            scripts: { test: 'vitest run', 'test:watch': 'vitest', lint: 'oxlint src' },
            devDependencies: deps('vitest', 'happy-dom', 'oxlint'),
        },
        tsconfig: { include: ['vitest.config.ts'] },
        readme: ({ pm }) => [
            {
                title: 'Testing & linting',
                order: 35,
                body: [
                    `\`${pm.run('test')}\` runs Vitest in a happy-dom environment (\`vitest.config.ts\`); components mount into a real DOM and you assert on it — see the sample test under \`src/\`. \`${pm.run('lint')}\` runs oxlint (\`.oxlintrc.json\`).`,
                ].join('\n'),
            },
        ],
    };
}
