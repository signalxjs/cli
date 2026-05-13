# @sigx/create

The canonical scaffolder for SignalX projects.

```bash
npm  create @sigx@latest my-app
pnpm create @sigx        my-app
yarn create @sigx        my-app
bunx create @sigx        my-app
```

You'll be prompted to pick a template (basic / SSR / SSG / Lynx, with optional Tailwind or daisyUI).

## What this package is

`@sigx/create` is a ~10-line shim that delegates to [`@sigx/cli`](../cli)'s `create` command. The actual scaffolding logic, prompts, and templates all live in `@sigx/cli`. This package exists to give SignalX the canonical `npm create @sigx` onboarding URL — see [Vite](https://www.npmjs.com/package/create-vite), [Next](https://www.npmjs.com/package/create-next-app), [Astro](https://www.npmjs.com/package/create-astro) for the same pattern.

After scaffolding, your project uses `@sigx/cli` directly (`sigx dev`, `sigx build`, etc.).

## License

MIT — © Andreas Ekdahl
