# Tasks: GitHub Actions CI — Build, Test & Deploy to GitHub Pages

**Input**: Design documents from `specs/002-github-actions-ci-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, contracts/workflow.md ✅

**Tests**: Per the project constitution (Principles IV & V), tests are MANDATORY. For this CI/CD feature the existing Vitest suite, ESLint, and TypeScript type checker serve as the acceptance test suite — the workflow itself enforces them. A workflow spec-compliance test validates that the YAML contract is satisfied.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Ensure the repository directory structure exists for the workflow.

- [X] T001 Create `.github/workflows/` directory in repository root

---

## Phase 2: Application Config Change (Blocking Prerequisite)

**Purpose**: Update `vite.config.ts` with the GitHub Pages base URL. This must be done before building so the artifact is correct, and must be verified before writing the workflow.

**⚠️ CRITICAL**: The workflow relies on a correct Vite build artifact; the base URL must be set first.

- [X] T002 Add `base: '/cant-stop/'` to `vite.config.ts` (insert as first property inside `defineConfig`)
- [X] T003 Verify `npm run build` succeeds with the new base — confirm `dist/` is produced with no errors

**Checkpoint**: `dist/` builds cleanly with the `/cant-stop/` base path before any workflow file is authored.

---

## Phase 3: User Story 2 — Quality Gate Enforcement (Priority: P1) 🎯 MVP

**Goal**: The existing quality checks (typecheck, lint, test) all pass — these become the gates in the CI workflow.

**Independent Test**: Run `npm run typecheck && npm run lint && npm run test` locally; all must exit 0.

### Verification (pre-workflow)

- [X] T004 [P] [US2] Run `npm run typecheck` — confirm exits 0 (no type errors)
- [X] T005 [P] [US2] Run `npm run lint` — confirm exits 0 (zero warnings)
- [X] T006 [P] [US2] Run `npm run test` — confirm all Vitest tests pass

**Checkpoint**: All three quality gates pass locally before encoding them in the workflow.

---

## Phase 4: User Story 1 — Automatic Deploy on Main Branch Push (Priority: P1) 🎯 MVP

**Goal**: Create `.github/workflows/ci.yml` implementing the two-job pipeline per the workflow contract.

**Independent Test**: Push to `main`; observe the `build` job and `deploy` job both succeed in the GitHub Actions tab; confirm the GitHub Pages URL serves the updated app.

### Workflow Implementation

- [X] T007 [US1] Create `.github/workflows/ci.yml` with:
  - `on:` triggers: `push` to `main`, `pull_request` targeting `main`
  - `concurrency` block to cancel in-progress runs on the same ref
  - `permissions` block: `contents: read`, `pages: write`, `id-token: write`
  - `build` job on `ubuntu-latest` with steps:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` (`node-version: 'lts/*'`)
    3. `actions/cache@v4` (path: `~/.npm`, key keyed on `package-lock.json` hash)
    4. `npm ci`
    5. `npm run typecheck`
    6. `npm run lint`
    7. `npm run test`
    8. `npm run build`
    9. `actions/configure-pages@v5`
    10. `actions/upload-pages-artifact@v3` (path: `./dist`)
  - `deploy` job: `needs: [build]`, `if: github.ref == 'refs/heads/main'`, `environment: github-pages`, step: `actions/deploy-pages@v4`

- [X] T008 [US1] Validate `.github/workflows/ci.yml` YAML is well-formed: `node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8')" && echo OK`

**Checkpoint**: Workflow file exists, YAML parses without error, and matches the contract in `contracts/workflow.md`.

---

## Phase 5: User Story 3 — PR Validation Without Deployment (Priority: P2)

**Goal**: Confirm the workflow correctly skips `deploy` on pull requests — verified by inspecting the `if:` condition on the `deploy` job.

**Independent Test**: Open a pull request targeting `main`; confirm only the `build` job runs and the `deploy` job shows as skipped in the Actions tab.

### Verification

- [X] T009 [US3] Confirm `deploy` job in `ci.yml` has `if: github.ref == 'refs/heads/main'` — this is the sole gating condition; no additional PR check is needed in the YAML.

**Checkpoint**: PR validation is satisfied structurally by the `if:` condition; no code change required beyond what T007 already produces.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T010 [P] Verify `.gitignore` contains `dist/` and `node_modules/` (append if missing)
- [X] T011 Run `npm run build` one final time after all changes to confirm a clean production artifact
- [X] T012 Update `specs/002-github-actions-ci-deploy/tasks.md` to mark all tasks complete

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Vite config)**: Depends on Phase 1 — blocks workflow authoring
- **Phase 3 (Quality gate verification)**: Can run in parallel with Phase 2 (different files)
- **Phase 4 (Workflow file)**: Depends on Phase 2 and Phase 3 — both must be done first
- **Phase 5 (PR validation)**: Structural check on Phase 4 output — no new files
- **Phase 6 (Polish)**: Depends on all prior phases

### Within-phase Parallel Opportunities

- T004, T005, T006 (quality gate checks) can all run in parallel
- T010 (gitignore check) can run in parallel with other Phase 6 tasks

---

## Notes

- This feature has no new Vitest unit tests to author — the existing suite is the acceptance test
- The CI workflow itself is the integration test harness for the entire quality gate (FR-004 through FR-009)
- The YAML `if:` condition on `deploy` is the sole mechanism for US3; no additional conditional logic is needed
- After T007, the workflow will not actually deploy until the GitHub repository Pages source is set to "GitHub Actions" (a one-time manual step documented in research.md)
