import { describe, it, expect } from 'vitest';
import { rollDice, computeSplits, classifyUsability, buildRoll } from '@/server/engine/dice';
import { createBoard } from '@/server/engine/board';
import type { Turn } from '@/shared/types';

function makeTurn(overrides: Partial<Turn> = {}): Turn {
  return { activePlayerId: 'p1', hasRolled: false, climbers: {}, activeColumns: [], ...overrides };
}

describe('FR-006 — rollDice produces 4 dice in [1,6]', () => {
  it('returns exactly 4 values each in [1,6]', () => {
    for (let i = 0; i < 50; i++) {
      const dice = rollDice();
      expect(dice).toHaveLength(4);
      dice.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      });
    }
  });
});

describe('FR-007 — computeSplits enumerates 3 canonical pairings', () => {
  it('always produces exactly 3 splits', () => {
    const board = createBoard();
    const turn = makeTurn();
    const splits = computeSplits([1, 2, 3, 4], turn, board);
    expect(splits).toHaveLength(3);
  });

  it('split indices are 0, 1, 2', () => {
    const board = createBoard();
    const turn = makeTurn();
    const splits = computeSplits([3, 4, 5, 6], turn, board);
    expect(splits[0].index).toBe(0);
    expect(splits[1].index).toBe(1);
    expect(splits[2].index).toBe(2);
  });

  it('split 0: (d0+d1, d2+d3)', () => {
    const board = createBoard();
    const turn = makeTurn();
    const splits = computeSplits([1, 2, 3, 4], turn, board);
    expect(splits[0].sumA).toBe(3);  // 1+2
    expect(splits[0].sumB).toBe(7);  // 3+4
  });

  it('split 1: (d0+d2, d1+d3)', () => {
    const board = createBoard();
    const turn = makeTurn();
    const splits = computeSplits([1, 2, 3, 4], turn, board);
    expect(splits[1].sumA).toBe(4);  // 1+3
    expect(splits[1].sumB).toBe(6);  // 2+4
  });

  it('split 2: (d0+d3, d1+d2)', () => {
    const board = createBoard();
    const turn = makeTurn();
    const splits = computeSplits([1, 2, 3, 4], turn, board);
    expect(splits[2].sumA).toBe(5);  // 1+4
    expect(splits[2].sumB).toBe(5);  // 2+3
  });
});

describe('FR-007 — classifyUsability', () => {
  it('fully-usable when both sums are open columns with room', () => {
    const board = createBoard();
    const turn = makeTurn();
    const usability = classifyUsability(7, 9, turn, board);
    expect(usability).toBe('fully-usable');
  });

  it('unusable when both sums target claimed columns', () => {
    const board = createBoard();
    board.columns.find((c) => c.number === 7)!.claimed = true;
    board.columns.find((c) => c.number === 9)!.claimed = true;
    const turn = makeTurn();
    const usability = classifyUsability(7, 9, turn, board);
    expect(usability).toBe('unusable');
  });

  it('partially-usable when one sum is claimed', () => {
    const board = createBoard();
    board.columns.find((c) => c.number === 7)!.claimed = true;
    const turn = makeTurn();
    const usability = classifyUsability(7, 9, turn, board);
    expect(usability).toBe('partially-usable');
  });
});

describe('FR-005 — 4-column constraint in usability (FR-007)', () => {
  it('blocks a sum that would open a 4th active column', () => {
    const board = createBoard();
    const turn = makeTurn({ activeColumns: [7, 9, 11] });
    // sum=5 would open a 4th column — blocked
    const usability = classifyUsability(5, 7, turn, board);
    // sumA=5 blocked (would open 4th), sumB=7 has climber (ok)
    expect(usability).toBe('partially-usable');
  });

  it('both sums blocked when 3 active and both would open new columns', () => {
    const board = createBoard();
    const turn = makeTurn({ activeColumns: [7, 9, 11] });
    const usability = classifyUsability(4, 5, turn, board);
    expect(usability).toBe('unusable');
  });

  it('sum is allowed if a climber already exists on that column', () => {
    const board = createBoard();
    const turn = makeTurn({ activeColumns: [7, 9, 11], climbers: { 7: 2, 9: 3, 11: 1 } });
    // sumA=7 has a climber, so not blocked despite 3 active columns
    const usability = classifyUsability(7, 5, turn, board);
    expect(usability).toBe('partially-usable');
  });
});

describe('FR-010 — allUnusable flag triggers bust', () => {
  it('buildRoll sets allUnusable=true when all splits are unusable', () => {
    const board = createBoard();
    // Claim columns 7, 9, 11 and occupy 3 active columns with other columns
    // so any new sum would open a 4th
    board.columns.find((c) => c.number === 2)!.claimed = true;
    board.columns.find((c) => c.number === 3)!.claimed = true;
    board.columns.find((c) => c.number === 4)!.claimed = true;
    board.columns.find((c) => c.number === 5)!.claimed = true;
    board.columns.find((c) => c.number === 6)!.claimed = true;
    board.columns.find((c) => c.number === 8)!.claimed = true;
    board.columns.find((c) => c.number === 10)!.claimed = true;
    board.columns.find((c) => c.number === 12)!.claimed = true;
    // Active: 7, 9, 11 — any sum targeting something else is blocked
    const turn = makeTurn({ activeColumns: [7, 9, 11], climbers: { 7: 1, 9: 1, 11: 1 } });
    // dice [1,1,1,1] → all splits produce sums 2 → claimed → unusable
    const roll = buildRoll([1, 1, 1, 1], turn, board);
    expect(roll.allUnusable).toBe(true);
  });

  it('buildRoll sets allUnusable=false when at least one split is usable', () => {
    const board = createBoard();
    const turn = makeTurn();
    const roll = buildRoll([3, 4, 5, 6], turn, board);
    expect(roll.allUnusable).toBe(false);
  });
});

describe('FR-013 — doubles detection', () => {
  it('identifies doubles when sumA === sumB', () => {
    const board = createBoard();
    const turn = makeTurn();
    // [2,5,4,3] → split2: d0+d3=5, d1+d2=9; split0: d0+d1=7, d2+d3=7 → doubles at index 0
    const splits = computeSplits([2, 5, 2, 5], turn, board);
    // split0: (2+5, 2+5) = (7, 7) — doubles
    expect(splits[0].sumA).toBe(7);
    expect(splits[0].sumB).toBe(7);
  });
});
