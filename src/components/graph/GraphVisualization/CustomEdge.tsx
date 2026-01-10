import React, { useMemo } from 'react';
import {
  BezierEdge,
  SmoothStepEdge,
  StraightEdge,
  SimpleBezierEdge,
  type EdgeProps
} from '@xyflow/react';



import type { CustomEdgeData } from './FloatingEdge';

/**
 * 自定义连接组件
 * 支持多种内置连接类别、动态效果和箭头
 */
export const CustomEdge = (props: EdgeProps) => {
  const { id, data, selected } = props;
  // 使用类型断言确保类型安全
  const edgeData = data as CustomEdgeData;

  // 连接数据配置
  const curveType = edgeData?.curveType || 'default';
  const isAnimating = edgeData?.animation?.isAnimating || false;
  const dynamicEffect = edgeData?.animation?.dynamicEffect || 'none';
  const edgeType = edgeData?.type || 'related';

  // 连接样式 - 使用useMemo缓存计算结果
  const memoizedEdgeStyles = useMemo(() => {
    // 定义基础颜色和选中颜色，确保有明显的对比度
    const baseStrokeColor = '#3b82f6';
    const selectedStrokeColor = '#ef4444';
    const baseLabelBgColor = '#3b82f6';
    const selectedLabelBgColor = '#ef4444';
    const baseStrokeWidth = 2;
    const selectedStrokeWidth = 2.5;

    // 基础样式 - 直接设置stroke属性，不依赖CSS变量
    const baseStyle: React.CSSProperties = {
      'stroke': baseStrokeColor,
      'strokeWidth': baseStrokeWidth,
      'fill': 'none',
      'markerEnd': 'url(#arrowhead)'
    };

    // 动态效果样式
    let animatedStyle = baseStyle;

    if (isAnimating) {
      animatedStyle = {
        ...baseStyle,
        'strokeDasharray': dynamicEffect === 'flow' ? '5,5' : '10,10',
        'animation': dynamicEffect === 'flow' ? 'flowAnimation 2s linear infinite' : 'pulseAnimation 1.5s ease-in-out infinite'
      };
    } else if (edgeData?.animation?.pathAnimation) {
      const progress = edgeData.animation.pathAnimationProgress || 0;
      // 当进度为0时，不应用strokeDasharray和strokeDashoffset，确保路径完整显示
      if (progress === 0) {
        animatedStyle = {
          ...baseStyle
        };
      } else {
        // 使用足够大的值作为strokeDasharray，确保所有连接都能完整显示
        // 同时使用progress控制动画进度，实现流畅的绘制效果
        const dashLength = 100000;
        animatedStyle = {
          ...baseStyle,
          'strokeDasharray': `${dashLength}`,
          'strokeDashoffset': `${dashLength - (dashLength * progress)}`,
          'transition': 'stroke-dashoffset 0.5s ease-out'
        };
      }
    }

    // 选择样式 - 直接设置stroke属性为红色
    const computedStyle = selected ? {
      ...animatedStyle,
      'stroke': selectedStrokeColor,
      'strokeWidth': selectedStrokeWidth,
      'markerEnd': 'url(#arrowhead-selected)'
    } : animatedStyle;

    // 合并外部传递的style属性，特别是opacity
    // 外部style属性优先级更高，可以覆盖内部计算的样式
    const finalStyle = {
      ...computedStyle,
      ...(typeof props.style === 'object' && props.style !== null ? props.style : {})
    };

    // 根据选中状态确定标签背景色
    const labelBgColor = selected ? selectedLabelBgColor : baseLabelBgColor;
    const labelStrokeColor = selected ? selectedStrokeColor : baseStrokeColor;

    return {
      finalStyle,
      labelBgColor,
      labelStrokeColor
    };
  }, [isAnimating, dynamicEffect, edgeData?.animation?.pathAnimation, edgeData?.animation?.pathAnimationProgress, selected, props.style]);

  // 基础边属性 - 预定义静态样式
  const labelStyle = {
    'fill': '#ffffff',
    'fontSize': 10,
    'fontWeight': 'bold',
    'transition': 'all 0.2s ease'
  };

  const labelBgStyle = {
    'fill': memoizedEdgeStyles.labelBgColor,
    'stroke': memoizedEdgeStyles.labelStrokeColor,
    'strokeWidth': 1,
    'rx': 4,
    'ry': 4,
    'transition': 'fill 0.2s ease, stroke 0.2s ease'
  };

  // 基础边属性
  const baseEdgeProps = {
    ...props,
    'id': id as string,
    'style': memoizedEdgeStyles.finalStyle,
    'label': edgeType,
    labelStyle,
    'labelShowBg': true,
    labelBgStyle,
    'labelBgPadding': [6, 10] as [number, number],
    'labelBgBorderRadius': 4
  };

  // 直接根据曲线类型渲染不同的边，避免创建额外的函数
  // 使用switch语句代替嵌套三元表达式，符合ESLint规范
  // 默认使用BezierEdge
  let EdgeComponent: React.FC<EdgeProps> = BezierEdge;

  switch (curveType) {
    case 'straight':
      EdgeComponent = StraightEdge;
      break;
    case 'smoothstep':
      EdgeComponent = SmoothStepEdge;
      break;
    case 'simplebezier':
      EdgeComponent = SimpleBezierEdge;
      break;
    case 'default':
    default:
      EdgeComponent = BezierEdge;
      break;
  }

  return (
    <>
      <EdgeComponent {...baseEdgeProps} />
    </>
  );
};

export default React.memo(CustomEdge);
