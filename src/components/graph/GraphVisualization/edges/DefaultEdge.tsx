/**
 * 默认边组件
 * 用于渲染React Flow图中的边
 */
import React from 'react';
import { EdgeProps } from 'reactflow';
import type { EnhancedGraphConnection } from '../types';
import { defaultConnectionStyleRegistry } from '../utils/ConnectionStyleRegistry';

/**
 * 生成贝塞尔曲线路径
 * @param params 路径生成参数
 * @returns SVG路径字符串
 */
interface BezierPathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  controlPointsCount?: number;
  connectionIndex?: number;
}

const generateBezierPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  controlPointsCount = 1,
  connectionIndex = 0
}: BezierPathParams) => {
  // 计算控制点的基础偏移量
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const baseOffset = Math.max(dx, dy) * 0.3;

  // 根据连接索引计算偏移量，避免同节点间多连接重叠
  const connectionOffset = connectionIndex * 15 * (1 + connectionIndex * 0.2);
  const offset = baseOffset + connectionOffset;

  let path = `M ${sourceX} ${sourceY}`;

  if (controlPointsCount === 1) {
    // 二次贝塞尔曲线
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
    const perpendicularAngle = angle + Math.PI / 2;

    // 根据连接索引调整控制点位置，避免重叠
    const cpX = (sourceX + targetX) / 2 + Math.cos(perpendicularAngle) * offset;
    const cpY = (sourceY + targetY) / 2 + Math.sin(perpendicularAngle) * offset;
    path += ` Q ${cpX} ${cpY} ${targetX} ${targetY}`;
  } else {
    // 三次贝塞尔曲线，使用连接索引调整控制点位置
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
    const perpendicularAngle = angle + Math.PI / 2;

    // 根据连接索引奇偶性确定偏移方向，避免重叠
    const offsetDirection = connectionIndex % 2 === 0 ? 1 : -1;
    const cpOffset = offset * offsetDirection;

    const cp1X = sourceX + (targetX - sourceX) * 0.33 + Math.cos(perpendicularAngle) * cpOffset;
    const cp1Y = sourceY + (targetY - sourceY) * 0.33 + Math.sin(perpendicularAngle) * cpOffset;
    const cp2X = sourceX + (targetX - sourceX) * 0.66 + Math.cos(perpendicularAngle) * cpOffset;
    const cp2Y = sourceY + (targetY - sourceY) * 0.66 + Math.sin(perpendicularAngle) * cpOffset;

    path += ` C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${targetX} ${targetY}`;
  }

  return path;
};

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
 * 使用贝塞尔曲线实现高质量连接线
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

  // 获取连接样式
  const connectionStyle = defaultConnectionStyleRegistry.getStyleOrDefault(connectionType, {
    // 使用更明显的默认颜色
    'stroke': '#3b82f6',
    'strokeWidth': 2,
    'strokeOpacity': 0.8,
    'arrowCount': 1
  });

  // 控制点数量
  const controlPointsCount = data?.curveControl?.controlPointsCount || 1;

  // 动态效果
  const dynamicEffect = data?.animation?.dynamicEffect;

  // 获取连接索引（来自GraphCanvasReactFlow.tsx的data对象）
  const connectionIndex = Number((data as EnhancedGraphConnection & { connectionIndex?: number }).connectionIndex || 0);

  // 生成贝塞尔曲线路径
  const path = generateBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlPointsCount,
    connectionIndex
  });

  // 基础边样式
  const baseEdgeStyle = {
    'stroke': selected ? '#FF5252' : connectionStyle.stroke,
    'strokeWidth': selected ? 3 : connectionStyle.strokeWidth,
    'strokeOpacity': connectionStyle.strokeOpacity,
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
    const arrowCount = connectionStyle.arrowCount || 1;
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

  // 渲染控制点
  const renderControlPoints = () => {
    if (!selected || !data?.curveControl?.controlPoints) {
      return null;
    }

    return data.curveControl.controlPoints.map((point, index) => (
      <circle
        key={index}
        cx={point.x}
        cy={point.y}
        r={6}
        fill={data.curveControl.locked ? '#94a3b8' : '#3b82f6'}
        stroke="white"
        strokeWidth={2}
        style={{
          'cursor': data.curveControl.locked ? 'not-allowed' : 'move',
          'pointerEvents': data.curveControl.locked ? 'none' : 'auto',
          'zIndex': 10
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
            fill={selected ? '#FF5252' : connectionStyle.stroke}
          />
        </marker>
      </defs>

      {/* 使用SVG path元素绘制贝塞尔曲线 */}
      <path
        d={path}
        style={edgeStyle}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={connectionStyle.arrowCount ? `url(#${getArrowMarkerId()})` : undefined}
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

      {/* 渲染控制点 */}
      {renderControlPoints()}

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
