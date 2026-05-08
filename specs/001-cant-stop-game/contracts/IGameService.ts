/**
 * IGameService — the contract between the server layer (game engine + persistence)
 * and the client layer (React UI).
 *
 * Implementations live in src/server/services/GameService.ts.
 * The client interacts exclusively through this interface via custom hooks in
 * src/client/hooks/. The implementation writes all state changes to the Zustand
 * store (src/store/gameStore.ts); the client reads state from the store, never
 * calling the service for reads.
 *
 * All mutating methods are synchronous at the game-logic level but return
 * Promise to accommodate the async Dexie persistence call that follows each
 * state change.
 */

import type { Game, GameConfig, Roll, Split, TurnSummary } from './types';

export interface IGameService {
  /**
   * Creates a new game session with the given player configuration.
   * Persists the initial Game to IndexedDB and writes it to the Zustand store.
   * Rejects if player count is outside [2, 4] or any name is invalid.
   *
   * Spec: FR-001, FR-002, FR-003
   */
  createGame(config: GameConfig): Promise<Game>;

  /**
   * Simulates rolling four six-sided dice for the current player.
   * Computes the three pair-splits and classifies each as fully-usable,
   * partially-usable, or unusable based on current board and turn state.
   * If all splits are unusable, triggers a bust automatically (calls bustTurn()).
   * Writes the resulting Roll to the store; if bust, writes the new Turn.
   * Rejects if the game is not in 'playing' status or a roll is already pending.
   *
   * Spec: FR-006, FR-007, FR-010, FR-019
   */
  rollDice(): Promise<Roll>;

  /**
   * Applies the chosen split to the current turn's climber state.
   * For a fully-usable split, both sums advance (or the same column twice for doubles).
   * For a partially-usable split, only the usable sum advances.
   * Clears currentRoll from the store; updates climber positions.
   * Rejects if splitIndex is not in {0,1,2} or the selected split is unusable.
   *
   * Spec: FR-008, FR-009, FR-011, FR-012, FR-013
   */
  selectSplit(splitIndex: 0 | 1 | 2): Promise<TurnSummary>;

  /**
   * Commits the current turn: converts all climber positions to permanent committed
   * positions, claims any columns where a climber reached the summit, removes
   * opponent markers from claimed columns, and checks for a win condition.
   * Advances turn to the next player. If the current player's claimed column count
   * reaches 3, ends the game.
   * Rejects if no roll has been made this turn (hasRolled === false).
   *
   * Spec: FR-014, FR-015, FR-017, FR-018
   */
  stop(): Promise<Game>;

  /**
   * Discards all climber positions from the current turn without modifying any
   * player's committed board state. Advances turn to the next player.
   * Called automatically by rollDice() when all splits are unusable; may also be
   * called directly in tests.
   *
   * Spec: FR-016, FR-017
   */
  bustTurn(): Promise<Game>;
}
