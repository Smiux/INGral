import React, { useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals, useStore, type ReactFlowState } from '@xyflow/react';

// 自定义节点数据类型
export interface CustomNodeData {
  title?: string | undefined;
  category?: string | undefined;
  handleCount?: number | undefined;
  handles?: {
    lockedHandles?: Record<string, boolean> | undefined;
    handleLabels?: Record<string, string> | undefined;
  } | undefined;
  style?: {
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    radius?: number | undefined;
    // 内层旋转 - 影响内容
    innerAngle?: number | undefined;
    // 外层旋转 - 影响连接点和连接
    outerAngle?: number | undefined;
    // 是否同步旋转内外层
    isSyncRotation?: boolean | undefined;
  } | undefined;
  metadata?: {
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    version?: number | undefined;
    content?: string | undefined;
    type?: string | undefined;
  } | undefined;
  [key: string]: unknown;
}

/**
 * 自定义节点组件
 * 圆形节点，支持4个可调整数量的source连接点
 * 样式与legacy DefaultNode保持一致
 */
export const CustomNode = (props: NodeProps) => {
  const { id, data, selected } = props;
  // 使用类型断言确保类型安全
  const nodeData = data as CustomNodeData;
  // 使用useUpdateNodeInternals通知React Flow节点内部状态变化
  const updateNodeInternals = useUpdateNodeInternals();

  // 获取选中的边，检查当前节点是否是任何选中边的源节点或目标节点
  const isConnectedToSelectedEdge = useStore((state: ReactFlowState) => {
    const selectedEdges = state.edges.filter((edge) => edge.selected);
    return selectedEdges.some((edge) => edge.source === id || edge.target === id);
  });

  // 节点基本信息
  const nodeTitle = (nodeData.title || id || 'Node') as string;
  const nodeCategory = nodeData.category || '默认';
  const content = nodeData.metadata?.content || '';

  // 样式配置 - 与legacy DefaultNode保持一致
  const style = nodeData.style || {};
  const styleFill = style.fill || '#fff';
  const baseStrokeColor = style.stroke || '#4ECDC4';
  const styleStrokeWidth = style.strokeWidth || 2;

  // 旋转配置
  // 是否同步旋转
  const isSyncRotation = style.isSyncRotation || false;
  // 内层旋转角度 - 影响内容
  const innerAngle = style.innerAngle || 0;
  // 外层旋转角度 - 影响连接点和连接
  // 如果同步旋转，外层角度等于内层角度
  const outerAngle = isSyncRotation ? innerAngle : (style.outerAngle || 0);

  // 当外层角度变化时，通知React Flow更新节点内部状态，这样连接会重新计算
  // 优化：只有当outerAngle真正变化时才调用，避免不必要的更新
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, outerAngle]);

  // 连接点样式 - 与legacy DefaultNode保持一致
  // 静态样式，使用useMemo缓存
  const handleStyle = useMemo(() => ({
    'background': '#4ECDC4',
    'borderColor': '#26A69A',
    'width': 6,
    'height': 6,
    'borderRadius': '50%',
    'borderWidth': 1,
    'zIndex': 10,
    'cursor': 'pointer'
  } as React.CSSProperties), []);

  // 生成连接点 - 均匀分布在圆形周围，全部使用source类型
  const handles = useMemo(() => {
    // 避免频繁创建新数组，使用缓存的空数组
    if (!nodeData.handleCount || nodeData.handleCount <= 0) {
      return [];
    }

    const calculatedHandleCount = nodeData.handleCount;
    const lockedHandles = (nodeData.handles?.lockedHandles || {}) as Record<string, boolean>;

    // 将外层旋转角度转换为弧度（逆时针旋转）
    const outerAngleRad = (-outerAngle * Math.PI) / 180;

    // 节点尺寸常量，定义在useMemo内部避免依赖项问题
    const NODE_SIZE = 100;
    const RADIUS = NODE_SIZE / 2;
    const TWO_PI = 2 * Math.PI;
    const QUARTER_PI = Math.PI / 4;
    const THREE_QUARTER_PI = 3 * Math.PI / 4;
    const FIVE_QUARTER_PI = 5 * Math.PI / 4;
    const SEVEN_QUARTER_PI = 7 * Math.PI / 4;

    // 预计算角度增量
    const angleIncrement = TWO_PI / calculatedHandleCount;

    // 生成handle元素
    // 使用数组.from代替push，减少内存分配
    return Array.from({ 'length': calculatedHandleCount }, (_, i) => {
      const baseAngle = i * angleIncrement;
      const rotatedAngle = baseAngle + outerAngleRad;
      const handleId = `${id}-handle-${i}`;
      const isLocked = lockedHandles[handleId] || false;

      // 计算连接点的精确位置（考虑外层旋转）
      const x = Math.cos(rotatedAngle) * RADIUS;
      const y = Math.sin(rotatedAngle) * RADIUS;

      // 计算position属性 - 这是React Flow用于连接计算的关键属性
      // 使用弧度直接判断，避免转换为角度，提高性能
      const normalizedAngle = rotatedAngle % TWO_PI;
      let position: Position;

      // 优化：使用更高效的角度判断（直接使用弧度比较）
      if (normalizedAngle < QUARTER_PI || normalizedAngle >= SEVEN_QUARTER_PI) {
        position = Position.Right;
      } else if (normalizedAngle >= QUARTER_PI && normalizedAngle < THREE_QUARTER_PI) {
        position = Position.Bottom;
      } else if (normalizedAngle >= THREE_QUARTER_PI && normalizedAngle < FIVE_QUARTER_PI) {
        position = Position.Left;
      } else {
        position = Position.Top;
      }

      // 合并基础样式和位置样式
      const customHandleStyle = {
        ...handleStyle,
        'left': `calc(50% + ${x}px - 3px)`,
        'top': `calc(50% + ${y}px - 3px)`,
        'position': 'absolute' as const,
        'transform': 'none'
      };

      return (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={position}
          style={customHandleStyle}
          isConnectable={!isLocked}
        />
      );
    });
  }, [id, nodeData.handleCount, nodeData.handles?.lockedHandles, handleStyle, outerAngle]);

  // 节点样式 - 圆形，与legacy DefaultNode保持一致
  // 移除选中时的样式变化
  // 优化：减少useMemo的依赖项，只在必要时重新计算
  const nodeStyle = useMemo(() => ({
    'backgroundColor': styleFill,
    'border': `${styleStrokeWidth}px solid ${baseStrokeColor}`,
    'borderRadius': '50%',
    'width': 100,
    'height': 100,
    'display': 'flex',
    'justifyContent': 'center',
    'alignItems': 'center',
    'position': 'relative',
    'boxSizing': 'border-box',
    'cursor': 'grab',
    'overflow': 'visible'
  } as React.CSSProperties), [styleFill, baseStrokeColor, styleStrokeWidth]);



  // 标题样式 - 与legacy DefaultNode保持一致
  const titleStyle = useMemo(() => ({
    'color': '#FFFFFF',
    'fontSize': 12,
    'fontWeight': 'bold',
    'lineHeight': 1.2,
    'maxWidth': '85%',
    'overflow': 'hidden',
    'textOverflow': 'ellipsis',
    'whiteSpace': 'nowrap',
    'backgroundColor': '#4ECDC4',
    'padding': '3px 6px',
    'borderRadius': '3px'
  } as React.CSSProperties), []);

  // 类别样式 - 与原来的节点类型样式相同
  const categoryStyle = useMemo(() => ({
    'color': '#999',
    'fontSize': 8,
    'opacity': 0.6,
    'textTransform': 'uppercase',
    'letterSpacing': 0.4,
    'marginTop': 2
  } as React.CSSProperties), []);

  // 内容文本样式 - 与legacy DefaultNode保持一致
  const contentTextStyle = useMemo(() => ({
    'color': '#666',
    'fontSize': 9,
    'opacity': 0.8,
    'lineHeight': 1.1,
    'maxWidth': '80%',
    'overflow': 'hidden',
    'textOverflow': 'ellipsis',
    'whiteSpace': 'nowrap',
    'marginTop': 2
  } as React.CSSProperties), []);

  // 节点容器不旋转，保持原始边界框，确保React Flow能正确计算连接
  // 只旋转节点内容和连接点位置

  // 内容样式 - 使用内层旋转角度（逆时针）
  const rotatedContentStyle = useMemo(() => ({
    'position': 'absolute',
    'inset': 0,
    'display': 'flex',
    'flexDirection': 'column',
    'justifyContent': 'center',
    'alignItems': 'center',
    'textAlign': 'center',
    'pointerEvents': 'none',
    'transform': `rotate(${-innerAngle}deg)`,
    'transformOrigin': 'center center'
  } as React.CSSProperties), [innerAngle]);

  return (
    <>
      {/* 选中光圈效果 - 节点选中或连接到选中边时显示 */}
      {(selected || isConnectedToSelectedEdge) && (
        <div
          className="selected-glow"
          style={{
            'width': '120px',
            'height': '120px',
            'left': '-10px',
            'top': '-10px',
            'position': 'absolute'
          }}
        />
      )}
      {/* 节点内容 */}
      <div style={nodeStyle}>
        {/* 节点内容 - 旋转 */}
        <div
          className="node-content"
          style={rotatedContentStyle}
        >
          <div style={titleStyle}>
            {nodeTitle}
          </div>

          {/* 只在有内容时渲染 */}
          {content && (
            <div style={contentTextStyle}>
              {content}
            </div>
          )}

          {/* 只在有类别时渲染 */}
          {nodeCategory && (
            <div style={categoryStyle}>
              {nodeCategory}
            </div>
          )}
        </div>

        {/* 连接点 - 根据旋转角度重新计算位置 */}
        {handles}
      </div>
    </>
  );
};

export default React.memo(CustomNode);
