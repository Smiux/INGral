import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CustomNodeData {
  'title'?: string;
  'category'?: string;
  'handleCount'?: number;
  'shape'?: 'circle' | 'square' | 'rectangle';
  'style'?: {
    'fill'?: string;
    'stroke'?: string;
    'strokeWidth'?: number;
    'textColor'?: string;
    'titleBackgroundColor'?: string;
    'titleTextColor'?: string;
  };
  'metadata'?: {
    'content'?: string;
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

const HANDLE_STYLE: React.CSSProperties = {
  'background': '#4ECDC4',
  'borderColor': '#26A69A',
  'width': 6,
  'height': 6,
  'borderRadius': '50%',
  'borderWidth': 1,
  'zIndex': 10,
  'cursor': 'pointer',
  'position': 'absolute',
  'transform': 'none'
};

function generateHandles (config: HandleConfig) {
  const { id, handleCount, shape, nodeWidth, nodeHeight } = config;
  if (handleCount <= 0) {
    return (
      <Handle
        key={`${id}-virtual-handle`}
        id={`${id}-virtual-handle`}
        type="source"
        position={Position.Right}
        style={{ 'display': 'none', 'pointerEvents': 'none', 'width': 0, 'height': 0 }}
        isConnectable={false}
      />
    );
  }

  if (shape === 'circle') {
    const radius = nodeWidth / 2;
    const angleIncrement = (2 * Math.PI) / handleCount;

    return Array.from({ 'length': handleCount }, (_, i) => {
      const angle = i * angleIncrement;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const normalizedAngle = angle % (2 * Math.PI);

      let position: Position;
      if (normalizedAngle < Math.PI / 4 || normalizedAngle >= 7 * Math.PI / 4) {
        position = Position.Right;
      } else if (normalizedAngle < 3 * Math.PI / 4) {
        position = Position.Bottom;
      } else if (normalizedAngle < 5 * Math.PI / 4) {
        position = Position.Left;
      } else {
        position = Position.Top;
      }

      return (
        <Handle
          key={`${id}-handle-${i}`}
          id={`${id}-handle-${i}`}
          type="source"
          position={position}
          style={{
            ...HANDLE_STYLE,
            'left': `calc(50% + ${x}px - 3px)`,
            'top': `calc(50% + ${y}px - 3px)`
          }}
          isConnectable
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

  const handles: React.ReactElement[] = [];
  let handleIndex = 0;

  sides.forEach((side, sideIndex) => {
    const count = handlesPerSide + (sideIndex < remainingHandles ? 1 : 0);
    if (count <= 0) {
      return;
    }

    const margin = 10;
    const spacing = (side.length - margin * 2) / (count + 1);

    for (let i = 0; i < count; i += 1) {
      const offset = margin + spacing * (i + 1);
      let x = 0;
      let y = 0;

      switch (side.position) {
        case Position.Top:
          x = offset - nodeWidth / 2;
          y = -nodeHeight / 2;
          break;
        case Position.Right:
          x = nodeWidth / 2;
          y = offset - nodeHeight / 2;
          break;
        case Position.Bottom:
          x = offset - nodeWidth / 2;
          y = nodeHeight / 2;
          break;
        case Position.Left:
          x = -nodeWidth / 2;
          y = offset - nodeHeight / 2;
          break;
      }

      handles.push(
        <Handle
          key={`${id}-handle-${handleIndex}`}
          id={`${id}-handle-${handleIndex}`}
          type="source"
          position={side.position}
          style={{
            ...HANDLE_STYLE,
            'left': `calc(50% + ${x}px - 3px)`,
            'top': `calc(50% + ${y}px - 3px)`
          }}
          isConnectable
        />
      );
      handleIndex += 1;
    }
  });

  return handles;
}

export const Node = (props: NodeProps) => {
  const { id, data, selected } = props;

  const nodeData = data as CustomNodeData;
  const style = nodeData.style || {};
  const shape = nodeData.shape || 'circle';
  const isRectangle = shape === 'rectangle';

  const nodeWidth = isRectangle ? 140 : 100;
  const nodeHeight = 100;

  const stroke = style.stroke || '#4ECDC4';
  const fill = style.fill || '#fff';
  const strokeWidth = style.strokeWidth || 2;
  const titleBgColor = style.titleBackgroundColor || '#4ECDC4';
  const titleTextColor = style.titleTextColor || '#FFFFFF';
  const textColor = style.textColor || '#666';

  return (
    <>
      {selected && (
        <div
          className="selected-glow"
          style={{
            'position': 'absolute',
            'pointerEvents': 'none',
            'boxSizing': 'border-box',
            'width': isRectangle ? 160 : 120,
            'height': 120,
            'left': -10,
            'top': -10,
            'borderRadius': shape === 'circle' ? '50%' : '8px'
          }}
        />
      )}
      <div
        style={{
          'backgroundColor': fill,
          'border': `${strokeWidth}px solid ${stroke}`,
          'display': 'flex',
          'justifyContent': 'center',
          'alignItems': 'center',
          'position': 'relative',
          'boxSizing': 'border-box',
          'cursor': 'grab',
          'overflow': 'visible',
          'borderRadius': shape === 'circle' ? '50%' : '8px',
          'width': nodeWidth,
          'height': nodeHeight
        }}
      >
        <div
          style={{
            'position': 'absolute',
            'inset': 0,
            'display': 'flex',
            'flexDirection': 'column',
            'justifyContent': 'center',
            'alignItems': 'center',
            'textAlign': 'center',
            'pointerEvents': 'none'
          }}
        >
          <div
            style={{
              'color': titleTextColor,
              'fontSize': 12,
              'fontWeight': 'bold',
              'lineHeight': 1.2,
              'maxWidth': '85%',
              'overflow': 'hidden',
              'textOverflow': 'ellipsis',
              'whiteSpace': 'nowrap',
              'backgroundColor': titleBgColor,
              'padding': '3px 6px',
              'borderRadius': 3
            }}
          >
            {nodeData.title || id || 'Node'}
          </div>
          {nodeData.metadata?.content && (
            <div
              style={{
                'color': textColor,
                'fontSize': 9,
                'opacity': 0.8,
                'lineHeight': 1.1,
                'maxWidth': '80%',
                'overflow': 'hidden',
                'textOverflow': 'ellipsis',
                'whiteSpace': 'nowrap',
                'marginTop': 2
              }}
            >
              {nodeData.metadata.content}
            </div>
          )}
          {nodeData.category && (
            <div
              style={{
                'color': textColor,
                'fontSize': 8,
                'opacity': 0.6,
                'textTransform': 'uppercase',
                'letterSpacing': 0.4,
                'marginTop': 2
              }}
            >
              {nodeData.category}
            </div>
          )}
        </div>
        {generateHandles({ id, 'handleCount': nodeData.handleCount || 0, shape, nodeWidth, nodeHeight })}
      </div>
    </>
  );
};

export default React.memo(Node);
