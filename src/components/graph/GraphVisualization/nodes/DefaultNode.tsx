/**
 * 默认节点组件
 * 用于渲染React Flow图中的节点
 */
import React from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import type { GraphNode } from '../GraphTypes';

/**
 * 默认节点组件
 * 恢复了原有的样式和功能，支持多种节点形状
 */
export const DefaultNode: React.FC<NodeProps> = ({ data, selected }) => {
  // 从data中获取GraphNode数据
  const nodeData = data.node as GraphNode;

  // 节点基本信息
  const title = nodeData?.title || nodeData?.id || 'Node';
  const content = nodeData?.metadata?.content || '';
  const nodeType = nodeData?.type || 'default';
  const shape = nodeData?.shape || 'circle';

  // 从nodeData.style获取样式值，如果不存在则使用默认值
  const style = nodeData?.style || {};
  const styleFill = style.fill || '#fff';
  const styleStroke = style.stroke || (selected ? '#FF5252' : '#4ECDC4');
  const styleStrokeWidth = style.strokeWidth || 2;
  const styleRadius = style.radius || 6;

  // 根据节点形状动态调整样式
  const getNodeStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      'backgroundColor': 'transparent',
      'display': 'flex',
      'justifyContent': 'center',
      'alignItems': 'center',
      'position': 'relative',
      'transition': 'all 0.2s ease',
      'transformOrigin': 'center center',
      'boxSizing': 'border-box',
      // 确保连接点定位正确
      'transform': 'none'
    };

    switch (shape) {
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
      case 'diamond':
        return {
          ...baseStyle,
          'width': 100,
          'height': 100,
          'transform': 'rotate(45deg)',
          'borderRadius': `${styleRadius}px`,
          'border': `${styleStrokeWidth}px solid ${styleStroke}`
        };
      case 'rect':
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

  // 获取clip-path样式的辅助函数
  const getClipPath = () => {
    return 'none';
  };

  // 连接点样式
  const handleStyle: React.CSSProperties = {
    'background': '#4ECDC4',
    'borderColor': '#26A69A',
    'width': 8,
    'height': 8,
    'borderRadius': '50%',
    'borderWidth': 2,
    'zIndex': 10,
    'transform': 'translateZ(0)',
    'cursor': 'pointer'
  };

  // 获取节点样式，确保连接点位置正确
  const getAdjustedNodeStyle = () => {
    const baseStyle = getNodeStyle();

    // 根据节点形状调整样式，确保连接点位置正确
    switch (shape) {
      case 'diamond':
        return {
          ...baseStyle,
          // 确保菱形的连接点位于外框上
          'transform': 'rotate(45deg)',
          // 调整padding，确保连接点位置正确
          'padding': 0
        };

      case 'triangle':
      case 'hexagon':
        return {
          ...baseStyle,
          // 确保多边形的连接点位于外框上
          'padding': 0
        };

      case 'circle':
      case 'ellipse':
        return {
          ...baseStyle,
          // 确保圆形和椭圆形的连接点位于外框上
          'padding': 0
        };

      case 'rect':
      default:
        return {
          ...baseStyle,
          // 确保矩形的连接点位于外框上
          'padding': 0
        };
    }
  };

  // 生成连接点位置 - 根据handleCount和节点形状动态生成
  const generateHandles = () => {
    // 从节点数据获取handleCount，如果没有则默认为4
    const handleCount = nodeData?.handles?.handleCount || 4;

    // 生成连接点，显式声明类型
    const handles: React.ReactNode[] = [];

    // 计算连接点位置的辅助函数
    const getHandlePosition = (index: number, total: number) => {
      // 基础角度计算
      const angle = (index / total) * 2 * Math.PI;

      // 根据不同形状计算连接点位置
      switch (shape) {
        case 'circle': {
          // 圆形：直接使用极坐标
          return {
            'left': `${50 + Math.cos(angle) * 50}%`,
            'top': `${50 + Math.sin(angle) * 50}%`,
            'transform': 'translate(-50%, -50%)'
          };
        }

        case 'ellipse': {
          // 椭圆形：调整x和y方向的缩放
          // 椭圆形宽度的一半（150px）
          const xRadius = 75;
          // 椭圆形高度的一半（100px）
          const yRadius = 50;
          return {
            'left': `${50 + Math.cos(angle) * (xRadius / 1.5)}%`,
            'top': `${50 + Math.sin(angle) * (yRadius / 1)}%`,
            'transform': 'translate(-50%, -50%)'
          };
        }

        case 'rect': {
          // 矩形：将连接点均匀分布在四条边上
          const edgeIndex = Math.floor((index / total) * 4);
          const edgePosition = ((index / total) * 4) % 1;

          switch (edgeIndex) {
            case 0:
              // 上边
              return {
                'left': `${edgePosition * 100}%`,
                'top': '0%',
                'transform': 'translate(-50%, -50%)'
              };
            case 1:
              // 右边
              return {
                'left': '100%',
                'top': `${edgePosition * 100}%`,
                'transform': 'translate(-50%, -50%)'
              };
            case 2:
              // 下边
              return {
                'left': `${(1 - edgePosition) * 100}%`,
                'top': '100%',
                'transform': 'translate(-50%, -50%)'
              };
            case 3:
              // 左边
              return {
                'left': '0%',
                'top': `${(1 - edgePosition) * 100}%`,
                'transform': 'translate(-50%, -50%)'
              };
            default:
              return { 'left': '50%', 'top': '50%', 'transform': 'translate(-50%, -50%)' };
          }
        }

        case 'diamond': {
          // 菱形：节点本身被旋转了45度，连接点需要在旋转后的坐标系中定位
          // 菱形是100x100px的正方形旋转45度，所以实际菱形的对角线长度为100px
          // 但连接点是相对于未旋转的容器定位的，所以需要考虑旋转影响

          // 计算角度，将连接点均匀分布
          const diamondAngle = (index / total) * 2 * Math.PI;

          // 菱形的对角线长度为100px，所以从中心到顶点的距离为50px
          const diagonalHalf = 50;

          // 计算在菱形坐标系中的位置
          // 菱形的参数方程：x = a*cosθ, y = b*sinθ
          // 这里a和b都是50px（对角线的一半）
          const x = diagonalHalf * Math.cos(diamondAngle);
          const y = diagonalHalf * Math.sin(diamondAngle);

          // 由于节点容器是未旋转的，而菱形本身是旋转了45度的
          // 我们需要将连接点位置反向旋转45度，以抵消菱形的旋转
          // 旋转矩阵：x' = x*cosθ + y*sinθ, y' = -x*sinθ + y*cosθ
          // θ = -45度 = -π/4（反向旋转）
          const cosNeg45 = Math.cos(-Math.PI / 4);
          const sinNeg45 = Math.sin(-Math.PI / 4);

          // 计算反向旋转后的坐标（相对于未旋转的容器）
          const containerX = x * cosNeg45 + y * sinNeg45;
          const containerY = -x * sinNeg45 + y * cosNeg45;

          // 转换为百分比坐标
          const left = 50 + (containerX / diagonalHalf) * 50;
          const top = 50 + (containerY / diagonalHalf) * 50;

          return {
            'left': `${left}%`,
            'top': `${top}%`,
            'transform': 'translate(-50%, -50%)'
          };
        }

        default: {
          // 默认情况：使用矩形的计算方式
          const edgeIndex = Math.floor((index / total) * 4);
          const edgePosition = ((index / total) * 4) % 1;

          switch (edgeIndex) {
            case 0:
              // 上边
              return {
                'left': `${edgePosition * 100}%`,
                'top': '0%',
                'transform': 'translate(-50%, -50%)'
              };
            case 1:
              // 右边
              return {
                'left': '100%',
                'top': `${edgePosition * 100}%`,
                'transform': 'translate(-50%, -50%)'
              };
            case 2:
              // 下边
              return {
                'left': `${(1 - edgePosition) * 100}%`,
                'top': '100%',
                'transform': 'translate(-50%, -50%)'
              };
            case 3:
              // 左边
              return {
                'left': '0%',
                'top': `${(1 - edgePosition) * 100}%`,
                'transform': 'translate(-50%, -50%)'
              };
            default:
              return { 'left': '50%', 'top': '50%', 'transform': 'translate(-50%, -50%)' };
          }
        }
      }
    };

    // 直接根据handleCount生成对应数量的连接点
    for (let i = 0; i < handleCount; i += 1) {
      // 为每个连接点生成唯一的id
      const handleId = `${nodeData.id}-handle-${i}`;

      // 计算连接点的位置
      const handlePosition = getHandlePosition(i, handleCount);

      // Source连接点
      handles.push(
        <Handle
          key={`${handleId}-source`}
          id={`${handleId}-source`}
          type="source"
          position={Position.Top}
          // 使用自定义样式来精确控制连接点位置
          style={{
            ...handleStyle,
            ...handlePosition,
            'zIndex': 10
          }}
          isConnectable={!nodeData?.handles?.lockedHandles?.[`${handleId}-source`]}
        />
      );

      // Target连接点
      handles.push(
        <Handle
          key={`${handleId}-target`}
          id={`${handleId}-target`}
          type="target"
          position={Position.Top}
          // 使用自定义样式来精确控制连接点位置
          style={{
            ...handleStyle,
            ...handlePosition,
            'zIndex': 10
          }}
          isConnectable={!nodeData?.handles?.lockedHandles?.[`${handleId}-target`]}
        />
      );
    }

    return handles;
  };

  // 使用调整后的节点样式
  const adjustedNodeStyle = getAdjustedNodeStyle();

  return (
    <div style={adjustedNodeStyle}>
      {/* 节点背景容器 - 带有背景色的内部容器 */}
      <div
        className="node-background"
        style={{
          'position': 'absolute',
          'inset': 0,
          'backgroundColor': styleFill,
          'borderRadius': shape === 'circle' || shape === 'ellipse' ? '50%' : `${styleRadius}px`,
          'clipPath': getClipPath(),
          'WebkitClipPath': getClipPath(),
          'zIndex': 1
        }}
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
          'zIndex': 2,
          // 对于菱形节点，内容需要反向旋转
          'transform': shape === 'diamond' ? 'rotate(-45deg)' : 'none'
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

      {/* 动态生成连接点 - 根据handleCount和节点形状生成 */}
      {generateHandles()}
    </div>
  );
};

export default DefaultNode;
