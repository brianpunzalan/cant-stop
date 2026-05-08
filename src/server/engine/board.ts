import type { Board, Column, Turn } from '@/shared/types';

/** Fixed heights for columns 2–12 (index 0 = column 2) */
export const COLUMN_HEIGHTS: Record<number, number> = {
  2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 11, 9: 9, 10: 7, 11: 5, 12: 3,
};

export function createBoard(): Board {
  const columns: Column[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
    number: n,
    height: COLUMN_HEIGHTS[n],
    claimed: false,
    claimedBy: null,
    committedPositions: {},
  }));
  return { columns };
}

export function getColumn(board: Board, columnNumber: number): Column {
  const col = board.columns.find((c) => c.number === columnNumber);
  if (!col) throw new Error(`Column ${columnNumber} not found`);
  return col;
}

/**
 * Advances a climber on the given column by 1, capped at the column summit.
 * If no climber exists, places one at committedPosition + 1.
 * Returns the updated turn (immutable — original turn unchanged).
 */
export function advanceClimber(
  turn: Turn,
  board: Board,
  columnNumber: number,
  activePlayerId: string,
): Turn {
  const column = getColumn(board, columnNumber);
  const committedPos = column.committedPositions[activePlayerId] ?? 0;
  const currentClimberPos = turn.climbers[columnNumber];

  let newPos: number;
  if (currentClimberPos === undefined) {
    newPos = committedPos + 1;
  } else {
    newPos = currentClimberPos + 1;
  }
  newPos = Math.min(newPos, column.height);

  const newClimbers = { ...turn.climbers, [columnNumber]: newPos };
  const newActiveColumns = turn.activeColumns.includes(columnNumber)
    ? turn.activeColumns
    : [...turn.activeColumns, columnNumber];

  return { ...turn, climbers: newClimbers, activeColumns: newActiveColumns };
}

/**
 * Claims a column for a player: sets claimed=true, removes all other players'
 * committedPositions, and records the claimant. Returns updated board.
 */
export function claimColumn(
  board: Board,
  columnNumber: number,
  playerId: string,
): Board {
  const columns = board.columns.map((col) => {
    if (col.number !== columnNumber) return col;
    return {
      ...col,
      claimed: true,
      claimedBy: playerId,
      committedPositions: { [playerId]: col.height },
    };
  });
  return { columns };
}

/**
 * Commits all climber positions to permanent board state.
 * Any climber at the summit triggers claimColumn for that player.
 * Returns { board, claimedColumnNumbers }.
 */
export function commitTurn(
  board: Board,
  turn: Turn,
): { board: Board; claimedColumnNumbers: number[] } {
  let updatedBoard = board;
  const claimedColumnNumbers: number[] = [];

  // First commit all climber positions
  const columns = updatedBoard.columns.map((col) => {
    const climberPos = turn.climbers[col.number];
    if (climberPos === undefined) return col;
    const committedPositions = {
      ...col.committedPositions,
      [turn.activePlayerId]: climberPos,
    };
    return { ...col, committedPositions };
  });
  updatedBoard = { columns };

  // Then claim columns where climber reached the summit
  for (const [colNumStr, climberPos] of Object.entries(turn.climbers)) {
    const colNum = Number(colNumStr);
    const col = updatedBoard.columns.find((c) => c.number === colNum)!;
    if (climberPos >= col.height) {
      updatedBoard = claimColumn(updatedBoard, colNum, turn.activePlayerId);
      claimedColumnNumbers.push(colNum);
    }
  }

  return { board: updatedBoard, claimedColumnNumbers };
}

export function removeOpponentMarkers(board: Board, columnNumber: number, claimantId: string): Board {
  const columns = board.columns.map((col) => {
    if (col.number !== columnNumber) return col;
    const committedPositions: Record<string, number> = {};
    if (col.committedPositions[claimantId] !== undefined) {
      committedPositions[claimantId] = col.committedPositions[claimantId];
    }
    return { ...col, committedPositions };
  });
  return { columns };
}
