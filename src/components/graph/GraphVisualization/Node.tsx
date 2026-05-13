import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CustomNodeData {
  'title'?: string;
  'category'?: string;
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

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
  'opacity': 0,
  'pointerEvents': 'none',
  'width': 1,
  'height': 1,
  'minWidth': 0,
  'minHeight': 0,
  'position': 'absolute',
  'border': 'none',
  'background': 'transparent'
};

export const Node = (props: NodeProps) => {
  const { id, data, selected } = props;

  const nodeData = data as CustomNodeData;
  const style = nodeData.style || {};
  const shape = nodeData.shape || 'circle';
  const isRectangle = shape === 'rectangle';

  const nodeWidth = isRectangle ? 180 : 120;
  const nodeHeight = 120;

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
            'width': isRectangle ? 200 : 140,
            'height': 140,
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
        <Handle
          type="source"
          id="source"
          position={Position.Right}
          style={HIDDEN_HANDLE_STYLE}
        />
        <Handle
          type="target"
          id="target"
          position={Position.Left}
          style={HIDDEN_HANDLE_STYLE}
        />
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
            title={nodeData.title || id || 'Node'}
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
              'borderRadius': 3,
              'pointerEvents': 'auto'
            }}
          >
            {nodeData.title || id || 'Node'}
          </div>
          {nodeData.category && (
            <div
              title={nodeData.category}
              style={{
                'color': textColor,
                'fontSize': 9,
                'opacity': 0.6,
                'textTransform': 'uppercase',
                'letterSpacing': 0.4,
                'marginTop': 3,
                'maxWidth': '85%',
                'overflow': 'hidden',
                'textOverflow': 'ellipsis',
                'whiteSpace': 'nowrap',
                'pointerEvents': 'auto'
              }}
            >
              {nodeData.category}
            </div>
          )}
          {nodeData.metadata?.content && (
            <div
              title={nodeData.metadata.content}
              style={{
                'color': textColor,
                'fontSize': 9,
                'opacity': 0.8,
                'lineHeight': 1.3,
                'maxWidth': '90%',
                'overflow': 'hidden',
                'marginTop': 3,
                'display': '-webkit-box',
                'WebkitLineClamp': 2,
                'WebkitBoxOrient': 'vertical',
                'textOverflow': 'ellipsis',
                'pointerEvents': 'auto'
              }}
            >
              {nodeData.metadata.content}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(Node);
