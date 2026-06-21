import { useRef, useEffect, useCallback } from 'react';
import { Graph } from '@cosmos.gl/graph';
import { type KnowledgeNode, type KnowledgeLink, type GraphMetadata, NODE_TYPE_SHAPES } from './types';
import { type CosmosGLSettings } from './settings';

interface MathGraphProps {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  metadata: GraphMetadata;
  width: number;
  height: number;
  settings: CosmosGLSettings;
  showEdges: boolean;
  backgroundColor: string;
  onNodeHover: (node: KnowledgeNode | null) => void;
  onNodeRightClick: (node: KnowledgeNode) => void;
  onNodeClick: (node: KnowledgeNode, event: MouseEvent) => void;
  onLinkRightClick: (sourceId: string, targetId: string) => void;
}

const SPACE_SIZE = 8192;

const hslToRgb = (hsl: string): [number, number, number] => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return [0.38, 0.65, 0.98];
  }
  const h = parseInt(match[1], 10) / 360;
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;

  let r = 0;
  let g = 0;
  let b = 0;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, tVal: number) => {
      let t = tVal;
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
};

const DOMAIN_COLORS: string[] = [
  'hsl(210, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(280, 50%, 55%)',
  'hsl(350, 65%, 55%)',
  'hsl(40, 80%, 50%)',
  'hsl(190, 65%, 50%)',
  'hsl(10, 70%, 55%)',
  'hsl(120, 40%, 50%)',
  'hsl(300, 45%, 55%)',
  'hsl(0, 0%, 50%)'
];

const DOMAIN_ANGLE_OFFSETS: Record<string, number> = {};

function getDomainColor (domain: string): string {
  let index = 0;
  for (const d of Object.keys(DOMAIN_ANGLE_OFFSETS).sort()) {
    if (d === domain) {
      break;
    }
    index += 1;
  }
  if (index >= DOMAIN_COLORS.length - 1) {
    index = DOMAIN_COLORS.length - 1;
  }
  return DOMAIN_COLORS[index] ?? 'hsl(0,0%,50%)';
}

const getNodeSize = (degree: number): number => {
  return 5 + Math.log2(1 + degree) * 1.5;
};

function computeInitialPositions (nodes: KnowledgeNode[]): Float32Array {
  const positions = new Float32Array(nodes.length * 2);
  const centerX = SPACE_SIZE / 2;
  const centerY = SPACE_SIZE / 2;

  const domainGroups = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    if (!domainGroups.has(node.domain)) {
      domainGroups.set(node.domain, []);
    }
    domainGroups.get(node.domain)!.push(index);
  });

  const sortedDomains = [...domainGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const domainAngles = new Map<string, number>();
  const domainRadii = new Map<string, number>();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  sortedDomains.forEach(([domain, indices], i) => {
    DOMAIN_ANGLE_OFFSETS[domain] = i;
    const angle = i * goldenAngle;
    const baseRadius = Math.sqrt(indices.length / nodes.length) * SPACE_SIZE * 0.35;
    domainAngles.set(domain, angle);
    domainRadii.set(domain, Math.max(baseRadius, 200));
  });

  const tagGroups = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    for (const tag of node.tags) {
      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, []);
      }
      tagGroups.get(tag)!.push(index);
    }
  });

  const TAG_CLUSTER_RADIUS = 10;

  sortedDomains.forEach(([domain, domainNodeIndices]) => {
    const domainAngle = domainAngles.get(domain) ?? 0;
    const domainRadius = domainRadii.get(domain) ?? 500;
    const spread = Math.min(domainRadius * 0.6, 800);

    const domainTags = new Map<string, number[]>();
    for (const idx of domainNodeIndices) {
      for (const tag of nodes[idx]!.tags) {
        const list = domainTags.get(tag) ?? [];
        list.push(idx);
        domainTags.set(tag, list);
      }
    }

    const seedPositions = new Map<string, { x: number; y: number }>();
    const sortedTags = [...domainTags.entries()]
      .sort((a, b) => b[1].length - a[1].length);

    for (const [tag, tagIndices] of sortedTags) {
      const seedIndex = tagIndices[0]!;
      const localAngle = domainAngle + (Math.random() - 0.5) * (spread / domainRadius);
      const localRadius = domainRadius * (0.3 + Math.random() * 0.7);
      const x = centerX + Math.cos(localAngle) * localRadius;
      const y = centerY + Math.sin(localAngle) * localRadius;
      positions[seedIndex * 2] = x;
      positions[seedIndex * 2 + 1] = y;
      seedPositions.set(tag, { x, y });
    }

    nodes.forEach((node, index) => {
      if (positions[index * 2] !== 0 || positions[index * 2 + 1] !== 0) {
        return;
      }
      const firstTag = node.tags[0];
      const seed = firstTag ? seedPositions.get(firstTag) : undefined;
      if (!seed) {
        return;
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * TAG_CLUSTER_RADIUS;
      positions[index * 2] = seed.x + Math.cos(angle) * dist;
      positions[index * 2 + 1] = seed.y + Math.sin(angle) * dist;
    });
  });

  return positions;
}

function findNodeAtPosition (
  graph: Graph,
  nodes: KnowledgeNode[],
  screenX: number,
  screenY: number
): KnowledgeNode | null {
  const spacePos = graph.screenToSpacePosition([screenX, screenY]);
  const positions = graph.getPointPositions();

  let closestNode: KnowledgeNode | null = null;
  let closestDist = Infinity;

  for (let i = 0; i < positions.length; i += 2) {
    const px = positions[i];
    const py = positions[i + 1];
    const nodeIndex = i / 2;
    const node = nodes[nodeIndex];
    if (px !== undefined && py !== undefined && node) {
      const hitRadius = Math.max(15, getNodeSize(node.degree) * 3);
      const dist = Math.hypot(spacePos[0] - px, spacePos[1] - py);
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        closestNode = node;
      }
    }
  }

  return closestNode;
}

export default function MathGraph ({
  nodes,
  links,
  metadata,
  width,
  height,
  settings,
  showEdges,
  backgroundColor,
  onNodeHover,
  onNodeRightClick,
  onNodeClick,
  onLinkRightClick
}: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const nodesRef = useRef<KnowledgeNode[]>([]);
  const edgesRef = useRef<Float32Array>(new Float32Array(0));
  const linkColorsRef = useRef<Float32Array>(new Float32Array(0));
  const initializedRef = useRef(false);
  const settingsRef = useRef(settings);
  const showEdgesRef = useRef(showEdges);
  const onNodeRightClickRef = useRef(onNodeRightClick);
  const onLinkRightClickRef = useRef(onLinkRightClick);
  const hoveredLinkIndexRef = useRef<number | undefined>(undefined);
  const validLinksRef = useRef<{ sourceId: string; targetId: string }[]>([]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    showEdgesRef.current = showEdges;
    if (graphRef.current && initializedRef.current && edgesRef.current.length > 0) {
      if (showEdges) {
        graphRef.current.setLinks(edgesRef.current);
        graphRef.current.setLinkColors(linkColorsRef.current);
      } else {
        graphRef.current.setLinks(new Float32Array(0));
      }
      graphRef.current.render();
    }
  }, [showEdges]);

  useEffect(() => {
    onNodeRightClickRef.current = onNodeRightClick;
  }, [onNodeRightClick]);

  useEffect(() => {
    onLinkRightClickRef.current = onLinkRightClick;
  }, [onLinkRightClick]);

  const handlePointClick = useCallback(
    (pointIndex: number) => {
      const node = nodesRef.current[pointIndex];
      if (node) {
        onNodeClick(node, new MouseEvent('click'));
      }
    },
    [onNodeClick]
  );

  const handlePointMouseOver = useCallback(
    (pointIndex: number) => {
      const node = nodesRef.current[pointIndex];
      if (node) {
        onNodeHover(node);
      }
    },
    [onNodeHover]
  );

  const handlePointMouseOut = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) {
      return undefined;
    }

    nodesRef.current = nodes;

    if (!initializedRef.current) {
      if (graphRef.current) {
        graphRef.current.destroy?.();
      }

      const initConfig = {
        'spaceSize': SPACE_SIZE,
        backgroundColor,
        'pointDefaultColor': '#60A5FA',
        'simulationFriction': settingsRef.current.simulationFriction,
        'simulationGravity': settingsRef.current.simulationGravity,
        'simulationRepulsion': settingsRef.current.simulationRepulsion,
        'simulationDecay': 1000000,
        'fitViewOnInit': true,
        'fitViewDelay': 500,
        'fitViewPadding': 0.2,
        'enableDrag': true,
        'enableZoom': true,
        'linkDefaultArrows': true,
        'linkArrowsSizeScale': 0.6,
        'pointSizeScale': settingsRef.current.pointSizeScale,
        'linkWidthScale': settingsRef.current.linkWidthScale,
        'pointOpacity': settingsRef.current.pointOpacity,
        'linkOpacity': settingsRef.current.linkOpacity,
        'onPointClick': handlePointClick,
        'onPointMouseOver': handlePointMouseOver,
        'onPointMouseOut': handlePointMouseOut,
        'onLinkMouseOver': (linkIndex: number) => {
          hoveredLinkIndexRef.current = linkIndex;
        },
        'onLinkMouseOut': () => {
          hoveredLinkIndexRef.current = undefined;
        }
      };

      graphRef.current = new Graph(containerRef.current, initConfig);

      const numPoints = nodes.length;
      const pointPositions = computeInitialPositions(nodes);
      const pointColors = new Float32Array(numPoints * 4);
      const pointSizes = new Float32Array(numPoints);
      const pointShapes = new Float32Array(numPoints);

      nodes.forEach((node, index) => {
        const [r, g, b] = hslToRgb(getDomainColor(node.domain));
        pointColors[index * 4] = r;
        pointColors[index * 4 + 1] = g;
        pointColors[index * 4 + 2] = b;
        pointColors[index * 4 + 3] = 1.0;

        pointSizes[index] = getNodeSize(node.degree);
        pointShapes[index] = NODE_TYPE_SHAPES[node.type] ?? 0;
      });

      const nodeIdToIndex = new Map<string, number>();
      nodes.forEach((node, index) => nodeIdToIndex.set(node.id, index));

      const linksF32 = new Float32Array(links.length * 2);
      const linkColors = new Float32Array(links.length * 4);
      const validLinksList: { sourceId: string; targetId: string }[] = [];
      let validLinks = 0;
      links.forEach((link) => {
        const sourceIndex = nodeIdToIndex.get(link.source);
        const targetIndex = nodeIdToIndex.get(link.target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const sourceNode = nodes[sourceIndex];
          linksF32[validLinks * 2] = sourceIndex;
          linksF32[validLinks * 2 + 1] = targetIndex;
          if (sourceNode) {
            const [r, g, b] = hslToRgb(getDomainColor(sourceNode.domain));
            linkColors[validLinks * 4] = r;
            linkColors[validLinks * 4 + 1] = g;
            linkColors[validLinks * 4 + 2] = b;
          }
          linkColors[validLinks * 4 + 3] = 0.35;
          validLinksList.push({ 'sourceId': link.source, 'targetId': link.target });
          validLinks += 1;
        }
      });

      validLinksRef.current = validLinksList;

      edgesRef.current = linksF32.slice(0, validLinks * 2);
      linkColorsRef.current = linkColors.slice(0, validLinks * 4);

      graphRef.current.setPointPositions(pointPositions);
      graphRef.current.setPointColors(pointColors);
      graphRef.current.setPointSizes(pointSizes);
      graphRef.current.setPointShapes(pointShapes);
      if (showEdgesRef.current && validLinks > 0) {
        graphRef.current.setLinks(linksF32.slice(0, validLinks * 2));
        graphRef.current.setLinkColors(linkColors.slice(0, validLinks * 4));
      }
      graphRef.current.render();

      if (settingsRef.current.simulationPaused) {
        graphRef.current.pause();
      }

      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        const contextMenuHandler = (event: MouseEvent) => {
          event.preventDefault();
          if (!graphRef.current) {
            return;
          }

          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          // Check link right-click first
          const hoveredLinkIdx = hoveredLinkIndexRef.current;
          if (hoveredLinkIdx !== undefined) {
            const linkInfo = validLinksRef.current[hoveredLinkIdx];
            if (linkInfo) {
              onLinkRightClickRef.current(linkInfo.sourceId, linkInfo.targetId);
              return;
            }
          }

          // Fall back to node right-click
          const node = findNodeAtPosition(graphRef.current, nodesRef.current, x, y);
          if (node) {
            onNodeRightClickRef.current(node);
          }
        };
        canvas.addEventListener('contextmenu', contextMenuHandler);
        (canvas as HTMLCanvasElement & { _mathContextMenu: (e: MouseEvent) => void })._mathContextMenu = contextMenuHandler;
      }

      initializedRef.current = true;
    }

    const currentContainer = containerRef.current;
    const currentCanvas = currentContainer?.querySelector('canvas');
    return () => {
      if (currentCanvas) {
        const handler = (currentCanvas as HTMLCanvasElement & { _mathContextMenu?: (e: MouseEvent) => void })._mathContextMenu;
        if (handler) {
          currentCanvas.removeEventListener('contextmenu', handler);
        }
      }
      if (graphRef.current) {
        graphRef.current.destroy?.();
        graphRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [nodes, links, metadata, backgroundColor, handlePointClick, handlePointMouseOver, handlePointMouseOut]);

  useEffect(() => {
    if (graphRef.current && initializedRef.current) {
      graphRef.current.setConfig({
        'simulationFriction': settings.simulationFriction,
        'simulationGravity': settings.simulationGravity,
        'simulationRepulsion': settings.simulationRepulsion,
        'pointSizeScale': settings.pointSizeScale,
        'linkWidthScale': settings.linkWidthScale,
        'pointOpacity': settings.pointOpacity,
        'linkOpacity': settings.linkOpacity
      });

      if (settings.simulationPaused) {
        graphRef.current.pause();
      } else {
        graphRef.current.unpause();
      }
    }
  }, [settings]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.width = `${width}px`;
      containerRef.current.style.height = `${height}px`;
    }
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        'cursor': 'grab'
      }}
    />
  );
}
