import { defineApp } from 'sigx';
import { App } from './App';
// @sigx:if router
import { createServerRouter } from './router';
// @sigx:endif
// @sigx:if i18n
import { i18nPlugin, preloadCatalogs } from './i18n';
// @sigx:endif

/**
 * The per-request app factory. Both request handlers consume this export —
 * `createDevRequestHandler` under `vite` and `createRequestHandler` in
 * production — and each call builds a FRESH app, so nothing is shared
 * between concurrent requests. `url` is the requested path.
 */
// @sigx:if i18n
export async function createApp(url: string) {
    const app = defineApp(<App />);
    // @sigx:if router
    app.use(createServerRouter(url));
    // @sigx:endif
    // The server picks the locale (from `?lang=`) and preloads its catalogs so
    // the render is synchronous; the tree transfers to the client as SSR state.
    app.use(i18nPlugin({ context: { url }, initialMessages: await preloadCatalogs() }));
    return app;
}
// @sigx:endif
// @sigx:if !i18n
export function createApp(url: string) {
    // @sigx:if !router
    void url;
    // @sigx:endif
    const app = defineApp(<App />);
    // @sigx:if router
    app.use(createServerRouter(url));
    // @sigx:endif
    return app;
}
// @sigx:endif
