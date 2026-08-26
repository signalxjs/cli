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

`sigx create` (and `npm create @sigx`) composes a project from your choices rather than copying a fixed template:

| `--type` | What you get |
|---|---|
| `basic` | Web app (SPA) on Vite |
| `ssr` | Server-rendered web app — `vite build --app`, Express `server.mjs`, streaming + hydration |
| `ssg` | Static site with `@sigx/ssg` — file-based routing, MDX, search |
| `terminal` | Terminal UI with `@sigx/terminal` — HMR via `sigx-terminal-dev` |
| `lynx` | Native iOS/Android app with SignalX Lynx |

`--styling none|tailwind|daisyui` picks the stylesheet (Tailwind 4 via `@tailwindcss/vite`; daisyUI 5 adds `@sigx/daisyui` components on web apps). `-y` skips the prompts; any non-TTY run is headless too.

```bash
sigx create my-app --type ssr --styling tailwind -y
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
