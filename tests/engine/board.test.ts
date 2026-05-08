import { describe, it, expect } from 'vitest';
import {
  createBoard,
  COLUMN_HEIGHTS,
  advanceClimber,
  claimColumn,
  commitTurn,
} from '@/server/engine/board';
import type { Turn } from '@/shared/types';

function makeTurn(overrides: Partial<Turn> = {}): Turn {
  return { activePlayerId: 'p1', hasRolled: false, climbers: {}, activeColumns: [], ...overrides };
}

describe('FR-002 — board initialization', () => {
  it('has exactly 11 columns numbered 2–12', () => {
    const board = createBoard();
    expect(board.columns).toHaveLength(11);
    board.columns.forEach((col, i) => {
      expect(col.number).toBe(i + 2);
    });
  });

  it('column heights match spec', () => {
    const expected: Record<number, number> = {
      2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 11, 9: 9, 10: 7, 11: 5, 12: 3,
    };
    const board = createBoard();
    board.columns.forEach((col) => {
      expect(col.height).toBe(expected[col.number]);
    });
  });

  it('COLUMN_HEIGHTS constant matches spec', () => {
    expect(COLUMN_HEIGHTS[2]).toBe(3);
    expect(COLUMN_HEIGHTS[7]).toBe(13);
    expect(COLUMN_HEIGHTS[12]).toBe(3);
  });

  it('all columns start unclaimed with no committed positions', () => {
    const board = createBoard();
    board.columns.forEach((col) => {
      expect(col.claimed).toBe(false);
      expect(col.claimedBy).toBeNull();
      expect(col.committedPositions).toEqual({});
    });
  });
});

describe('FR-003 — committed progress tracking', () => {
  it('committedPositions default to 0 for uninitialized players', () => {
    const board = createBoard();
    const col = board.columns.find((c) => c.number === 7)!;
    expect(col.committedPositions['p1']).toBeUndefined(); // 0 by convention
  });
});

describe('FR-004 — claimed columns block movement', () => {
  it('claimColumn marks column as claimed', () => {
    let board = createBoard();
    board = claimColumn(board, 7, 'p1');
    const col = board.columns.find((c) => c.number === 7)!;
    expect(col.claimed).toBe(true);
    expect(col.claimedBy).toBe('p1');
  });
});

describe('FR-011 — climber placement: new climber placed one above committed position', () => {
  it('places new climber at committed + 1 when no existing climber', () => {
    const board = createBoard();
    const turn = makeTurn();
    const updated = advanceClimber(turn, board, 7, 'p1');
    expect(updated.climbers[7]).toBe(1); // committed = 0, so 0 + 1 = 1
  });

  it('places new climber above existing committed position', () => {
    const board = createBoard();
    board.columns.find((c) => c.number === 7)!.committedPositions['p1'] = 3;
    const turn = makeTurn();
    const updated = advanceClimber(turn, board, 7, 'p1');
    expect(updated.climbers[7]).toBe(4); // 3 + 1
  });

  it('advances existing climber by 1', () => {
    const board = createBoard();
    const turn = makeTurn({ climbers: { 7: 2 }, activeColumns: [7] });
    const updated = advanceClimber(turn, board, 7, 'p1');
    expect(updated.climbers[7]).toBe(3);
  });
});

describe('FR-012 — climber capped at column height (summit)', () => {
  it('does not advance beyond column height', () => {
    const board = createBoard();
    const turn = makeTurn({ climbers: { 7: 13 }, activeColumns: [7] }); // already at max
    const updated = advanceClimber(turn, board, 7, 'p1');
    expect(updated.climbers[7]).toBe(13); // capped
  });

  it('caps a new climber placed in a 1-height scenario', () => {
    const board = createBoard();
    // Place committed at height - 1 so new climber would exactly reach summit
    board.columns.find((c) => c.number === 12)!.committedPositions['p1'] = 2;
    const turn = makeTurn();
    const updated = advanceClimber(turn, board, 12, 'p1');
    expect(updated.climbers[12]).toBe(3); // height of col 12 = 3
  });
});

describe('FR-014 — commitTurn writes climbers to board', () => {
  it('sets committedPositions from climber positions', () => {
    const board = createBoard();
    const turn = makeTurn({ activePlayerId: 'p1', climbers: { 7: 5, 9: 3 }, activeColumns: [7, 9] });
    const { board: updated } = commitTurn(board, turn);
    expect(updated.columns.find((c) => c.number === 7)!.committedPositions['p1']).toBe(5);
    expect(updated.columns.find((c) => c.number === 9)!.committedPositions['p1']).toBe(3);
  });
});

describe('FR-015 — claimColumn on summit; removes opponent markers', () => {
  it('claims column and sets claimedBy', () => {
    let board = createBoard();
    board = claimColumn(board, 7, 'p1');
    const col = board.columns.find((c) => c.number === 7)!;
    expect(col.claimed).toBe(true);
    expect(col.claimedBy).toBe('p1');
  });

  it('removes other players committed positions on claim', () => {
    let board = createBoard();
    board.columns.find((c) => c.number === 7)!.committedPositions = { p1: 5, p2: 3 };
    board = claimColumn(board, 7, 'p1');
    const col = board.columns.find((c) => c.number === 7)!;
    expect(col.committedPositions['p2']).toBeUndefined();
    expect(col.committedPositions['p1']).toBe(13); // set to height
  });

  it('commitTurn claims columns where climber is at summit', () => {
    const board = createBoard();
    // column 12 height = 3; climber at 3 = summit
    const turn = makeTurn({ activePlayerId: 'p1', climbers: { 12: 3 }, activeColumns: [12] });
    const { board: updated, claimedColumnNumbers } = commitTurn(board, turn);
    expect(claimedColumnNumbers).toContain(12);
    expect(updated.columns.find((c) => c.number === 12)!.claimed).toBe(true);
  });
});

describe('Edge Case — column claimed by opponent mid-game', () => {
  it('closes the column and removes all other players markers (FR-015)', () => {
    let board = createBoard();
    board.columns.find((c) => c.number === 7)!.committedPositions = { alice: 3, bob: 5 };
    // Bob claims column 7 (climber at summit)
    board = claimColumn(board, 7, 'bob');
    const col = board.columns.find((c) => c.number === 7)!;
    expect(col.claimed).toBe(true);
    expect(col.committedPositions['alice']).toBeUndefined();
    expect(col.committedPositions['bob']).toBe(col.height);
  });
});

describe('Edge Case — three climbers all at summits simultaneously', () => {
  it('commitTurn claims all three columns in one call', () => {
    const board = createBoard();
    const turn = makeTurn({
      activePlayerId: 'p1',
      climbers: { 12: 3, 11: 5, 10: 7 },
      activeColumns: [12, 11, 10],
    });
    const { claimedColumnNumbers } = commitTurn(board, turn);
    expect(claimedColumnNumbers).toContain(12);
    expect(claimedColumnNumbers).toContain(11);
    expect(claimedColumnNumbers).toContain(10);
  });
});
