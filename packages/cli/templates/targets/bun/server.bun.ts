// The Bun production server: Bun consumes the same external `dist/` build
// Node does (it resolves node_modules and honors export conditions).
//
//     bun --conditions=production server.bun.ts
//
// Request order: static assets -> server functions -> document render.
import { createFetchHandler } from '@sigx/server-renderer/server';
// @sigx:if server-fns
import { handleServerFnRequest, matchesServerFn } from '@sigx/server/server';
import { serverFns } from './dist/server/sigx-server-fns.js';
// @sigx:endif
// @sigx:if resume
import { resumePlugin } from '@sigx/resume';
import { createBoundaryRefresh } from '@sigx/resume/server';
import { template, assets, resumeManifest } from './dist/server/sigx-app.js';
import { createApp, refreshComponents } from './dist/server/entry-server.js';
// @sigx:endif
// @sigx:if !resume
import { template, assets } from './dist/server/sigx-app.js';
import { createApp } from './dist/server/entry-server.js';
// @sigx:endif
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = resolve(fileURLToPath(new URL('./dist/client/', import.meta.url)));
const port = Number(process.env.PORT) || 3000;

const handler = createFetchHandler({
    template,
    app: (url: string) => createApp(url),
    document: { assets }
});

// @sigx:if resume
// Single-flight boundary refresh: a mutation's response carries the
// re-rendered HTML of every boundary whose data it invalidates.
const renderBoundaries = createBoundaryRefresh({
    plugins: [resumePlugin({ manifest: resumeManifest })],
    components: refreshComponents
});
// @sigx:endif

Bun.serve({
    port,
    async fetch(request: Request): Promise<Response> {
        const { pathname } = new URL(request.url);

        // Static tier: GET/HEAD only, exact file paths only (never index.html —
        // the raw template must not shadow the document render). The resolved
        // prefix check guards ../ traversal.
        if ((request.method === 'GET' || request.method === 'HEAD') && pathname !== '/' && !pathname.endsWith('/')) {
            let decoded: string | undefined;
            try {
                decoded = decodeURIComponent(pathname);
            } catch {
                // Malformed encoding — not a file path.
            }
            if (decoded) {
                const filePath = resolve(join(clientDir, decoded));
                if (filePath.startsWith(clientDir + sep)) {
                    const file = Bun.file(filePath);
                    if (await file.exists()) return new Response(file);
                }
            }
        }

        // @sigx:if server-fns
        if (matchesServerFn(request)) {
            return handleServerFnRequest(request, {
                resolve: (symbol) => serverFns[symbol]?.() ?? null,
                // @sigx:if resume
                renderBoundaries
                // @sigx:endif
            });
        }
        // @sigx:endif

        return handler(request);
    }
});

console.log(`[{{projectName}}] bun production server on http://localhost:${port}`);
