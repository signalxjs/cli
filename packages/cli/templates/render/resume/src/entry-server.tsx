import { defineApp } from 'sigx';
import { resumePlugin } from '@sigx/resume';
import { resumeManifest } from 'virtual:sigx-manifests';
import { App } from './App';

/**
 * The boundary-refresh registry: components the server re-renders after a
 * mutation whose `invalidates` names data they read (single-flight
 * boundary refresh). Add a component here to let its HTML refresh without
 * its chunk ever loading in the browser.
 */
export const refreshComponents = {};

/**
 * The per-request app factory. The resume pack installs here — its
 * manifest comes from the build (undefined under `vite` dev, where QRLs
 * resolve through the virtual registry).
 */
export function createApp(_url: string) {
    return defineApp(<App />).use(resumePlugin({ manifest: resumeManifest }));
}
