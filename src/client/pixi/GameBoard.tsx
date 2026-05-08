import { Application } from '@pixi/react';
import { useGameState } from '../hooks/useGameState';
import { BoardColumn } from './BoardColumn';

const COLUMN_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const COL_SPACING = 52;
const MAX_HEIGHT = 13; // column 7 height
const CELL_SIZE = 36;
const CELL_GAP = 4;
const BOARD_PADDING_X = 40;
const BOARD_PADDING_Y = 24;

const BOARD_WIDTH = BOARD_PADDING_X * 2 + COL_SPACING * (COLUMN_NUMBERS.length - 1);
const BOARD_HEIGHT = BOARD_PADDING_Y * 2 + MAX_HEIGHT * (CELL_SIZE + CELL_GAP) + 32;

export function GameBoard() {
  const game = useGameState((s) => s.game);

  if (!game) return null;

  const { board, players, turn } = game;

  return (
    <div style={styles.wrapper} aria-label="Game board">
      <Application
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        background={0x0f1b35}
        antialias
      >
        {COLUMN_NUMBERS.map((colNum, i) => {
          const col = board.columns.find((c) => c.number === colNum)!;
          const colX = BOARD_PADDING_X + i * COL_SPACING;
          return (
            <BoardColumn
              key={colNum}
              column={col}
              players={players}
              climbers={turn.climbers}
              x={colX}
              baseY={BOARD_PADDING_Y}
              maxHeight={MAX_HEIGHT}
            />
          );
        })}
      </Application>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    borderRadius: '0.75rem',
    overflow: 'hidden',
    display: 'inline-block',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
};
