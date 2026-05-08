import type { Roll, Split, SplitUsability, Turn, Board } from '@/shared/types';

export function rollDice(): [number, number, number, number] {
  return [d6(), d6(), d6(), d6()];
}

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Three canonical pairings of 4 dice into 2 pairs (exhaustive, non-redundant).
 * Split 0: (d0+d1, d2+d3)
 * Split 1: (d0+d2, d1+d3)
 * Split 2: (d0+d3, d1+d2)
 */
export function computeSplits(
  dice: [number, number, number, number],
  turn: Turn,
  board: Board,
): [Split, Split, Split] {
  const pairings: [[[number, number], [number, number]], [[number, number], [number, number]], [[number, number], [number, number]]] = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  return pairings.map(([pairA, pairB], i) => {
    const sumA = dice[pairA[0]] + dice[pairA[1]];
    const sumB = dice[pairB[0]] + dice[pairB[1]];
    const usability = classifyUsability(sumA, sumB, turn, board);
    return {
      index: i as 0 | 1 | 2,
      diceIndices: [pairA, pairB] as [[number, number], [number, number]],
      sumA,
      sumB,
      usability,
    };
  }) as [Split, Split, Split];
}

export function classifyUsability(
  sumA: number,
  sumB: number,
  turn: Turn,
  board: Board,
): SplitUsability {
  const aBlocked = isSumBlocked(sumA, turn, board);
  const bBlocked = isSumBlocked(sumB, turn, board);

  if (!aBlocked && !bBlocked) return 'fully-usable';
  if (aBlocked && bBlocked) return 'unusable';
  return 'partially-usable';
}

/**
 * A sum is blocked if:
 * 1. The column is claimed, OR
 * 2. No climber exists on that column AND activeColumns already has 3 entries
 */
function isSumBlocked(sum: number, turn: Turn, board: Board): boolean {
  const column = board.columns.find((c) => c.number === sum);
  if (!column) return true;
  if (column.claimed) return true;
  const hasClimber = turn.activeColumns.includes(sum);
  if (!hasClimber && turn.activeColumns.length >= 3) return true;
  return false;
}

export function buildRoll(
  dice: [number, number, number, number],
  turn: Turn,
  board: Board,
): Roll {
  const splits = computeSplits(dice, turn, board);
  const allUnusable = splits.every((s) => s.usability === 'unusable');
  return { dice, splits, allUnusable };
}
