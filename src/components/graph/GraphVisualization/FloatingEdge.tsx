import React from 'react';
import {
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  useInternalNode
} from '@xyflow/react';
import { getEdgeParams } from './utils/floatingEdgeUtils';

export interface CustomEdgeData {
  type?: string;
  curveType?: 'default' | 'smoothstep' | 'straight' | 'simplebezier';
  weight?: number;
  label?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    dasharray?: string;
    arrowColor?: string;
    labelBackgroundColor?: string;
    labelTextColor?: string;
  };
  [key: string]: unknown;
}

/**
 * 浮动连接组件
 * 不依赖连接点，直接连接到节点中心
 */
export const FloatingEdge = (props: EdgeProps) => {
  const { source, target, id, style, data, markerEnd } = props;

  const edgeData = data as CustomEdgeData;
  const curveType = edgeData?.curveType || 'default';
  const edgeType = edgeData?.type || 'related';

  const baseStrokeColor = edgeData?.style?.stroke || '#3b82f6';
  const baseLabelBgColor = edgeData?.style?.labelBackgroundColor || baseStrokeColor;
  const baseLabelTextColor = edgeData?.style?.labelTextColor || '#ffffff';
  const baseStrokeWidth = edgeData?.style?.strokeWidth || 2;

  const finalStyle = {
    'stroke': baseStrokeColor,
    'strokeWidth': baseStrokeWidth,
    'fill': 'none',
    'strokeDasharray': edgeData?.style?.dasharray || '',
    ...(typeof style === 'object' && style !== null ? style : {})
  };

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const pathParams = {
    'sourceX': sx,
    'sourceY': sy,
    'sourcePosition': sourcePos,
    'targetPosition': targetPos,
    'targetX': tx,
    'targetY': ty
  };

  let edgePath: string;
  if (curveType === 'straight') {
    [edgePath] = getStraightPath(pathParams);
  } else if (curveType === 'smoothstep') {
    [edgePath] = getSmoothStepPath(pathParams);
  } else if (curveType === 'simplebezier') {
    [edgePath] = getSimpleBezierPath(pathParams);
  } else {
    [edgePath] = getBezierPath(pathParams);
  }

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  const labelText = edgeData?.label || edgeType;

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        className="react-flow__edge-path"
        style={finalStyle}
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
            fill={baseLabelBgColor}
            stroke={baseStrokeColor}
            strokeWidth={1}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={baseLabelTextColor}
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

export default React.memo(FloatingEdge);
