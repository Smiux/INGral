import React from 'react';
import {
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  useInternalNode
} from '@xyflow/react';
import { getEdgeParams } from './utils/edgeUtils';

export interface CustomEdgeData {
  'type'?: string;
  'curveType'?: 'default' | 'smoothstep' | 'straight' | 'simplebezier';
  'label'?: string;
  'style'?: {
    'stroke'?: string;
    'strokeWidth'?: number;
    'dasharray'?: string;
    'arrowColor'?: string;
    'labelBackgroundColor'?: string;
    'labelTextColor'?: string;
  };
  [key: string]: unknown;
}

const PATH_GENERATORS = {
  'straight': getStraightPath,
  'smoothstep': getSmoothStepPath,
  'simplebezier': getSimpleBezierPath,
  'default': getBezierPath
} as const;

export const Edge = (props: EdgeProps) => {
  const { source, target, id, style, data, markerEnd } = props;

  const edgeData = data as CustomEdgeData | undefined;
  const curveType = edgeData?.curveType || 'default';
  const labelText = edgeData?.label || edgeData?.type || '';

  const stroke = edgeData?.style?.stroke || '#3b82f6';
  const strokeWidth = edgeData?.style?.strokeWidth || 2;
  const labelBgColor = edgeData?.style?.labelBackgroundColor || stroke;
  const labelTextColor = edgeData?.style?.labelTextColor || '#ffffff';

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const getPath = PATH_GENERATORS[curveType] || getBezierPath;
  const [edgePath] = getPath({
    'sourceX': sx,
    'sourceY': sy,
    'sourcePosition': sourcePos,
    'targetPosition': targetPos,
    'targetX': tx,
    'targetY': ty
  });

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        className="react-flow__edge-path"
        style={{
          stroke,
          strokeWidth,
          'fill': 'none',
          'strokeDasharray': edgeData?.style?.dasharray || '',
          ...(typeof style === 'object' && style !== null ? style : {})
        }}
        markerEnd={markerEnd}
      />
      {labelText && (
        <g>
          <rect
            x={midX - 25}
            y={midY - 12}
            width={50}
            height={24}
            rx={4}
            ry={4}
            fill={labelBgColor}
            stroke={stroke}
            strokeWidth={1}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={labelTextColor}
            fontSize={10}
            fontWeight="bold"
          >
            {labelText}
          </text>
        </g>
      )}
    </g>
  );
};

export default React.memo(Edge);
