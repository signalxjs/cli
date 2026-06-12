import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

// Crawlers and AI agents get the blocking document: complete content inline,
// no placeholders, nothing for the client to execute.
const BOT_UA = /bot|crawl|spider|slurp|gptbot|claudebot|perplexity|headless/i;

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('./src/entry-server').render} render
 * @param {string} template
 */
async function handle(req, res, render, template) {
    const bot = BOT_UA.test(req.get('user-agent') ?? '');
    const result = render(req.originalUrl, template, { bot });

    if (result.kind === 'blocking') {
        res.status(200).set({ 'Content-Type': 'text/html' }).end(await result.html);
        return;
    }

    // Status-code decision point: the shell promise settles before any byte
    // is produced. Reject -> we can still send a proper 500 page.
    try {
        await result.shell;
    } catch (err) {
        console.error('[ssr] shell render failed:', err);
        res.status(500).set({ 'Content-Type': 'text/html' })
            .end('<!doctype html><h1>500 — render failed</h1>');
        return;
    }
    res.status(200).set({ 'Content-Type': 'text/html' });
    // Headers are sent once streaming starts: a mid-stream failure can only
    // end the response, and a client disconnect tears the render down so it
    // doesn't keep working (or emit an unhandled 'error') after the fact.
    result.stream.on('error', (err) => {
        console.error('[ssr] stream error:', err);
        res.end();
    });
    res.on('close', () => result.stream.destroy());
    result.stream.pipe(res);
}

async function createServer() {
    const app = express();

    if (!isProd) {
        // Dev: hand HTTP to Vite middleware, load entry-server via Vite SSR loader.
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            root: __dirname,
            server: { middlewareMode: true },
            appType: 'custom'
        });
        app.use(vite.middlewares);

        // NOTE: express 5 (path-to-regexp 8) no longer accepts '*' as a path —
        // a bare use() matches everything.
        app.use(async (req, res, next) => {
            try {
                const url = req.originalUrl;
                const rawHtml = await readFile(resolve(__dirname, 'index.html'), 'utf-8');
                const template = await vite.transformIndexHtml(url, rawHtml);
                const mod = await vite.ssrLoadModule('/src/entry-server.tsx');
                await handle(req, res, mod.render, template);
            } catch (err) {
                next(err);
            }
        });
    } else {
        // Prod: serve built client assets and dynamically import the server bundle.
        const clientDir = resolve(__dirname, 'dist/client');
        const template = await readFile(resolve(clientDir, 'index.html'), 'utf-8');
        const { render } = await import('./dist/server/entry-server.js');

        app.use(express.static(clientDir, { index: false }));

        app.use(async (req, res, next) => {
            try {
                await handle(req, res, render, template);
            } catch (err) {
                next(err);
            }
        });
    }

    app.listen(port, () => {
        console.log(`[ssr] ${isProd ? 'production' : 'dev'} server on http://localhost:${port}`);
    });
}

createServer().catch((err) => {
    console.error('[ssr] failed to start server:', err);
    process.exit(1);
});
