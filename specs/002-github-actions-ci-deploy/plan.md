# Implementation Plan: GitHub Actions CI — Build, Test & Deploy to GitHub Pages

**Branch**: `002-github-actions-ci-deploy` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-github-actions-ci-deploy/spec.md`

## Summary

Add a GitHub Actions workflow that enforces the full quality gate (TypeScript type check, ESLint with zero warnings, Vitest test suite) and deploys the Vite/React PWA to GitHub Pages on every push to `main`. Pull requests targeting `main` run quality checks only — no deployment occurs. The workflow uses the official `actions/upload-pages-artifact` + `actions/deploy-pages` approach with npm dependency caching. The Vite base URL is updated to the repository sub-path so GitHub Pages serves assets correctly.

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js (LTS — GitHub Actions `ubuntu-latest` default)  
**Primary Dependencies**: Vite 6, React 19, vite-plugin-pwa — build toolchain already in repo; new: `actions/checkout@v4`, `actions/cache@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`  
**Storage**: N/A (CI/CD config; no new data storage)  
**Testing**: Vitest 3 (`npm run test` → `vitest run`); ESLint (`npm run lint`); TypeScript (`npm run typecheck`)  
**Target Platform**: GitHub Actions (GitHub-hosted `ubuntu-latest` runner); deployment target: GitHub Pages static hosting  
**Project Type**: CI/CD pipeline configuration (YAML workflow) + minimal application configuration change (`vite.config.ts` base URL)  
**Performance Goals**: Full pipeline (install → typecheck → lint → test → build → deploy) completes in under 10 minutes  
**Constraints**: No server runtime; uses only `GITHUB_TOKEN` (no external secrets); npm cache keyed on `package-lock.json` for reproducibility  
**Scale/Scope**: Single workflow file; one application config change; no new source files beyond `.github/workflows/ci.yml`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Code — lint + typecheck enforced automatically | ✅ PASS | Workflow runs `eslint . --max-warnings 0` and `tsc --noEmit`; CI is the enforcement mechanism |
| II. React Composition Patterns | ✅ N/A | This feature adds no React components; existing code patterns unaffected |
| III. Offline-First PWA (NON-NEGOTIABLE) | ✅ PASS | Deploys a fully static build to GitHub Pages; no server runtime introduced; PWA manifest and service worker are included in the Vite build artifact |
| IV. Spec-Driven Tests (NON-NEGOTIABLE) | ✅ PASS | `vitest run` is a required step; the workflow blocks deploy if any test fails |
| V. All Tests Pass Gate (NON-NEGOTIABLE) | ✅ PASS | Deploy step only runs after all quality checks and build succeed; failing tests block deployment |

**Constitution verdict: PASS — proceed to Phase 1 design.**

## Project Structure

### Documentation (this feature)

```text
specs/002-github-actions-ci-deploy/
├── plan.md          # This file
├── research.md      # Phase 0 output
├── contracts/
│   └── workflow.md  # Phase 1 output — workflow contract
└── tasks.md         # Phase 2 output (/speckit-tasks — NOT created here)
```

*Note: `data-model.md` is omitted — this feature introduces no new data entities.*

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml           # NEW: GitHub Actions workflow

vite.config.ts           # MODIFIED: add base URL for GitHub Pages sub-path
```

**Structure Decision**: Single flat addition. This feature is purely configuration — one new YAML file in `.github/workflows/` and a one-line change to `vite.config.ts`. No source code restructuring is needed.

## Phase 0: Research

*See [research.md](./research.md) for full findings. Key decisions summarised here:*

### Decision 1: Deployment mechanism
**Decision**: Use the official GitHub Actions approach — `actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages`.  
**Rationale**: First-party actions maintained by GitHub; requires only `GITHUB_TOKEN`; no third-party dependency; aligns with GitHub's current documentation.  
**Alternative rejected**: `JamesIves/github-pages-deploy-action` — third-party, pushes to a `gh-pages` branch, more moving parts.

### Decision 2: Job structure
**Decision**: Two jobs — `build` (typecheck + lint + test + vite build + upload-pages-artifact) and `deploy` (deploy-pages, depends on `build`, runs only on `main` push).  
**Rationale**: Separates quality-gate from publish; `deploy` is skipped automatically on pull requests because of the `if: github.ref == 'refs/heads/main'` condition on the job.  
**Alternative rejected**: Single job — cannot conditionally skip only the deploy steps without awkward `if` blocks on every step.

### Decision 3: Dependency caching
**Decision**: `actions/cache@v4` caching `~/.npm` keyed on `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`, followed by `npm ci`.  
**Rationale**: `npm ci` is deterministic and uses the lockfile; cache hit skips network download entirely; key rotation on lockfile change ensures correctness.  
**Alternative rejected**: No caching — acceptable for small projects but avoidable overhead.

### Decision 4: Vite base URL
**Decision**: Set `base: '/cant-stop/'` in `vite.config.ts` (the repository name).  
**Rationale**: GitHub Pages serves project repos under `https://<owner>.github.io/<repo>/`; without the base, all asset paths would be absolute from `/` and 404.  
**Constraint**: The `vite-plugin-pwa` service worker picks up the base automatically; no additional PWA configuration is needed.  
**Alternative rejected**: Using an environment variable for the base — unnecessary complexity for a single fixed deploy target.

### Decision 5: Concurrency
**Decision**: Add a `concurrency` group at the workflow level to cancel in-progress runs on the same branch when a new push arrives.  
**Rationale**: Prevents redundant queue buildup on rapid pushes to `main`; standard GitHub Actions pattern.

## Phase 1: Design & Contracts

*See [contracts/workflow.md](./contracts/workflow.md) for the full workflow contract.*

### Workflow Structure

```
Trigger: push to main → build job → deploy job (conditional on main branch)
Trigger: PR targeting main → build job only (deploy skipped)

build job steps:
  1. actions/checkout@v4
  2. actions/setup-node@v4 (LTS)
  3. actions/cache@v4 (npm cache)
  4. npm ci
  5. npm run typecheck  (tsc --noEmit)
  6. npm run lint       (eslint . --max-warnings 0)
  7. npm run test       (vitest run)
  8. npm run build      (tsc -b && vite build)
  9. actions/configure-pages@v5
  10. actions/upload-pages-artifact@v3 (uploads dist/)

deploy job (needs: build, if: github.ref == 'refs/heads/main'):
  1. actions/deploy-pages@v4
```

### Required Repository Settings

The following GitHub repository settings must be configured once by a maintainer before the workflow can deploy:

1. **GitHub Pages source**: Set to "GitHub Actions" (Settings → Pages → Source → GitHub Actions)
2. **Actions permissions**: Default `GITHUB_TOKEN` permissions must include `pages: write` and `id-token: write` — granted via the `permissions` key in the workflow YAML itself (no repo-level change needed)

### Vite Config Change

```typescript
// vite.config.ts — add base property
export default defineConfig({
  base: '/cant-stop/',
  plugins: [
    // ... existing plugins unchanged
  ],
  // ... rest unchanged
});
```
