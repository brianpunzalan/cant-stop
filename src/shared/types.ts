export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type GameStatus = 'setup' | 'playing' | 'finished';
export type SplitUsability = 'fully-usable' | 'partially-usable' | 'unusable';

export interface PlayerConfig {
  name: string;
  color: PlayerColor;
}

export interface GameConfig {
  players: PlayerConfig[];
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  claimedColumns: number[];
}

export interface Column {
  number: number;
  height: number;
  claimed: boolean;
  claimedBy: string | null;
  committedPositions: Record<string, number>;
}

export interface Board {
  columns: Column[];
}

export interface Turn {
  activePlayerId: string;
  hasRolled: boolean;
  climbers: Record<number, number>;
  activeColumns: number[];
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

export interface TurnSummary {
  turn: Turn;
  advancedColumns: number[];
  climbersAtSummit: number[];
  busted: false;
}

export interface BustResult {
  roll: Roll;
  busted: true;
  game: Game;
}

export interface GameStore {
  game: Game | null;
  currentRoll: Roll | null;
  _setGame: (game: Game) => void;
  _setRoll: (roll: Roll | null) => void;
}

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
