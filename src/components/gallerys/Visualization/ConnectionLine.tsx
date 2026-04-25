import { getBezierPath, type ConnectionLineComponentProps } from '@xyflow/react';

export const ConnectionLine = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition
}: ConnectionLineComponentProps) => {
  const [linePath] = getBezierPath({
    'sourceX': fromX,
    'sourceY': fromY,
    'sourcePosition': fromPosition,
    'targetX': toX,
    'targetY': toY,
    'targetPosition': toPosition
  });

  return (
    <g>
      <path
        d={linePath}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={2}
        strokeDasharray="5,5"
        className="animated"
      />
      <circle
        cx={toX}
        cy={toY}
        r={4}
        fill="#0ea5e9"
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
};

export default ConnectionLine;
