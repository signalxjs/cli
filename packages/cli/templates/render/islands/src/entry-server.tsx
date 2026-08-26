import { defineApp } from 'sigx';
import { islandsPlugin } from '@sigx/ssr-islands';
import { islandsManifest } from 'virtual:sigx-manifests';
import { App } from './App';

/**
 * The per-request app factory. The islands pack installs here — its
 * manifest comes from the build (undefined under `vite` dev, where islands
 * resolve through the virtual registry). A fresh app per request keeps
 * concurrent renders independent.
 */
export function createApp(_url: string) {
    return defineApp(<App />).use(islandsPlugin({ manifest: islandsManifest }));
}
