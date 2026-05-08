# Workflow Contract: `.github/workflows/ci.yml`

**Feature**: `002-github-actions-ci-deploy`  
**Type**: GitHub Actions workflow definition  
**Date**: 2026-05-08

This document is the authoritative contract for the CI/CD workflow. The implementation MUST match this contract exactly. Any deviation requires updating this contract first.

---

## Triggers

| Event | Branches | Effect |
|-------|----------|--------|
| `push` | `main` | Runs `build` job + `deploy` job |
| `pull_request` | `main` (targeting) | Runs `build` job only; `deploy` is skipped |

---

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Cancels in-progress runs on the same branch/ref when a newer run starts.

---

## Permissions

Declared at the workflow level (least-privilege):

```yaml
permissions:
  contents: read      # checkout
  pages: write        # deploy to GitHub Pages
  id-token: write     # OIDC token for pages deployment
```

---

## Job: `build`

**Runs on**: `ubuntu-latest`  
**Timeout**: 15 minutes (implicit GitHub default; no explicit override needed)

### Steps (in order)

| # | Step | Action / Command | Failure behaviour |
|---|------|-----------------|-------------------|
| 1 | Checkout | `actions/checkout@v4` | Fail workflow |
| 2 | Setup Node | `actions/setup-node@v4` with `node-version: 'lts/*'` | Fail workflow |
| 3 | Cache npm | `actions/cache@v4` — path: `~/.npm`, key: `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}` | Non-fatal cache miss; `npm ci` continues |
| 4 | Install dependencies | `npm ci` | Fail workflow |
| 5 | Type check | `npm run typecheck` (`tsc --noEmit`) | Fail workflow; deploy blocked |
| 6 | Lint | `npm run lint` (`eslint . --max-warnings 0`) | Fail workflow; deploy blocked |
| 7 | Test | `npm run test` (`vitest run`) | Fail workflow; deploy blocked |
| 8 | Build | `npm run build` (`tsc -b && vite build`) | Fail workflow; deploy blocked |
| 9 | Configure Pages | `actions/configure-pages@v5` | Fail workflow |
| 10 | Upload artifact | `actions/upload-pages-artifact@v3` with `path: ./dist` | Fail workflow |

**Step ordering rationale**: Steps 5–7 (quality gate) run before step 8 (build) to fail fast without spending time on a full Vite build if the code is invalid. Step 9–10 run only after a successful build.

---

## Job: `deploy`

**Runs on**: `ubuntu-latest`  
**Needs**: `build` (will not start if `build` fails)  
**Condition**: `if: github.ref == 'refs/heads/main'` (skipped on pull requests)  
**Environment**:

```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

### Steps (in order)

| # | Step | Action | Failure behaviour |
|---|------|--------|-------------------|
| 1 | Deploy to Pages | `actions/deploy-pages@v4` (id: `deployment`) | Fail workflow; GitHub Pages not updated |

---

## Environment Variables & Secrets

| Name | Source | Used In |
|------|--------|---------|
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions | Implicitly used by `actions/deploy-pages` via the `id-token: write` OIDC flow |

No additional secrets or environment variables are required.

---

## Application Config Change: `vite.config.ts`

The Vite `base` property MUST be set to the repository sub-path for GitHub Pages:

```typescript
export default defineConfig({
  base: '/cant-stop/',   // ADD THIS LINE
  plugins: [
    // ... existing plugins unchanged
  ],
  // ... rest unchanged
})
```

**Why**: GitHub Pages serves project repos at `https://<owner>.github.io/cant-stop/`. Without `base`, all asset hrefs point to `/assets/...` which 404 under the sub-path. The `vite-plugin-pwa` service worker inherits this `base` automatically.

---

## Observable Outcomes

After successful deployment:

- `https://<owner>.github.io/cant-stop/` serves the latest build from `main`
- GitHub → Actions tab shows two completed jobs: `build` ✅ and `deploy` ✅
- GitHub → Environments tab shows a `github-pages` environment with deployment history
- A failed quality check (type error, lint error, or test failure) shows `build` ❌ and `deploy` ⏭ (skipped) in the Actions tab
- Pull requests targeting `main` show a `build` status check in the PR interface

---

## Diagram

```
push to main
    │
    ▼
┌─────────────────────────────────────────────────┐
│ build job                                        │
│  checkout → setup-node → cache → npm ci         │
│  → typecheck → lint → test                      │
│  → vite build → configure-pages → upload-artifact│
└─────────────────────────┬───────────────────────┘
                          │ success only
                          ▼
              ┌───────────────────────┐
              │ deploy job            │
              │ (main branch only)    │
              │  deploy-pages         │
              └───────────────────────┘

pull_request targeting main
    │
    ▼
┌─────────────────────────────────────────────────┐
│ build job (quality gate only)                    │
│  checkout → setup-node → cache → npm ci         │
│  → typecheck → lint → test → vite build         │
│  → configure-pages → upload-artifact            │
└─────────────────────────────────────────────────┘
              │
              deploy job SKIPPED (github.ref != main)
```
