import { resumePlugin } from '@sigx/resume';
import { createBoundaryRefresh } from '@sigx/resume/server';
import { refreshComponents } from './entry-server';

/**
 * Dev half of single-flight boundary refresh: `sigxServer({ renderBoundaries })`
 * in vite.config.ts forwards this export to the dev server-function
 * endpoint — the same registry the production entry wires by hand.
 */
export const renderBoundaries = createBoundaryRefresh({
    plugins: [resumePlugin()],
    components: refreshComponents
});
