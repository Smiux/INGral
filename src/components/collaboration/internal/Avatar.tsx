import { useMemo } from 'react';

interface AvatarProps {
  userId: string;
  size?: number;
  className?: string;
  color?: string;
}

function hashString (str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char;
  }
  return Math.abs(hash);
}

function generateHashSequence (input: string): number[] {
  const sequence: number[] = [];
  let hash = hashString(input);
  for (let i = 0; i < 15; i += 1) {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    sequence.push(hash % 100);
  }
  return sequence;
}

function generatePatternPath (sequence: number[], cellSize: number): string {
  const gridSize = 5;
  const centerCol = 2;
  const paths: string[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col <= centerCol; col += 1) {
      const seqIndex = row * 3 + col;
      const value = sequence[seqIndex] as number;
      const threshold = 40 + (value % 30);
      const shouldFill = value < threshold;

      if (shouldFill) {
        const x = col * cellSize;
        const y = row * cellSize;
        paths.push(`M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`);

        const mirrorCol = gridSize - 1 - col;
        if (mirrorCol !== col) {
          const mx = mirrorCol * cellSize;
          paths.push(`M${mx},${y}h${cellSize}v${cellSize}h-${cellSize}z`);
        }
      }
    }
  }

  return paths.join('');
}

function generateColor (sequence: number[]): string {
  const hue = ((sequence[0] as number) * 3.6 + (sequence[1] as number)) % 360;
  const saturation = 55 + ((sequence[2] as number) % 30);
  const lightness = 40 + ((sequence[3] as number) % 25);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function Avatar ({ userId, size = 40, className, color }: AvatarProps) {
  const { path, backgroundColor } = useMemo(() => {
    const sequence = generateHashSequence(userId);
    const cellSize = size / 5;
    return {
      'path': generatePatternPath(sequence, cellSize),
      'backgroundColor': color ?? generateColor(sequence)
    };
  }, [userId, color, size]);

  return (
    <div
      className={`relative rounded-full overflow-hidden ${className ?? ''}`}
      style={{ 'width': size, 'height': size, backgroundColor }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <path
          d={path}
          fill="rgba(255, 255, 255, 0.9)"
        />
      </svg>
    </div>
  );
}
