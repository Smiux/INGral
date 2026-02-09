import { Position, type InternalNode } from '@xyflow/react';

export function getNodeIntersection (sourceNode: InternalNode, targetNode: InternalNode) {
  const sourceInternals = sourceNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const targetInternals = targetNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };

  const sourcePosition = sourceInternals.positionAbsolute || { 'x': 0, 'y': 0 };
  const targetPosition = targetInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  const shape = (sourceNode.data || {}).shape || 'circle';
  const nodeWidth = sourceNode.measured?.width || 100;
  const nodeHeight = sourceNode.measured?.height || 100;

  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  const sourceCenterX = sourcePosition.x + halfWidth;
  const sourceCenterY = sourcePosition.y + halfHeight;

  const targetCenterX = targetPosition.x + (targetNode.measured?.width || 100) / 2;
  const targetCenterY = targetPosition.y + (targetNode.measured?.height || 100) / 2;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { 'x': sourceCenterX, 'y': sourceCenterY };
  }

  const unitX = dx / distance;
  const unitY = dy / distance;

  if (shape === 'circle') {
    const radius = Math.min(halfWidth, halfHeight);
    return {
      'x': sourceCenterX + unitX * radius,
      'y': sourceCenterY + unitY * radius
    };
  }

  let t = Infinity;

  const checkIntersection = (axis: 'x' | 'y', direction: number, limit: number) => {
    if (direction === 0) {
      return;
    }
    const tVal = (direction > 0 ? limit : -limit) / direction;
    if (tVal > 0 && tVal < t) {
      const otherAxis = axis === 'x' ? unitY * tVal : unitX * tVal;
      const otherLimit = axis === 'x' ? halfHeight : halfWidth;
      if (Math.abs(otherAxis) <= otherLimit) {
        t = tVal;
      }
    }
  };

  checkIntersection('x', unitX, halfWidth);
  checkIntersection('y', unitY, halfHeight);

  return {
    'x': sourceCenterX + unitX * t,
    'y': sourceCenterY + unitY * t
  };
}

export function getNodeIntersectionToPoint (sourceNode: InternalNode, targetPoint: { x: number; y: number }) {
  const sourceInternals = sourceNode.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const sourcePosition = sourceInternals.positionAbsolute || { 'x': 0, 'y': 0 };

  const shape = (sourceNode.data || {}).shape || 'circle';
  const nodeWidth = sourceNode.measured?.width || 100;
  const nodeHeight = sourceNode.measured?.height || 100;

  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  const sourceCenterX = sourcePosition.x + halfWidth;
  const sourceCenterY = sourcePosition.y + halfHeight;

  const dx = targetPoint.x - sourceCenterX;
  const dy = targetPoint.y - sourceCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { 'x': sourceCenterX, 'y': sourceCenterY };
  }

  const unitX = dx / distance;
  const unitY = dy / distance;

  if (shape === 'circle') {
    const radius = Math.min(halfWidth, halfHeight);
    return {
      'x': sourceCenterX + unitX * radius,
      'y': sourceCenterY + unitY * radius
    };
  }

  let t = Infinity;

  const checkIntersection = (axis: 'x' | 'y', direction: number, limit: number) => {
    if (direction === 0) {
      return;
    }
    const tVal = (direction > 0 ? limit : -limit) / direction;
    if (tVal > 0 && tVal < t) {
      const otherAxis = axis === 'x' ? unitY * tVal : unitX * tVal;
      const otherLimit = axis === 'x' ? halfHeight : halfWidth;
      if (Math.abs(otherAxis) <= otherLimit) {
        t = tVal;
      }
    }
  };

  checkIntersection('x', unitX, halfWidth);
  checkIntersection('y', unitY, halfHeight);

  return {
    'x': sourceCenterX + unitX * t,
    'y': sourceCenterY + unitY * t
  };
}

export function getEdgePosition (node: InternalNode, intersectionPoint: { x: number; y: number }) {
  const nodeInternals = node.internals || { 'positionAbsolute': { 'x': 0, 'y': 0 } };
  const nodePosition = nodeInternals.positionAbsolute || { 'x': 0, 'y': 0 };
  const nodeWidth = node.measured?.width || 100;
  const nodeHeight = node.measured?.height || 100;
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;

  const centerX = nodePosition.x + halfWidth;
  const centerY = nodePosition.y + halfHeight;

  const dx = intersectionPoint.x - centerX;
  const dy = intersectionPoint.y - centerY;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
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
