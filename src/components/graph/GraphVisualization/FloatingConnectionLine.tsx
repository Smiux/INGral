import {
  type ConnectionLineComponentProps,
  getBezierPath,
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

  // 确保fromNode有正确的属性
  const fromInternals = fromNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const fromPositionAbsolute = fromInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  // 获取节点数据，包括形状信息
  const nodeData = fromNode.data || {};
  const shape = nodeData.shape || 'circle';

  // 获取节点的实际尺寸或使用默认值
  const nodeWidth = fromNode.measured?.width || 100;
  const nodeHeight = fromNode.measured?.height || 100;

  // 计算源节点的中心坐标
  const sourceCenterX = fromPositionAbsolute.x + nodeWidth / 2;
  const sourceCenterY = fromPositionAbsolute.y + nodeHeight / 2;

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

  // 计算节点的半宽和半高
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  // 通用算法：根据节点形状计算源节点边缘的交点
  let sx: number;
  let sy: number;

  if (shape === 'circle') {
    // 圆形节点：交点在半径上
    const radius = Math.min(halfWidth, halfHeight);
    sx = sourceCenterX + unitX * radius;
    sy = sourceCenterY + unitY * radius;
  } else {
    // 矩形、正方形或其他形状：使用边界框计算交点
    // 计算线段与矩形边界的交点
    let t = Infinity;

    // 检查与左边界的交点
    if (unitX < 0) {
      const tLeft = (Number(-halfWidth) - 0) / unitX;
      if (tLeft > 0) {
        const yAtLeft = 0 + unitY * tLeft;
        if (Math.abs(yAtLeft) <= halfHeight) {
          t = Math.min(t, tLeft);
        }
      }
    } else if (unitX > 0) {
      // 检查与右边界的交点
      const tRight = (Number(halfWidth) - 0) / unitX;
      if (tRight > 0) {
        const yAtRight = 0 + unitY * tRight;
        if (Math.abs(yAtRight) <= halfHeight) {
          t = Math.min(t, tRight);
        }
      }
    }

    // 检查与上边界的交点
    if (unitY < 0) {
      const tTop = (Number(-halfHeight) - 0) / unitY;
      if (tTop > 0) {
        const xAtTop = 0 + unitX * tTop;
        if (Math.abs(xAtTop) <= halfWidth) {
          t = Math.min(t, tTop);
        }
      }
    } else if (unitY > 0) {
      // 检查与下边界的交点
      const tBottom = (Number(halfHeight) - 0) / unitY;
      if (tBottom > 0) {
        const xAtBottom = 0 + unitX * tBottom;
        if (Math.abs(xAtBottom) <= halfWidth) {
          t = Math.min(t, tBottom);
        }
      }
    }

    // 计算交点坐标
    sx = sourceCenterX + unitX * t;
    sy = sourceCenterY + unitY * t;
  }

  const pathParams = {
    'sourceX': sx,
    'sourceY': sy,
    'sourcePosition': fromPosition || Position.Right,
    'targetPosition': toPosition || Position.Left,
    'targetX': toX,
    'targetY': toY
  };

  const [edgePath] = getBezierPath(pathParams);

  const stroke = '#3b82f6';
  const dasharray = '5,5';

  return (
    <g>
      <path
        d={edgePath}
        stroke={stroke}
        strokeWidth={2}
        fill="none"
        strokeDasharray={dasharray}
      />
      {/* 目标点预览 */}
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke={stroke}
        strokeWidth={2}
      />
    </g>
  );
};

export default FloatingConnectionLine;
