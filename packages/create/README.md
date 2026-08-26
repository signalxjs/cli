# @sigx/create

The canonical scaffolder for SignalX projects.

```bash
npm  create @sigx@latest my-app
pnpm create @sigx        my-app
yarn create @sigx        my-app
bunx create @sigx        my-app
```

The wizard asks for a project name, then offers **Quick start** (a web app with Tailwind, a router and tests) or **Customize** — kind (web SPA, SSR, static site, terminal app, native Lynx), rendering and deploy target for SSR (Node, Cloudflare Workers, Bun, Deno, Vercel, Netlify), styling (plain CSS, Tailwind, Tailwind + daisyUI) and extras (router, i18n, tests, server functions). It detects your package manager, installs dependencies and initializes git, then prints the next steps. Skip the prompts with flags:

```bash
npm create @sigx@latest my-app -- --kind ssr --target cloudflare --styling tailwind --install --git -y
npm create @sigx@latest -- --list
```

## 📚 Documentation

Full guides, template reference and live examples → **<https://sigx.dev/cli/>**

## What this package is

`@sigx/create` is a ~10-line shim that delegates to [`@sigx/cli`](https://sigx.dev/cli/)'s `create` command. The actual scaffolding logic, prompts, and templates all live in `@sigx/cli`. This package exists to give SignalX the canonical `npm create @sigx` onboarding URL — see [Vite](https://www.npmjs.com/package/create-vite), [Next](https://www.npmjs.com/package/create-next-app), [Astro](https://www.npmjs.com/package/create-astro) for the same pattern.

After scaffolding, your project uses `@sigx/cli` directly (`sigx dev`, `sigx build`, etc.).

## License

MIT — © Andreas Ekdahl
