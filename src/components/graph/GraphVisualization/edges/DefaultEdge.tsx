import React from 'react';
import { EdgeProps } from '@xyflow/react';
import type { GraphConnection } from '../GraphTypes';

const generateDynamicEffectStyle = (
  dynamicEffect: string | undefined,
  strokeWidth: number
) => {
  switch (dynamicEffect) {
    case 'flow':
      return {
        'strokeDasharray': `${strokeWidth * 5} ${strokeWidth * 2}`,
        'animation': 'flow 2s linear infinite'
      };
    case 'pulse':
      return {
        'animation': 'pulse 2s ease-in-out infinite'
      };
    case 'gradient':
      return {
        'stroke': 'url(#gradient)',
        'animation': 'gradientShift 3s linear infinite'
      };
    default:
      return {};
  }
};

export const DefaultEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected
}) => {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const connection = data?.connection as GraphConnection | undefined;
  const dynamicEffect = connection?.animation?.dynamicEffect;

  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  const defaultStroke = '#3b82f6';
  const defaultStrokeWidth = 2;
  const defaultStrokeOpacity = 0.8;

  const baseEdgeStyle = {
    'stroke': selected ? '#FF5252' : defaultStroke,
    'strokeWidth': selected ? 3 : defaultStrokeWidth,
    'strokeOpacity': defaultStrokeOpacity,
    ...(style || {})
  };

  const dynamicStyle = generateDynamicEffectStyle(dynamicEffect, baseEdgeStyle.strokeWidth as number);

  const edgeStyle = {
    ...baseEdgeStyle,
    ...dynamicStyle
  };

  const labelStyle = {
    'fill': selected ? '#FF5252' : '#666',
    'fontSize': 12,
    'pointerEvents': 'none' as const,
    'userSelect': 'none' as const
  };

  const renderArrowMarkers = () => (
    <svg style={{ 'position': 'absolute', 'width': 0, 'height': 0 }}>
      <defs>
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={defaultStroke} />
        </marker>
        <marker
          id="arrow-selected"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF5252" />
        </marker>
      </defs>
    </svg>
  );

  return (
    <>
      {renderArrowMarkers()}

      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="visibleStroke"
        style={{
          'cursor': 'pointer'
        }}
      />

      <path
        d={path}
        style={edgeStyle}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#arrow-${selected ? 'selected' : 'default'})`}
      />

      {connection?.label && (
        <text
          x={midX}
          y={midY}
          style={labelStyle}
          textAnchor="middle"
          dominantBaseline="middle"
          className="edge-label"
        >
          {connection.label}
        </text>
      )}

      {selected && (
        <circle
          cx={midX}
          cy={midY}
          r={6}
          fill="#FF5252"
          opacity={0.8}
          pointerEvents="auto"
        />
      )}
    </>
  );
};

export default DefaultEdge;
