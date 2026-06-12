import { defineApp } from 'sigx';
import { ssrClientPlugin } from '@sigx/server-renderer/client';
import { App } from './App';
import { createClientRouter } from './router';

const router = createClientRouter();

function startHydration() {
    const app = defineApp(<App />)
        .use(router)
        .use(ssrClientPlugin);
    // hydrate() is installed by ssrClientPlugin (declared optional on App).
    app.hydrate!('#app');
}

// Gate hydration on the server's completion signal: the document render emits
// `window.__SIGX_STREAMING_COMPLETE__` + the `sigx:ready` event after the last
// content chunk — in BOTH streaming and blocking modes — so hydration always
// runs against the finished server HTML.
if (window.__SIGX_STREAMING_COMPLETE__) {
    startHydration();
} else {
    window.addEventListener('sigx:ready', startHydration, { once: true });
}

declare global {
    interface Window {
        __SIGX_STREAMING_COMPLETE__?: boolean;
    }
}
