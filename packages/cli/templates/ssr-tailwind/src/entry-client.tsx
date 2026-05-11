import { defineApp } from 'sigx';
import { ssrClientPlugin } from '@sigx/server-renderer/client';
import { App } from './App';
import { createClientRouter } from './router';

const router = createClientRouter();

function startHydration() {
    defineApp(<App />)
        .use(router)
        .use(ssrClientPlugin)
        .hydrate('#app');
}

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
