import { Graphics } from 'pixi.js';
import { PlayerMarker } from './PlayerMarker';
import { Climber } from './Climber';
import type { Column, Player } from '@/shared/types';

const CELL_SIZE = 36;
const CELL_GAP = 4;
const CLAIMED_BG = 0x1a3a1a;

interface Props {
  column: Column;
  players: Player[];
  climbers: Record<number, number>;
  x: number;
  baseY: number;
  maxHeight: number;
}

export function BoardColumn({ column, players, climbers, x, baseY, maxHeight }: Props) {
  const { number: colNum, height, claimed, claimedBy } = column;
  const claimantColor = claimed
    ? players.find((p) => p.id === claimedBy)?.color ?? 'red'
    : null;

  const cells: React.ReactNode[] = [];

  for (let pos = height; pos >= 1; pos--) {
    // pos = 1 is bottom, pos = height is top (summit)
    // We draw from top to bottom visually, so pos=height is at lowest y
    const offsetFromTop = maxHeight - pos - (maxHeight - height) / 2;
    const cellY = baseY + offsetFromTop * (CELL_SIZE + CELL_GAP);

    cells.push(
      <pixiGraphics
        key={`cell-${colNum}-${pos}`}
        draw={(g: Graphics) => {
          g.clear();
          if (claimed && claimantColor) {
            g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 6);
            g.fill({ color: CLAIMED_BG });
          } else {
            g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 6);
            g.fill({ color: 0x1e2a4a });
            g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 6);
            g.stroke({ color: 0x334477, width: 1 });
          }
        }}
        x={x}
        y={cellY}
      />
    );

    // Player committed markers on this cell
    const playersAtPos = players.filter(
      (p) => (column.committedPositions[p.id] ?? 0) === pos
    );
    playersAtPos.forEach((p, i) => {
      const markerX = x + (i - (playersAtPos.length - 1) / 2) * 10;
      cells.push(
        <PlayerMarker key={`marker-${colNum}-${p.id}`} x={markerX} y={cellY} color={p.color} />
      );
    });

    // Climber on this cell
    const climberPos = climbers[colNum];
    if (climberPos === pos) {
      const activePlayer = players.find(() =>
        Object.keys(climbers).includes(String(colNum))
      );
      if (activePlayer) {
        cells.push(
          <Climber key={`climber-${colNum}`} x={x} y={cellY} color={activePlayer.color} />
        );
      }
    }
  }

  // Column number label at bottom
  const labelY = baseY + maxHeight * (CELL_SIZE + CELL_GAP) + 8;

  return (
    <>
      {cells}
      <pixiText
        key={`label-${colNum}`}
        text={String(colNum)}
        style={{
          fontSize: 13,
          fill: claimed ? (claimantColor ? playerColorHex(claimantColor) : '#888') : '#888',
          fontWeight: 'bold',
          align: 'center',
        }}
        anchor={{ x: 0.5, y: 0 }}
        x={x}
        y={labelY}
      />
    </>
  );
}

function playerColorHex(color: string): string {
  const map: Record<string, string> = {
    red: '#E74C3C', blue: '#3498DB', green: '#2ECC71', yellow: '#F1C40F',
  };
  return map[color] ?? '#fff';
}
