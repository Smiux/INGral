import React, { useMemo } from 'react';
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
  type?: string | undefined;
  curveType?: 'default' | 'smoothstep' | 'straight' | 'simplebezier' | undefined;
  weight?: number | undefined;
  label?: string | undefined;
  style?: {
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    dasharray?: string | undefined;
    arrowColor?: string | undefined;
    labelBackgroundColor?: string | undefined;
    labelTextColor?: string | undefined;
  } | undefined;
  animation?: {
    dynamicEffect?: 'none' | 'flow' | 'arrow' | 'blink' | 'wave' | 'rotate' | 'color-change' | 'fade' | undefined;
    isAnimating?: boolean | undefined;
    pathAnimation?: boolean | undefined;
    pathAnimationProgress?: number | undefined;
  } | undefined;
  [key: string]: unknown;
}

/**
 * 浮动连接组件
 * 不依赖连接点，直接连接到节点中心
 */
export const FloatingEdge = (props: EdgeProps) => {
  const { source, target, id, style, data, markerEnd } = props;

  // 连接数据配置
  const edgeData = data as CustomEdgeData;
  const curveType = edgeData?.curveType || 'default';
  const isAnimating = edgeData?.animation?.isAnimating || false;
  // 当动画开启时，确保dynamicEffect有有效的值，默认使用'flow'
  const dynamicEffect = isAnimating ? (edgeData?.animation?.dynamicEffect || 'flow') : 'none';
  const edgeType = edgeData?.type || 'related';

  // 连接样式
  const memoizedEdgeStyles = useMemo(() => {
    const baseStrokeColor = edgeData?.style?.stroke || '#3b82f6';
    const baseLabelBgColor = edgeData?.style?.labelBackgroundColor || baseStrokeColor;
    const baseLabelTextColor = edgeData?.style?.labelTextColor || '#ffffff';
    const baseStrokeWidth = edgeData?.style?.strokeWidth || 2;

    // 基础样式
    const baseStyle: React.CSSProperties = {
      'stroke': baseStrokeColor,
      'strokeWidth': baseStrokeWidth,
      'fill': 'none',
      'strokeDasharray': edgeData?.style?.dasharray || ''
    };

    // 动态效果样式
    let animatedStyle = baseStyle;

    if (isAnimating) {
      // 根据dynamicEffect的值正确应用动画效果
      if (dynamicEffect === 'flow') {
        animatedStyle = {
          ...baseStyle,
          'strokeDasharray': '5,5',
          'animation': 'flowAnimation 6s linear infinite'
        };
      } else if (dynamicEffect === 'blink') {
        animatedStyle = {
          ...baseStyle,
          'animation': 'blinkAnimation 1s ease-in-out infinite'
        };
      } else if (dynamicEffect === 'wave') {
        animatedStyle = {
          ...baseStyle,
          'animation': 'waveAnimation 30s ease-in-out infinite'
        };
      } else if (dynamicEffect === 'rotate') {
        animatedStyle = {
          ...baseStyle,
          'transformOrigin': 'center center',
          'animation': 'rotateAnimation 10s linear infinite'
        };
      } else if (dynamicEffect === 'color-change') {
        animatedStyle = {
          ...baseStyle,
          'animation': 'colorChangeAnimation 6s linear infinite'
        };
      } else if (dynamicEffect === 'fade') {
        animatedStyle = {
          ...baseStyle,
          'animation': 'fadeAnimation 5s ease-in-out infinite'
        };
      } else if (dynamicEffect === 'arrow') {
        animatedStyle = {
          ...baseStyle,
          'strokeDasharray': '15, 15',
          'animation': 'flowAnimation 6s linear infinite'
        };
      }
    } else if (edgeData?.animation?.pathAnimation) {
      const progress = edgeData.animation.pathAnimationProgress || 0;
      if (progress === 0) {
        animatedStyle = baseStyle;
      } else {
        const dashLength = 100000;
        animatedStyle = {
          ...baseStyle,
          'strokeDasharray': `${dashLength}`,
          'strokeDashoffset': `${dashLength - (dashLength * progress)}`,
          'transition': 'stroke-dashoffset 0.5s ease-out'
        };
      }
    } else {
      // 当动画开关关闭且没有路径动画时，确保移除所有动画相关样式
      animatedStyle = {
        ...baseStyle,
        'strokeDasharray': edgeData?.style?.dasharray || '',
        'animation': 'none'
      };
    }

    // 合并外部样式
    const finalStyle = {
      ...animatedStyle,
      ...(typeof style === 'object' && style !== null ? style : {})
    };

    return {
      finalStyle,
      'labelBgColor': baseLabelBgColor,
      'labelStrokeColor': baseStrokeColor,
      baseLabelTextColor
    };
  }, [
    isAnimating,
    dynamicEffect,
    edgeData,
    style
  ]);

  // 获取内部节点引用
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  // 根据曲线类型计算路径
  let edgePath: string;
  let midX = 0;
  let midY = 0;

  if (sourceNode && targetNode) {
    // 获取边的参数
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

    const pathParams = {
      'sourceX': sx,
      'sourceY': sy,
      'sourcePosition': sourcePos,
      'targetPosition': targetPos,
      'targetX': tx,
      'targetY': ty
    };

    if (curveType === 'straight') {
      [edgePath] = getStraightPath(pathParams);
    } else if (curveType === 'smoothstep') {
      [edgePath] = getSmoothStepPath(pathParams);
    } else if (curveType === 'simplebezier') {
      [edgePath] = getSimpleBezierPath(pathParams);
    } else {
      [edgePath] = getBezierPath(pathParams);
    }

    // 计算标签位置
    midX = (sx + tx) / 2;
    midY = (sy + ty) / 2;
  } else {
    return null;
  }

  return (
    <g>
      {/* 连接线 */}
      <path
        id={id}
        d={edgePath}
        className="react-flow__edge-path"
        style={memoizedEdgeStyles.finalStyle}
        markerEnd={markerEnd}
      />
      {/* 箭头动画 - 使用SVG animateMotion实现 */}
      {isAnimating && dynamicEffect === 'arrow' && (
        <g>
          {/* 移动的箭头元素 */}
          <g>
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              rotate="auto"
            >
              {/* 引用路径 */}
              <mpath href={`#${id}`} />
            </animateMotion>
            {/* 箭头符号 - 大小根据连接线宽度变化，初始大小更小 */}
            <path
              d={`M 0,0 L ${8 * (typeof memoizedEdgeStyles.finalStyle.strokeWidth === 'number' ? memoizedEdgeStyles.finalStyle.strokeWidth / 2 : 1)},${4 * (typeof memoizedEdgeStyles.finalStyle.strokeWidth === 'number' ? memoizedEdgeStyles.finalStyle.strokeWidth / 2 : 1)} L 0,${8 * (typeof memoizedEdgeStyles.finalStyle.strokeWidth === 'number' ? memoizedEdgeStyles.finalStyle.strokeWidth / 2 : 1)} Z`}
              fill={edgeData?.style?.arrowColor || memoizedEdgeStyles.finalStyle.stroke}
              stroke={edgeData?.style?.arrowColor || memoizedEdgeStyles.finalStyle.stroke}
              strokeWidth="1"
              transform={`translate(-${4 * (typeof memoizedEdgeStyles.finalStyle.strokeWidth === 'number' ? memoizedEdgeStyles.finalStyle.strokeWidth / 2 : 1)}, -${4 * (typeof memoizedEdgeStyles.finalStyle.strokeWidth === 'number' ? memoizedEdgeStyles.finalStyle.strokeWidth / 2 : 1)})`}
            />
          </g>
        </g>
      )}
      {/* 标签 */}
      {(edgeData?.label || edgeType) && (
        <g>
          {/* 标签背景 */}
          <rect
            x={midX - 25}
            y={midY - 12}
            width={50}
            height={24}
            rx={4}
            ry={4}
            fill={memoizedEdgeStyles.labelBgColor}
            stroke={memoizedEdgeStyles.labelStrokeColor}
            strokeWidth={1}
          />
          {/* 标签文本 */}
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill={memoizedEdgeStyles.baseLabelTextColor}
            fontSize={10}
            fontWeight="bold"
          >
            {edgeData?.label || edgeType}
          </text>
        </g>
      )}
    </g>
  );
};

export default React.memo(FloatingEdge);
