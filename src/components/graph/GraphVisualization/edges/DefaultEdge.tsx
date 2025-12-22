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
  // 使用非线性偏移，确保多个连接时仍能保持清晰分离
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
 * 使用贝塞尔曲线实现高质量连接线和动态效果
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
    'stroke': '#95A5A6',
    'strokeWidth': 2,
    'strokeOpacity': 0.8,
    'arrowCount': 1
  });

  // 控制点数量
  const controlPointsCount = data?.curveControl?.controlPointsCount || 1;

  // 动态效果
  const dynamicEffect = data?.animation?.dynamicEffect;

  // 控制点状态管理
  const [controlPoints, setControlPoints] = React.useState<Array<{ x: number; y: number; isLocked?: boolean }>>(
    data?.curveControl?.controlPoints || []
  );

  // 控制点交互状态
  const [hoveredControlPoint, setHoveredControlPoint] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);



  // 生成贝塞尔曲线路径
  const generatePathWithCustomControlPoints = () => {
    if (controlPoints.length === 0) {
      return generateBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        controlPointsCount,
        'connectionIndex': Number(data?.customData?.connectionIndex || 0)
      });
    }

    // 使用自定义控制点生成路径
    let path = `M ${sourceX} ${sourceY}`;

    if (controlPointsCount === 1) {
      // 二次贝塞尔曲线
      const cp = controlPoints[0];
      if (cp) {
        path += ` Q ${cp.x} ${cp.y} ${targetX} ${targetY}`;
      }
    } else {
      // 三次贝塞尔曲线
      const cp1 = controlPoints[0];
      const cp2 = controlPoints[1];
      if (cp1 && cp2) {
        path += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${targetX} ${targetY}`;
      }
    }

    return path;
  };

  const path = generatePathWithCustomControlPoints();

  // 控制点管理
  React.useEffect(() => {
    // 当控制点数量变化时，自动更新控制点数组
    if (controlPoints.length !== controlPointsCount) {
      const newControlPoints = [];
      const segmentCount = controlPointsCount + 1;
      const segmentLength = 1 / segmentCount;

      for (let i = 1; i <= controlPointsCount; i += 1) {
        // 计算每个控制点的默认位置
        const t = segmentLength * i;
        const defaultX = sourceX + (targetX - sourceX) * t;
        const defaultY = sourceY + (targetY - sourceY) * t + (Math.random() - 0.5) * 50;

        // 如果已有控制点，保留原有位置，否则使用默认位置
        const existingPoint = controlPoints[i - 1];
        newControlPoints.push(existingPoint || {
          'x': defaultX,
          'y': defaultY,
          'isLocked': false
        });
      }

      setControlPoints(newControlPoints);
    }
  }, [controlPointsCount, controlPoints, sourceX, sourceY, targetX, targetY]);

  // 鼠标事件处理
  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || draggingIndex === null || !containerRef.current) {
        return;
      }

      // 计算鼠标相对于容器的位置
      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 更新控制点位置
      setControlPoints(prev => {
        const newPoints = [...prev];
        if (newPoints[draggingIndex] && !newPoints[draggingIndex].isLocked) {
          newPoints[draggingIndex] = {
            ...newPoints[draggingIndex],
            x,
            y
          };
        }
        return newPoints;
      });

      event.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggingIndex(null);
      setHoveredControlPoint(null);
    };

    // 添加事件监听器
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggingIndex]);

  // 控制点拖动开始
  const handleDragStart = (index: number, event: React.MouseEvent) => {
    const controlPoint = controlPoints[index];
    if (controlPoint && !controlPoint.isLocked) {
      setIsDragging(true);
      setDraggingIndex(index);
      setHoveredControlPoint(index);
      event.stopPropagation();
      event.preventDefault();
    }
  };

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

  // 控制点样式
  const controlPointStyle = (index: number) => {
    const isHovered = hoveredControlPoint === index;
    const isLocked = controlPoints[index]?.isLocked || false;

    // 避免嵌套三元表达式
    let fillColor = '#3498DB';
    if (isLocked) {
      fillColor = '#95A5A6';
    } else if (selected) {
      fillColor = '#FF5252';
    }

    return {
      'fill': fillColor,
      'stroke': '#FFFFFF',
      'strokeWidth': 2,
      'transition': 'all 0.2s ease',
      'cursor': isLocked ? 'not-allowed' : 'grab',
      'transform': isHovered ? 'scale(1.5)' : 'scale(1)',
      'opacity': selected ? 1 : 0.6
    };
  };

  // 控制点点击事件处理
  const handleControlPointClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();

    // 切换控制点锁定状态
    setControlPoints(prev => {
      const newPoints = [...prev];
      if (newPoints[index]) {
        newPoints[index] = {
          'x': newPoints[index].x,
          'y': newPoints[index].y,
          'isLocked': !newPoints[index].isLocked
        };
      }
      return newPoints;
    });
  };

  return (
    <div ref={containerRef} style={{ 'position': 'absolute', 'top': 0, 'left': 0, 'width': '100%', 'height': '100%', 'pointerEvents': 'none' }}>
      {/* SVG容器 */}
      <svg width="100%" height="100%" style={{ 'pointerEvents': 'none' }}>
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

        {/* 使用SVG path元素绘制贝塞尔曲线 */}
        <path
          d={path}
          style={{ ...edgeStyle, 'pointerEvents': 'auto' }}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 控制点可视化 - 仅在选中状态下显示 */}
        {selected && controlPoints.map((point, index) => (
          <circle
            key={`control-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={6}
            style={controlPointStyle(index)}
            onMouseEnter={() => setHoveredControlPoint(index)}
            onMouseLeave={() => setHoveredControlPoint(null)}
            onClick={(event) => handleControlPointClick(index, event)}
            onMouseDown={(event) => handleDragStart(index, event)}
            cursor={controlPoints[index]?.isLocked ? 'not-allowed' : 'grab'}
            pointerEvents="auto"
          />
        ))}

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
            onClick={(event) => event.stopPropagation()}
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
    </div>
  );
};

export default DefaultEdge;
