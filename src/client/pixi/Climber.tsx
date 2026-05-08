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

export function Climber({ x, y, color, radius = 9 }: Props) {
  const hex = COLOR_HEX[color] ?? 0xffffff;

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        g.circle(0, 0, radius);
        g.fill({ color: hex, alpha: 0.9 });
        g.circle(0, 0, radius);
        g.stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      }}
      x={x}
      y={y}
    />
  );
}
