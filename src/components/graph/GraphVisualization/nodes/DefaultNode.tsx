/**
 * 默认节点组件
 * 用于渲染React Flow图中的节点
 */
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { EnhancedNode } from '../types';
// 可以在需要时导入useGraph
// import { useGraph } from '../useGraph';

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
 */
export const DefaultNode: React.FC<NodeProps<DefaultNodeData>> = ({ data, selected }) => {
  // 使用默认主题或从数据中获取样式
  const shape = data.shape || 'circle';
  const radius = data.type === 'aggregate' ? 40 : 30;
  const isSelected = selected;
  // 可以在需要时从useGraph获取状态
  // const { state } = useGraph();
  
  // 根据节点类型获取颜色
  const getNodeColor = () => {
    const baseColor = isSelected ? '#FF6B6B' : '#4ECDC4';
    
    switch (data.type) {
      case 'concept':
        return isSelected ? '#FF6B6B' : '#8B5CF6'; // 紫色
      case 'article':
        return isSelected ? '#FF6B6B' : '#3B82F6'; // 蓝色
      case 'resource':
        return isSelected ? '#FF6B6B' : '#10B981'; // 绿色
      case 'aggregate':
        return isSelected ? '#FF6B6B' : '#F59E0B'; // 橙色
      default:
        return baseColor;
    }
  };
  
  // 根据节点类型获取边框颜色
  const getNodeStrokeColor = () => {
    const baseStroke = isSelected ? '#FF5252' : '#26A69A';
    
    switch (data.type) {
      case 'concept':
        return isSelected ? '#FF5252' : '#7C3AED'; // 深紫色
      case 'article':
        return isSelected ? '#FF5252' : '#2563EB'; // 深蓝色
      case 'resource':
        return isSelected ? '#FF5252' : '#059669'; // 深绿色
      case 'aggregate':
        return isSelected ? '#FF5252' : '#D97706'; // 深橙色
      default:
        return baseStroke;
    }
  };
  
  // 主题样式
  const theme = {
    node: {
      fill: getNodeColor(),
      stroke: getNodeStrokeColor(),
      strokeWidth: isSelected ? 3 : 2,
      textFill: '#FFFFFF',
      fontSize: 12,
      radius: radius
    }
  };
  
  // 根据形状渲染不同的节点样式
  const renderNodeShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <circle
            r={radius}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
      case 'rectangle':
        return (
          <rect
            width={radius * 2.5}
            height={radius * 1.5}
            x={-radius * 1.25}
            y={-radius * 0.75}
            rx={5}
            ry={5}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
      case 'triangle':
        return (
          <path
            d={`M 0 ${-radius} L ${radius} ${radius} L ${-radius} ${radius} Z`}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
      case 'diamond':
        return (
          <path
            d={`M 0 ${-radius} L ${radius} 0 L 0 ${radius} L ${-radius} 0 Z`}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
      case 'hexagon':
        return (
          <path
            d={`M 0 ${-radius} L ${radius * 0.866} ${-radius * 0.5} L ${radius * 0.866} ${radius * 0.5} L 0 ${radius} L ${-radius * 0.866} ${radius * 0.5} L ${-radius * 0.866} ${-radius * 0.5} Z`}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
      default:
        return (
          <circle
            r={radius}
            fill={theme.node.fill}
            stroke={theme.node.stroke}
            strokeWidth={theme.node.strokeWidth}
            className="transition-all duration-200"
          />
        );
    }
  };
  
  // 渲染节点图标
  const renderNodeIcon = () => {
    if (!data.type) return null;
    
    const iconSize = radius * 0.5;
    
    switch (data.type) {
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
  
  return (
    <div className="graph-node-container" style={{ width: radius * 2, height: radius * 2 }}>
      {/* 四个方向的连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle"
        style={{ background: theme.node.fill, borderColor: theme.node.stroke }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{ background: theme.node.fill, borderColor: theme.node.stroke }}
      />
      
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{ background: theme.node.fill, borderColor: theme.node.stroke }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="node-handle"
        style={{ background: theme.node.fill, borderColor: theme.node.stroke }}
      />
      
      {/* 节点形状 */}
      <svg className="node-svg" width={radius * 2} height={radius * 2} viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}>
        {renderNodeShape()}
      </svg>
      
      {/* 节点内容 */}
      <div className="node-content" style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        {/* 节点图标 */}
        <div style={{ 
          marginBottom: data.type && data.title ? 4 : 0,
          color: theme.node.textFill
        }}>
          {renderNodeIcon()}
        </div>
        
        {/* 节点文本 */}
        <div className="node-text" style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <div className="node-title" style={{ 
            color: theme.node.textFill, 
            fontSize: theme.node.fontSize,
            fontWeight: 'bold',
            lineHeight: 1.2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 4px'
          }}>
            {data.title || data.id}
          </div>
          {data.type !== 'aggregate' && (
            <div className="node-connections" style={{ 
              color: theme.node.textFill, 
              fontSize: theme.node.fontSize * 0.8,
              opacity: 0.8
            }}>
              {data.connections} 连接
            </div>
          )}
          {data.type && (
            <div className="node-type" style={{ 
              color: theme.node.textFill, 
              fontSize: theme.node.fontSize * 0.7,
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              {data.type}
            </div>
          )}
        </div>
      </div>
      
      {/* 选中状态样式 */}
      {isSelected && (
        <div 
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            border: `2px solid ${theme.node.stroke}`,
            borderRadius: shape === 'circle' ? '50%' : shape === 'rectangle' ? '10px' : '50%',
            pointerEvents: 'none',
            animation: 'pulse 1.5s infinite',
            boxShadow: `0 0 0 2px ${theme.node.stroke}80`
          }}
        />
      )}
      
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