import { useGameStore } from '@/store/gameStore';
import type { GameStore } from '@/shared/types';

export function useGameState<T>(selector: (state: GameStore) => T): T {
  return useGameStore(selector);
}
