import { describe, it, expect, afterEach } from 'vitest';
import { defineApp } from 'sigx';
import { App } from './App';
// @sigx:if router
import { createServerRouter } from './router';
// @sigx:endif
// @sigx:if i18n
import { i18nPlugin, preloadCatalogs } from './i18n';
// @sigx:endif

/**
 * Mounts the App into happy-dom's document — the same plugin set the entry
 * installs — and asserts on the rendered DOM.
 */
describe('App', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let app: ReturnType<typeof defineApp> | undefined;

    afterEach(() => {
        app?.unmount();
        host.innerHTML = '';
    });

    it('renders the greeting', async () => {
        app = defineApp(<App />);
        // @sigx:if router
        app.use(createServerRouter('/'));
        // @sigx:endif
        // @sigx:if i18n
        app.use(i18nPlugin({ initialMessages: await preloadCatalogs() }));
        // @sigx:endif
        app.mount(host);
        expect(host.textContent).toContain('SignalX');
    });
});
