/**
 * 默认节点组件
 * 用于渲染React Flow图中的节点
 */
import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import type { EnhancedNode } from '../types';

// 节点数据接口，扩展React Flow的NodeProps.data
interface DefaultNodeData extends EnhancedNode {
  title: string;
  connections: number;
  content?: string;
}

/**
 * 默认节点组件
 * 简化版本，确保没有TypeScript错误
 */
export const DefaultNode: React.FC<NodeProps<DefaultNodeData>> = ({ data, selected }) => {
  // 节点基本信息
  const title = data.title || data.id || 'Node';
  const content = data.content || '';
  const nodeType = data.type || 'default';

  // 节点样式
  const nodeStyle: React.CSSProperties = {
    'width': 150,
    'height': 100,
    'border': `2px solid ${selected ? '#FF5252' : '#4ECDC4'}`,
    'borderRadius': '6px',
    'backgroundColor': '#fff',
    'display': 'flex',
    'justifyContent': 'center',
    'alignItems': 'center',
    'position': 'relative',
    'transition': 'all 0.2s ease'
  };

  return (
    <div style={nodeStyle}>
      {/* 静态连接点 - 仅使用React Flow内置的Position枚举值，避免类型错误 */}
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{ 'background': '#4ECDC4', 'borderColor': '#26A69A' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{ 'background': '#4ECDC4', 'borderColor': '#26A69A' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        className="node-handle"
        style={{ 'background': '#4ECDC4', 'borderColor': '#26A69A' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        className="node-handle"
        style={{ 'background': '#4ECDC4', 'borderColor': '#26A69A' }}
      />

      {/* 节点内容 */}
      <div
        className="node-content"
        style={{
          'position': 'absolute',
          'inset': 0,
          'display': 'flex',
          'flexDirection': 'column',
          'justifyContent': 'center',
          'alignItems': 'center',
          'textAlign': 'center',
          'pointerEvents': 'none',
          'zIndex': 1
        }}
      >
        <div
          className="node-title"
          style={{
            'color': '#FFFFFF',
            'fontSize': 12,
            'fontWeight': 'bold',
            'lineHeight': 1.2,
            'maxWidth': '90%',
            'overflow': 'hidden',
            'textOverflow': 'ellipsis',
            'whiteSpace': 'nowrap',
            'backgroundColor': '#4ECDC4',
            'padding': '4px 8px',
            'borderRadius': '4px'
          }}
        >
          {title}
        </div>

        {content && (
          <div
            className="node-content-text"
            style={{
              'color': '#666',
              'fontSize': 10,
              'opacity': 0.9,
              'lineHeight': 1.2,
              'maxWidth': '80%',
              'overflow': 'hidden',
              'textOverflow': 'ellipsis',
              'whiteSpace': 'nowrap',
              'marginTop': 4
            }}
          >
            {content}
          </div>
        )}

        <div
          className="node-type"
          style={{
            'color': '#999',
            'fontSize': 9,
            'opacity': 0.7,
            'textTransform': 'uppercase',
            'letterSpacing': 0.5,
            'marginTop': 4
          }}
        >
          {nodeType}
        </div>
      </div>
    </div>
  );
};

export default DefaultNode;
