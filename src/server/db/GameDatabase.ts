import Dexie, { type Table } from 'dexie';
import type { Game } from '@/shared/types';

export class GameDatabase extends Dexie {
  games!: Table<Game, string>;

  constructor() {
    super('CantStopDB');
    this.version(1).stores({
      games: 'id, status, updatedAt',
    });
  }
}

export const db = new GameDatabase();
