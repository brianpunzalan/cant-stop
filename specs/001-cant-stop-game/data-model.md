# Data Model: Can't Stop — Digital Board Game

**Phase**: 1 (Design) | **Date**: 2026-05-08 | **Feature**: [spec.md](./spec.md)

## Overview

The game domain has six core entities. `Game` is the root aggregate. `Board` and `Turn` are owned by `Game`. `Column` instances are owned by `Board`. `Roll` is transient, produced during a `Turn` and discarded after split selection.

All types are defined in `src/shared/types.ts` and shared by both server and client layers.

---

## Entities

### PlayerColor

```typescript
type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
```

Fixed set of four colors; one assigned per player at game creation, never changed.

---

### Player

Represents a single human participant. Immutable identity; mutable claimed column tracking.

```typescript
interface Player {
  id: string;           // UUID, assigned at game creation
  name: string;         // Display name, 1–20 chars, provided at setup
  color: PlayerColor;
  claimedColumns: number[];  // Column numbers (2–12) claimed by this player; grows as columns are won
}
```

**Constraints**:
- `name`: 1–20 characters, non-empty after trim.
- `claimedColumns.length` reaching 3 triggers immediate game end (FR-018).
- A player may not claim the same column twice (columns are exclusive once claimed).

---

### Column

One of the 11 tracks on the board, numbered 2–12. Tracks committed progress per player and claimed ownership.

```typescript
interface Column {
  number: number;       // 2–12 (board column identifier)
  height: number;       // Fixed: [3,5,7,9,11,13,11,9,7,5,3] for columns 2–12
  claimed: boolean;
  claimedBy: string | null;           // Player id of claimant; null if unclaimed
  committedPositions: Record<string, number>;  // playerId → position (0 = base, height = summit)
}
```

**Constraints**:
- `height` is read-only after board initialization; derived from the column number.
- `committedPositions[playerId]` is `0` (base) for a player who has never advanced this column.
- A `claimed` column is permanently closed: no advances, no climbers, no further position changes.
- When a column is claimed, all other players' `committedPositions` entries are removed (FR-015).

**Column heights by number**:
```
number:  2  3  4  5   6   7   8  9  10  11  12
height:  3  5  7  9  11  13  11  9   7   5   3
```

---

### Turn

Transient per-turn state. Created fresh at the start of each player's turn; discarded after STOP or BUST (FR-017).

```typescript
interface Turn {
  activePlayerId: string;
  hasRolled: boolean;                   // false until first roll; prevents premature STOP (FR-019)
  climbers: Record<number, number>;     // columnNumber → climber position (≥1)
  activeColumns: number[];              // column numbers currently occupied by a climber (max 3)
}
```

**Constraints**:
- `activeColumns.length ≤ 3` at all times (FR-005). Attempting to open a 4th column makes that sum unusable.
- A climber position is always `> committedPosition` for that player on that column and `≤ column.height`.
- On STOP: climbers → `committedPositions`; summit climbers → column claimed. On BUST: all climbers discarded.

---

### Split

One of the three possible pairings of four dice into two sums. Usability is evaluated against current `Turn` and `Board` state.

```typescript
type SplitUsability = 'fully-usable' | 'partially-usable' | 'unusable';

interface Split {
  index: 0 | 1 | 2;                  // One of exactly three splits
  diceIndices: [[number, number], [number, number]];  // Which of the 4 dice form each pair
  sumA: number;                        // First pair sum (2–12)
  sumB: number;                        // Second pair sum (2–12)
  usability: SplitUsability;
}
```

**Usability classification** (FR-007):
- **fully-usable**: Both `sumA` and `sumB` can be advanced (columns not claimed AND climber constraint not violated for either).
- **partially-usable**: Exactly one of `sumA`/`sumB` can be advanced; the other is blocked (claimed or 4th-column constraint).
- **unusable**: Neither sum can be advanced.

**Doubles handling** (FR-013): When `sumA === sumB`, the column is advanced twice in sequence on application.

---

### Roll

A single dice-roll event produced by the engine. Consumed during the current turn; not persisted.

```typescript
interface Roll {
  dice: [number, number, number, number];  // Four d6 values (1–6 each)
  splits: [Split, Split, Split];            // Always exactly three splits
  allUnusable: boolean;                    // Convenience flag — true iff all splits are 'unusable'
}
```

**Constraints**:
- `dice` values are uniformly random integers in `[1, 6]`.
- `splits` are always computed in canonical order (three partitions of 4 dice into 2 pairs).
- `allUnusable === true` triggers automatic bust (FR-010).

---

### Board

The complete 11-column playing surface.

```typescript
interface Board {
  columns: Column[];    // Exactly 11 columns, ordered 2–12
}
```

**Derived queries** (computed by engine, not stored):
- `getColumn(n)` → `Column` for column number `n`.
- `claimedCount(playerId)` → number of columns claimed by a player.

---

### Game

The root aggregate. Owns all game state for a session.

```typescript
type GameStatus = 'setup' | 'playing' | 'finished';

interface Game {
  id: string;                  // UUID
  players: Player[];           // 2–4 players, order is turn order
  board: Board;
  currentPlayerIndex: number;  // Index into players[]; cycles on STOP/BUST
  turn: Turn;                  // Current turn state (reset after each STOP/BUST)
  currentRoll: Roll | null;    // null before first roll or after split applied
  status: GameStatus;
  winnerId: string | null;     // Set when status becomes 'finished'
  createdAt: number;           // Unix timestamp ms
  updatedAt: number;           // Unix timestamp ms
}
```

**State transitions**:
```
setup → playing        on createGame() with valid player list
playing → playing      on rollDice() / selectSplit() / stop() / bust()
playing → finished     on stop() where claimedColumns reaches 3 (FR-018)
```

---

## Persistence Schema (Dexie)

Only `Game` is persisted to IndexedDB. `Roll` is ephemeral (held in memory during a turn only; persisted as `currentRoll` on the parent `Game` so a page refresh mid-turn can restore state).

```typescript
// src/server/db/GameDatabase.ts
class GameDatabase extends Dexie {
  games!: Table<Game, string>;  // keyed by game.id

  constructor() {
    super('CantStopDB');
    this.version(1).stores({
      games: 'id, status, updatedAt',
    });
  }
}
```

**Migration path**: Any schema change increments the Dexie version number and provides a `upgrade()` function. Existing stored `Game` records are migrated in place.

---

## State Transitions Summary

```
Game.status = 'setup'
  └─ createGame()  ──────────────────────►  status = 'playing'
                                             Turn { hasRolled: false, climbers: {}, activeColumns: [] }

status = 'playing'
  └─ rollDice()  ─────────────────────────►  currentRoll = Roll { dice, splits, allUnusable }
      ├─ allUnusable = true  ──────────────►  BUST: climbers discarded, turn advances, next player
      └─ allUnusable = false ──────────────►  wait for selectSplit()

  └─ selectSplit(i)  ──────────────────────►  climbers updated; currentRoll = null
      └─ wait for rollDice() or stop()

  └─ stop()  ──────────────────────────────►  climbers → committedPositions
      ├─ any climber at summit  ────────────►  column claimed; opponent markers removed
      │    └─ claimedColumns.length = 3  ──►  status = 'finished', winnerId set
      └─ turn advances, new Turn created

  └─ BUST  ────────────────────────────────►  climbers discarded; turn advances, new Turn created
```

---

## Validation Rules

| Rule | Condition | Error |
|------|-----------|-------|
| Player count | 2 ≤ players.length ≤ 4 | `INVALID_PLAYER_COUNT` |
| Player name | name.trim().length ∈ [1,20] | `INVALID_PLAYER_NAME` |
| Roll precondition | status = 'playing' AND currentRoll = null | `CANNOT_ROLL_NOW` |
| Stop precondition | status = 'playing' AND turn.hasRolled = true | `CANNOT_STOP_NOW` (FR-019) |
| Split index | i ∈ {0, 1, 2} AND splits[i].usability ≠ 'unusable' | `INVALID_SPLIT` |
| Column advance | column not claimed | `COLUMN_CLAIMED` |
| Climber cap | climber position ≤ column.height | enforced silently by engine |
