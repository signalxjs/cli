import './styles.css';
import { defineApp } from 'sigx';
import { App } from './App';
// @sigx:if router
import { createAppRouter } from './router';
// @sigx:endif
// @sigx:if i18n
import { i18nPlugin } from './i18n';
// @sigx:endif

const app = defineApp(<App />);
// @sigx:if router
app.use(createAppRouter());
// @sigx:endif
// @sigx:if i18n
app.use(i18nPlugin());
// @sigx:endif
app.mount('#app');
