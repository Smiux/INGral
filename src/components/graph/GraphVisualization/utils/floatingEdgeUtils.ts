import { Position, type InternalNode } from '@xyflow/react';

function getNodeGeometry (node: InternalNode) {
  const position = node.internals?.positionAbsolute || { 'x': 0, 'y': 0 };
  const width = node.measured?.width || 100;
  const height = node.measured?.height || 100;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    'centerX': position.x + halfWidth,
    'centerY': position.y + halfHeight,
    halfWidth,
    halfHeight,
    'shape': (node.data as { 'shape'?: string })?.shape || 'circle'
  };
}

function calculateIntersection (
  geometry: { 'centerX': number; 'centerY': number; 'halfWidth': number; 'halfHeight': number; 'shape': string },
  targetX: number,
  targetY: number
): { 'x': number; 'y': number } {
  const { centerX, centerY, halfWidth, halfHeight, shape } = geometry;

  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { 'x': centerX, 'y': centerY };
  }

  const unitX = dx / distance;
  const unitY = dy / distance;

  if (shape === 'circle') {
    const radius = Math.min(halfWidth, halfHeight);
    return {
      'x': centerX + unitX * radius,
      'y': centerY + unitY * radius
    };
  }

  let t = Infinity;

  const checkIntersection = (direction: number, limit: number) => {
    if (direction !== 0) {
      const tVal = (direction > 0 ? limit : -limit) / direction;
      if (tVal > 0 && tVal < t) {
        t = tVal;
      }
    }
  };

  checkIntersection(unitX, halfWidth);
  checkIntersection(unitY, halfHeight);

  return {
    'x': centerX + unitX * t,
    'y': centerY + unitY * t
  };
}

export function getNodeIntersection (sourceNode: InternalNode, targetNode: InternalNode) {
  const sourceGeometry = getNodeGeometry(sourceNode);
  const targetGeometry = getNodeGeometry(targetNode);
  return calculateIntersection(sourceGeometry, targetGeometry.centerX, targetGeometry.centerY);
}

export function getNodeIntersectionToPoint (sourceNode: InternalNode, targetPoint: { 'x': number; 'y': number }) {
  const sourceGeometry = getNodeGeometry(sourceNode);
  return calculateIntersection(sourceGeometry, targetPoint.x, targetPoint.y);
}

export function getEdgePosition (node: InternalNode, intersectionPoint: { 'x': number; 'y': number }) {
  const { centerX, centerY } = getNodeGeometry(node);
  const dx = intersectionPoint.x - centerX;
  const dy = intersectionPoint.y - centerY;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }
  return dy > 0 ? Position.Bottom : Position.Top;
}

export function getEdgeParams (source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  return {
    'sx': sourceIntersectionPoint.x,
    'sy': sourceIntersectionPoint.y,
    'tx': targetIntersectionPoint.x,
    'ty': targetIntersectionPoint.y,
    'sourcePos': getEdgePosition(source, sourceIntersectionPoint),
    'targetPos': getEdgePosition(target, targetIntersectionPoint)
  };
}
