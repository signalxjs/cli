import { defineApp } from 'sigx';
import { renderToString, renderToStreamWithCallbacks } from '@sigx/server-renderer/server';
import { App } from './App';
import { createServerRouter } from './router';

function createApp(url: string) {
    const router = createServerRouter(url);
    return defineApp(<App />).use(router);
}

export async function render(url: string) {
    const app = createApp(url);
    return await renderToString(app);
}

export async function renderStreamWithCallback(url: string, callbacks: {
    onShellReady: (html: string) => void;
    onAsyncChunk: (chunk: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}) {
    const app = createApp(url);
    return await renderToStreamWithCallbacks(app, callbacks);
}
