# Changelog

All notable changes to this repository are documented here. Per-package changelogs live in each `packages/*/CHANGELOG.md`.

## [0.1.0] — first release

Published packages:

- ✅ `@sigx/cli@0.1.0` — live on npm. Install with `npm i -g @sigx/cli` or run `npx @sigx/cli create my-app`.

Held back from this release (pending npm name-policy review for new unscoped `create-*` packages — will ship in 0.1.1 once cleared):

- ⏸ `create-sigx` (canonical scaffolder shim — enables `npm create sigx@latest`)

### Added

- Initial extraction of `@sigx/cli` from `signalxjs/core` into a dedicated repository.
- New canonical scaffolder package `create-sigx` (thin shim into `@sigx/cli`).
- Headless `sigx create` mode (auto-detected when stdin/stdout is not a TTY, or via `--type` / `--styling` / `--yes` flags) — usable from CI and scripts.
- Plugin discovery API (`@sigx/cli/plugin`) with the `sigx-cli.plugin` package.json field convention.
- `sigx info` command with environment, project, and Lynx-toolchain diagnostics.
- Built-in templates: `basic`, `basic-tailwind`, `basic-daisyui`, `ssr`, `ssr-tailwind`, `ssr-daisyui`, `ssg`, `ssg-tailwind`, `ssg-daisyui`, `lynx`, `lynx-tailwind`.
- npm Trusted Publishing (OIDC) release workflow.
- `RELEASING.md` with dist-tag strategy (publish to `@beta` first, soak, promote to `@latest`).
- Pinned template dependency versions to currently-published `@sigx/*` releases.
