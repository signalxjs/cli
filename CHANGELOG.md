# Changelog

All notable changes to this repository are documented here. Per-package changelogs live in each `packages/*/CHANGELOG.md`.

## [Unreleased]

### Added

- **A shell tab is told the pane it has to fill** (#88). `ShellTab.render` now receives a `ShellPane` — `{ width, height }`, the terminal minus whatever chrome the shell drew around the body (title bar, tab strip, body border and drop shadow, status/hints, and the command palette while it is open). That number was previously unavailable to a tab: `getTerminalSize()` reports the *terminal*, and the difference is a private detail of `runShell`'s own layout, so a tab wanting to scroll a table or fit columns to the width had to guess. Guessing low wastes the screen; guessing high pushes the shell's own footer off the bottom. The argument is additive — a `render: () => …` that ignores it still typechecks and behaves identically.

  The pane is a **budget, not a reservation**. The renderer's layout is content-driven and there is no clipping primitive, so a body that emits more rows than it was given still costs the footer; `fitLines(lines, pane)` from `@sigx/terminal` fits content to it in one call.

  Both layouts report it. Fullscreen charges each chrome segment against the terminal and derives the body box's own cost from `boxChrome`, so a change to the renderer's box geometry moves this number rather than silently misreporting it. Inline subtracts the transcript and the bottom chrome.

- **`ShellHandle.activeTab`** (#88): the id of the tab currently on screen. A shortcut that acts on "the visible tab" — a per-tab cursor, say — could not previously know which that was, and tracking it plugin-side does not work, because the shell's own `1`–`9` keys switch tabs without routing through `switchTab`, so a plugin-held copy desynchronises silently.

  It reports what is **rendered**, not what is selected: a pushed view (`pushView`) displaces the selected tab, so `activeTab` follows the view stack and falls back to the selection only at the root. The renderer resolves the visible tab through the same function, so the two cannot disagree. `''` when nothing is on screen — no tabs, the non-TTY fallback, or a view pushed for an id that is not a tab at all, which `pushView` permits.

### Changed

- **Tier-1 sibling pins move to the terminal family's 0.11 line** (#88): `@sigx/terminal ^0.11.0` and `@sigx/args ^0.11.0` (both were `^0.10.0`). Required, not cosmetic — `boxChrome` is new in `@sigx/terminal-zero` 0.11 and is what the fullscreen pane arithmetic is built on. Core stays on the 0.14 line.

- **Inline's body-height assumption is one named constant instead of two row-counts that had to agree** (#88). The filler that pushes the input to the bottom assumed a fixed 16-row body in a sum that separately re-counted the chrome; it is now `pane.height - NOMINAL_INLINE_BODY_ROWS`. An assumption is still unavoidable there — the renderer cannot measure an opaque child — but it no longer has to be kept in step with a second calculation. The tab strip is also now charged only when it is actually drawn (it is hidden outside the root view and with a single tab), which it previously was not.

## [0.8.0] - 2026-07-29

`@sigx/cli` 0.8.0, `@sigx/create` 0.4.0.

### Changed

- **Aligned to the SignalX core 0.14 line** (#90). The workspace catalog pin `@sigx/vite` moves to `^0.14.0` (was `^0.13.0`) — the single source of truth for the core minor this repo builds against, consumed via `"catalog:"` in both `@sigx/cli` and `@sigx/create`. The tier-1 sibling pins in `@sigx/cli` bump to `@sigx/args ^0.10.0` and `@sigx/terminal ^0.10.0` (both were `^0.9.0`), tracking the terminal family's 0.10 line on core 0.14. No CLI source changed — the prompt kit, dev-shell render surface and `@sigx/args` builder API all kept their signatures across the bump, and `build`, `typecheck` and `test` (11 files, 109 tests) passed on the first run.

### Known issue

- The scaffolding templates under `packages/cli/templates/` still pin siblings several minors back — `@sigx/router@^0.7.0` (now 0.10.0), `@sigx/daisyui@^0.7.0` (now 0.11.0), `@sigx/cli@^0.5.0`. An app scaffolded from those and then given a current `sigx` resolves **two copies of `@sigx/reactivity`**, which breaks reactivity silently. The drift predates this release; tracked in #91.

## [0.7.0] - 2026-07-23

`@sigx/cli` 0.7.0, `@sigx/create` 0.3.0.

### Changed

- **Aligned to the SignalX core 0.13 line** (#86). The workspace catalog pin `@sigx/vite` moves to `^0.13.0` (was `^0.12.0`) — the single source of truth for the core minor this repo builds against, consumed via `"catalog:"` in both `@sigx/cli` and `@sigx/create`. The tier-1 sibling pins in `@sigx/cli` bump to `@sigx/args ^0.9.0` (was `^0.8.0`) and `@sigx/terminal ^0.9.0` (was `^0.8.0`), tracking the terminal family's 0.9 line on core 0.13. No CLI source changed — the prompt kit, dev-shell render surface, and `@sigx/args` builder API all kept their signatures across the bump.

## [0.6.0] - 2026-07-18

### Changed

- **Migrated onto the terminal 0.8 family and core 0.12's build tool** (#79). `@sigx/cli` now depends on `@sigx/args ^0.8.0` (was `^0.6.0`) and `@sigx/terminal ^0.8.0` (was `^0.5.0`); the `@sigx/vite` devDependency in both `cli` and `create` moves to `^0.12.0` (was `^0.4.7`). The whole terminal family (`@sigx/terminal`, `@sigx/terminal-zero`, `@sigx/terminal-ui`, `@sigx/runtime-terminal`) is now the 0.8.0 line built on core 0.12 (`@sigx/reactivity`/`@sigx/runtime-core` `^0.12.0`). No source changes were needed — the prompt kit (`intro`/`outro`/`note`/`text`/`select`/`spinner`/`isCancel`/`cancel`), the dev-shell render surface (`defineApp`/`terminalMount`/`Tabs`/`StatusBar`/`renderPixelArt`/`createLogStore`/…), and the `@sigx/args` builder API (`a`/`command`/`runMain`/`parseArgs`) all kept their signatures across the 0.5→0.8 / 0.6→0.8 jumps. The CLI's runtime reactivity now resolves to a single `@sigx/reactivity@0.12.0` copy (the only other copy is the build-tool-only one bundled inside `@sigx/vite`'s own `sigx` devDependency, which is unchanged).

## [0.5.1] - 2026-07-13

`@sigx/cli` 0.5.1 (`@sigx/create` stays 0.2.3 — its `^0.5.0` dependency resolves to 0.5.1).

### Fixed

- **Lynx templates were unusable out of the box** (#75): they shipped the pre-0.4 `sigx.lynx.config.ts`, which `@sigx/lynx-cli` ≥0.4 hard-errors on ("Found legacy sigx.lynx.config.ts — rename to signalx.config.ts") — renamed to `signalx.config.ts` in all three templates (plus README/gitignore mentions). Also dropped `@sigx/lynx-device-info` from dependencies and the `modules` array — it was folded into `@sigx/lynx-core` at lynx 0.8 and has no newer published version, so any modern pin failed to resolve.
- `sigx info` now detects `signalx.config.ts`/`.js` as the Lynx project config (#75); the legacy `sigx.lynx.config.*` names are still listed but labeled as legacy with a rename hint.

### Changed

- **All 12 templates re-pinned to current matched version sets** (#75):
  - `basic`, `basic-tailwind` → core 0.8 line (`sigx`/`@sigx/vite` `^0.8.0` — 0.8.0 is perf/bugfix only, no code changes).
  - `basic-daisyui`, `ssr`, `ssr-tailwind`, `ssr-daisyui` → core 0.7 line (`sigx`/`@sigx/server-renderer`/`@sigx/router`/`@sigx/vite`/`@sigx/daisyui` `^0.7.0`) — router/daisyui 0.7.0 peers cap core at `<0.8.0`; the 0.6.1 document API these templates use is unchanged.
  - `ssg`, `ssg-tailwind`, `ssg-daisyui` → `@sigx/ssg ^0.15.0` + the 0.7 core set, and **`@sigx/cli` `^0.3.0` → `^0.5.0`** — ssg ≥0.13's CLI plugin is on the `@sigx/args` contract and a 0.3.x CLI crashes at startup registering its commands. Layout slot calls hardened to `slots.default?.()` per core 0.7's optional slot typing.
  - `lynx`, `lynx-tailwind`, `lynx-daisyui` → `@sigx/lynx-*` `^0.12.1` (lynx 0.12.1 ships lynx-cli on `@sigx/cli ^0.5.0`, giving a single-copy cli install), `@sigx/reactivity`/`@sigx/runtime-core` `^0.7.0`, `@sigx/cli` `^0.5.0`.

## [0.5.0] - 2026-07-13

`@sigx/cli` 0.5.0, `@sigx/create` 0.2.3.

### Added

- **Typed plugin args** (#71). `ctx.args` inside `definePlugin`/`defineCommand` now infers its exact type from the command's `a` builders (`a.boolean().default(false)` → `boolean`, `a.number().required()` → `number`, …) and typo'd keys are compile errors — no more `ctx.args.ios as boolean` casts. Fully backward compatible: legacy plugins (hand-annotated or `SigxPlugin`-typed objects) keep the `Record<string, unknown>` typing and compile unchanged, `TypedCommandContext` stays assignable to plain `CommandContext` so helpers keep working, and arg-less commands fall back per command without untyping their siblings. New exports: `defineCommand` (typed command in its own file), `PluginSpec`, `PluginArgs`, `TypedCommandContext`.
- **`PluginCommand` capabilities: `aliases`, `hidden`, `allowUnknownFlags`** (#71). Plugin commands can declare alternate names (rendered in `--help`, e.g. `serve, s`), hide themselves from help while staying dispatchable, and collect unrecognized flags into the new `ctx.unknownFlags` instead of erroring. Alias collisions with existing commands or aliases warn at startup (direct names always beat aliases). Nested plugin subcommands are deliberately deferred.
- Anti-drift guard for the published declarations (#71): a new test type-checks a real consumer against the emitted `dist/plugin.d.ts` with the TypeScript compiler, so a `plugin.ts`↔`generate-types.js` mismatch (the #55 failure mode) fails CI even if the string assertions are kept in sync.

### Fixed

- **`@sigx/create` shim: unknown-flag values no longer leak into positionals** (#69). The hand-rolled fallback argv parser treated an unknown flag's value as a positional, so `pnpm create @sigx --registry https://x my-app` scaffolded a project named `https://x`. The shim now parses with `@sigx/args`' headless `parseArgs` (`allowUnknownFlags`), sharing the CLI's parsing semantics; the last hand-rolled parser in the repo is gone. A project can now also literally be named `create` (previously every `create` token was stripped, not just the command token).

### Changed

- **`@sigx/create` shim: a value-taking flag with no value (e.g. trailing `--type`) now errors with exit code 2** (#69) instead of silently scaffolding with defaults.
- Internal: root command construction extracted from `cli.ts` into a testable `buildRootCommand()` (`src/root.ts`), plus an extensibility conformance suite — a lynx-shaped fixture plugin covering kebab/`no-*` literal flags, defaults, rest args, aliases, `--` passthrough, unknown-flag rejection, `DefinitionError` isolation, and collision warnings — and golden `sigx --help`/`--version` output tests (#69). No behavior change to the published CLI.

## [0.4.2] - 2026-06-12

`@sigx/cli` 0.4.2, `@sigx/create` 0.2.2.

### Changed

- **SSG templates re-pinned to the 0.6 core line** (#60). `@sigx/ssg@0.11.0` made `@sigx/router`/`@sigx/server-renderer` peerDependencies (`>=0.6.0 <0.7.0`) and widened its `sigx` peer to the 0.6 line, removing the blocker that kept the `ssg`, `ssg-tailwind`, and `ssg-daisyui` templates on the 0.4 set in #59. They now pin `sigx`/`@sigx/server-renderer`/`@sigx/vite` `^0.6.1`, `@sigx/router`/`@sigx/daisyui` `^0.6.0`, and `@sigx/ssg` `^0.11.0`. `@sigx/cli` stays `^0.3.0` in these templates: ssg 0.11.0's published CLI plugin still declares its command args in the pre-0.4 (citty-shaped) contract, which the 0.4 CLI's `@sigx/args` builders reject — move it to `^0.4.x` once ssg ships a plugin on the new contract.

### Fixed

- **Templates: `latest` pins replaced with matched version sets** (#50). Every template pinned `latest` for `sigx`/`@sigx/*`, which scaffolded mutually-exclusive core ranges as soon as versions drifted (with sigx 0.6.0 + router 0.4.5 a fresh app got three copies of `@sigx/reactivity` and `npm install` failed ERESOLVE). Web templates now pin the 0.6 matched set (`sigx`/`@sigx/server-renderer`/`@sigx/vite` `^0.6.1`, `@sigx/router`/`@sigx/daisyui` `^0.6.0`), SSG templates pin the 0.4 set that `@sigx/ssg@0.10.0` is built against (`sigx ^0.4.9`, `@sigx/router ^0.4.5`, `@sigx/server-renderer ^0.4.8`, `@sigx/daisyui ^0.4.3`, `@sigx/cli ^0.3.0` — `@sigx/ssg` has not moved to the 0.6 line yet), and Lynx templates pin `@sigx/lynx-*` `^0.7.0` with `@sigx/reactivity`/`@sigx/runtime-core` `^0.6.1` and `@sigx/cli ^0.4.1` (`@sigx/lynx-cli@0.7.0` requires the 0.4 plugin contract). A regression test fails on any `latest` pin.
- **SSR templates ported to the 0.6 document render API and the missing `server.js` added** (#50). `entry-server.tsx` used the pre-0.6 `renderToString`/`renderToStreamWithCallbacks` API and `package.json`'s `dev`/`start`/`preview` scripts ran a `server.js` the template never shipped. The SSR templates (`ssr`, `ssr-tailwind`, `ssr-daisyui`) now follow the canonical core `examples/spa-ssr` shape: an Express 5 `server.js` (Vite middleware in dev, static + built server bundle in prod) that serves crawlers/AI agents a blocking `renderDocument` and everyone else a streaming `renderDocumentToNodeStream`, an `index.html` with the standard `<!--ssr-outlet-->` marker, and a hydration entry gated on the completion signal (emitted in both modes as of server-renderer 0.6.1).
- **Templates no longer ship a `legacy-peer-deps=true` `.npmrc`** (#50). npm strips `.npmrc` from published tarballs so it never took effect — and with correctly matched version sets it would only mask a broken peer graph. `npm install` on every scaffolded template now resolves cleanly with strict peer deps and a single copy of `@sigx/reactivity` in the app's runtime graph.

## [0.4.1] - 2026-06-12

`@sigx/cli` 0.4.1, `@sigx/create` 0.2.1.

### Fixed

- **Published `plugin.d.ts` was stale in 0.4.0** (#55): `scripts/generate-types.js` (hand-maintained d.ts strings) wasn't updated with the #52 plugin-contract migration, so `@sigx/cli@0.4.0` shipped declarations with the old `ArgDef` and no `a`/`ArgsShape` exports while the runtime correctly exported them — plugins on the new fluent contract failed typechecking. The generated declarations now match the source contract (`plugin.d.ts` re-exports `a`/`ArgsShape`/`InferArgs`, `index.d.ts` follows, `create.d.ts` declares `runCreate(opts?: CreateOptions)`), and a regression test locks them to it.

## [0.4.0] - 2026-06-12

`@sigx/cli` 0.4.0, `@sigx/create` 0.2.0. Plugin authors: see the breaking plugin-contract change below.

### Changed

- **BREAKING (plugin contract): citty replaced with [`@sigx/args`](https://github.com/signalxjs/terminal/tree/main/packages/args)** (#51). `PluginCommand.args` is now a record of fluent `a.*` builders (re-exported from `@sigx/cli/plugin`): `args: { port: a.number().alias('p').default(8788), open: a.boolean() }` — typed numbers/enums/positionals/rest instead of citty's string|boolean-only defs. Behavioral deltas: unknown flags now error with a clear message (citty silently accepted them); bare positionals bind only to declared `a.positional()`/`a.rest()` args (`ctx.args._` is now the verbatim post-`--` tokens, not loose positionals); `--help` output comes from @sigx/args' help catalog. Plugins must update their schemas and set `"sigx-cli": { "requires": ">=0.4.0" }`.
- `sigx create` declares real parsed args (positional `name`, `--type`, `--styling`, `--yes/-y`) with enum validation at parse time; `runCreate(opts?)` accepts pre-parsed options while the bare `@sigx/create` shim path still self-parses `process.argv`.

## [0.2.8] - 2026-05-14

### Fixed

- **Templates: `basic-daisyui` & `ssr-daisyui`** — replaced the non-existent top-level `Stat` import from `@sigx/daisyui` with the correct `Stats.Item` compound API (`Stats.Item` with `Stats.Title`/`Stats.Value`/`Stats.Desc` children). Fixes the `Uncaught SyntaxError: ... does not provide an export named 'Stat'` runtime error when running `pnpm dev` on a freshly scaffolded daisyui project.
- **Templates: `ssg`, `ssg-tailwind`, `ssg-daisyui`** — `dev`/`build`/`preview` scripts now call `sigx` (the unified CLI) instead of a non-existent `ssg` bin. `@sigx/cli` is added as a devDependency so the scripts resolve. Fixes `ssg: command not found` on a freshly scaffolded SSG project.

### Changed

- SSG templates pick up [`@sigx/ssg@0.4.8`](https://github.com/signalxjs/ssg/releases/tag/v0.4.8), which moves `@mdx-js/rollup` from `devDependencies` to `dependencies`, so consumers no longer have to install it explicitly.
- `@sigx/create` bumped to `0.0.9` — version bump only, kept in sync with `@sigx/cli` so `npm create @sigx@latest` ships the template fixes above.

## [0.2.7] - 2026-05-13

### Fixed

- `sigx create` wizard — final fix for the duplicated Select on the Done step and "Directory already exists" error. The previous `0.2.6` release added two defensive layers (terminal `untrack` + reactivity re-entrancy guard) but the wizard still reproduced because the actual root cause was a renderer bug: `@sigx/runtime-core`'s `patch()` dropped a child component's `cleanup` closure on same-type parent re-renders, so `onUnmounted` silently stopped firing and the previous step's focusable was never unregistered. Fixed in [signalxjs/core#22](https://github.com/signalxjs/core/pull/22), shipped here by bumping `@sigx/terminal` to `^0.4.4` (which depends on `@sigx/runtime-core@0.4.7`) and `@sigx/vite` to `^0.4.7`.

### Changed

- Bump `@sigx/terminal` to `^0.4.4` and `@sigx/vite` to `^0.4.7` across the workspace.

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
