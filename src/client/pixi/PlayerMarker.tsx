import { Graphics } from 'pixi.js';

const COLOR_HEX: Record<string, number> = {
  red: 0xE74C3C, blue: 0x3498DB, green: 0x2ECC71, yellow: 0xF1C40F,
};

interface Props {
  x: number;
  y: number;
  color: string;
  radius?: number;
}

export function PlayerMarker({ x, y, color, radius = 7 }: Props) {
  const hex = COLOR_HEX[color] ?? 0xffffff;

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        g.circle(0, 0, radius);
        g.fill({ color: hex, alpha: 1 });
        g.circle(0, 0, radius);
        g.stroke({ color: 0x000000, width: 1.5, alpha: 0.4 });
      }}
      x={x}
      y={y}
    />
  );
}
