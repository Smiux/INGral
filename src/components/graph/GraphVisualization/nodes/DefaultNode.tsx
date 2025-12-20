/**
 * 默认节点组件
 * 用于渲染React Flow图中的节点
 */
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { EnhancedNode } from '../types';
import { defaultStyleRegistry } from '../utils/NodeStyleRegistry';
import { defaultShapeRegistry } from '../utils/NodeShapeRegistry';

// 节点数据接口，扩展React Flow的NodeProps.data
interface DefaultNodeData extends EnhancedNode {
  title: string;
  connections: number;
  content?: string;
  type?: string;
  shape?: string;
}

/**
 * 默认节点组件
 * 使用注册表系统实现高度可扩展的节点渲染
 */
export const DefaultNode: React.FC<NodeProps<DefaultNodeData>> = ({ data, selected }) => {
  // 获取节点类型和形状
  const nodeType = data.type || 'default';
  const shape = data.shape || 'rect';
  const radius = data.type === 'aggregate' ? 40 : 30;

  // 获取基础样式
  const baseStyle = defaultStyleRegistry.getStyleOrDefault(nodeType, {
    'fill': '#4ECDC4',
    'stroke': '#26A69A',
    'strokeWidth': 2,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 获取节点样式（如果选中则使用选中样式，否则使用基础样式）
  const style = selected
    ? defaultStyleRegistry.getSelectedStyle(nodeType, baseStyle)
    : baseStyle;

  // 获取形状配置
  const shapeConfig = defaultShapeRegistry.getShape(shape) || defaultShapeRegistry.getShape('rect')!;

  // 渲染节点图标
  const renderNodeIcon = () => {
    const iconSize = radius * 0.5;

    switch (nodeType) {
      case 'concept':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'article':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        );
      case 'resource':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case 'aggregate':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
          </svg>
        );
      default:
        return null;
    }
  };

  // 渲染选中状态边框
  const renderSelectedBorder = () => {
    if (!selected) {
      return null;
    }

    const borderRadius = radius + 4;

    return (
      <svg
        className="node-selected-border"
        width={radius * 2 + 16}
        height={radius * 2 + 16}
        viewBox={`-${radius + 8} -${radius + 8} ${radius * 2 + 16} ${radius * 2 + 16}`}
        style={{
          'position': 'absolute',
          'top': 0,
          'left': 0,
          'pointerEvents': 'none',
          'animation': 'pulse 1.5s infinite',
          'zIndex': 2
        }}
      >
        {/* 根据形状渲染边框 */}
        {(() => {
          switch (shape) {
            case 'circle':
            case 'ellipse':
              return (
                <circle
                  r={borderRadius}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
            case 'rect':
            case 'rectangle':
              return (
                <rect
                  width={borderRadius * 2.5}
                  height={borderRadius * 1.5}
                  x={-borderRadius * 1.25}
                  y={-borderRadius * 0.75}
                  rx={7}
                  ry={7}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
            case 'triangle':
              return (
                <path
                  d={`M 0 ${-borderRadius} L ${borderRadius} ${borderRadius} L ${-borderRadius} ${borderRadius} Z`}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
            case 'diamond':
              return (
                <path
                  d={`M 0 ${-borderRadius} L ${borderRadius} 0 L 0 ${borderRadius} L ${-borderRadius} 0 Z`}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
            case 'hexagon':
              return (
                <path
                  d={`M 0 ${-borderRadius} L ${borderRadius * 0.866} ${-borderRadius * 0.5} L ${borderRadius * 0.866} ${borderRadius * 0.5} L 0 ${borderRadius} L ${-borderRadius * 0.866} ${borderRadius * 0.5} L ${-borderRadius * 0.866} ${-borderRadius * 0.5} Z`}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
            default:
              return (
                <circle
                  r={borderRadius}
                  fill="transparent"
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              );
          }
        })()}
      </svg>
    );
  };

  return (
    <div className="graph-node-container" style={{ 'width': radius * 2, 'height': radius * 2 }}>
      {/* 四个方向的连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle"
        style={{
          'background': style.fill,
          'borderColor': style.stroke,
          'transition': 'all 0.2s ease'
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{
          'background': style.fill,
          'borderColor': style.stroke,
          'transition': 'all 0.2s ease'
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{
          'background': style.fill,
          'borderColor': style.stroke,
          'transition': 'all 0.2s ease'
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="node-handle"
        style={{
          'background': style.fill,
          'borderColor': style.stroke,
          'transition': 'all 0.2s ease'
        }}
      />

      {/* 节点形状 - 使用注册表渲染 */}
      <svg className="node-svg" width={radius * 2} height={radius * 2} viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}>
        {shapeConfig.render({ style, radius })}
      </svg>

      {/* 节点内容 */}
      <div className="node-content" style={{
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'right': 0,
        'bottom': 0,
        'display': 'flex',
        'flexDirection': 'column',
        'justifyContent': 'center',
        'alignItems': 'center',
        'textAlign': 'center',
        'pointerEvents': 'none',
        'zIndex': 1
      }}>
        {/* 节点图标 */}
        <div style={{
          'marginBottom': data.type && data.title ? 4 : 0,
          'color': style.textFill
        }}>
          {renderNodeIcon()}
        </div>

        {/* 节点文本 */}
        <div className="node-text" style={{
          'display': 'flex',
          'flexDirection': 'column',
          'alignItems': 'center',
          'gap': 2
        }}>
          <div className="node-title" style={{
            'color': style.textFill,
            'fontSize': style.fontSize,
            'fontWeight': 'bold',
            'lineHeight': 1.2,
            'maxWidth': '100%',
            'overflow': 'hidden',
            'textOverflow': 'ellipsis',
            'whiteSpace': 'nowrap',
            'padding': '0 4px'
          }}>
            {data.title || data.id}
          </div>
          {data.content && (
            <div className="node-content-text" style={{
              'color': style.textFill,
              'fontSize': style.fontSize * 0.8,
              'opacity': 0.9,
              'lineHeight': 1.2,
              'maxWidth': '90%',
              'overflow': 'hidden',
              'textOverflow': 'ellipsis',
              'whiteSpace': 'nowrap',
              'padding': '0 4px'
            }}>
              {data.content}
            </div>
          )}
          {data.type !== 'aggregate' && (
            <div className="node-connections" style={{
              'color': style.textFill,
              'fontSize': style.fontSize * 0.8,
              'opacity': 0.8
            }}>
              {data.connections} 连接
            </div>
          )}
          {data.type && (
            <div className="node-type" style={{
              'color': style.textFill,
              'fontSize': style.fontSize * 0.7,
              'opacity': 0.7,
              'textTransform': 'uppercase',
              'letterSpacing': 0.5
            }}>
              {data.type}
            </div>
          )}
        </div>
      </div>

      {/* 选中状态边框 */}
      {renderSelectedBorder()}

      {/* 全局CSS动画定义 */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .node-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: all 0.2s ease;
        }
        
        .node-handle {
          transition: all 0.2s ease;
        }
        
        .node-handle:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default DefaultNode;
