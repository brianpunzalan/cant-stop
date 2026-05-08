import type { Game, Turn } from '@/shared/types';

export function isBust(roll: { allUnusable: boolean }): boolean {
  return roll.allUnusable;
}

export function isWin(game: Game): boolean {
  const activePlayer = game.players[game.currentPlayerIndex];
  return activePlayer.claimedColumns.length >= 3;
}

export function nextPlayerIndex(currentIndex: number, playerCount: number): number {
  return (currentIndex + 1) % playerCount;
}

export function createFreshTurn(activePlayerId: string): Turn {
  return {
    activePlayerId,
    hasRolled: false,
    climbers: {},
    activeColumns: [],
  };
}
