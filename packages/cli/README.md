# @sigx/cli

The unified `sigx` command-line tool — daily-driver CLI for [SignalX](https://sigx.dev/core/) projects (web and Lynx).

```bash
npm i -D @sigx/cli
# then:
npx sigx <command>
```

After scaffolding with `npm create @sigx@latest`, the generated project depends on `@sigx/cli` directly. The `sigx` binary is the single entry point for everything: scaffolding, dev servers, builds, previews, and platform-specific commands provided by plugins. Any package can extend `sigx` with new commands via a `sigx-cli.plugin` field in its `package.json`.

## 📚 Documentation

Full command reference, headless `create` flags, the plugin API and live examples → **<https://sigx.dev/cli/>**

```bash
sigx create my-app    # scaffold a project (interactive)
sigx dev              # start the dev server
sigx build            # production build
```

Run `sigx --help` for the full live list (varies by what plugins are installed in your project).

## Scaffolding

`sigx create` (and `npm create @sigx`) composes a project from your choices rather than copying a fixed template. Run it with no flags for the wizard — **Quick start** (SPA + Tailwind + router + tests) or **Customize** — which also picks your package manager, installs dependencies and initializes git; or pass flags:

| `--kind` | What you get |
|---|---|
| `spa` | Web app (SPA) on Vite |
| `ssr` | Server-rendered web app — `vite build --app`, Express `server.mjs`, streaming + hydration |
| `ssg` | Static site with `@sigx/ssg` — file-based routing, MDX, search |
| `terminal` | Terminal UI with `@sigx/terminal` — HMR via `sigx-terminal-dev` |
| `lynx` | Native iOS/Android app with SignalX Lynx |

`--styling none|tailwind|daisyui` picks the stylesheet (Tailwind 4 via `@tailwindcss/vite`; daisyUI 5 adds `@sigx/daisyui` components on web apps). `--pm pnpm|npm|yarn|bun|deno` sets the package manager (default: the one running `create`), `--install`/`--no-install` and `--git`/`--no-git` control the post-steps, `--preset quick` is the quick start, `--list` prints everything this build can generate. `-y` skips the prompts (no install, no git unless asked); any non-TTY run is headless too. `--type basic|ssr|ssg|terminal|lynx` still works as an alias of `--kind`.

SSR projects also choose how they render and where they deploy:

| `--render` | |
|---|---|
| `hydrate` | streaming SSR, full client hydration (default) |
| `islands` | server-only page, components hydrate per `client:*` directive |
| `resume` | zero JS on load, handlers load on first interaction |

| `--target` | Entry | Deploy |
|---|---|---|
| `node` (default) | `server.mjs` (Express) | `node --conditions production server.mjs` |
| `cloudflare` | `src/entry.cloudflare.ts` + `wrangler.jsonc` | `wrangler deploy` |
| `bun` | `server.bun.ts` | `bun --conditions=production server.bun.ts` |
| `deno` | `src/entry.deno.ts` + `deno.json` | `deno deploy` |
| `vercel` / `vercel-edge` | `src/entry.vercel.ts` | `vercel deploy --prebuilt` |
| `netlify` | `src/entry.netlify.ts` + `netlify.toml` | `netlify deploy --prod --no-build` |

Every target develops on the same Vite dev server (`dev` runs `server.mjs`); the platform entry is what `build` bundles and `deploy` ships.

Extras (`--features`, comma-separated; the interactive flow offers the ones your choices support):

| Feature | Adds | Available for |
|---|---|---|
| `router` | `@sigx/router`, `src/router.ts`, Home/About pages | SPA, SSR (hydrate) |
| `i18n` | `@sigx/i18n`, `src/i18n.ts`, `src/locales/{en,sv}/app.json`, a language switch | SPA, SSR (hydrate) |
| `testing` | Vitest (happy-dom) + oxlint, `test`/`lint` scripts, a sample test | SPA, SSR, SSG |
| `server-fn` | `@sigx/server`, `src/api/hello.server.ts` + a component reading it with `useData` | SSR (any render mode / target) |

```bash
sigx create                      # the wizard
sigx create my-app --preset quick --install --git -y
sigx create my-app --kind ssr --render resume --target cloudflare --styling tailwind --features server-fn,testing --pm npm -y
sigx create --list
```

Generated projects pin the `@sigx/*` set this CLI was released against, so a scaffolded app never resolves two copies of `@sigx/reactivity`. Every project ships a README describing its layout and how to deploy.

## Writing a plugin

Declare a top-level `sigx-cli` field in your package.json pointing at your plugin module:

```json
{
    "sigx-cli": { "plugin": "./dist/plugin.js", "requires": ">=0.4.0" }
}
```

…and default-export a plugin from that module. Args declared with the `a` builders type `ctx.args` automatically — no casts:

```ts
import { a, definePlugin } from '@sigx/cli/plugin';

export default definePlugin({
    name: 'my-tool',
    detect: (cwd) => true,
    commands: {
        dev: {
            description: 'Start the dev server',
            aliases: ['d'],                    // optional alternate names
            args: {
                port: a.number().alias('p').default(8788),
                open: a.boolean(),
            },
            run: async (ctx) => {
                ctx.args.port;                 // number — inferred from the builders
                ctx.args.open;                 // boolean | undefined
            },
        },
    },
});
```

Commands can also set `hidden: true` (dispatchable but not listed in `--help`) and `allowUnknownFlags: true` (unrecognized flags land in `ctx.unknownFlags` instead of erroring). For a command authored in its own file, wrap it in `defineCommand({...})` to keep the same `ctx.args` inference. Full plugin API → **<https://sigx.dev/cli/>**

## License

MIT — © Andreas Ekdahl
