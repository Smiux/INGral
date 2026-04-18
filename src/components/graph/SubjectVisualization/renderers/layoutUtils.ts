import type { SubjectNode, SubjectLink } from '../types';

export interface RadialPosition {
  x: number;
  y: number;
  z: number;
}

export interface LayoutConfig {
  baseRadius: number;
  radiusStep: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  'baseRadius': 500,
  'radiusStep': 400
};

export const calculateRadialPositions = (
  nodes: SubjectNode[],
  links: SubjectLink[],
  spaceSize: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Map<string, RadialPosition> => {
  const positions = new Map<string, RadialPosition>();
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  nodes.forEach((node) => {
    childrenMap.set(node.id, []);
  });

  links.forEach((link) => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as SubjectNode).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as SubjectNode).id;
    const children = childrenMap.get(sourceId);
    if (children) {
      children.push(targetId);
    }
    if (!parentMap.has(targetId)) {
      parentMap.set(targetId, sourceId);
    }
  });

  let rootNode: SubjectNode | undefined;
  for (const node of nodes) {
    if (!parentMap.has(node.id)) {
      rootNode = node;
      break;
    }
  }

  if (!rootNode) {
    rootNode = nodes[0];
  }

  const centerX = spaceSize / 2;
  const centerY = spaceSize / 2;
  const centerZ = spaceSize / 2;

  if (rootNode) {
    positions.set(rootNode.id, { 'x': centerX, 'y': centerY, 'z': centerZ });
  }

  const levelNodes: string[][] = [];
  const visited = new Set<string>();

  if (rootNode) {
    levelNodes.push([rootNode.id]);
    visited.add(rootNode.id);
  }

  let currentLevel = 0;
  while (currentLevel < levelNodes.length) {
    const currentNodes = levelNodes[currentLevel];
    if (!currentNodes) {
      break;
    }
    const nextLevel: string[] = [];

    currentNodes.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          visited.add(childId);
          nextLevel.push(childId);
        }
      });
    });

    if (nextLevel.length > 0) {
      levelNodes.push(nextLevel);
    }
    currentLevel += 1;
  }

  const { baseRadius, radiusStep } = config;

  levelNodes.forEach((levelNodeIds, level) => {
    if (level === 0) {
      return;
    }

    const radius = baseRadius + (level - 1) * radiusStep;
    const nodeCount = levelNodeIds.length;
    const angleStep = (2 * Math.PI) / nodeCount;
    const startAngle = -Math.PI / 2;

    levelNodeIds.forEach((nodeId, index) => {
      const angle = startAngle + index * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const z = centerZ + (level - 1) * radiusStep * 0.3;
      positions.set(nodeId, { x, y, z });
    });
  });

  nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = baseRadius + Math.random() * radiusStep * 3;
      positions.set(node.id, {
        'x': centerX + radius * Math.cos(angle),
        'y': centerY + radius * Math.sin(angle),
        'z': centerZ
      });
    }
  });

  return positions;
};

export { DEFAULT_LAYOUT_CONFIG };
