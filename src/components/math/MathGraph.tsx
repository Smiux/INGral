import { useRef, useEffect, useCallback } from 'react';
import { Graph } from '@cosmos.gl/graph';
import { type MathNode, type MathEdge, type MathMetadata, NODE_TYPE_SHAPES } from './types';
import { type CosmosGLSettings } from './settings';

interface MathGraphProps {
  nodes: MathNode[];
  edges: MathEdge[];
  metadata: MathMetadata;
  width: number;
  height: number;
  settings: CosmosGLSettings;
  showEdges: boolean;
  backgroundColor: string;
  onNodeHover: (node: MathNode | null) => void;
  onNodeRightClick: (node: MathNode) => void;
  onNodeClick: (node: MathNode, event: MouseEvent) => void;
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

const getBranchColor = (branch: string, metadata: MathMetadata): string => {
  return metadata.branches[branch]?.color ?? 'hsl(0,0%,50%)';
};

const getNodeSize = (degree: number): number => {
  return 5 + Math.log2(1 + degree) * 1.5;
};

function computeInitialPositions (nodes: MathNode[]): Float32Array {
  const positions = new Float32Array(nodes.length * 2);
  const centerX = SPACE_SIZE / 2;
  const centerY = SPACE_SIZE / 2;

  const branchGroups = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    if (!branchGroups.has(node.branch)) {
      branchGroups.set(node.branch, []);
    }
    branchGroups.get(node.branch)!.push(index);
  });

  const sortedBranches = [...branchGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const branchAngles = new Map<string, number>();
  const branchRadii = new Map<string, number>();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  sortedBranches.forEach(([branch, indices], i) => {
    const angle = i * goldenAngle;
    const baseRadius = Math.sqrt(indices.length / nodes.length) * SPACE_SIZE * 0.35;
    branchAngles.set(branch, angle);
    branchRadii.set(branch, Math.max(baseRadius, 200));
  });

  nodes.forEach((node, index) => {
    const branchAngle = branchAngles.get(node.branch) ?? 0;
    const branchRadius = branchRadii.get(node.branch) ?? 500;
    const spread = Math.min(branchRadius * 0.6, 800);
    const localAngle = branchAngle + (Math.random() - 0.5) * (spread / branchRadius);
    const localRadius = branchRadius * (0.3 + Math.random() * 0.7);

    positions[index * 2] = centerX + Math.cos(localAngle) * localRadius;
    positions[index * 2 + 1] = centerY + Math.sin(localAngle) * localRadius;
  });

  return positions;
}

function findNodeAtPosition (
  graph: Graph,
  nodes: MathNode[],
  screenX: number,
  screenY: number
): MathNode | null {
  const spacePos = graph.screenToSpacePosition([screenX, screenY]);
  const positions = graph.getPointPositions();

  let closestNode: MathNode | null = null;
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
  edges,
  metadata,
  width,
  height,
  settings,
  showEdges,
  backgroundColor,
  onNodeHover,
  onNodeRightClick,
  onNodeClick
}: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const nodesRef = useRef<MathNode[]>([]);
  const edgesRef = useRef<Float32Array>(new Float32Array(0));
  const linkColorsRef = useRef<Float32Array>(new Float32Array(0));
  const initializedRef = useRef(false);
  const settingsRef = useRef(settings);
  const showEdgesRef = useRef(showEdges);
  const onNodeRightClickRef = useRef(onNodeRightClick);

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
        'simulationDecay': 10000,
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
        'onPointMouseOut': handlePointMouseOut
      };

      graphRef.current = new Graph(containerRef.current, initConfig);

      const numPoints = nodes.length;
      const pointPositions = computeInitialPositions(nodes);
      const pointColors = new Float32Array(numPoints * 4);
      const pointSizes = new Float32Array(numPoints);
      const pointShapes = new Float32Array(numPoints);

      nodes.forEach((node, index) => {
        const [r, g, b] = hslToRgb(getBranchColor(node.branch, metadata));
        pointColors[index * 4] = r;
        pointColors[index * 4 + 1] = g;
        pointColors[index * 4 + 2] = b;
        pointColors[index * 4 + 3] = 1.0;

        pointSizes[index] = getNodeSize(node.degree);
        pointShapes[index] = NODE_TYPE_SHAPES[node.type] ?? 0;
      });

      const nodeIdToIndex = new Map<string, number>();
      nodes.forEach((node, index) => nodeIdToIndex.set(node.id, index));

      const links = new Float32Array(edges.length * 2);
      const linkColors = new Float32Array(edges.length * 4);
      let validLinks = 0;
      edges.forEach((edge) => {
        const sourceIndex = nodeIdToIndex.get(edge.source);
        const targetIndex = nodeIdToIndex.get(edge.target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const sourceNode = nodes[sourceIndex];
          links[validLinks * 2] = sourceIndex;
          links[validLinks * 2 + 1] = targetIndex;
          if (sourceNode) {
            const [r, g, b] = hslToRgb(getBranchColor(sourceNode.branch, metadata));
            linkColors[validLinks * 4] = r;
            linkColors[validLinks * 4 + 1] = g;
            linkColors[validLinks * 4 + 2] = b;
          }
          linkColors[validLinks * 4 + 3] = 0.35;
          validLinks += 1;
        }
      });

      edgesRef.current = links.slice(0, validLinks * 2);
      linkColorsRef.current = linkColors.slice(0, validLinks * 4);

      graphRef.current.setPointPositions(pointPositions);
      graphRef.current.setPointColors(pointColors);
      graphRef.current.setPointSizes(pointSizes);
      graphRef.current.setPointShapes(pointShapes);
      if (showEdgesRef.current && validLinks > 0) {
        graphRef.current.setLinks(links.slice(0, validLinks * 2));
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
  }, [nodes, edges, metadata, backgroundColor, handlePointClick, handlePointMouseOver, handlePointMouseOut]);

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
