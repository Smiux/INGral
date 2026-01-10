import { Position, type InternalNode } from '@xyflow/react';

// 这个辅助函数返回圆形节点的交点
// 是连接交点节点中心和目标节点中心的线与交点节点边缘的交点
// 正确实现了圆形版本的交点计算，确保连接点准确落在圆形边缘上
function getNodeIntersection (intersectionNode: InternalNode, targetNode: InternalNode) {
  // 圆形节点的半径
  const radius = 50;
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;
  const targetWidth = targetNode.measured.width || 100;
  const targetHeight = targetNode.measured.height || 100;

  // 交点节点的中心坐标
  const sourceCenterX = intersectionNodePosition.x + radius;
  const sourceCenterY = intersectionNodePosition.y + radius;

  // 目标节点的中心坐标
  const targetCenterX = targetPosition.x + targetWidth / 2;
  const targetCenterY = targetPosition.y + targetHeight / 2;

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

  // 计算交点坐标：从源节点中心沿单位向量方向移动半径长度
  const intersectionX = sourceCenterX + unitX * radius;
  const intersectionY = sourceCenterY + unitY * radius;

  return { 'x': intersectionX, 'y': intersectionY };
}

// 返回节点相对于交点的位置（top, right, bottom 或 left）
// 修复了边界条件下的不稳定问题，确保在所有角度下都返回稳定的连接位置
function getEdgePosition (node: InternalNode, intersectionPoint: { x: number; y: number }) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = n.x;
  const ny = n.y;
  const px = intersectionPoint.x;
  const py = intersectionPoint.y;
  const nodeWidth = n.measured.width || 100;
  const nodeHeight = n.measured.height || 100;
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

  // 定义一个小的缓冲区域，避免在边界附近跳动
  const buffer = 0.1;

  // 基于水平和垂直距离的比例来确定连接位置
  // 使用稳定的比例判断，避免在边界附近跳动
  if (absDx > absDy * (1 + buffer)) {
    // 水平方向
    return dx > 0 ? Position.Right : Position.Left;
  } else if (absDy > absDx * (1 + buffer)) {
    // 垂直方向
    return dy > 0 ? Position.Bottom : Position.Top;
  }
  // 对角线方向，根据主要方向返回稳定的位置
  // 避免在边界附近跳动，返回最接近的主要方向
  if (absDx >= absDy) {
    return dx > 0 ? Position.Right : Position.Left;
  }
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
