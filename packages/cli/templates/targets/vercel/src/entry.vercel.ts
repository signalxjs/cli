// The Vercel function entry. Static assets never reach this code —
// the generated Build Output config serves `static/` before the function
// runs. What is left, in order:
//
//     server functions  ->  document render
import { createFetchHandler } from '@sigx/server-renderer/server';
import { template, assets } from 'virtual:sigx-app';
// @sigx:if server-fns
import { handleServerFnRequest, matchesServerFn } from '@sigx/server/server';
import { serverFns, serverFnBase } from 'virtual:sigx-server-fns';
// @sigx:endif
// @sigx:if resume
import { resumePlugin } from '@sigx/resume';
import { createBoundaryRefresh } from '@sigx/resume/server';
import { resumeManifest } from 'virtual:sigx-manifests';
import { createApp, refreshComponents } from './entry-server';
// @sigx:endif
// @sigx:if !resume
import { createApp } from './entry-server';
// @sigx:endif

const handler = createFetchHandler({
    template,
    app: (url) => createApp(url),
    document: { assets }
});

// @sigx:if resume
// Single-flight boundary refresh: a mutation's response carries the
// re-rendered HTML of every boundary whose data it invalidates. Built once
// per isolate with the same plugin set the page rendered with.
const renderBoundaries = createBoundaryRefresh({
    plugins: [resumePlugin({ manifest: resumeManifest })],
    components: refreshComponents
});
// @sigx:endif

export default {
    async fetch(request: Request): Promise<Response> {
        // @sigx:if server-fns
        if (matchesServerFn(request, serverFnBase)) {
            return handleServerFnRequest(request, {
                // The build's own mount path, so router and handler cannot disagree.
                base: serverFnBase,
                // The registry is passed explicitly, never ambient.
                resolve: (symbol) => serverFns[symbol]?.() ?? null,
                // @sigx:if resume
                renderBoundaries
                // @sigx:endif
            });
        }
        // @sigx:endif
        return handler(request);
    }
};
