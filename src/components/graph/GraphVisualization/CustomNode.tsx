import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

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
  };
  metadata?: {
    content?: string;
  };
  [key: string]: unknown;
}

interface HandleConfig {
  id: string;
  handleCount: number;
  shape: string;
  nodeWidth: number;
  nodeHeight: number;
}

function generateHandles (config: HandleConfig) {
  const { id, handleCount, shape, nodeWidth, nodeHeight } = config;
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

  if (shape === 'circle') {
    const RADIUS = nodeWidth / 2;
    const TWO_PI = 2 * Math.PI;
    const angleIncrement = TWO_PI / handleCount;

    return Array.from({ 'length': handleCount }, (_, i) => {
      const angle = i * angleIncrement;
      const handleId = `${id}-handle-${i}`;

      const x = Math.cos(angle) * RADIUS;
      const y = Math.sin(angle) * RADIUS;

      const normalizedAngle = angle % TWO_PI;
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

  const sides = [
    { 'position': Position.Top, 'length': nodeWidth },
    { 'position': Position.Right, 'length': nodeHeight },
    { 'position': Position.Bottom, 'length': nodeWidth },
    { 'position': Position.Left, 'length': nodeHeight }
  ];

  const handlesPerSide = Math.floor(handleCount / 4);
  const remainingHandles = handleCount % 4;
  const sideHandleCounts = sides.map((_, index) =>
    handlesPerSide + (index < remainingHandles ? 1 : 0)
  );

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

        switch (side.position) {
          case Position.Top:
            x = offset - nodeWidth / 2;
            y = -nodeHeight / 2;
            position = Position.Top;
            break;
          case Position.Right:
            x = nodeWidth / 2;
            y = offset - nodeHeight / 2;
            position = Position.Right;
            break;
          case Position.Bottom:
            x = offset - nodeWidth / 2;
            y = nodeHeight / 2;
            position = Position.Bottom;
            break;
          case Position.Left:
            x = -nodeWidth / 2;
            y = offset - nodeHeight / 2;
            position = Position.Left;
            break;
          default:
            x = 0;
            y = 0;
            position = Position.Right;
        }

        const customHandleStyle = {
          ...handleStyle,
          'left': `calc(50% + ${x}px - 3px)`,
          'top': `calc(50% + ${y}px - 3px)`,
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
}

export const CustomNode = (props: NodeProps) => {
  const { id, data, selected } = props;

  const nodeData = data as CustomNodeData;
  const nodeTitle = nodeData.title || id || 'Node';
  const nodeCategory = nodeData.category || '默认';
  const content = nodeData.metadata?.content || '';

  const style = nodeData.style || {};
  const styleFill = style.fill || '#fff';
  const baseStrokeColor = style.stroke || '#4ECDC4';
  const styleStrokeWidth = style.strokeWidth || 2;
  const textColor = style.textColor || '#666';
  const titleBackgroundColor = style.titleBackgroundColor || '#4ECDC4';
  const titleTextColor = style.titleTextColor || '#FFFFFF';
  const shape = nodeData.shape || 'circle';
  const handleCount = nodeData.handleCount || 0;
  const isRectangle = shape === 'rectangle';

  const nodeWidth = isRectangle ? 140 : 100;
  const nodeHeight = 100;

  const nodeStyle = {
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
    'width': nodeWidth,
    'height': nodeHeight
  };

  const titleStyle = {
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
  };

  const categoryStyle = {
    'color': textColor,
    'fontSize': 8,
    'opacity': 0.6,
    'textTransform': 'uppercase' as const,
    'letterSpacing': 0.4,
    'marginTop': 2
  };

  const contentTextStyle = {
    'color': textColor,
    'fontSize': 9,
    'opacity': 0.8,
    'lineHeight': 1.1,
    'maxWidth': '80%',
    'overflow': 'hidden' as const,
    'textOverflow': 'ellipsis' as const,
    'whiteSpace': 'nowrap' as const,
    'marginTop': 2
  };

  const contentStyle = {
    'position': 'absolute' as const,
    'inset': 0,
    'display': 'flex' as const,
    'flexDirection': 'column' as const,
    'justifyContent': 'center' as const,
    'alignItems': 'center' as const,
    'textAlign': 'center' as const,
    'pointerEvents': 'none' as const
  };

  const selectedGlowStyle = {
    'position': 'absolute' as const,
    'pointerEvents': 'none' as const,
    'boxSizing': 'border-box' as const,
    'width': isRectangle ? '160px' : '120px',
    'height': '120px',
    'left': '-10px',
    'top': '-10px',
    'borderRadius': shape === 'circle' ? '50%' : '8px'
  };

  const handles = handleCount <= 0 ? (
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
  ) : generateHandles({ id, handleCount, shape, nodeWidth, nodeHeight });

  return (
    <>
      {selected && <div className="selected-glow" style={selectedGlowStyle} />}
      <div style={nodeStyle}>
        <div className="node-content" style={contentStyle}>
          <div style={titleStyle}>{nodeTitle}</div>
          {content && <div style={contentTextStyle}>{content}</div>}
          {nodeCategory && <div style={categoryStyle}>{nodeCategory}</div>}
        </div>
        {handles}
      </div>
    </>
  );
};

export default React.memo(CustomNode);
