// The Deno entry — bundled by the build (deno.json / package.json `start`):
//
//     deno run --allow-net --allow-read --allow-env dist/server/entry.deno.js
//
// Request order: static assets -> server functions -> document render.
import { serveDir } from 'jsr:@std/http@^1.0.0/file-server';
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
const renderBoundaries = createBoundaryRefresh({
    plugins: [resumePlugin({ manifest: resumeManifest })],
    components: refreshComponents
});
// @sigx:endif

Deno.serve({ port: Number(Deno.env.get('PORT')) || 8000 }, async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    // Static tier: GET/HEAD only, never the raw index.html template.
    if ((request.method === 'GET' || request.method === 'HEAD') && pathname !== '/index.html') {
        const res = await serveDir(request, { fsRoot: 'dist/client', quiet: true, showIndex: false });
        if (res.status !== 404) return res;
    }
    // @sigx:if server-fns
    if (matchesServerFn(request, serverFnBase)) {
        return handleServerFnRequest(request, {
            base: serverFnBase,
            resolve: (symbol) => serverFns[symbol]?.() ?? null,
            // @sigx:if resume
            renderBoundaries
            // @sigx:endif
        });
    }
    // @sigx:endif
    return handler(request);
});
