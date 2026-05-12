# Changelog

All notable changes to this repository are documented here. Per-package changelogs live in each `packages/*/CHANGELOG.md`.

## [Unreleased]

### Fixed

- `@sigx/cli` 0.1.2 / `create-sigx` 0.1.1 — `sigx create` was reading every template file as UTF-8 before applying `{{projectName}}` substitution, which corrupted binary template assets (PNG icons in the `lynx` template — the `0x89` magic byte became the UTF-8 replacement bytes `0xEF 0xBF 0xBD`, and `sharp` rejected the resulting file as "unsupported image format"). Text files still get `{{projectName}}` substitution; binaries are now byte-copied.
- `lynx` and `lynx-tailwind` templates — `package.json` referenced the obsolete `@sigx/runtime-lynx[-main]` names (orphaned tarballs from the `signalxjs/core` era) instead of the canonical `@sigx/lynx-runtime[-main]`. Also added the native module deps the template's `sigx.lynx.config.ts` already references (`@sigx/lynx-storage`, `-clipboard`, `-haptics`, `-device-info`, `-network`) and the `@sigx/lynx-dev-client` debug dep that the iOS `App.swift` template uses for `SigxDevClient` / `DevTemplateProvider`. Without these, `pnpm install` warned and the iOS Swift build failed with "cannot find SigxDevClient in scope".
- `scripts/publish.js` — was overwritten by a copy of `signalxjs/core`'s `publish.js` and still had the hardcoded `PACKAGES` list pointing at paths that don't exist in this repo (`packages/reactivity`, `packages/sigx`, …). The CI release step would silently log "package.json not found" and ship zero tarballs. Replaced with the workspace-enumerating script from `signalxjs/lynx` (`pnpm publish -r` for ordering + `workspace:^` rewriting). Added matching `verify:pack` script referenced by `release.yml`.

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
