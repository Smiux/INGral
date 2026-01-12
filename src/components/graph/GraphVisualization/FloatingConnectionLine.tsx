import {
  type ConnectionLineComponentProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  Position
} from '@xyflow/react';

/**
 * 浮动连接线组件
 * 在创建连接时显示浮动连接的预览线
 */
export const FloatingConnectionLine = (props: ConnectionLineComponentProps) => {
  const { fromNode, toX, toY, fromPosition, toPosition } = props;

  if (!fromNode) {
    return null;
  }

  // 圆形节点的半径
  const radius = 50;

  // 确保fromNode有正确的属性
  const fromInternals = fromNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const fromPositionAbsolute = fromInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  // 计算源节点的中心坐标
  const sourceCenterX = fromPositionAbsolute.x + radius;
  const sourceCenterY = fromPositionAbsolute.y + radius;

  // 计算源节点到目标点的向量
  const dx = toX - sourceCenterX;
  const dy = toY - sourceCenterY;

  // 计算向量的长度
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 避免除以零
  const safeDistance = Math.max(distance, 0.1);

  // 计算单位向量
  const unitX = dx / safeDistance;
  const unitY = dy / safeDistance;

  // 计算源节点边缘的交点
  const sx = sourceCenterX + unitX * radius;
  const sy = sourceCenterY + unitY * radius;

  // 目标点就是光标位置
  const tx = toX;
  const ty = toY;

  const pathParams = {
    'sourceX': sx,
    'sourceY': sy,
    'sourcePosition': fromPosition || Position.Right,
    'targetPosition': toPosition || Position.Left,
    'targetX': tx,
    'targetY': ty
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
        cx={tx}
        cy={ty}
        fill="#fff"
        r={3}
        stroke={stroke}
        strokeWidth={2}
      />
    </g>
  );
};

export default FloatingConnectionLine;
