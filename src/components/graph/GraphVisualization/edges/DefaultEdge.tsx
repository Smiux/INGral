/**
 * 默认边组件
 * 用于渲染React Flow图中的边
 */
import React from 'react';
import { EdgeProps } from 'reactflow';

/**
 * 默认边组件
 */
export const DefaultEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected
}) => {
  // 计算边的中点位置，用于显示标签
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // 主题样式
  const theme = {
    'link': {
      'stroke': selected ? '#FF6B6B' : '#95A5A6',
      'strokeWidth': selected ? 3 : 2,
      'strokeOpacity': 0.8,
      'selectedStroke': '#FF5252',
      'selectedStrokeWidth': 3
    },
    'text': {
      'fill': '#666',
      'fontSize': 12,
      'selectedFill': '#FF5252'
    }
  };

  // 边的样式
  const edgeStyle = {
    'stroke': selected ? theme.link.selectedStroke : theme.link.stroke,
    'strokeWidth': selected ? theme.link.selectedStrokeWidth : theme.link.strokeWidth,
    'strokeOpacity': theme.link.strokeOpacity,
    ...style
  };

  // 标签样式
  const labelStyle = {
    'fill': selected ? theme.text.selectedFill : theme.text.fill,
    'fontSize': theme.text.fontSize,
    'pointerEvents': 'none' as const,
    'userSelect': 'none' as const
  };

  return (
    <>
      {/* 使用SVG原生元素绘制边 */}
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        style={edgeStyle}
      />

      {/* 边标签 */}
      {data?.label && (
        <text
          x={midX}
          y={midY}
          style={labelStyle}
          textAnchor="middle"
          dominantBaseline="middle"
          className="edge-label"
        >
          {data.label}
        </text>
      )}

      {/* 选中状态样式 */}
      {selected && (
        <circle
          cx={midX}
          cy={midY}
          r={6}
          fill={theme.link.selectedStroke}
          opacity={0.8}
        />
      )}
    </>
  );
};

export default DefaultEdge;
