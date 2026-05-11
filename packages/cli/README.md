# @sigx/cli

The unified `sigx` command-line tool — daily-driver CLI for [SignalX](https://github.com/signalxjs/core) projects (web and Lynx).

```bash
npm i -D @sigx/cli
# then:
npx sigx <command>
```

After scaffolding with `npm create sigx@latest`, the generated project depends on `@sigx/cli` directly. The `sigx` binary is the entry point for everything: scaffolding, dev servers, builds, previews, and platform-specific commands provided by plugins.

## Commands

| Command | Provided by | Description |
|---|---|---|
| `sigx create [name]`     | core                | Scaffold a new project (interactive TUI; falls back to flag-driven headless when stdout isn't a TTY or when `--yes` / `--type` is passed) |
| `sigx info`              | core                | Print environment & project info (Node, pnpm, installed `@sigx/*` packages, Lynx toolchain) |
| `sigx dev`               | `@sigx/vite` plugin | Start the Vite dev server (web) |
| `sigx build`             | `@sigx/vite` plugin | Production build (web) |
| `sigx preview`           | `@sigx/ssg` plugin  | Serve a built SSG site |
| `sigx prebuild`          | `@sigx/lynx-cli`    | Generate native iOS/Android project files |
| `sigx run:android`       | `@sigx/lynx-cli`    | Build & launch on Android |
| `sigx run:ios`           | `@sigx/lynx-cli`    | Build & launch on iOS |
| `sigx doctor`            | `@sigx/lynx-cli`    | Verify Lynx toolchain (rspeedy, ADB, Xcode, JDK) |

Run `sigx --help` for the full live list (varies by what plugins are installed in your project).

## Headless `create` (CI / scripts)

```bash
sigx create my-app --type basic                      # web SPA
sigx create my-app --type ssr  --styling tailwind    # SSR + Tailwind
sigx create my-app --type ssg  --styling daisyui     # SSG + Tailwind + daisyUI
sigx create my-app --type lynx --styling tailwind    # native mobile (Lynx)
```

Valid values:

- `--type`: `basic` | `ssr` | `ssg` | `lynx`
- `--styling`: `none` | `tailwind` | `daisyui` (daisyUI not available for `lynx`)
- `--yes` / `-y`: skip prompts even when running in a TTY

Headless mode is also auto-selected when stdin/stdout is not a TTY (e.g. CI runners).

## Plugins

Any package can extend `sigx` with new commands. To author a plugin, ship a `sigx-cli.plugin` field in your `package.json` pointing at a module that default-exports a `SigxPlugin`:

```json
{
  "name": "my-sigx-plugin",
  "sigx-cli": { "plugin": "./dist/plugin.js" }
}
```

```ts
// my-sigx-plugin/src/plugin.ts
import type { SigxPlugin } from '@sigx/cli/plugin';

export default {
    name: 'my-plugin',
    commands: {
        hello: {
            description: 'Say hello',
            async run({ cwd, args, logger }) {
                logger.info(`hello from ${cwd}`);
            },
        },
    },
} satisfies SigxPlugin;
```

Plugins are discovered by walking up from `cwd` and inspecting installed dependencies' `package.json` files for the `sigx-cli.plugin` key.

## License

MIT — © Andreas Ekdahl
