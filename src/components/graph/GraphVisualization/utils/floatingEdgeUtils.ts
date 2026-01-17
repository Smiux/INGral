import { Position, type InternalNode } from '@xyflow/react';

// 这个辅助函数返回节点的交点
// 是连接交点节点中心和目标节点中心的线与交点节点边缘的交点
// 通用算法，支持各种形状的节点
function getNodeIntersection (sourceNode: InternalNode, targetNode: InternalNode) {
  // 确保节点有正确的属性
  const sourceInternals = sourceNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const targetInternals = targetNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };

  const sourcePosition = sourceInternals.positionAbsolute || { 'x': 0, 'y': 0 };
  const targetPosition = targetInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  // 获取节点数据，包括形状信息
  const shape = (sourceNode.data || {}).shape || 'circle';

  // 获取节点的实际尺寸或使用默认值
  const nodeWidth = sourceNode.measured?.width || 100;
  const nodeHeight = sourceNode.measured?.height || 100;

  // 计算节点中心坐标
  const sourceCenterX = sourcePosition.x + nodeWidth / 2;
  const sourceCenterY = sourcePosition.y + nodeHeight / 2;

  // 目标节点的中心坐标
  const targetCenterX = targetPosition.x + (targetNode.measured?.width || 100) / 2;
  const targetCenterY = targetPosition.y + (targetNode.measured?.height || 100) / 2;

  // 计算源节点到目标节点的向量
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  // 计算向量的长度
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 避免除以零
  if (distance === 0) {
    return { 'x': sourceCenterX, 'y': sourceCenterY };
  }

  // 计算单位向量
  const unitX = dx / distance;
  const unitY = dy / distance;

  // 计算节点的半宽和半高
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  // 通用算法：根据节点形状计算交点
  if (shape === 'circle') {
    // 圆形节点：交点在半径上
    const radius = Math.min(halfWidth, halfHeight);
    return {
      'x': sourceCenterX + unitX * radius,
      'y': sourceCenterY + unitY * radius
    };
  }

  // 矩形、正方形或其他形状：使用边界框计算交点
  let t = Infinity;

  // 检查与左边界的交点
  if (unitX < 0) {
    const tLeft = (-halfWidth) / unitX;
    if (tLeft > 0) {
      const yAtLeft = unitY * tLeft;
      if (Math.abs(yAtLeft) <= halfHeight) {
        t = Math.min(t, tLeft);
      }
    }
  } else if (unitX > 0) {
    // 检查与右边界的交点
    const tRight = halfWidth / unitX;
    if (tRight > 0) {
      const yAtRight = unitY * tRight;
      if (Math.abs(yAtRight) <= halfHeight) {
        t = Math.min(t, tRight);
      }
    }
  }

  // 检查与上边界的交点
  if (unitY < 0) {
    const tTop = (-halfHeight) / unitY;
    if (tTop > 0) {
      const xAtTop = unitX * tTop;
      if (Math.abs(xAtTop) <= halfWidth) {
        t = Math.min(t, tTop);
      }
    }
  } else if (unitY > 0) {
    // 检查与下边界的交点
    const tBottom = halfHeight / unitY;
    if (tBottom > 0) {
      const xAtBottom = unitX * tBottom;
      if (Math.abs(xAtBottom) <= halfWidth) {
        t = Math.min(t, tBottom);
      }
    }
  }

  // 计算交点坐标
  return {
    'x': sourceCenterX + unitX * t,
    'y': sourceCenterY + unitY * t
  };
}

// 返回节点相对于交点的位置（top, right, bottom 或 left）
function getEdgePosition (node: InternalNode, intersectionPoint: { x: number; y: number }) {
  const nodeInternals = node.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const nodePosition = nodeInternals.positionAbsolute || { 'x': 0, 'y': 0 };
  const nx = nodePosition.x;
  const ny = nodePosition.y;
  const px = intersectionPoint.x;
  const py = intersectionPoint.y;
  const nodeWidth = node.measured?.width || 100;
  const nodeHeight = node.measured?.height || 100;
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  // 计算节点中心坐标
  const centerX = nx + halfWidth;
  const centerY = ny + halfHeight;

  // 计算交点相对于中心的偏移
  const dx = px - centerX;
  const dy = py - centerY;

  // 计算水平和垂直距离的绝对值
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 基于水平和垂直距离的比例来确定连接位置
  if (absDx > absDy) {
    // 水平方向
    return dx > 0 ? Position.Right : Position.Left;
  }
  // 垂直方向
  return dy > 0 ? Position.Bottom : Position.Top;
}

// 返回创建边所需的参数 (sx, sy, tx, ty, sourcePos, targetPos)
export function getEdgeParams (source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    'sx': sourceIntersectionPoint.x,
    'sy': sourceIntersectionPoint.y,
    'tx': targetIntersectionPoint.x,
    'ty': targetIntersectionPoint.y,
    sourcePos,
    targetPos
  };
}
