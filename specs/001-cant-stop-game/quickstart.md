# Quickstart: Can't Stop — Integration Scenarios

**Phase**: 1 (Design) | **Date**: 2026-05-08 | **Feature**: [spec.md](./spec.md)

These scenarios describe how the server and client layers integrate during the key game flows. Each scenario maps to one or more spec acceptance scenarios and is the basis for integration tests in `tests/services/GameService.test.ts`.

---

## Scenario 1: Start a 2-Player Game

**Spec**: User Story 1, Acceptance Scenario 3 (turn order); FR-001, FR-002, FR-003

```typescript
// 1. Client calls GameService via useGameActions hook
const { createGame } = useGameActions();

await createGame({
  players: [
    { name: 'Alice', color: 'red' },
    { name: 'Bob',   color: 'blue' },
  ],
});

// 2. GameService produces an initial Game in the Zustand store:
// game.status === 'playing'
// game.players[0].id → Alice, game.players[1].id → Bob
// game.currentPlayerIndex === 0  (Alice goes first)
// game.turn.hasRolled === false
// game.board.columns → 11 columns, all uncommitted, all unclaimed
// game.currentRoll === null
//
// 3. Game is persisted to IndexedDB (Dexie 'games' table)
//
// 4. GameBoard (PixiJS) renders via useGameState() hook:
//    - 11 columns drawn, no markers
//    - TurnControls shows "Alice's turn — Roll"
//    - Stop button is disabled (hasRolled = false)
```

---

## Scenario 2: Roll Dice and Select a Split

**Spec**: User Story 2, Acceptance Scenarios 1–2; FR-006, FR-007, FR-008, FR-009

```typescript
// Precondition: game in 'playing' state, Alice's turn, hasRolled = false

const { rollDice, selectSplit } = useGameActions();

const roll = await rollDice();
// roll.dice = [3, 4, 5, 6]  (example)
// roll.splits = [
//   { index: 0, sumA: 7,  sumB: 11, usability: 'fully-usable' },
//   { index: 1, sumA: 9,  sumB: 9,  usability: 'fully-usable' },   // doubles
//   { index: 2, sumA: 8,  sumB: 10, usability: 'fully-usable' },
// ]
// roll.allUnusable = false
//
// Store update: game.currentRoll = roll, game.turn.hasRolled = true
// UI: SplitSelector renders 3 options, Stop button enabled

// Player selects split index 0 (sumA=7, sumB=11)
const summary = await selectSplit(0);
// summary.advancedColumns = [7, 11]
// summary.turn.climbers = { 7: 1, 11: 1 }  (both start 1 above committed=0)
// summary.turn.activeColumns = [7, 11]
// Store update: currentRoll = null
// UI: board shows climbers on columns 7 and 11
```

---

## Scenario 3: Doubles Advance the Same Column Twice

**Spec**: User Story 2, Acceptance Scenario 5; FR-013

```typescript
// Precondition: Alice's turn, column 7 climber at position 2

// roll.splits[1] = { sumA: 7, sumB: 7, usability: 'fully-usable' }  (doubles)
const summary = await selectSplit(1);
// Engine advances column 7 twice in sequence:
//   position 2 → 3 → 4
// summary.advancedColumns = [7, 7]
// summary.turn.climbers = { 7: 4 }
```

---

## Scenario 4: Bust — All Splits Unusable

**Spec**: User Story 2, Acceptance Scenario 4; User Story 5; FR-010, FR-016, FR-017

```typescript
// Precondition: Alice has climbers on columns 7, 9, 11 (3 active)
//   All three remaining split sums target either claimed columns or would
//   open a 4th active column → all unusable

const roll = await rollDice();
// roll.allUnusable = true
// GameService automatically calls bustTurn():
//   - climbers discarded (turn.climbers = {})
//   - committedPositions unchanged
//   - currentPlayerIndex advances to Bob
//   - new Turn created: { hasRolled: false, climbers: {}, activeColumns: [] }
// UI: "Alice busted! Bob's turn"
// Bob's committed markers still show on the board; Alice's committed markers unchanged
```

---

## Scenario 5: Stop and Commit Progress

**Spec**: User Story 4, Acceptance Scenarios 1–2; FR-014, FR-015

```typescript
// Precondition: Alice has climbers at column 7 pos=5, column 11 pos=3
// column 11 height = 3 → climber is at summit

const game = await stop();
// Column 7: Alice's committedPositions[7] = 5
// Column 11: claimed by Alice; claimedBy = Alice.id
//   All other players' committedPositions on column 11 are removed
//   column 11 is permanently closed
// Alice.claimedColumns = [11]
// currentPlayerIndex advances to Bob
// new Turn created for Bob
```

---

## Scenario 6: Win Condition

**Spec**: User Story 1, Acceptance Scenario 2; User Story 4, Acceptance Scenario 3; FR-018

```typescript
// Precondition: Alice has claimedColumns = [7, 9]; climber at top of column 11

const game = await stop();
// stop() commits climber at column 11 summit → column 11 claimed
// Alice.claimedColumns = [7, 9, 11]  → length = 3
// game.status = 'finished'
// game.winnerId = Alice.id
// UI: victory screen, no further actions allowed
```

---

## Scenario 7: Partially Usable Split

**Spec**: User Story 2, Acceptance Scenario 3; FR-008, FR-009

```typescript
// Precondition: Alice has 3 active climbers (columns 7, 9, 11)
// roll.splits[0] = { sumA: 7, sumB: 5, usability: 'partially-usable' }
//   sumA=7 → existing climber (OK), sumB=5 → would open 4th column (blocked)

const summary = await selectSplit(0);
// Only sumA=7 is applied:
//   climbers[7] advanced by 1
// summary.advancedColumns = [7]
// summary.turn.activeColumns = [7, 9, 11]  (unchanged count)
```

---

## Scenario 8: Opponent Column Claim Removes Player Markers

**Spec**: Edge Case — column claimed mid-game; FR-015

```typescript
// Precondition: Alice has committedPositions[7] = 3
// Bob's climber reaches column 7 summit and Bob calls stop()

const game = await stop();  // Bob's turn
// column 7: claimedBy = Bob.id, claimed = true
// Alice's committedPositions[7] entry is deleted
// Alice loses all progress on column 7
// column 7 is closed — no further advances
```

---

## Client Integration Pattern

All scenarios above are exercised by `GameService` integration tests. The UI hooks use this pattern:

```typescript
// Reading state (client layer)
const game = useGameState(state => state.game);
const currentRoll = useGameState(state => state.currentRoll);
const currentPlayer = useGameState(state =>
  state.game?.players[state.game.currentPlayerIndex]
);

// Calling actions (thin wrappers over IGameService)
const { rollDice, selectSplit, stop, createGame } = useGameActions();
```

The PixiJS `GameBoard` component reads `game.board` and `game.turn.climbers` from the store to position all markers and climbers on each frame update.
