import {
  type ConnectionLineComponentProps,
  getBezierPath,
  Position
} from '@xyflow/react';
import { getNodeIntersectionToPoint } from './utils/floatingEdgeUtils';

export const FloatingConnectionLine = (props: ConnectionLineComponentProps) => {
  const { fromNode, toX, toY, fromPosition, toPosition } = props;

  if (!fromNode) {
    return null;
  }

  const intersectionPoint = getNodeIntersectionToPoint(fromNode, { 'x': toX, 'y': toY });

  const pathParams = {
    'sourceX': intersectionPoint.x,
    'sourceY': intersectionPoint.y,
    'sourcePosition': fromPosition || Position.Right,
    'targetPosition': toPosition || Position.Left,
    'targetX': toX,
    'targetY': toY
  };

  const [edgePath] = getBezierPath(pathParams);

  return (
    <g>
      <path
        d={edgePath}
        stroke="#3b82f6"
        strokeWidth={2}
        fill="none"
        strokeDasharray="5,5"
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke="#3b82f6"
        strokeWidth={2}
      />
    </g>
  );
};

export default FloatingConnectionLine;
