# Releasing

Publishing happens **only** from GitHub Actions via npm Trusted Publishing (OIDC). No `NPM_TOKEN` is stored.

## Pre-release checklist

- [ ] `pnpm install`, `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint` all pass on `main`.
- [ ] `pnpm publish:dry` succeeds.
- [ ] `CHANGELOG.md` entries added for the version being cut.
- [ ] Each package's `repository`, `homepage`, and `bugs` fields point at `signalxjs/cli`.

## Cutting a release

```bash
# 1. Bump versions
pnpm version:patch          # or minor / major / explicit

# 2. Commit + tag
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z

# 3. Push — release.yml triggers on the tag
git push --follow-tags
```

The release workflow publishes every package directly to `@latest` (with provenance) and publishes the GitHub Release.

## Onboarding a new package to npm Trusted Publishing

For each `@sigx/*` package the **first publish** has to be done manually with an authenticated npm account, then on https://www.npmjs.com/package/<name>/access:

1. Settings → Trusted Publishers → Add a Trusted Publisher.
2. Provider: GitHub Actions.
3. Repository owner: `signalxjs`. Repository: `cli`. Workflow filename: `release.yml`. Environment: `npm-publish`.

Subsequent publishes happen automatically via OIDC — no token required. The published tarball will carry npm provenance attestation and the "verified publisher" badge.

## Dist-tag strategy

Releases publish **directly to `@latest`** — there is no beta/soak stage for now, since we ship fast and have no beta channel. The CI gate (lint, typecheck, build, test, verify pack) plus a post-release smoke test is the safety net. If a release turns out bad, roll back by pointing `@latest` at the previous version:

```bash
npm dist-tag add @sigx/cli@<previous-version> latest
npm dist-tag add @sigx/create@<previous-version> latest
```

After the workflow finishes, smoke-test: `npm create @sigx@latest my-app` — verify the scaffolder runs and the generated project boots. Then update `CHANGELOG.md`.

The publish script still supports `--tag beta` (`pnpm publish:beta`) if a release ever needs a pre-release channel. Pre-release identifiers (`0.1.0-rc.1`) are reserved for breaking changes that deserve broader review.
