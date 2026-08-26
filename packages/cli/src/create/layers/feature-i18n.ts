import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

/**
 * `@sigx/i18n`: one `app` namespace in English and Swedish, lazy catalog
 * loading via `import.meta.glob`, locale detection from `?lang=`, cookie
 * and browser. On SSR the server negotiates the locale and preloads the
 * catalogs; the client seeds from the transferred state, so hydration
 * matches without a flash.
 */
export const featureI18n: Layer = {
    name: 'feature:i18n',
    overlay: 'features/i18n',
    packageJson: { dependencies: deps('@sigx/i18n', '@sigx/store') },
    readme: [
        {
            title: 'Internationalization',
            order: 26,
            body: [
                '`src/i18n.ts` configures `@sigx/i18n`; catalogs live in `src/locales/<locale>/<namespace>.json` and load lazily per namespace. In a component: `const t = useTranslation(\'app\'); t(\'greeting\')`. Switch with `useLocale().setLocale(\'sv\')` or `?lang=sv`.',
                '',
                'Docs: https://sigx.dev/i18n/',
            ].join('\n'),
        },
    ],
};
