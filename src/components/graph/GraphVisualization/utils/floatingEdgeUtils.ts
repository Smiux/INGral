import { Position, type InternalNode } from '@xyflow/react';

// 这个辅助函数返回节点的交点
// 是连接交点节点中心和目标节点中心的线与交点节点边缘的交点
// 通用算法，支持各种形状的节点
function getNodeIntersection (intersectionNode: InternalNode, targetNode: InternalNode) {
  // 确保节点有正确的属性
  const intersectionInternals = intersectionNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const targetInternals = targetNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };

  const intersectionNodePosition = intersectionInternals.positionAbsolute || { 'x': 0, 'y': 0 };
  const targetPosition = targetInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  // 获取节点数据，包括形状信息
  const nodeData = intersectionNode.data || {};
  const shape = nodeData.shape || 'circle';

  // 获取节点的实际尺寸或使用默认值
  const nodeWidth = intersectionNode.measured?.width || 100;
  const nodeHeight = intersectionNode.measured?.height || 100;

  // 计算节点中心坐标
  const sourceCenterX = intersectionNodePosition.x + nodeWidth / 2;
  const sourceCenterY = intersectionNodePosition.y + nodeHeight / 2;

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

  // 计算交点
  let intersectionX: number;
  let intersectionY: number;

  // 计算节点的半宽和半高
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  // 通用算法：根据节点形状计算交点
  if (shape === 'circle') {
    // 圆形节点：交点在半径上
    const radius = Math.min(halfWidth, halfHeight);
    intersectionX = sourceCenterX + unitX * radius;
    intersectionY = sourceCenterY + unitY * radius;
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
    intersectionX = sourceCenterX + unitX * t;
    intersectionY = sourceCenterY + unitY * t;
  }

  return { 'x': intersectionX, 'y': intersectionY };
}

// 返回节点相对于交点的位置（top, right, bottom 或 left）
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
