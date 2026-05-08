import type {
  Game,
  GameConfig,
  Roll,
  Split,
  TurnSummary,
} from '@/shared/types';
import { GameError } from '@/shared/types';
import type { IGameService } from './IGameService';
import { db } from '../db/GameDatabase';
import { rollDice as engineRoll, buildRoll } from '../engine/dice';
import { createBoard, advanceClimber, commitTurn } from '../engine/board';
import { createFreshTurn, nextPlayerIndex } from '../engine/rules';
import { gameStore } from '@/store/gameStore';

export class GameService implements IGameService {
  async createGame(config: GameConfig): Promise<Game> {
    if (config.players.length < 2 || config.players.length > 4) {
      throw new GameError('INVALID_PLAYER_COUNT', 'Game requires 2–4 players');
    }
    const seenColors = new Set<string>();
    for (const p of config.players) {
      const name = p.name.trim();
      if (name.length < 1 || name.length > 20) {
        throw new GameError('INVALID_PLAYER_NAME', `Invalid name: "${p.name}"`);
      }
      if (seenColors.has(p.color)) {
        throw new GameError('DUPLICATE_COLOR', `Duplicate color: ${p.color}`);
      }
      seenColors.add(p.color);
    }

    const players = config.players.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name.trim(),
      color: p.color,
      claimedColumns: [] as number[],
    }));

    const now = Date.now();
    const game: Game = {
      id: crypto.randomUUID(),
      players,
      board: createBoard(),
      currentPlayerIndex: 0,
      turn: createFreshTurn(players[0].id),
      currentRoll: null,
      status: 'playing',
      winnerId: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.games.put(game);
    gameStore.getState()._setGame(game);
    return game;
  }

  async rollDice(): Promise<Roll> {
    const { game } = gameStore.getState();
    if (!game || game.status !== 'playing') {
      throw new GameError('CANNOT_ROLL_NOW', 'No active game');
    }
    if (game.currentRoll !== null) {
      throw new GameError('CANNOT_ROLL_NOW', 'A roll is already pending');
    }

    const dice = engineRoll();
    const roll = buildRoll(dice, game.turn, game.board);

    if (roll.allUnusable) {
      // Auto-bust — persist roll on game temporarily for return value, then bust
      const bustGame = await this._bustWithRoll(game, roll);
      gameStore.getState()._setGame(bustGame);
      return roll;
    }

    const updatedGame: Game = {
      ...game,
      turn: { ...game.turn, hasRolled: true },
      currentRoll: roll,
      updatedAt: Date.now(),
    };

    await db.games.put(updatedGame);
    gameStore.getState()._setGame(updatedGame);
    return roll;
  }

  async selectSplit(splitIndex: 0 | 1 | 2): Promise<TurnSummary> {
    const { game } = gameStore.getState();
    if (!game || game.status !== 'playing' || !game.currentRoll) {
      throw new GameError('INVALID_SPLIT', 'No roll to select from');
    }
    const split: Split = game.currentRoll.splits[splitIndex];
    if (split.usability === 'unusable') {
      throw new GameError('INVALID_SPLIT', `Split ${splitIndex} is unusable`);
    }

    const { activePlayerId } = game.turn;
    let turn = { ...game.turn };

    const advancedColumns: number[] = [];

    if (split.usability === 'fully-usable') {
      if (split.sumA === split.sumB) {
        // Doubles: advance the same column twice
        turn = advanceClimber(turn, game.board, split.sumA, activePlayerId);
        advancedColumns.push(split.sumA);
        turn = advanceClimber(turn, game.board, split.sumA, activePlayerId);
        advancedColumns.push(split.sumA);
      } else {
        turn = advanceClimber(turn, game.board, split.sumA, activePlayerId);
        advancedColumns.push(split.sumA);
        turn = advanceClimber(turn, game.board, split.sumB, activePlayerId);
        advancedColumns.push(split.sumB);
      }
    } else {
      // partially-usable: advance the non-blocked sum
      const colA = game.board.columns.find((c) => c.number === split.sumA)!;
      const colB = game.board.columns.find((c) => c.number === split.sumB)!;
      const aBlocked =
        colA.claimed ||
        (!turn.activeColumns.includes(split.sumA) && turn.activeColumns.length >= 3);
      if (!aBlocked) {
        turn = advanceClimber(turn, game.board, split.sumA, activePlayerId);
        advancedColumns.push(split.sumA);
      } else {
        turn = advanceClimber(turn, game.board, split.sumB, activePlayerId);
        advancedColumns.push(split.sumB);
      }
      void colB; // suppress unused warning
    }

    // Compute which climbers are now at summit
    const climbersAtSummit: number[] = [];
    for (const [colNumStr, climberPos] of Object.entries(turn.climbers)) {
      const colNum = Number(colNumStr);
      const col = game.board.columns.find((c) => c.number === colNum)!;
      if (climberPos >= col.height) climbersAtSummit.push(colNum);
    }

    const updatedGame: Game = {
      ...game,
      turn,
      currentRoll: null,
      updatedAt: Date.now(),
    };

    await db.games.put(updatedGame);
    gameStore.getState()._setGame(updatedGame);

    return { turn, advancedColumns, climbersAtSummit, busted: false };
  }

  async stop(): Promise<Game> {
    const { game } = gameStore.getState();
    if (!game || game.status !== 'playing') {
      throw new GameError('CANNOT_STOP_NOW', 'No active game');
    }
    if (!game.turn.hasRolled) {
      throw new GameError('CANNOT_STOP_NOW', 'Must roll at least once before stopping (FR-019)');
    }

    const { board, claimedColumnNumbers } = commitTurn(game.board, game.turn);

    // Update the active player's claimedColumns list
    const activePlayer = game.players[game.currentPlayerIndex];
    const updatedPlayers = game.players.map((p) => {
      if (p.id !== activePlayer.id) return p;
      const newClaimed = [
        ...p.claimedColumns,
        ...claimedColumnNumbers.filter((n) => !p.claimedColumns.includes(n)),
      ];
      return { ...p, claimedColumns: newClaimed };
    });

    let updatedGame: Game = {
      ...game,
      players: updatedPlayers,
      board,
      currentRoll: null,
      updatedAt: Date.now(),
    };

    // Check win condition
    const updatedActivePlayer = updatedPlayers[game.currentPlayerIndex];
    if (updatedActivePlayer.claimedColumns.length >= 3) {
      updatedGame = {
        ...updatedGame,
        status: 'finished',
        winnerId: updatedActivePlayer.id,
      };
      await db.games.put(updatedGame);
      gameStore.getState()._setGame(updatedGame);
      return updatedGame;
    }

    // Advance turn
    const nextIndex = nextPlayerIndex(game.currentPlayerIndex, game.players.length);
    const nextPlayer = updatedGame.players[nextIndex];
    updatedGame = {
      ...updatedGame,
      currentPlayerIndex: nextIndex,
      turn: createFreshTurn(nextPlayer.id),
    };

    await db.games.put(updatedGame);
    gameStore.getState()._setGame(updatedGame);
    return updatedGame;
  }

  async bustTurn(): Promise<Game> {
    const { game } = gameStore.getState();
    if (!game || game.status !== 'playing') {
      throw new GameError('CANNOT_ROLL_NOW', 'No active game');
    }
    const bustedGame = this._bustGame(game);
    await db.games.put(bustedGame);
    gameStore.getState()._setGame(bustedGame);
    return bustedGame;
  }

  /** Load the most recent in-progress game from IndexedDB and restore to store. */
  async restoreGame(): Promise<Game | null> {
    const games = await db.games.where('status').equals('playing').sortBy('updatedAt');
    if (games.length === 0) return null;
    const game = games[games.length - 1];
    gameStore.getState()._setGame(game);
    return game;
  }

  /** Clear all finished games from storage (called on New Game from winner screen). */
  async clearFinishedGames(): Promise<void> {
    await db.games.where('status').equals('finished').delete();
  }

  private _bustGame(game: Game): Game {
    const nextIndex = nextPlayerIndex(game.currentPlayerIndex, game.players.length);
    const nextPlayer = game.players[nextIndex];
    return {
      ...game,
      currentPlayerIndex: nextIndex,
      turn: createFreshTurn(nextPlayer.id),
      currentRoll: null,
      updatedAt: Date.now(),
    };
  }

  private async _bustWithRoll(game: Game, roll: Roll): Promise<Game> {
    void roll; // roll is returned to caller but not stored on game after bust
    return this._bustGame(game);
  }
}

export const gameService = new GameService();
