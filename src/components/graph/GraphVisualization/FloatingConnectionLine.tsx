import {
  type ConnectionLineComponentProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  type InternalNode
} from '@xyflow/react';
import { getEdgeParams } from './utils/floatingEdgeUtils';

/**
 * 浮动连接线组件
 * 在创建连接时显示浮动连接的预览线
 */
export const FloatingConnectionLine = (props: ConnectionLineComponentProps) => {
  const { fromNode, toX, toY, fromPosition, toPosition } = props;

  if (!fromNode) {
    return null;
  }

  // 创建一个模拟的目标节点在光标位置
  const targetNode = {
    'id': 'connection-target',
    'measured': {
      'width': 1,
      'height': 1
    },
    'internals': {
      'positionAbsolute': { 'x': toX, 'y': toY }
    }
  } as unknown as InternalNode;

  // 获取边的参数
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(fromNode, targetNode);

  const pathParams = {
    'sourceX': sx,
    'sourceY': sy,
    'sourcePosition': sourcePos || fromPosition,
    'targetPosition': targetPos || toPosition,
    'targetX': tx || toX,
    'targetY': ty || toY
  };

  // 定义支持的曲线类型
  type CurveType = 'default' | 'smoothstep' | 'straight' | 'simplebezier';

  // 这里可以从props或上下文获取curveType
  // 使用类型断言确保TypeScript正确推断类型
  const curveType = 'default' as CurveType;
  let edgePath: string;

  // 根据曲线类型计算路径
  if (curveType === 'straight') {
    [edgePath] = getStraightPath(pathParams);
  } else if (curveType === 'smoothstep') {
    [edgePath] = getSmoothStepPath(pathParams);
  } else if (curveType === 'simplebezier') {
    [edgePath] = getSimpleBezierPath(pathParams);
  } else {
    // default或其他情况
    [edgePath] = getBezierPath(pathParams);
  }

  // 使用与CustomEdge和FloatingEdge一致的默认样式
  const stroke = '#3b82f6';
  const strokeWidth = 2;
  const dasharray = '5,5';

  return (
    <g>
      <path
        d={edgePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={dasharray}
      />
      {/* 目标点预览 */}
      <circle
        cx={tx || toX}
        cy={ty || toY}
        fill="#fff"
        r={3}
        stroke={stroke}
        strokeWidth={2}
      />
    </g>
  );
};

export default FloatingConnectionLine;
