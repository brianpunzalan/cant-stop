# Research: GitHub Actions CI — Build, Test & Deploy to GitHub Pages

**Feature**: `002-github-actions-ci-deploy`  
**Date**: 2026-05-08  
**Status**: Complete — all unknowns resolved

---

## Decision 1: Deployment Mechanism

**Decision**: Use GitHub's first-party deploy actions — `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Rationale**:
- Maintained by GitHub; guaranteed to stay in sync with GitHub Pages API changes
- Requires only the auto-provided `GITHUB_TOKEN` — no personal access tokens or secrets to manage
- Supports OIDC-based deployment (id-token: write permission) which is more secure than branch-based approaches
- Produces a deployment environment in the GitHub UI (with deployment URL, history, and status)

**Alternatives considered**:

| Alternative | Rejected Because |
|-------------|-----------------|
| `JamesIves/github-pages-deploy-action` | Third-party; pushes to a `gh-pages` branch, creating noise in the branch list; requires `contents: write` permission (broader than needed) |
| Manual `git push` to `gh-pages` branch | No environment tracking; brittle; requires managing orphan branch |
| Custom `peaceiris/actions-gh-pages` | Third-party; same branch-push model as JamesIves |

---

## Decision 2: Job Structure

**Decision**: Two separate jobs — `build` and `deploy`.

```
build:
  runs-on: ubuntu-latest
  steps: checkout → setup-node → cache → npm ci → typecheck → lint → test → vite-build → configure-pages → upload-pages-artifact

deploy:
  needs: [build]
  if: github.ref == 'refs/heads/main'
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  steps: deploy-pages
```

**Rationale**:
- `deploy` job is skipped on pull requests because `github.ref` is not `refs/heads/main` on PR runs; no extra `if` conditions needed on individual steps
- Separation makes logs cleaner — build failures and deploy failures appear in distinct job cards
- `needs: [build]` guarantees `deploy` never runs if `build` fails

**Alternatives considered**:

| Alternative | Rejected Because |
|-------------|-----------------|
| Single job with `if:` on the deploy step | Works but mixes concerns; deploy step failure shows alongside quality gate in the same log; `upload-pages-artifact` must still run to hand off to deploy |
| Three jobs (lint, test, build+deploy) | More parallelism but adds complexity; `npm ci` would run twice; savings are minimal for a small project |

---

## Decision 3: Dependency Caching

**Decision**: `actions/cache@v4` caching `~/.npm`, keyed on `package-lock.json` hash.

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
- run: npm ci
```

**Rationale**:
- `npm ci` (not `npm install`) uses the lockfile exactly; produces byte-identical installs
- Caching `~/.npm` (the global npm cache, not `node_modules`) is more reliable across runner versions than caching `node_modules` directly
- Key rotation on lockfile change prevents stale cache from hiding dependency drift
- Restore key `${{ runner.os }}-node-` provides partial cache hit for incremental lockfile updates

**Alternatives considered**:

| Alternative | Rejected Because |
|-------------|-----------------|
| Cache `node_modules` | Node version or OS change can produce incompatible binaries; more fragile |
| No caching | Acceptable but wastes 30–60 seconds per run downloading packages that haven't changed |
| `setup-node` built-in cache (`cache: npm`) | Also valid; `actions/cache` is more explicit and easier to debug |

---

## Decision 4: Vite Base URL for GitHub Pages

**Decision**: Add `base: '/cant-stop/'` to `vite.config.ts`.

**Rationale**:
- GitHub Pages serves project repositories at `https://<owner>.github.io/<repo>/` (not at the root `/`)
- Without `base`, Vite generates asset `<script src="/assets/...">` tags pointing to the root, which 404 on GitHub Pages
- `vite-plugin-pwa` reads `base` automatically; the service worker scope and asset cache paths are adjusted accordingly — no additional PWA config needed
- The change is a single property addition; no other source files are affected

**Constraint identified**: If a custom domain is ever configured for GitHub Pages (pointing to root `/`), the `base` would need to be changed back to `'/'`. This is a known trade-off for sub-path GitHub Pages hosting.

**Alternatives considered**:

| Alternative | Rejected Because |
|-------------|-----------------|
| Environment variable via `import.meta.env.BASE_URL` | `BASE_URL` already reflects `base` from vite config; no additional env var needed |
| Build-time `--base` CLI flag in the workflow | Harder to track than a config file change; not version-controlled alongside the code |
| Leave `base` as default (`/`) | Assets 404 on GitHub Pages sub-path; not viable |

---

## Decision 5: Workflow Concurrency

**Decision**: Add a `concurrency` block at the workflow level:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Rationale**:
- Cancels an in-progress run when a new push arrives on the same branch
- Prevents wasteful parallelism when rapid commits land on `main`
- Standard pattern; no downsides for this use case

**Alternatives considered**:

| Alternative | Rejected Because |
|-------------|-----------------|
| No concurrency control | Multiple runs queue up; older runs may complete and deploy after a newer run has already deployed |
| `cancel-in-progress: false` | Queues but doesn't cancel; useful for release branches where every run must complete, but not needed here |

---

## Required Repository Settings (One-Time)

The following settings must be configured manually in the GitHub repository before the first deployment:

1. **Pages Source**: Go to **Settings → Pages → Build and deployment → Source** and select **"GitHub Actions"**. This tells GitHub Pages to expect deployments from Actions rather than a branch.
2. **No additional secrets needed**: `GITHUB_TOKEN` is automatically available with the permissions declared in the workflow YAML.

---

## Node.js Version

**Decision**: Use `actions/setup-node@v4` with `node-version: 'lts/*'`.

**Rationale**: The project has no hard Node.js version pin in `package.json` (no `engines` field). LTS tracks the active LTS release, which is appropriate for a Vite/React project. Pinning to a specific version (e.g., `20`) would require manual updates; LTS wildcard stays current automatically.
