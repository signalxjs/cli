import { createI18n, type DetectionContext, type LocaleLoader, type MessageTree } from '@sigx/i18n';

/**
 * Catalogs: `src/locales/<locale>/<namespace>.json`, each its own lazy
 * chunk — a namespace loads only when a component that uses it renders.
 */
const catalogs = import.meta.glob('./locales/*/*.json');
const loadCatalog: LocaleLoader = (locale, ns) => {
    const loader = catalogs[`./locales/${locale}/${ns}.json`];
    return (loader ? loader() : Promise.resolve({})) as ReturnType<LocaleLoader>;
};

export const SUPPORTED = ['en', 'sv'] as const;
export const NAMESPACES = ['app'] as const;

/**
 * Preload every catalog into a `messages[locale][namespace]` tree. The
 * server passes it as `initialMessages` so the render resolves every
 * translation synchronously (no async boundary, hydration matches).
 */
export async function preloadCatalogs(): Promise<MessageTree> {
    const tree: MessageTree = {};
    await Promise.all(
        SUPPORTED.flatMap((locale) =>
            NAMESPACES.map(async (ns) => {
                const mod = (await loadCatalog(locale, ns)) as Record<string, unknown> & { default?: unknown };
                (tree[locale] ??= {})[ns] = (mod.default ?? mod) as MessageTree[string][string];
            }),
        ),
    );
    return tree;
}

/**
 * The i18n plugin, shared by every entry so they agree on the loader, the
 * supported set and the detection chain (`?lang=`, cookie, browser).
 * The server passes request data as `context` plus preloaded messages; the
 * client omits both and seeds from the transferred SSR state.
 */
export function i18nPlugin(opts: { context?: DetectionContext; initialMessages?: MessageTree } = {}) {
    return createI18n({
        fallbackLocale: 'en',
        supported: [...SUPPORTED],
        defaultNamespace: 'app',
        namespaces: ['app'],
        detection: { order: ['url', 'cookie', 'browser'], urlParam: 'lang', context: opts.context },
        initialMessages: opts.initialMessages,
        load: loadCatalog,
    });
}
