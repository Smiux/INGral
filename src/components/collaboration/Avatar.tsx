import { useMemo } from 'react';

interface AvatarProps {
  userId: string;
  size?: number;
  className?: string;
}

function hashCode (str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return Math.abs(hash);
}

function hslToHex (h: number, sParam: number, lParam: number): string {
  const s = sParam / 100;
  const l = lParam / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateColor (seed: number): string {
  const hue = (seed * 137.508) % 360;
  const saturation = 65 + (seed % 20);
  const lightness = 45 + (seed % 15);
  return hslToHex(hue, saturation, lightness);
}

function hashCodeUserId (userId: string): number {
  return hashCode(userId);
}

function generatePattern (seed: number): boolean[][] {
  const pattern: boolean[][] = [];
  const centerCol = 2;
  const totalCols = 5;

  for (let row = 0; row < 5; row += 1) {
    const rowPattern: boolean[] = [];
    for (let col = 0; col < totalCols; col += 1) {
      const bitIndex = row * totalCols + (col <= centerCol ? col : totalCols - 1 - col);
      const bit = (seed >> bitIndex) & 1;
      rowPattern.push(bit === 1);
    }
    pattern.push(rowPattern);
  }

  return pattern;
}

export function Avatar ({ userId, size = 40, className = '' }: AvatarProps) {
  const { pattern, color } = useMemo(() => {
    const seed = hashCodeUserId(userId);
    return {
      'pattern': generatePattern(seed),
      'color': generateColor(seed)
    };
  }, [userId]);

  const cellSize = size / 5;

  return (
    <div
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ 'width': size, 'height': size, 'backgroundColor': color }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {pattern.map((row, rowIndex) =>
          row.map((filled, colIndex) => {
            if (!filled) {
              return null;
            }
            return (
              <rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex * cellSize}
                y={rowIndex * cellSize}
                width={cellSize}
                height={cellSize}
                fill="rgba(255, 255, 255, 0.9)"
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
