# Contributing

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Node 22+ and pnpm 10+ are required.

## Working against a sibling `signalxjs/core` checkout

While SignalX is pre-1.0, the CLI repo often needs to be tested against an unreleased `signalxjs/core` build. Use pnpm overrides:

```yaml
# pnpm-workspace.yaml (in this repo, locally — don't commit)
overrides:
  "@sigx/runtime-core": "link:../../viewti/lynx/packages/runtime-core"
  "@sigx/server-renderer": "link:../../viewti/lynx/packages/server-renderer"
```

Adjust the relative path to match your local layout. After editing, run `pnpm install` to relink.

## Conventions

- Tab/indent + style follow `signalxjs/core`. Lint with `pnpm lint`.
- Each package owns its own `README.md`, `CHANGELOG.md`, and entry in the root `CHANGELOG.md`.
- Bin scripts must start with `#!/usr/bin/env node` and be marked executable in the published tarball.

## Filing issues / PRs

- Issues: https://github.com/signalxjs/cli/issues
- Discussions about runtime primitives belong in `signalxjs/core`. Discussions about Lynx-specific behavior belong in `signalxjs/lynx`.
