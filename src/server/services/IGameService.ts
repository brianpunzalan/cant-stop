import type { Game, GameConfig, Roll, TurnSummary } from '@/shared/types';

export interface IGameService {
  createGame(config: GameConfig): Promise<Game>;
  rollDice(): Promise<Roll>;
  selectSplit(splitIndex: 0 | 1 | 2): Promise<TurnSummary>;
  stop(): Promise<Game>;
  bustTurn(): Promise<Game>;
}
