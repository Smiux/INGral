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

  // 根据节点形状动态调整样式
  const getNodeStyle = () => {
    // 从data.style获取样式值，如果不存在则使用默认值
    const styleFill = data.style?.fill || '#fff';
    const styleStroke = data.style?.stroke || (selected ? '#FF5252' : '#4ECDC4');
    const styleStrokeWidth = data.style?.strokeWidth || 2;
    const styleRadius = data.style?.radius || 6;
    const baseStyle: React.CSSProperties = {
      'backgroundColor': styleFill,
      'display': 'flex',
      'justifyContent': 'center',
      'alignItems': 'center',
      'position': 'relative',
      'transition': 'all 0.2s ease',
      'transformOrigin': 'center center',
      'boxSizing': 'border-box'
    };

    switch (data.shape) {
      case 'circle':
        return {
          ...baseStyle,
          'width': 100,
          'height': 100,
          'borderRadius': '50%',
          'border': `${styleStrokeWidth}px solid ${styleStroke}`
        };
      case 'ellipse':
        return {
          ...baseStyle,
          'width': 150,
          'height': 100,
          'borderRadius': '50%',
          'border': `${styleStrokeWidth}px solid ${styleStroke}`
        };
      case 'triangle':
        return {
          ...baseStyle,
          'width': 100,
          'height': 100,
          'backgroundColor': styleFill,
          'clipPath': 'polygon(50% 0%, 100% 100%, 0% 100%)',
          'border': `${styleStrokeWidth}px solid ${styleStroke}`,
          'WebkitClipPath': 'polygon(50% 0%, 100% 100%, 0% 100%)'
        };
      case 'diamond':
        return {
          ...baseStyle,
          'width': 100,
          'height': 100,
          'transform': 'rotate(45deg)',
          'borderRadius': `${styleRadius}px`,
          'border': `${styleStrokeWidth}px solid ${styleStroke}`
        };
      case 'hexagon':
        return {
          ...baseStyle,
          'width': 100,
          'height': 100,
          'backgroundColor': styleFill,
          'clipPath': 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          'border': `${styleStrokeWidth}px solid ${styleStroke}`,
          'WebkitClipPath': 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        };
      case 'rect':
      case 'rectangle':
      default:
        return {
          ...baseStyle,
          'width': 150,
          'height': 100,
          'borderRadius': `${styleRadius}px`,
          'border': `${styleStrokeWidth}px solid ${styleStroke}`
        };
    }
  };

  // 节点样式
  const nodeStyle = getNodeStyle();

  return (
    <div style={nodeStyle}>
      {/* 动态生成连接点 */}
      {[...Array(data.handles?.handleCount || 4)].map((_, index) => {
        // 根据索引确定连接点位置
        const positions: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
        const position = positions[index % positions.length] as Position;

        // 优化连接点类型分配：确保每个方向都有source和target类型
        // 奇数索引使用source类型，偶数索引使用target类型
        const type = index % 2 === 0 ? 'target' : 'source';

        // 为每个连接点生成唯一的id，确保连接点识别正确
        const handleId = `handle-${index}-${position}-${type}`;

        return (
          <Handle
            key={handleId}
            id={handleId}
            type={type as 'target' | 'source'}
            position={position}
            className="node-handle"
            style={{
              'background': '#4ECDC4',
              'borderColor': '#26A69A',
              'width': 8,
              'height': 8,
              'borderRadius': '50%',
              'borderWidth': 2,
              'zIndex': 10,
              'transform': 'translateZ(0)',
              // 扩大选择判定区域
              'cursor': 'pointer'
            }}
          />
        );
      })}

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
