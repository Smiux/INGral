import { useRef, useEffect, useCallback } from 'react';
import { Graph } from '@cosmos.gl/graph';
import type { SubjectNode, SubjectLink } from '../types';
import type { BaseRendererProps } from './types';
import { type CosmosGLSettings, DEFAULT_COSMOS_GL_SETTINGS } from './settingsTypes';
import { calculateRadialPositions } from './layoutUtils';

interface CosmosGLRendererProps extends BaseRendererProps {
  graphData: {
    nodes: SubjectNode[];
    links: SubjectLink[];
  };
  settings?: CosmosGLSettings;
}

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

const SPACE_SIZE = 8192;

const findNodeAtPosition = (
  graph: Graph,
  nodes: SubjectNode[],
  screenX: number,
  screenY: number
): SubjectNode | null => {
  const spacePos = graph.screenToSpacePosition([screenX, screenY]);
  const positions = graph.getPointPositions();

  let closestNode: SubjectNode | null = null;
  let closestDist = Infinity;

  for (let i = 0; i < positions.length; i += 2) {
    const px = positions[i];
    const py = positions[i + 1];
    const nodeIndex = i / 2;
    const node = nodes[nodeIndex];
    if (px !== undefined && py !== undefined && node) {
      const nodeSize = Math.max(10, (node.val ?? 5) * 0.8);
      const dist = Math.hypot(spacePos[0] - px, spacePos[1] - py);
      if (dist < nodeSize && dist < closestDist) {
        closestDist = dist;
        closestNode = node;
      }
    }
  }
  return closestNode;
};

export default function CosmosGLRenderer ({
  graphData,
  dimensions,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  backgroundColor = '#171717',
  settings = DEFAULT_COSMOS_GL_SETTINGS
}: CosmosGLRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const nodesRef = useRef<SubjectNode[]>([]);
  const initializedRef = useRef(false);
  const settingsRef = useRef(settings);

  const handleSimulationEnd = useCallback(() => {
    if (graphRef.current && !settingsRef.current.simulationPaused) {
      graphRef.current.start(0.5);
    }
  }, []);

  const handlePointClick = useCallback((pointIndex: number) => {
    const node = nodesRef.current[pointIndex];
    if (node) {
      const mockEvent = new MouseEvent('click');
      onNodeClick(node, mockEvent);
    }
  }, [onNodeClick]);

  const handlePointMouseOver = useCallback((pointIndex: number) => {
    const node = nodesRef.current[pointIndex];
    if (node) {
      onNodeHover(node);
    }
  }, [onNodeHover]);

  const handlePointMouseOut = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    if (!graphRef.current || !containerRef.current) {
      return;
    }

    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const node = findNodeAtPosition(graphRef.current, nodesRef.current, x, y);

    if (node) {
      onNodeRightClick(node, event);
    }
  }, [onNodeRightClick]);

  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) {
      return undefined;
    }

    nodesRef.current = graphData.nodes;

    const initConfig = {
      'spaceSize': SPACE_SIZE,
      backgroundColor,
      'pointDefaultColor': '#60A5FA',
      'simulationFriction': settings.simulationFriction,
      'simulationGravity': settings.simulationGravity,
      'simulationRepulsion': settings.simulationRepulsion,
      'simulationDecay': 10000,
      'curvedLinks': settings.curvedLinks,
      'fitViewOnInit': true,
      'fitViewDelay': 500,
      'fitViewPadding': 0.2,
      'enableDrag': true,
      'enableZoom': true,
      'linkDefaultArrows': settings.linkDefaultArrows,
      'linkArrowsSizeScale': 0.8,
      'pointSizeScale': settings.pointSizeScale,
      'linkWidthScale': settings.linkWidthScale,
      'pointOpacity': settings.pointOpacity,
      'linkOpacity': settings.linkOpacity,
      'onPointClick': handlePointClick,
      'onPointMouseOver': handlePointMouseOver,
      'onPointMouseOut': handlePointMouseOut,
      'onSimulationEnd': handleSimulationEnd
    };

    if (!initializedRef.current) {
      if (graphRef.current) {
        graphRef.current.destroy?.();
      }

      graphRef.current = new Graph(containerRef.current, initConfig);

      const numPoints = graphData.nodes.length;
      const pointPositions = new Float32Array(numPoints * 2);
      const pointColors = new Float32Array(numPoints * 4);
      const pointSizes = new Float32Array(numPoints);

      const radialPositions = calculateRadialPositions(graphData.nodes, graphData.links, SPACE_SIZE);

      graphData.nodes.forEach((node, index) => {
        const pos = radialPositions.get(node.id);
        pointPositions[index * 2] = pos?.x ?? SPACE_SIZE / 2;
        pointPositions[index * 2 + 1] = pos?.y ?? SPACE_SIZE / 2;

        const [r, g, b] = hslToRgb(node.color);
        pointColors[index * 4] = r;
        pointColors[index * 4 + 1] = g;
        pointColors[index * 4 + 2] = b;
        pointColors[index * 4 + 3] = 1.0;

        pointSizes[index] = Math.max(3, node.val * 0.8);
      });

      const nodeIdToIndex = new Map<string, number>();
      graphData.nodes.forEach((node, index) => {
        nodeIdToIndex.set(node.id, index);
      });

      const links = new Float32Array(graphData.links.length * 2);
      graphData.links.forEach((link, index) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as SubjectNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as SubjectNode).id;
        const sourceIndex = nodeIdToIndex.get(sourceId);
        const targetIndex = nodeIdToIndex.get(targetId);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          links[index * 2] = sourceIndex;
          links[index * 2 + 1] = targetIndex;
        }
      });

      graphRef.current.setPointPositions(pointPositions);
      graphRef.current.setPointColors(pointColors);
      graphRef.current.setPointSizes(pointSizes);
      graphRef.current.setLinks(links);
      graphRef.current.render();

      if (settings.simulationPaused) {
        graphRef.current.pause();
      }

      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('contextmenu', handleContextMenu);
      }

      initializedRef.current = true;
    } else if (graphRef.current) {
      graphRef.current.setConfig({
        'simulationFriction': settings.simulationFriction,
        'simulationGravity': settings.simulationGravity,
        'simulationRepulsion': settings.simulationRepulsion,
        'curvedLinks': settings.curvedLinks,
        'linkDefaultArrows': settings.linkDefaultArrows,
        'pointSizeScale': settings.pointSizeScale,
        'linkWidthScale': settings.linkWidthScale,
        'pointOpacity': settings.pointOpacity,
        'linkOpacity': settings.linkOpacity
      });
    }

    const currentContainer = containerRef.current;
    return () => {
      const canvas = currentContainer?.querySelector('canvas');
      if (canvas) {
        canvas.removeEventListener('contextmenu', handleContextMenu);
      }
      if (graphRef.current) {
        graphRef.current.destroy?.();
        graphRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [graphData, settings, handlePointClick, handlePointMouseOver, handlePointMouseOut, handleSimulationEnd, handleContextMenu, backgroundColor]);

  useEffect(() => {
    settingsRef.current = settings;
    if (graphRef.current && initializedRef.current) {
      graphRef.current.setConfig({
        'simulationFriction': settings.simulationFriction,
        'simulationGravity': settings.simulationGravity,
        'simulationRepulsion': settings.simulationRepulsion,
        'curvedLinks': settings.curvedLinks,
        'linkDefaultArrows': settings.linkDefaultArrows,
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
      containerRef.current.style.width = `${dimensions.width}px`;
      containerRef.current.style.height = `${dimensions.height}px`;
    }
  }, [dimensions]);

  return (
    <div
      ref={containerRef}
      style={{
        'width': dimensions.width,
        'height': dimensions.height,
        'cursor': 'grab'
      }}
    />
  );
}
