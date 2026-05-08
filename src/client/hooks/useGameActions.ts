import { gameService } from '@/server/services/GameService';
import type { GameConfig } from '@/shared/types';

export function useGameActions() {
  return {
    createGame: (config: GameConfig) => gameService.createGame(config),
    rollDice: () => gameService.rollDice(),
    selectSplit: (index: 0 | 1 | 2) => gameService.selectSplit(index),
    stop: () => gameService.stop(),
    restoreGame: () => gameService.restoreGame(),
    clearFinishedGames: () => gameService.clearFinishedGames(),
  };
}
