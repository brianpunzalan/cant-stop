<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Bump rationale: Initial ratification of the Cant Stop constitution. All
  placeholder tokens replaced with concrete principles and governance.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Clean Code
  - [PRINCIPLE_2_NAME] → II. React Composition Patterns
  - [PRINCIPLE_3_NAME] → III. Offline-First Progressive Web App (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] → IV. Spec-Driven Tests (NON-NEGOTIABLE)
  - [PRINCIPLE_5_NAME] → V. All Tests Pass Gate (NON-NEGOTIABLE)

Added sections:
  - Technology & Architecture Constraints
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check + Constraints
       already align; no edits needed)
  - ✅ .specify/templates/spec-template.md (no constitution-specific section
       drift; aligned)
  - ✅ .specify/templates/tasks-template.md (updated: tests are now
       MANDATORY per Principles IV & V, replacing the prior "tests optional"
       language)
  - ✅ .specify/templates/checklist-template.md (no constitution-specific
       drift detected)
  - ✅ CLAUDE.md (generic pointer; no edits needed)

Follow-up TODOs: none
-->

# Cant Stop Constitution

## Core Principles

### I. Clean Code

Code MUST be readable before it is clever. Names describe intent (no
abbreviations that obscure meaning, no `tmp`/`data`/`x` for domain
concepts). Functions do one thing at one level of abstraction. Dead code,
commented-out code, and speculative abstractions are removed before merge.
Comments explain *why*, never *what*; the code itself explains *what*.
Formatting and lint rules are enforced automatically and MUST pass in CI.

**Rationale**: This is a long-lived browser-only project with no backend
fallback to hide complexity. The codebase is the product surface; clarity
directly determines maintainability and the speed at which new rules,
variants, or UI affordances can be added to the game.

### II. React Composition Patterns

UI MUST be expressed as small, composable React components. Composition
is preferred over inheritance, prop drilling, and ad-hoc context. Specific
rules:

- Components are pure functions of their props and hook state; no hidden
  module-level mutable state.
- Shared behavior is extracted into custom hooks, not class hierarchies or
  HOC chains.
- Container/presentational separation is encouraged: state-owning
  components pass values and callbacks down; leaf components render and
  emit events up.
- `children` and render-prop / slot patterns are the default extension
  mechanism before reaching for new context providers.
- Side effects live in `useEffect` / event handlers, never inside render.

**Rationale**: Composition keeps the dice/roll/score domain modeled as
small, reusable units (e.g., `<Die>`, `<Column>`, `<TurnControls>`),
which is essential for testability and for evolving the UI without
rewriting state management.

### III. Offline-First Progressive Web App (NON-NEGOTIABLE)

The application MUST run entirely in the browser with no backend server,
API, or runtime network dependency for core gameplay. Specifically:

- All game logic, state, randomness, and persistence MUST execute
  client-side.
- The app MUST be installable and operable offline (PWA: web app
  manifest, service worker, cacheable static assets).
- Persistent state (in-progress games, settings, history) MUST use
  browser-local storage mechanisms (e.g., `localStorage`,
  `IndexedDB`); no remote database.
- Third-party network calls at runtime are PROHIBITED for core
  features. Optional analytics or telemetry, if ever added, MUST be
  off by default and MUST NOT block gameplay when unreachable.
- Build-time dependencies (npm, CDN at build) are permitted; runtime
  dependencies on a server are not.

**Rationale**: Cant Stop is a self-contained game. Eliminating server
state removes operational cost, latency, and privacy concerns, and
guarantees the app works on a plane, in a tunnel, or after the
maintainer stops paying for hosting.

### IV. Spec-Driven Tests (NON-NEGOTIABLE)

Tests MUST be derived from the feature specification, not from the
implementation.

- Every user story and acceptance scenario in `spec.md` MUST map to at
  least one automated test (unit, component, or end-to-end as
  appropriate).
- Tests are authored against the spec *before* the production code
  that satisfies them; the test file MUST exist and fail (red) before
  the implementing change is committed.
- Test names reference the spec scenario they cover so coverage is
  auditable.
- Tests assert observable behavior, not internal implementation
  details (no snapshotting of arbitrary internals, no asserting on
  private functions).

**Rationale**: Specs define correctness. Writing tests from the spec
prevents the common failure mode where tests merely re-state whatever
the code already does, and it forces ambiguities in the spec to
surface early.

### V. All Tests Pass Gate (NON-NEGOTIABLE)

A feature is "complete" if and only if every test in the suite passes.

- A pull request MUST NOT be merged while any test is failing,
  skipped without justification, or marked `.only` / `xit` /
  equivalent.
- A feature branch MUST NOT be declared done, demoed, or marked as
  shipped while tests for any prior feature are red.
- Flaky tests are bugs and MUST be fixed or removed with explicit
  rationale recorded in the PR; silencing them is not permitted.
- Lint and type checks (where applicable) are part of the gate.

**Rationale**: A green test suite is the project's only durable
guarantee that the offline app actually works on the user's machine.
Any erosion of this gate compounds quickly because there is no server
the maintainer can patch after the fact.

## Technology & Architecture Constraints

- **Runtime**: Modern evergreen browsers only. No server runtime.
- **Framework**: React, with hooks and function components. Class
  components are not introduced for new code.
- **State**: Local component state and hooks first. A single shared
  store is permitted only when prop/composition flow becomes
  demonstrably worse; the choice MUST be justified in the relevant
  plan's Complexity Tracking.
- **Persistence**: Browser-local only (`localStorage` / `IndexedDB`).
  Data schema changes MUST include a migration path for existing
  stored games.
- **PWA**: Service worker and manifest are required for any release
  build. Caching strategy MUST allow first-load offline after one
  online visit.
- **Tooling**: Linting, formatting, type checking (if TypeScript is
  adopted), and tests run locally and in CI with identical
  configuration.

## Development Workflow & Quality Gates

- **Spec → Tests → Code**: Every feature follows
  `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  test authoring → implementation → `/speckit-implement` review.
- **Branching**: Feature work happens on a dedicated branch created
  by the speckit git extension; the branch is the unit of review.
- **Review**: Every change is reviewed against this constitution.
  Reviewers MUST cite the principle a change violates when
  requesting changes for principle reasons.
- **CI Gate**: Merge is blocked until lint, type checks, and the full
  test suite are green on the target branch's HEAD.
- **Definition of Done**: Spec scenarios mapped to tests; tests
  green; offline behavior manually verified at least once per
  feature touching persistence or networking; no `NEEDS
  CLARIFICATION` markers remaining in feature artifacts.

## Governance

This constitution supersedes ad-hoc conventions and individual
preferences. When a guideline elsewhere in the repository conflicts
with this document, this document wins until amended.

- **Amendments**: Proposed via a pull request that edits this file
  and runs `/speckit-constitution`. The PR description MUST state
  the version bump (MAJOR/MINOR/PATCH) and rationale.
- **Versioning policy**:
  - MAJOR: Backward-incompatible removal or redefinition of a
    principle or governance rule.
  - MINOR: New principle or materially expanded guidance.
  - PATCH: Clarifications, wording, typo fixes, non-semantic
    refinements.
- **Compliance review**: Every PR review MUST verify constitution
  compliance. Justified deviations are recorded in the affected
  plan's Complexity Tracking table; unjustified deviations block
  merge.
- **Runtime guidance**: `CLAUDE.md` and the `.specify/` workflow
  artifacts are the day-to-day operational guides; they MUST stay
  consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-06 | **Last Amended**: 2026-05-06
