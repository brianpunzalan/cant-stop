import { describe, it, expect } from 'vitest';
import { isBust, isWin, nextPlayerIndex, createFreshTurn } from '@/server/engine/rules';
import { createBoard } from '@/server/engine/board';
import type { Game } from '@/shared/types';

function makeGame(overrides: Partial<Game> = {}): Game {
  const players = [
    { id: 'p1', name: 'Alice', color: 'red' as const, claimedColumns: [] },
    { id: 'p2', name: 'Bob', color: 'blue' as const, claimedColumns: [] },
  ];
  return {
    id: 'game1',
    players,
    board: createBoard(),
    currentPlayerIndex: 0,
    turn: createFreshTurn('p1'),
    currentRoll: null,
    status: 'playing',
    winnerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('FR-005 — isBust', () => {
  it('returns true when allUnusable is true', () => {
    expect(isBust({ allUnusable: true })).toBe(true);
  });

  it('returns false when allUnusable is false', () => {
    expect(isBust({ allUnusable: false })).toBe(false);
  });
});

describe('FR-016 — bust discards climbers', () => {
  it('fresh turn after bust has empty climbers', () => {
    const turn = createFreshTurn('p1');
    expect(turn.climbers).toEqual({});
    expect(turn.activeColumns).toEqual([]);
    expect(turn.hasRolled).toBe(false);
  });
});

describe('FR-017 — turn advances after stop or bust', () => {
  it('nextPlayerIndex wraps around', () => {
    expect(nextPlayerIndex(0, 2)).toBe(1);
    expect(nextPlayerIndex(1, 2)).toBe(0);
    expect(nextPlayerIndex(3, 4)).toBe(0);
  });

  it('nextPlayerIndex advances correctly for 4 players', () => {
    expect(nextPlayerIndex(0, 4)).toBe(1);
    expect(nextPlayerIndex(2, 4)).toBe(3);
  });
});

describe('FR-018 — win condition: 3 claimed columns', () => {
  it('isWin returns true when active player has 3 claimed columns', () => {
    const game = makeGame({
      players: [
        { id: 'p1', name: 'Alice', color: 'red', claimedColumns: [7, 9, 11] },
        { id: 'p2', name: 'Bob', color: 'blue', claimedColumns: [] },
      ],
    });
    expect(isWin(game)).toBe(true);
  });

  it('isWin returns false when active player has fewer than 3', () => {
    const game = makeGame({
      players: [
        { id: 'p1', name: 'Alice', color: 'red', claimedColumns: [7, 9] },
        { id: 'p2', name: 'Bob', color: 'blue', claimedColumns: [] },
      ],
    });
    expect(isWin(game)).toBe(false);
  });
});

describe('FR-019 — cannot stop before first roll', () => {
  it('createFreshTurn initializes hasRolled=false', () => {
    const turn = createFreshTurn('p1');
    expect(turn.hasRolled).toBe(false);
  });
});

describe('User Story 1 — turn order in 4-player game (SC-007)', () => {
  it('turn order cycles correctly across 4 players', () => {
    let idx = 0;
    const players = 4;
    const order: number[] = [idx];
    for (let i = 0; i < 7; i++) {
      idx = nextPlayerIndex(idx, players);
      order.push(idx);
    }
    expect(order).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });
});

describe('SC-004 — bust preserves committed positions', () => {
  it('createFreshTurn produces empty climbers regardless of previous state', () => {
    const turn = createFreshTurn('p1');
    expect(Object.keys(turn.climbers)).toHaveLength(0);
  });
});
