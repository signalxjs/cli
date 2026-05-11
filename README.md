# SignalX CLI

The official command-line tools for [SignalX](https://github.com/signalxjs/core).

## Quick start

```bash
npm  create sigx@latest my-app
pnpm create sigx        my-app
yarn create sigx        my-app
bunx create sigx        my-app
```

You'll be prompted to choose a template (basic / SSR / SSG / Lynx, with optional Tailwind or daisyUI). Once scaffolded:

```bash
cd my-app
pnpm install
pnpm dev
```

## Packages

| Package | Description |
|---|---|
| [`@sigx/cli`](./packages/cli) | Unified `sigx` binary — `sigx create`, plugin discovery, daily-driver CLI |
| [`create-sigx`](./packages/create-sigx) | Canonical `npm create sigx` scaffolder (thin shim into `@sigx/cli`) |

Lynx (native mobile) templates and the `@sigx/lynx-cli` plugin live in [`signalxjs/lynx`](https://github.com/signalxjs/lynx).

## Development

```bash
pnpm install
pnpm build
pnpm test
```

To work against a sibling [`signalxjs/core`](https://github.com/signalxjs/core) checkout, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Releasing

See [RELEASING.md](./RELEASING.md). Publishing is automated via GitHub Actions using npm Trusted Publishing (OIDC) — no `NPM_TOKEN` is stored anywhere.

## License

MIT — © Andreas Ekdahl
