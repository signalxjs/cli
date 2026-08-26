import { component } from 'sigx';
// @sigx:if i18n
import { useTranslation } from '@sigx/i18n';
// @sigx:endif
import { Counter } from '../components/Counter';
// @sigx:if server-fn
import { ServerGreeting } from '../components/ServerGreeting';
// @sigx:endif

export const Home = component(() => {
    // @sigx:if i18n
    const t = useTranslation('app');
    // @sigx:endif
    return () => (
        <div class="card">
            <div class="card-body">
                {/* @sigx:if i18n */}
                <h1 class="card-title">{t('greeting')}</h1>
                <p class="muted">{t('hint')}</p>
                {/* @sigx:endif */}
                {/* @sigx:if !i18n */}
                <h1 class="card-title">Hello, SignalX</h1>
                <p class="muted">
                    Edit <code>src/pages/Home.tsx</code> and save — the page updates in place.
                </p>
                {/* @sigx:endif */}
                <Counter />
                {/* @sigx:if server-fn */}
                <ServerGreeting />
                {/* @sigx:endif */}
            </div>
        </div>
    );
});
