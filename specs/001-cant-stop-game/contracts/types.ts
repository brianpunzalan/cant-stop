/**
 * Shared domain types used by both the server layer (src/server/) and the
 * client layer (src/client/). Canonical source: src/shared/types.ts.
 * This file mirrors those types for spec/contract documentation purposes.
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type GameStatus = 'setup' | 'playing' | 'finished';
export type SplitUsability = 'fully-usable' | 'partially-usable' | 'unusable';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface PlayerConfig {
  name: string;         // 1–20 chars
  color: PlayerColor;
}

export interface GameConfig {
  players: PlayerConfig[];   // 2–4 entries
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  claimedColumns: number[];
}

export interface Column {
  number: number;                          // 2–12
  height: number;                          // fixed per column number
  claimed: boolean;
  claimedBy: string | null;
  committedPositions: Record<string, number>;   // playerId → 0..height
}

export interface Board {
  columns: Column[];    // 11 entries, ordered column 2..12
}

export interface Turn {
  activePlayerId: string;
  hasRolled: boolean;
  climbers: Record<number, number>;        // columnNumber → climber position
  activeColumns: number[];                 // max 3
}

export interface Split {
  index: 0 | 1 | 2;
  diceIndices: [[number, number], [number, number]];
  sumA: number;
  sumB: number;
  usability: SplitUsability;
}

export interface Roll {
  dice: [number, number, number, number];
  splits: [Split, Split, Split];
  allUnusable: boolean;
}

export interface Game {
  id: string;
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  turn: Turn;
  currentRoll: Roll | null;
  status: GameStatus;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─── Return types ─────────────────────────────────────────────────────────────

/**
 * Returned by selectSplit() — describes the updated turn state after a split
 * is applied, including which columns were advanced and whether any climber
 * reached the summit.
 */
export interface TurnSummary {
  turn: Turn;
  advancedColumns: number[];       // column numbers that were advanced this split
  climbersAtSummit: number[];      // column numbers where a climber is now at the top
  busted: false;
}

/**
 * Returned by rollDice() when all splits are unusable. The service calls
 * bustTurn() automatically; the return value reflects the state after bust.
 */
export interface BustResult {
  roll: Roll;
  busted: true;
  game: Game;    // game state after turn advances to next player
}

// ─── Store shape (Zustand) ────────────────────────────────────────────────────

/**
 * The shape of the Zustand store exposed to client hooks.
 * The server layer writes these fields; client hooks read them via selectors.
 */
export interface GameStore {
  game: Game | null;
  currentRoll: Roll | null;

  // Actions (written by server via GameService — do not call directly from UI)
  _setGame: (game: Game) => void;
  _setRoll: (roll: Roll | null) => void;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export type GameErrorCode =
  | 'INVALID_PLAYER_COUNT'
  | 'INVALID_PLAYER_NAME'
  | 'DUPLICATE_COLOR'
  | 'CANNOT_ROLL_NOW'
  | 'CANNOT_STOP_NOW'
  | 'INVALID_SPLIT'
  | 'COLUMN_CLAIMED'
  | 'GAME_ALREADY_FINISHED';

export class GameError extends Error {
  constructor(
    public readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}
