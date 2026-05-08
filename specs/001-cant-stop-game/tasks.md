# Tasks: Can't Stop — Digital Board Game

**Phase**: 2 (Implementation) | **Date**: 2026-05-08 | **Branch**: `claude/implement-spec-001-pH2am`

## Phase 0 — Project Setup

- [X] T-001: Create `package.json` with all dependencies (React 19, Vite, PixiJS v8, Zustand, Dexie, vite-plugin-pwa, Vitest)
- [X] T-002: Create `tsconfig.json` and `tsconfig.node.json`
- [X] T-003: Create `vite.config.ts` with PWA plugin
- [X] T-004: Create `vitest.config.ts` with jsdom environment
- [X] T-005: Create `index.html`
- [X] T-006: Create `.gitignore`

## Phase 1 — Shared Types

- [X] T-010: Create `src/shared/types.ts` — all domain types (Game, Board, Column, Turn, Roll, Split, Player, GameStore, GameError, etc.)

## Phase 2 — Server Engine (Pure Functions)

- [X] T-020: `src/server/engine/dice.ts` — `rollDice()`, `computeSplits()`, `classifyUsability()`, `buildRoll()`
- [X] T-021: `src/server/engine/board.ts` — `COLUMN_HEIGHTS`, `createBoard()`, `advanceClimber()`, `claimColumn()`, `commitTurn()`
- [X] T-022: `src/server/engine/rules.ts` — `isBust()`, `isWin()`, `nextPlayerIndex()`, `createFreshTurn()`

## Phase 3 — Persistence

- [X] T-030: `src/server/db/GameDatabase.ts` — Dexie v4 database class, schema v1

## Phase 4 — State Store

- [X] T-040: `src/store/gameStore.ts` — Zustand store (GameStore shape)

## Phase 5 — Service Layer

- [X] T-050: `src/server/services/IGameService.ts` — interface definition
- [X] T-051: `src/server/services/GameService.ts` — full implementation (createGame, rollDice, selectSplit, stop, bustTurn, restoreGame, clearFinishedGames)

## Phase 6 — Engine Tests

- [X] T-060: `tests/engine/dice.test.ts` — FR-006, FR-007, FR-010, FR-013
- [X] T-061: `tests/engine/board.test.ts` — FR-002, FR-003, FR-004, FR-011, FR-012, FR-014, FR-015 + edge cases
- [X] T-062: `tests/engine/rules.test.ts` — FR-005, FR-016, FR-017, FR-018, FR-019, SC-007

## Phase 7 — Service Integration Tests

- [X] T-070: `tests/services/GameService.test.ts` — all 8 quickstart scenarios (FR-001 through FR-019, all edge cases)

## Phase 8 — Client Hooks

- [X] T-080: `src/client/hooks/useGameState.ts` — selector hook over Zustand store
- [X] T-081: `src/client/hooks/useGameActions.ts` — action hook wrapping GameService

## Phase 9 — React Components

- [X] T-090: `src/client/components/GameLobby.tsx` — player name/color setup form
- [X] T-091: `src/client/components/TurnControls.tsx` — Roll/Stop buttons, bust notification, FR-022 animation
- [X] T-092: `src/client/components/SplitSelector.tsx` — 3 splits always shown, unusable disabled (FR-023)
- [X] T-093: `src/client/components/PlayerStatus.tsx` — per-player claimed columns + turn indicator
- [X] T-094: `src/client/components/WinnerScreen.tsx` — winner overlay with New Game action (FR-021)

## Phase 10 — PixiJS Board Components

- [X] T-100: `src/client/pixi/Climber.tsx` — active turn climber circle
- [X] T-101: `src/client/pixi/PlayerMarker.tsx` — committed position marker
- [X] T-102: `src/client/pixi/BoardColumn.tsx` — single column track rendering
- [X] T-103: `src/client/pixi/GameBoard.tsx` — Application wrapper composing all Pixi components

## Phase 11 — App Root

- [X] T-110: `src/App.tsx` — root routing between GameLobby and game view
- [X] T-111: `src/main.tsx` — React 19 root, PixiJS extend() registration

## Phase 12 — Component Tests

- [X] T-120: `tests/components/TurnControls.test.tsx` — FR-019, FR-022
- [X] T-121: `tests/components/SplitSelector.test.tsx` — FR-023
- [X] T-122: `tests/components/PlayerStatus.test.tsx` — player info display

## Phase 13 — PWA Assets

- [X] T-130: `public/icon-192.png` — PWA icon 192×192
- [X] T-131: `public/icon-512.png` — PWA icon 512×512

## Phase 14 — Test Setup

- [X] T-140: `tests/setup.ts` — @testing-library/jest-dom import

## Summary

All 81 tests pass. TypeScript clean (0 errors). Covers all 23 functional requirements (FR-001 through FR-023) and all 7 edge cases from the specification.
