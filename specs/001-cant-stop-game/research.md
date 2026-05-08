# Research: Can't Stop — Digital Board Game

**Phase**: 0 (Pre-Design) | **Date**: 2026-05-08 | **Feature**: [spec.md](./spec.md)

## Technology Decisions

### Frontend Framework
**Decision**: React 19 + TypeScript 5.x
**Rationale**: React 19 is required for `@pixi/react` v8 compatibility. React 18 locks the project to `@pixi/react` v7 (pixi.js v7), which has a known StrictMode WebGL context double-mount bug on iOS and a less ergonomic API. React 19 resolves the lifecycle model that caused those issues.
**Alternatives considered**: React 18 + `@pixi/react` v7 — rejected due to StrictMode/WebGL context issues and the older pixi.js v7 API surface.

### Build Tool
**Decision**: Vite 5.x
**Rationale**: Native ESM, fast HMR, first-class TypeScript support, and direct compatibility with `vite-plugin-pwa`. Standard choice for React + TypeScript browser apps.
**Alternatives considered**: webpack — rejected (slower DX, heavier config overhead).

### Game Engine
**Decision**: `pixi.js` v8.x + `@pixi/react` v8.x
**Rationale**: PixiJS provides WebGL-accelerated 2D rendering. `@pixi/react` v8 integrates it into the React tree via an `<Application>` component and a custom JSX transform — components are registered with `extend()` and used as `<pixiGraphics>`, `<pixiText>`, etc.
**Setup**: `"jsxImportSource": "@pixi/react"` in `tsconfig.json`; pixi types registered via `extend({ Graphics, Text, Sprite })` before use.
**Alternatives considered**: Phaser — rejected (too heavyweight, not React-idiomatic); Canvas 2D — rejected (no WebGL acceleration, more boilerplate).

### State Management
**Decision**: Zustand v5.0.12
**Rationale**: Zustand stores live outside React's component tree, allowing the game engine (server layer) to call `store.setState()` imperatively without hooks or context. Selector-based subscriptions prevent unnecessary re-renders. Simple and TypeScript-native.
**Alternatives considered**: React Context + useReducer — rejected (doesn't support external non-React writes from the engine layer); Jotai — rejected (atomic model better suited to fine-grained UI state, not a monolithic game state object).

### IndexedDB Persistence
**Decision**: Dexie.js v4.4.2
**Rationale**: TypeScript-first table API with built-in schema versioning and migration support. The most ergonomic IndexedDB wrapper for structured game state. ~50 KB footprint is acceptable for a PWA. Schema migrations are required by the constitution when data layout changes.
**Alternatives considered**: `idb` — thin promise wrapper without schema management; `localForage` — simpler API but no complex query support; raw IndexedDB — verbose and error-prone.

### PWA & Offline Support
**Decision**: `vite-plugin-pwa` v1.3.0
**Rationale**: Official Vite PWA plugin using Workbox for service worker generation. `registerType: 'autoUpdate'` handles SW lifecycle automatically. Precaches all built assets (JS/CSS/HTML/SVG) for full offline capability after first visit. Satisfies the NON-NEGOTIABLE Offline-First PWA constitution principle.
**Configuration**: Web app manifest with game name, short name, icons; Workbox `globPatterns` covering `**/*.{js,css,html,svg,png,ico,woff2}`.

### Testing
**Decision**: Vitest + `@testing-library/react` + `@testing-library/user-event`
**Rationale**: Vitest integrates natively with Vite (shared config, no separate Babel pipeline). `@testing-library/react` enables behavioral component tests (observable outputs, not internals). Aligns with constitution Principles IV (Spec-Driven Tests) and V (All Tests Pass Gate).
**Test tiers**: Pure engine functions → Vitest unit tests; React components → `@testing-library/react`; full game flows → Vitest integration tests against `GameService`.
**Alternatives considered**: Jest — rejected (separate Babel/ts-jest transform, slower than Vitest in Vite projects).

## Asset Strategy

### Game Board
**Decision**: Drawn programmatically with PixiJS Graphics API
**Rationale**: The board is a structured geometric grid — 11 trapezoid column tracks, numbered 2–12, with heights `[3, 5, 7, 9, 11, 13, 11, 9, 7, 5, 3]`. Drawing in code gives exact cell center coordinates for marker placement, easy responsive resizing, and eliminates asset pipeline complexity. No external files to load or cache.

### Player Markers & Climbers
**Decision**: PixiJS Graphics circles with text labels
**Rationale**: Filled circles render crisply at any resolution and trivially recolor per player. Climbers drawn slightly smaller in the same player color.
**Colors**: Player 1 = `#E74C3C` (red), Player 2 = `#3498DB` (blue), Player 3 = `#2ECC71` (green), Player 4 = `#F1C40F` (yellow).

### Dice Faces
**Decision**: SVG sprites from `game-icons.net` (`dice-six-faces-one` through `dice-six-faces-six`), CC BY 3.0
**License**: Attribution required — credit line in app About/Credits screen.
**Loading**: `Assets.load()` in PixiJS v8 supports SVG natively.
**Fallback**: If licensing becomes a blocker, dice drawn with PixiJS Graphics (rounded rectangle + pip circles).

### Reference Implementation
**Source**: `ShevinuM/Cant-Stop` (GitHub, Java) — used to verify column height constants and game rule edge cases only. No code reuse.

## Architecture Decision: Client/Server Separation in Browser

```
Server (src/server/)           Store (src/store/)      Client (src/client/)
────────────────────           ──────────────────      ────────────────────
Engine (pure functions)                                 React hooks
  dice.ts                 →   Zustand store       →     useGameState.ts
  board.ts                    gameStore.ts               useGameActions.ts
  rules.ts                                                    ↓
GameService.ts                                          Components + Pixi
  (orchestrates engine + DB)                              GameBoard.tsx
Dexie persistence                                         TurnControls.tsx
  GameDatabase.ts                                         SplitSelector.tsx
```

**Server responsibilities**: All game logic (rolling, split classification, climber advancement, column claiming, bust/win detection), IndexedDB persistence, Zustand state writes.
**Client responsibilities**: Rendering (PixiJS board, HTML controls), user input capture, Zustand state reads via selectors.
**Bridge**: Zustand store in `src/store/` — the only shared mutable boundary. Server writes; client reads.
**Testing benefit**: Engine functions are pure TypeScript with no DOM dependency — tested entirely with Vitest unit tests, no jsdom or React overhead.

## Column Height Constants (verified)

| Column | 2 | 3 | 4 | 5 | 6 |  7 | 8 | 9 | 10 | 11 | 12 |
|--------|---|---|---|---|---|:--:|---|---|----|----|-----|
| Height | 3 | 5 | 7 | 9 |11 | 13 |11 | 9 |  7 |  5 |  3 |
