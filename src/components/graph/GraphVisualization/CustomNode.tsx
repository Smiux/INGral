import React, { useMemo, useCallback } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals, useStore } from '@xyflow/react';

// 自定义节点数据类型
export interface CustomNodeData {
  title?: string;
  category?: string;
  handleCount?: number;
  shape?: 'circle' | 'square' | 'rectangle';
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    textColor?: string;
    titleBackgroundColor?: string;
    titleTextColor?: string;
    innerAngle?: number;
    outerAngle?: number;
    isSyncRotation?: boolean;
  };
  metadata?: {
    content?: string;
  };
  [key: string]: unknown;
}

/**
 * 自定义节点组件
 * 支持多种形状，可调整连接点数量和旋转角度
 */
export const CustomNode = (props: NodeProps) => {
  const { id, data, selected } = props;
  const updateNodeInternals = useUpdateNodeInternals();

  // 获取选中的边，检查当前节点是否是任何选中边的源节点或目标节点
  const isConnectedToSelectedEdge = useStore(
    useCallback((state) =>
      state.edges.some((edge) => edge.selected && (edge.source === id || edge.target === id)),
    [id]
    )
  );

  // 节点基本信息
  const nodeData = data as CustomNodeData;
  const nodeTitle = nodeData.title || id || 'Node';
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
  const isSyncRotation = style.isSyncRotation || false;
  const innerAngle = style.innerAngle || 0;
  const outerAngle = isSyncRotation ? innerAngle : (style.outerAngle || 0);

  // 缓存样式对象
  const nodeStyle = useMemo(() => ({
    'backgroundColor': styleFill,
    'border': `${styleStrokeWidth}px solid ${baseStrokeColor}`,
    'display': 'flex',
    'justifyContent': 'center',
    'alignItems': 'center',
    'position': 'relative' as const,
    'boxSizing': 'border-box' as const,
    'cursor': 'grab' as const,
    'overflow': 'visible' as const,
    'borderRadius': shape === 'circle' ? '50%' : '8px',
    'width': shape === 'rectangle' ? 140 : 100,
    'height': 100
  }), [styleFill, baseStrokeColor, styleStrokeWidth, shape]);

  // 标题样式
  const titleStyle = useMemo(() => ({
    'color': titleTextColor,
    'fontSize': 12,
    'fontWeight': 'bold',
    'lineHeight': 1.2,
    'maxWidth': '85%',
    'overflow': 'hidden' as const,
    'textOverflow': 'ellipsis' as const,
    'whiteSpace': 'nowrap' as const,
    'backgroundColor': titleBackgroundColor,
    'padding': '3px 6px',
    'borderRadius': '3px'
  }), [titleTextColor, titleBackgroundColor]);

  // 类别样式
  const categoryStyle = useMemo(() => ({
    'color': textColor,
    'fontSize': 8,
    'opacity': 0.6,
    'textTransform': 'uppercase' as const,
    'letterSpacing': 0.4,
    'marginTop': 2
  }), [textColor]);

  // 内容文本样式
  const contentTextStyle = useMemo(() => ({
    'color': textColor,
    'fontSize': 9,
    'opacity': 0.8,
    'lineHeight': 1.1,
    'maxWidth': '80%',
    'overflow': 'hidden' as const,
    'textOverflow': 'ellipsis' as const,
    'whiteSpace': 'nowrap' as const,
    'marginTop': 2
  }), [textColor]);

  // 内容样式 - 使用内层旋转角度（逆时针）
  const rotatedContentStyle = useMemo(() => ({
    'position': 'absolute' as const,
    'inset': 0,
    'display': 'flex' as const,
    'flexDirection': 'column' as const,
    'justifyContent': 'center' as const,
    'alignItems': 'center' as const,
    'textAlign': 'center' as const,
    'pointerEvents': 'none' as const,
    'transform': `rotate(${-innerAngle}deg)`,
    'transformOrigin': 'center center'
  }), [innerAngle]);

  // 选中高亮样式
  const selectedGlowStyle = useMemo(() => ({
    'position': 'absolute' as const,
    'pointerEvents': 'none' as const,
    'boxSizing': 'border-box' as const,
    'width': shape === 'rectangle' ? '160px' : '120px',
    'height': '120px',
    'left': '-10px',
    'top': '-10px',
    'borderRadius': shape === 'circle' ? '50%' : '8px'
  }), [shape]);

  // 生成连接点
  const handles = useMemo(() => {
    const handleCount = nodeData.handleCount || 0;

    // 如果连接点数量为0，创建一个虚拟连接点
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

    // 连接点基础样式
    const handleStyle = {
      'background': '#4ECDC4',
      'borderColor': '#26A69A',
      'width': 6,
      'height': 6,
      'borderRadius': '50%',
      'borderWidth': 1,
      'zIndex': 10,
      'cursor': 'pointer'
    } as React.CSSProperties;

    // 根据节点形状设置尺寸
    const width = shape === 'rectangle' ? 140 : 100;
    const height = 100;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const outerAngleRad = (-outerAngle * Math.PI) / 180;

    // 生成连接点
    if (shape === 'circle') {
      const RADIUS = width / 2;
      const TWO_PI = 2 * Math.PI;
      const angleIncrement = TWO_PI / handleCount;

      return Array.from({ 'length': handleCount }, (_, i) => {
        const baseAngle = i * angleIncrement;
        const rotatedAngle = baseAngle + outerAngleRad;
        const handleId = `${id}-handle-${i}`;

        // 计算连接点位置
        const x = Math.cos(rotatedAngle) * RADIUS;
        const y = Math.sin(rotatedAngle) * RADIUS;

        // 确定位置类型
        const normalizedAngle = rotatedAngle % TWO_PI;
        let position: Position;

        if (normalizedAngle < Math.PI / 4 || normalizedAngle >= 7 * Math.PI / 4) {
          position = Position.Right;
        } else if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) {
          position = Position.Bottom;
        } else if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) {
          position = Position.Left;
        } else {
          position = Position.Top;
        }

        // 连接点样式
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

    // 对于方形和矩形节点
    const sides = [
      { 'position': Position.Top, 'length': width },
      { 'position': Position.Right, 'length': height },
      { 'position': Position.Bottom, 'length': width },
      { 'position': Position.Left, 'length': height }
    ];

    // 计算每条边上的连接点数量
    const handlesPerSide = Math.floor(handleCount / 4);
    const remainingHandles = handleCount % 4;
    const sideHandleCounts = sides.map((_, index) =>
      handlesPerSide + (index < remainingHandles ? 1 : 0)
    );

    // 生成所有连接点
    const allHandles = [];
    let handleIndex = 0;

    for (let sideIndex = 0; sideIndex < sides.length; sideIndex += 1) {
      const side = sides[sideIndex];
      const count = sideHandleCounts[sideIndex];

      if (side && count && count > 0) {
        const margin = 10;
        const availableLength = side.length - margin * 2;
        const spacing = availableLength / (count + 1);

        for (let i = 0; i < count; i += 1) {
          const currentHandleIndex = handleIndex;
          handleIndex += 1;
          const handleId = `${id}-handle-${currentHandleIndex}`;
          const offset = margin + spacing * (i + 1);

          let x: number;
          let y: number;
          let position: Position;

          // 计算连接点坐标
          switch (side.position) {
            case Position.Top:
              x = -halfWidth + offset;
              y = -halfHeight;
              position = Position.Top;
              break;
            case Position.Right:
              x = halfWidth;
              y = -halfHeight + offset;
              position = Position.Right;
              break;
            case Position.Bottom:
              x = -halfWidth + offset;
              y = halfHeight;
              position = Position.Bottom;
              break;
            case Position.Left:
              x = -halfWidth;
              y = -halfHeight + offset;
              position = Position.Left;
              break;
            default:
              x = 0;
              y = 0;
              position = Position.Right;
          }

          // 计算旋转后连接点的位置
          const originalAngle = Math.atan2(y, x);
          const rotatedAngle = originalAngle + outerAngleRad;
          const cosTheta = Math.cos(rotatedAngle);
          const sinTheta = Math.sin(rotatedAngle);

          // 计算矩形的“有效半径”
          const absCosTheta = Math.abs(cosTheta);
          const absSinTheta = Math.abs(sinTheta);
          const rectRadius = 1 / Math.max(absCosTheta / halfWidth, absSinTheta / halfHeight);

          // 计算最终的连接点坐标
          const rotatedX = rectRadius * cosTheta;
          const rotatedY = rectRadius * sinTheta;

          // 连接点样式
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
  }, [id, nodeData.handleCount, shape, outerAngle]);

  // 更新节点内部状态
  React.useEffect(() => {
    updateNodeInternals(id as string);
  }, [id, updateNodeInternals, outerAngle]);

  return (
    <>
      {/* 选中光圈效果 */}
      {(selected || isConnectedToSelectedEdge) && (
        <div className="selected-glow" style={selectedGlowStyle} />
      )}

      {/* 节点内容 */}
      <div style={nodeStyle}>
        {/* 旋转内容 */}
        <div className="node-content" style={rotatedContentStyle}>
          <div style={titleStyle}>{nodeTitle}</div>

          {/* 内容渲染 */}
          {content && <div style={contentTextStyle}>{content}</div>}

          {/* 类别渲染 */}
          {nodeCategory && <div style={categoryStyle}>{nodeCategory}</div>}
        </div>

        {/* 连接点 */}
        {handles}
      </div>
    </>
  );
};

export default React.memo(CustomNode);
