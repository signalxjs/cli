import { defineApp } from 'sigx';
import { App } from './App';

/**
 * The per-request app factory. Both request handlers consume this export —
 * `createDevRequestHandler` under `vite` and `createRequestHandler` in
 * production — and each call builds a FRESH app, so nothing is shared
 * between concurrent requests. `url` is the requested path, for routing.
 */
export function createApp(_url: string) {
    return defineApp(<App />);
}
