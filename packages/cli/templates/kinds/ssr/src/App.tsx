import { component } from 'sigx';
// @sigx:if router
import { RouterView, Link } from '@sigx/router';
// @sigx:endif
// @sigx:if i18n
import { useTranslation, useLocale } from '@sigx/i18n';
// @sigx:endif
// @sigx:if !router
import { Counter } from './components/Counter';
// @sigx:endif
// @sigx:if server-fn
import { ServerGreeting } from './components/ServerGreeting';
// @sigx:endif

/**
 * The root component. `signal` creates reactive state; the render function
 * re-runs only for the parts of the DOM that read what changed.
 */
export const App = component(() => {
    // @sigx:if i18n
    const t = useTranslation('app');
    const locale = useLocale();
    // @sigx:endif

    return () => (
        <div class="app">
            <header class="app-header">
                <span class="brand">⚡ {{projectName}}</span>
                <nav class="nav">
                    {/* @sigx:if router */}
                    <Link class="link" to="/">Home</Link>
                    <Link class="link" to="/about">About</Link>
                    {/* @sigx:endif */}
                    {/* @sigx:if i18n */}
                    <button class="btn btn-ghost" onClick={() => locale.setLocale(locale.locale === 'en' ? 'sv' : 'en')}>
                        {t('switch')}
                    </button>
                    {/* @sigx:endif */}
                    <a class="link" href="https://sigx.dev" target="_blank" rel="noreferrer">Docs</a>
                </nav>
            </header>

            <main class="app-main">
                {/* @sigx:if router */}
                <RouterView />
                {/* @sigx:endif */}
                {/* @sigx:if !router */}
                <div class="card">
                    <div class="card-body">
                        {/* @sigx:if i18n */}
                        <h1 class="card-title">{t('greeting')}</h1>
                        <p class="muted">{t('hint')}</p>
                        {/* @sigx:endif */}
                        {/* @sigx:if !i18n */}
                        <h1 class="card-title">Hello, SignalX</h1>
                        <p class="muted">
                            Edit <code>src/App.tsx</code> and save — the page updates in place.
                        </p>
                        {/* @sigx:endif */}
                        <Counter />
                        {/* @sigx:if server-fn */}
                        <ServerGreeting />
                        {/* @sigx:endif */}
                    </div>
                </div>
                {/* @sigx:endif */}
            </main>
        </div>
    );
});
