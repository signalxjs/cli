import './styles.css';
import { defineApp } from 'sigx';
import { ssrClientPlugin } from '@sigx/server-renderer/client';
import { App } from './App';
// @sigx:if router
import { createAppRouter } from './router';
// @sigx:endif
// @sigx:if i18n
import { i18nPlugin } from './i18n';
// @sigx:endif

// Hydrate the server-rendered HTML in place. `hydrate()` is installed by
// ssrClientPlugin (declared optional on App, hence the `!`).
const app = defineApp(<App />);
// @sigx:if router
app.use(createAppRouter());
// @sigx:endif
// @sigx:if i18n
// Seeds locale + catalogs from the transferred SSR state — no refetch, no flash.
app.use(i18nPlugin());
// @sigx:endif
app.use(ssrClientPlugin).hydrate!('#app');
