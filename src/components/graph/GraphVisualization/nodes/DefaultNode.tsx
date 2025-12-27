import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { GraphNode } from '../GraphTypes';

export const DefaultNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data.node as GraphNode;
  const title = nodeData?.title || nodeData?.id || 'Node';
  const content = nodeData?.metadata?.content || '';
  const nodeType = nodeData?.type || 'default';

  const getNodeStyle = () => {
    const style = nodeData?.style || {};
    const baseStyle: React.CSSProperties = {
      'width': '160px',
      'height': '120px',
      'borderRadius': '8px',
      'padding': '12px',
      'backgroundColor': style.fill || '#ffffff',
      'border': `2px solid ${style.stroke || '#3b82f6'}`,
      'boxShadow': selected ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
      'display': 'flex',
      'flexDirection': 'column',
      'alignItems': 'center',
      'justifyContent': 'center',
      'textAlign': 'center',
      'cursor': 'pointer',
      'transition': 'all 0.2s ease',
      'opacity': style.opacity || 1
    };

    if (nodeType === 'concept') {
      baseStyle.borderRadius = '50%';
      baseStyle.width = '120px';
      baseStyle.height = '120px';
    } else if (nodeType === 'article') {
      baseStyle.borderRadius = '4px';
    } else if (nodeType === 'resource') {
      baseStyle.borderRadius = '12px';
    } else if (nodeType === 'aggregate') {
      baseStyle.borderRadius = '16px';
    }

    return baseStyle;
  };

  const nodeStyle = getNodeStyle();

  const handleSize = 8;
  const handleStyle: React.CSSProperties = {
    'width': handleSize,
    'height': handleSize,
    'backgroundColor': '#4ECDC4',
    'border': '2px solid #26A69A',
    'borderRadius': '4px',
    'zIndex': 10
  };

  const handleCount = nodeData?.handles?.handleCount || 4;
  const basicPositions = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  const handlePositions = handleCount <= 4
    ? basicPositions.slice(0, handleCount)
    : basicPositions;

  const renderHandle = (position: Position) => {
    const baseHandleId = `${nodeData.id}-${position}`;
    const sourceHandleId = `${baseHandleId}-source`;
    const targetHandleId = `${baseHandleId}-target`;

    const isLocked = nodeData?.handles?.lockedHandles?.[baseHandleId] || false;
    const label = nodeData?.handles?.handleLabels?.[baseHandleId] || '';

    return (
      <>
        <Handle
          key={sourceHandleId}
          id={sourceHandleId}
          type="source"
          position={position}
          style={handleStyle}
          isConnectable={!isLocked}
        />
        <Handle
          key={targetHandleId}
          id={targetHandleId}
          type="target"
          position={position}
          style={handleStyle}
          isConnectable={!isLocked}
        />

        {label && (
          <div
            key={`${baseHandleId}-label`}
            style={{
              'position': 'absolute',
              'top': '100%',
              'left': '50%',
              'transform': 'translateX(-50%)',
              'marginTop': '4px',
              'fontSize': '8px',
              'color': '#666',
              'pointerEvents': 'none',
              'whiteSpace': 'nowrap'
            }}
          >
            {label}
          </div>
        )}
      </>
    );
  };

  return (
    <div style={nodeStyle}>
      {handlePositions.map((position) => {
        return renderHandle(position);
      })}

      <div
        className="node-content"
        style={{
          'flex': 1,
          'display': 'flex',
          'flexDirection': 'column',
          'alignItems': 'center',
          'justifyContent': 'center',
          'overflow': 'hidden'
        }}
      >
        <div
          className="node-title"
          style={{
            'fontSize': '14px',
            'fontWeight': 'bold',
            'color': nodeData?.style?.textFill || '#1f2937',
            'marginBottom': '4px',
            'wordBreak': 'break-word',
            'maxWidth': '100%'
          }}
        >
          {title}
        </div>
        {content && (
          <div
            className="node-description"
            style={{
              'fontSize': '10px',
              'color': '#6b7280',
              'overflow': 'hidden',
              'textOverflow': 'ellipsis',
              'display': '-webkit-box',
              'WebkitLineClamp': 2,
              'WebkitBoxOrient': 'vertical',
              'maxWidth': '100%'
            }}
          >
            {content}
          </div>
        )}
        {nodeData?.connections !== undefined && (
          <div
            className="node-connections"
            style={{
              'fontSize': '10px',
              'color': '#9ca3af',
              'marginTop': '4px'
            }}
          >
            {nodeData.connections} connections
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaultNode;
