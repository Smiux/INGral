/**
 * 默认边组件
 * 用于渲染React Flow图中的边
 */
import React from 'react';
import { EdgeProps } from 'reactflow';
import type { EnhancedGraphConnection } from '../types';

/**
 * 生成动态效果样式
 * @param dynamicEffect 动态效果类型
 * @param strokeWidth 线条宽度
 * @returns 动态效果样式对象
 */
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

/**
 * 默认边组件
 * 使用直线实现高质量连接线
 * 简化版本：移除内部状态和事件处理，仅保留纯渲染逻辑
 */
export const DefaultEdge: React.FC<EdgeProps<EnhancedGraphConnection>> = ({
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

  // 获取连接类型
  const connectionType = data?.type || 'default';

  // 动态效果
  const dynamicEffect = data?.animation?.dynamicEffect;

  // 默认使用直线路径
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  // 默认连接样式
  const defaultStroke = '#3b82f6';
  const defaultStrokeWidth = 2;
  const defaultStrokeOpacity = 0.8;
  const defaultArrowCount = 1;

  // 基础边样式
  const baseEdgeStyle = {
    'stroke': selected ? '#FF5252' : defaultStroke,
    'strokeWidth': selected ? 3 : defaultStrokeWidth,
    'strokeOpacity': defaultStrokeOpacity,
    ...style
  };

  // 添加动态效果
  const dynamicStyle = generateDynamicEffectStyle(dynamicEffect, baseEdgeStyle.strokeWidth as number);

  // 最终边样式
  const edgeStyle = {
    ...baseEdgeStyle,
    ...dynamicStyle
  };

  // 标签样式
  const labelStyle = {
    'fill': selected ? '#FF5252' : '#666',
    'fontSize': 12,
    'pointerEvents': 'none' as const,
    'userSelect': 'none' as const
  };

  // 生成箭头标记
  const getArrowMarkerId = () => `arrow-${selected ? 'selected' : connectionType}`;

  // 计算箭头上的均匀分布位置
  const calculateArrowPositions = () => {
    const arrowCount = defaultArrowCount;
    if (arrowCount <= 1) {
      // 只在中间显示一个箭头
      return [0.5];
    }

    // 均匀分布箭头位置
    const positions: number[] = [];
    const step = 1 / (arrowCount + 1);
    for (let i = 1; i <= arrowCount; i += 1) {
      positions.push(step * i);
    }
    return positions;
  };

  // 渲染箭头
  const renderArrows = () => {
    const arrowPositions = calculateArrowPositions();

    return arrowPositions.map((_, index) => (
      <use
        key={index}
        href={`#${getArrowMarkerId()}`}
        transform={`translate(${midX} ${midY}) rotate(0)`}
        style={{
          'transformOrigin': 'center center',
          'pointerEvents': 'none' as const
        }}
      />
    ));
  };

  return (
    <svg width="100%" height="100%" style={{ 'pointerEvents': 'auto' }}>
      {/* 渐变定义（用于渐变过渡效果） */}
      {dynamicEffect === 'gradient' && (
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={baseEdgeStyle.stroke as string} stopOpacity="0.3" />
            <stop offset="50%" stopColor={baseEdgeStyle.stroke as string} stopOpacity="1" />
            <stop offset="100%" stopColor={baseEdgeStyle.stroke as string} stopOpacity="0.3" />
          </linearGradient>
        </defs>
      )}

      {/* 箭头标记定义 */}
      <defs>
        <marker
          id={getArrowMarkerId()}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={selected ? '#FF5252' : defaultStroke}
          />
        </marker>
      </defs>

      {/* 绘制不可见但可点击的路径，扩大选择判定区域 */}
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
      {/* 使用SVG path元素绘制实际可见的直线 */}
      <path
        d={path}
        style={edgeStyle}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={defaultArrowCount ? `url(#${getArrowMarkerId()})` : undefined}
      />

      {/* 渲染均匀分布的箭头 */}
      {renderArrows()}

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
          fill="#FF5252"
          opacity={0.8}
          pointerEvents="auto"
        />
      )}

      {/* 动态效果CSS */}
      <style>{`
        @keyframes flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: ${(baseEdgeStyle.strokeWidth as number) * 7}; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </svg>
  );
};

export default DefaultEdge;
