# Changelog

All notable changes to this repository are documented here. Per-package changelogs live in each `packages/*/CHANGELOG.md`.

## [Unreleased]

## [0.2.7] - 2026-05-13

### Fixed

- `sigx create` wizard — final fix for the duplicated Select on the Done step and "Directory already exists" error. The previous `0.2.6` release added two defensive layers (terminal `untrack` + reactivity re-entrancy guard) but the wizard still reproduced because the actual root cause was a renderer bug: `@sigx/runtime-core`'s `patch()` dropped a child component's `cleanup` closure on same-type parent re-renders, so `onUnmounted` silently stopped firing and the previous step's focusable was never unregistered. Fixed in [signalxjs/core#22](https://github.com/signalxjs/core/pull/22), shipped here by bumping `@sigx/terminal` to `^0.4.4` (which depends on `@sigx/runtime-core@0.4.7`) and `@sigx/vite` to `^0.4.7`.

### Changed

- Bump `@sigx/terminal` peer to `^0.4.4` and `@sigx/vite` to `^0.4.7` across the workspace.

## [0.2.6] - 2026-05-13

### Fixed

- `sigx create` wizard regression — picks up the upstream fixes for the duplicated Done-screen + "Directory already exists" bug. `@sigx/terminal` floor bumped from `^0.4.2` to `^0.4.3`, which transitively brings in `@sigx/runtime-terminal@0.4.3` (focus helpers now wrap their `focusState` read/write blocks in `untrack(...)` so they cannot leak `focusState.activeId` as a dep of the caller's effect) and `@sigx/reactivity@0.4.6` (runtime-level `running` guard in `runEffect` so an effect cannot re-enter itself synchronously). See [signalxjs/terminal#8](https://github.com/signalxjs/terminal/pull/8) and [signalxjs/core#18](https://github.com/signalxjs/core/pull/18). The defensive `state.step !== <expected>` guards from 0.2.4 are kept in place as belt-and-braces.

### Changed

- `@sigx/vite` bumped from `^0.4.3` to `^0.4.6` across the workspace to keep all `@sigx/*` deps on the same 0.4.6 train.

## [0.2.5] - 2026-05-13

### Fixed

- `lynx-daisyui` template — `App.tsx` used the wrong event prop names on the DaisyUI components (`bindpress` on `<Button>`, `bindchange` on `<Toggle>`). The DaisyUI wrappers expose Vue-style props derived from their `Define.Event<…>` declarations, so the correct names are `onPress` and `onChange`. With the old props the buttons did nothing — the counter was inert. Native lynx primitives like `<view>` still use `bindtap` (those are unchanged in the plain `lynx` and `lynx-tailwind` templates).
- `lynx-daisyui` template — `tailwind.config.ts` imported `daisyuiPreset` (a lowercase alias). Switched to the canonical `DaisyLynxPreset` to match the in-repo showcase. Both still work; this avoids drift between docs and templates.
- `lynx-daisyui` template — `src/styles.css` dropped the `@tailwind components;` directive. Lynx Tailwind doesn't ship the component layer (only `base` + `utilities` per the showcase), and shipping the directive emits an unused empty layer at the head of the generated CSS.

## [0.2.4] - 2026-05-13

### Fixed

- Belt-and-braces follow-up to the 0.2.3 wizard refactor: the Exit-Enter re-run bug still reproduced for some users, suggesting the previous step's focusable component is not always being torn down by the runtime reconciler when `state.step` changes. Each submit handler (`handleNameSubmit`, `handleTypeSubmit`, `handleStylingSubmit`, `createProject`) now no-ops if `state.step` has already moved past its own step, so any lingering submit event from a stale focusable is dropped instead of re-running `scaffoldProject` (which then errored with `Directory already exists`) or rewinding the wizard.

## [0.2.3] - 2026-05-13

### Changed

- Renamed the canonical scaffolder package from `create-sigx` (unscoped) to `@sigx/create` (scoped). npm Support confirmed the unscoped `create-sigx` name is permanently blocked by their anti-typosquatting / restricted-name filter for unscoped publishes, with no whitelisting path. Pivoting to a scoped name under the already-owned `@sigx` org both bypasses that filter and matches the rest of the package set. User-facing command becomes `npm create @sigx@latest my-app` (also `pnpm create @sigx`, `yarn create @sigx`, `bunx create @sigx`); npm's `init`/`create` command resolves `@scope` → `@scope/create` automatically. The package was never successfully published under the old name, so no installs break.
- Templates now reference `sigx` and every `@sigx/*` dependency as `"latest"` instead of pinning a specific caret range. Newly scaffolded projects always pull the most recent published `@sigx/*` packages on first `pnpm install`, so they don't lag behind fast-forward releases. Third-party deps (`vite`, `tailwindcss`, `typescript`, `express`, `daisyui`, `@lynx-js/*`, etc.) keep their existing caret ranges. The in-workspace path (`patchWorkspaceDeps`) still rewrites `@sigx/*` to `workspace:*` so monorepo scaffolds keep working unchanged.

### Fixed

- `sigx create` wizard would re-run `scaffoldProject` when the user pressed Enter on the Exit button of the Done screen, surfacing as `Directory "…" already exists!` instead of exiting cleanly. The IIFE-switch render returned differently-shaped JSX at the same `<box>` slot for every step, so the reconciler kept previous-step focusable components alive across transitions. Split each step into its own component (`StepName`, `StepType`, `StepStyling`, `StepCreating`, `StepDone`, `ErrorScreen`) so each transition is a distinct component type at the slot, forcing a clean unmount/remount of the focusable. Belt-and-braces upstream fix in `@sigx/runtime-terminal@0.4.2` adds the same 50ms post-mount keystroke cooldown to `Button` that `Input` and `Select` already have. Floor on `@sigx/terminal` bumped to `^0.4.2`.
- `@sigx/cli` / `@sigx/create` — `sigx create` was reading every template file as UTF-8 before applying `{{projectName}}` substitution, which corrupted binary template assets (PNG icons in the `lynx` template — the `0x89` magic byte became the UTF-8 replacement bytes `0xEF 0xBF 0xBD`, and `sharp` rejected the resulting file as "unsupported image format"). Text files still get `{{projectName}}` substitution; binaries are now byte-copied.
- `sigx create` was shipping templates with no `.gitignore` because npm strips `.gitignore` from published tarballs. Templates now ship a `gitignore` (no leading dot) file and the scaffolder renames it back to `.gitignore` on copy, so generated projects have a working `.gitignore` again.
- `lynx` and `lynx-tailwind` templates — `package.json` referenced the obsolete `@sigx/runtime-lynx[-main]` names (orphaned tarballs from the `signalxjs/core` era) instead of the canonical `@sigx/lynx-runtime[-main]`. Also added the native module deps the template's `sigx.lynx.config.ts` already references (`@sigx/lynx-storage`, `-clipboard`, `-haptics`, `-device-info`, `-network`) and the `@sigx/lynx-dev-client` debug dep that the iOS `App.swift` template uses for `SigxDevClient` / `DevTemplateProvider`. Without these, `pnpm install` warned and the iOS Swift build failed with "cannot find SigxDevClient in scope". The Lynx main-thread entry (`src/main.thread.tsx`) was also still importing the old `@sigx/runtime-lynx-main` name; switched to `@sigx/lynx-runtime-main`.
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
