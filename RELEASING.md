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

The release workflow runs `pnpm publish:all -- --tag beta` first. After ≥1–2 days of soak:

```bash
npm dist-tag add @sigx/cli@X.Y.Z latest
npm dist-tag add create-sigx@X.Y.Z latest
```

## Onboarding a new package to npm Trusted Publishing

For each `@sigx/*` or `create-sigx` package the **first publish** has to be done manually with an authenticated npm account, then on https://www.npmjs.com/package/<name>/access:

1. Settings → Trusted Publishers → Add a Trusted Publisher.
2. Provider: GitHub Actions.
3. Repository owner: `signalxjs`. Repository: `cli`. Workflow filename: `release.yml`. Environment: `npm-publish`.

Subsequent publishes happen automatically via OIDC — no token required. The published tarball will carry npm provenance attestation and the "verified publisher" badge.

## Dist-tag strategy

Every release lands on `@beta` first, never directly on `@latest`. This lets us:

- Smoke-test with real installs (`npm i pkg@beta`) before users on `@latest` are affected.
- Roll back trivially by republishing the previous version under `@latest` without unpublishing.

Workflow per release:

1. Bump versions, tag, push — release workflow publishes under `@beta`.
2. Run smoke tests:
   - `npm create sigx@beta my-app` (cli repo) — verify scaffolder & generated project boots.
   - For `lynx`: scaffold a Lynx template and run `sigx prebuild && sigx run:android`.
3. Soak ≥ 24 h. Watch for issues.
4. Promote: `npm dist-tag add <pkg>@<version> latest` for each package.
5. Update `CHANGELOG.md`, draft GitHub Release notes.

Patch versions for urgent fixes follow the same path. Pre-release identifiers (`0.1.0-rc.1`) are reserved for breaking changes that deserve broader review.
