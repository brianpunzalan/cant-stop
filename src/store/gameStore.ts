import { create } from 'zustand';
import type { GameStore } from '@/shared/types';

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  currentRoll: null,
  _setGame: (game) => set({ game, currentRoll: game.currentRoll }),
  _setRoll: (currentRoll) => set({ currentRoll }),
}));

/** Direct store access for use outside React components (server layer). */
export const gameStore = useGameStore;
