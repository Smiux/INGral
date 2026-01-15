import React, { useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals, useStore, type ReactFlowState } from '@xyflow/react';

// 自定义节点数据类型
export interface CustomNodeData {
  title?: string | undefined;
  category?: string | undefined;
  handleCount?: number | undefined;
  shape?: 'circle' | 'square' | 'rectangle' | undefined;
  style?: {
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    textColor?: string | undefined;
    titleBackgroundColor?: string | undefined;
    titleTextColor?: string | undefined;
    // 内层旋转 - 影响内容
    innerAngle?: number | undefined;
    // 外层旋转 - 影响连接点和连接
    outerAngle?: number | undefined;
    // 是否同步旋转内外层
    isSyncRotation?: boolean | undefined;
  } | undefined;
  metadata?: {
    content?: string | undefined;
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
  const nodeData = data as CustomNodeData;
  // 使用useUpdateNodeInternals通知React Flow节点内部状态变化
  const updateNodeInternals = useUpdateNodeInternals();

  // 获取选中的边，检查当前节点是否是任何选中边的源节点或目标节点
  // 只在选中状态变化时重新计算，节点移动时不需要重新计算
  const selectedEdges = useStore((state: ReactFlowState) => state.edges.filter((edge) => edge.selected), (prev, next) => {
    // 比较选中边的id数组是否相同
    const prevIds = prev.map(edge => edge.id).sort();
    const nextIds = next.map(edge => edge.id).sort();
    return prevIds.length === nextIds.length && prevIds.every((edgeId, index) => edgeId === nextIds[index]);
  });

  // 计算当前节点是否连接到选中边
  const isConnectedToSelectedEdge = useMemo(() => {
    return selectedEdges.some((edge) => edge.source === id || edge.target === id);
  }, [selectedEdges, id]);

  // 节点基本信息
  const nodeTitle = (nodeData.title || id || 'Node') as string;
  const nodeCategory = nodeData.category || '默认';
  const content = nodeData.metadata?.content || '';

  // 样式配置
  const style = nodeData.style || {};
  const styleFill = style.fill || '#fff';
  const baseStrokeColor = style.stroke || '#4ECDC4';
  const styleStrokeWidth = style.strokeWidth || 2;
  const textColor = style.textColor || '#666';
  const titleBackgroundColor = style.titleBackgroundColor || '#4ECDC4';
  const titleTextColor = style.titleTextColor || '#FFFFFF';
  const shape = nodeData.shape || 'circle';

  // 旋转配置
  // 是否同步旋转
  const isSyncRotation = style.isSyncRotation || false;
  // 内层旋转角度 - 影响内容
  const innerAngle = style.innerAngle || 0;
  // 外层旋转角度 - 影响连接点和连接
  // 如果同步旋转，外层角度等于内层角度
  const outerAngle = isSyncRotation ? innerAngle : (style.outerAngle || 0);

  // 当外层角度变化时，通知React Flow更新节点内部状态，这样连接会重新计算
  // 只有当outerAngle真正变化时才调用，避免不必要的更新
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, outerAngle]);

  // 连接点样式
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

  // 生成连接点 - 根据节点形状均匀分布，全部使用source类型
  const handles = useMemo(() => {
    // 获取连接点数量，允许为0
    const handleCount = nodeData.handleCount || 0;

    // 如果连接点数量为0，创建一个虚拟连接点
    // 这个虚拟连接点不会渲染，也不会触发鼠标事件
    // 但能满足React Flow的连接机制要求
    if (handleCount <= 0) {
      return [
        <Handle
          key={`${id}-virtual-handle`}
          id={`${id}-virtual-handle`}
          type="source"
          position={Position.Right}
          style={{
            'display': 'none',
            'pointerEvents': 'none',
            'width': 0,
            'height': 0
          }}
          isConnectable={false}
        />
      ];
    }

    // 根据节点形状设置尺寸
    let width: number;
    let height: number;
    switch (shape) {
      case 'rectangle':
        width = 140;
        height = 100;
        break;
      case 'square':
        width = 100;
        height = 100;
        break;
      case 'circle':
      default:
        width = 100;
        height = 100;
        break;
    }

    // 计算半宽和半高
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // 对于圆形节点，使用极坐标计算
    if (shape === 'circle') {
      // 将外层旋转角度转换为弧度（逆时针旋转）
      const outerAngleRad = (-outerAngle * Math.PI) / 180;

      const RADIUS = width / 2;
      const TWO_PI = 2 * Math.PI;
      const QUARTER_PI = Math.PI / 4;
      const THREE_QUARTER_PI = 3 * Math.PI / 4;
      const FIVE_QUARTER_PI = 5 * Math.PI / 4;
      const SEVEN_QUARTER_PI = 7 * Math.PI / 4;

      // 预计算角度增量
      const angleIncrement = TWO_PI / handleCount;

      // 生成handle元素
      return Array.from({ 'length': handleCount }, (_, i) => {
        const baseAngle = i * angleIncrement;
        const rotatedAngle = baseAngle + outerAngleRad;
        const handleId = `${id}-handle-${i}`;

        // 计算连接点的精确位置（考虑外层旋转）
        const x = Math.cos(rotatedAngle) * RADIUS;
        const y = Math.sin(rotatedAngle) * RADIUS;

        const normalizedAngle = rotatedAngle % TWO_PI;
        let position: Position;

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
            isConnectable={true}
          />
        );
      });
    }
    // 对于方形和矩形节点，将连接点均匀分布在四条边上

    // 将外层旋转角度转换为弧度（逆时针旋转）
    const outerAngleRad = (-outerAngle * Math.PI) / 180;

    // 计算每条边上的连接点数量
    // 四条边：上、右、下、左
    const sides = [
      { 'position': Position.Top, 'length': width, 'edge': 'top' },
      { 'position': Position.Right, 'length': height, 'edge': 'right' },
      { 'position': Position.Bottom, 'length': width, 'edge': 'bottom' },
      { 'position': Position.Left, 'length': height, 'edge': 'left' }
    ];

    // 计算每条边上应该分配的连接点数量
    // 优先均匀分配，剩余的连接点从第一条边开始依次添加
    const handlesPerSide = Math.floor(handleCount / 4);
    const remainingHandles = handleCount % 4;

    // 计算每条边的连接点数量
    const sideHandleCounts = sides.map((_, index) => {
      return handlesPerSide + (index < remainingHandles ? 1 : 0);
    });

    // 生成所有连接点
    const allHandles = [];
    let handleIndex = 0;

    // 遍历每条边，生成连接点
    for (let sideIndex = 0; sideIndex < sides.length; sideIndex += 1) {
      const side = sides[sideIndex];
      const count = sideHandleCounts[sideIndex];

      if (side && count !== undefined && count > 0) {
        // 计算每条边上连接点之间的间距
        // 确保连接点不会出现在顶点上，留出一定的边距
        const margin = 10;
        // 边距，避免连接点出现在顶点
        const availableLength = side.length - margin * 2;
        const spacing = availableLength / (count + 1);

        // 在当前边上生成连接点
        for (let i = 0; i < count; i += 1) {
          const currentHandleIndex = handleIndex;
          handleIndex += 1;
          const handleId = `${id}-handle-${currentHandleIndex}`;

          // 计算连接点在边上的位置（从边的一端开始，留出边距）
          const offset = margin + spacing * (i + 1);

          let x: number;
          let y: number;
          let position: Position;

          // 根据边的位置计算连接点的坐标
          switch (side.position) {
            case Position.Top:
              // 上边：x从左到右，y固定在上边
              x = -halfWidth + offset;
              y = -halfHeight;
              position = Position.Top;
              break;
            case Position.Right:
              // 右边：x固定在右边，y从上到下
              x = halfWidth;
              y = -halfHeight + offset;
              position = Position.Right;
              break;
            case Position.Bottom:
              // 下边：x从左到右，y固定在下边
              x = -halfWidth + offset;
              y = halfHeight;
              position = Position.Bottom;
              break;
            case Position.Left:
              // 左边：x固定在左边，y从上到下
              x = -halfWidth;
              y = -halfHeight + offset;
              position = Position.Left;
              break;
            default:
              x = 0;
              y = 0;
              position = Position.Right;
          }

          // 计算旋转后连接点的位置，确保它始终在边框上

          // 1. 首先计算未旋转时连接点的角度（相对于中心）
          const originalAngle = Math.atan2(y, x);

          // 2. 应用旋转角度
          const rotatedAngle = originalAngle + outerAngleRad;

          // 3. 计算旋转后的点到中心的距离，确保它在边框上
          // 对于矩形，距离中心的距离取决于角度
          const cosTheta = Math.cos(rotatedAngle);
          const sinTheta = Math.sin(rotatedAngle);

          // 4. 计算旋转后连接点在边框上的坐标
          // 计算矩形的“有效半径”，即从中心到边框的距离，根据角度
          const absCosTheta = Math.abs(cosTheta);
          const absSinTheta = Math.abs(sinTheta);

          // 计算在该角度下，矩形的半宽和半高的投影
          const rectRadius = 1 / Math.max(absCosTheta / halfWidth, absSinTheta / halfHeight);

          // 5. 计算最终的连接点坐标
          const rotatedX = rectRadius * cosTheta;
          const rotatedY = rectRadius * sinTheta;

          // 合并基础样式和位置样式
          const customHandleStyle = {
            ...handleStyle,
            'left': `calc(50% + ${rotatedX}px - 3px)`,
            'top': `calc(50% + ${rotatedY}px - 3px)`,
            'position': 'absolute' as const,
            'transform': 'none'
          };

          allHandles.push(
            <Handle
              key={handleId}
              id={handleId}
              type="source"
              position={position}
              style={customHandleStyle}
              isConnectable={true}
            />
          );
        }
      }
    }

    return allHandles;
  }, [id, nodeData.handleCount, handleStyle, outerAngle, shape]);

  // 节点样式 - 根据形状动态生成
  const nodeStyle = useMemo(() => {
    const baseStyle = {
      'backgroundColor': styleFill,
      'border': `${styleStrokeWidth}px solid ${baseStrokeColor}`,
      'display': 'flex',
      'justifyContent': 'center',
      'alignItems': 'center',
      'position': 'relative',
      'boxSizing': 'border-box',
      'cursor': 'grab',
      'overflow': 'visible'
    };

    switch (shape) {
      case 'square':
        return {
          ...baseStyle,
          'borderRadius': '8px',
          'width': 100,
          'height': 100
        } as React.CSSProperties;
      case 'rectangle':
        return {
          ...baseStyle,
          'borderRadius': '8px',
          'width': 140,
          'height': 100
        } as React.CSSProperties;
      case 'circle':
      default:
        return {
          ...baseStyle,
          'borderRadius': '50%',
          'width': 100,
          'height': 100
        } as React.CSSProperties;
    }
  }, [styleFill, baseStrokeColor, styleStrokeWidth, shape]);



  // 标题样式
  const titleStyle = useMemo(() => ({
    'color': titleTextColor,
    'fontSize': 12,
    'fontWeight': 'bold',
    'lineHeight': 1.2,
    'maxWidth': '85%',
    'overflow': 'hidden',
    'textOverflow': 'ellipsis',
    'whiteSpace': 'nowrap',
    'backgroundColor': titleBackgroundColor,
    'padding': '3px 6px',
    'borderRadius': '3px'
  } as React.CSSProperties), [titleBackgroundColor, titleTextColor]);

  // 类别样式
  const categoryStyle = useMemo(() => ({
    'color': textColor,
    'fontSize': 8,
    'opacity': 0.6,
    'textTransform': 'uppercase',
    'letterSpacing': 0.4,
    'marginTop': 2
  } as React.CSSProperties), [textColor]);

  // 内容文本样式
  const contentTextStyle = useMemo(() => ({
    'color': textColor,
    'fontSize': 9,
    'opacity': 0.8,
    'lineHeight': 1.1,
    'maxWidth': '80%',
    'overflow': 'hidden',
    'textOverflow': 'ellipsis',
    'whiteSpace': 'nowrap',
    'marginTop': 2
  } as React.CSSProperties), [textColor]);

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

  // 选中高亮样式 - 根据节点形状动态生成
  const selectedGlowStyle = useMemo(() => {
    // 基础高亮样式
    const baseGlowStyle = {
      'position': 'absolute' as const,
      'pointerEvents': 'none',
      'boxSizing': 'border-box' as const
    };

    // 根据节点形状计算高亮样式
    switch (shape) {
      case 'square':
        // 正方形高亮：120x120px，8px圆角，居中
        return {
          ...baseGlowStyle,
          'width': '120px',
          'height': '120px',
          'left': '-10px',
          'top': '-10px',
          'borderRadius': '8px'
        } as React.CSSProperties;
      case 'rectangle':
        // 矩形高亮：160x120px，8px圆角，居中
        return {
          ...baseGlowStyle,
          'width': '160px',
          'height': '120px',
          'left': '-10px',
          'top': '-10px',
          'borderRadius': '8px'
        } as React.CSSProperties;
      case 'circle':
      default:
        // 圆形高亮：120x120px，50%圆角，居中
        return {
          ...baseGlowStyle,
          'width': '120px',
          'height': '120px',
          'left': '-10px',
          'top': '-10px',
          'borderRadius': '50%'
        } as React.CSSProperties;
    }
  }, [shape]);

  return (
    <>
      {/* 选中光圈效果 - 节点选中或连接到选中边时显示 */}
      {(selected || isConnectedToSelectedEdge) && (
        <div
          className="selected-glow"
          style={selectedGlowStyle}
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
