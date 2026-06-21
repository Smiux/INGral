import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronUp, ChevronDown, Circle, Minus } from 'lucide-react';
import {
  type JumpGraph,
  type JumpEdge,
  dockBodyTransition
} from './jumpTypes';
import {
  useJumpGraphStore,
  setArrangementMode,
  setJumpPathCollapsed,
  type ArrangementMode
} from './jumpGraphStore';

interface JumpPathBarProps {
  graph: JumpGraph;
  currentArticleId: string;
  onNodeClick: (articleId: string) => void;
  onEdgeClick: (edge: JumpEdge) => void;
  onClear: () => void;
}

interface NodeTooltipData {
  articleTitle: string;
  rect: DOMRect;
}

interface EdgeTooltipData {
  edge: JumpEdge;
  sourceTitle: string;
  targetTitle: string;
  rect: DOMRect;
}

const NODE_SPACING = 100;
const NODE_RADIUS = 6;
const CHAIN_Y = 60;
const SVG_HEIGHT = 120;
const TEXT_Y_OFFSET = 18;
const MIN_ARC_HEIGHT = 16;
const ARC_HEIGHT_PER_STEP = 10;
const MAX_ARC_HEIGHT = 44;
const PARALLEL_LINE_GAP = 5;
const PARALLEL_ARC_GAP = 10;
const ADJACENT_ARC_HEIGHT = 14;
const ARROW_SIZE = 5;
const DOCK_HEIGHT = 200;

interface ArcInfo {
  pathD: string;
  endX: number;
  endY: number;
  cpX: number;
  cpY: number;
}

interface ShortenParams {
  endX: number;
  endY: number;
  cpX: number;
  cpY: number;
  offset: number;
}

function shortenEndpoint (params: ShortenParams): { 'x': number; 'y': number } {
  const { endX, endY, cpX, cpY, offset } = params;
  const dx = endX - cpX;
  const dy = endY - cpY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return { 'x': endX, 'y': endY };
  }
  return {
    'x': endX - (dx / len) * offset,
    'y': endY - (dy / len) * offset
  };
}

function getAdjacentArcInfo (x1: number, x2: number, isUp: boolean, heightOffset: number = 0): ArcInfo {
  const midX = (x1 + x2) / 2;
  const arcHeight = ADJACENT_ARC_HEIGHT + heightOffset;
  const cpY = isUp ? CHAIN_Y - arcHeight : CHAIN_Y + arcHeight;
  const end = shortenEndpoint({ 'endX': x2, 'endY': CHAIN_Y, 'cpX': midX, cpY, 'offset': NODE_RADIUS });
  return {
    'pathD': `M ${x1} ${CHAIN_Y} Q ${midX} ${cpY} ${end.x} ${end.y}`,
    'endX': end.x,
    'endY': end.y,
    'cpX': midX,
    cpY
  };
}

function getArcInfo (x1: number, x2: number, isUp: boolean, heightOffset: number): ArcInfo {
  const distance = Math.abs(x2 - x1);
  const steps = Math.round(distance / NODE_SPACING);
  const baseHeight = Math.min(MAX_ARC_HEIGHT, MIN_ARC_HEIGHT + steps * ARC_HEIGHT_PER_STEP);
  const arcHeight = baseHeight + heightOffset;
  const midX = (x1 + x2) / 2;
  const cpY = isUp ? CHAIN_Y - arcHeight : CHAIN_Y + arcHeight;
  const end = shortenEndpoint({ 'endX': x2, 'endY': CHAIN_Y, 'cpX': midX, cpY, 'offset': NODE_RADIUS });
  return {
    'pathD': `M ${x1} ${CHAIN_Y} Q ${midX} ${cpY} ${end.x} ${end.y}`,
    'endX': end.x,
    'endY': end.y,
    'cpX': midX,
    cpY
  };
}

function getArcArrowPoints (info: ArcInfo): string {
  const dx = info.endX - info.cpX;
  const dy = info.endY - info.cpY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return '';
  }
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tipX = info.endX;
  const tipY = info.endY;
  const baseX = tipX - ux * ARROW_SIZE;
  const baseY = tipY - uy * ARROW_SIZE;
  const leftX = baseX + px * (ARROW_SIZE * 0.6);
  const leftY = baseY + py * (ARROW_SIZE * 0.6);
  const rightX = baseX - px * (ARROW_SIZE * 0.6);
  const rightY = baseY - py * (ARROW_SIZE * 0.6);
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function getCircularNodePosition (params: { index: number; total: number; cx: number; cy: number; radius: number }): { x: number; y: number } {
  const { index, total, cx, cy, radius } = params;
  const theta = -Math.PI / 2 + index * (2 * Math.PI / total);
  return {
    'x': cx + radius * Math.cos(theta),
    'y': cy + radius * Math.sin(theta)
  };
}

function getCircularEdgePath (params: { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number }): string {
  const { x1, y1, x2, y2, cx, cy } = params;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return '';
  }
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function getCircularArrowPoints (params: { cpX: number; cpY: number; x2: number; y2: number; offset: number }): string {
  const { cpX, cpY, x2, y2, offset } = params;
  const dx = x2 - cpX;
  const dy = y2 - cpY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return '';
  }
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tipX = x2 - ux * offset;
  const tipY = y2 - uy * offset;
  const baseX = tipX - ux * ARROW_SIZE;
  const baseY = tipY - uy * ARROW_SIZE;
  const leftX = baseX + px * (ARROW_SIZE * 0.6);
  const leftY = baseY + py * (ARROW_SIZE * 0.6);
  const rightX = baseX - px * (ARROW_SIZE * 0.6);
  const rightY = baseY - py * (ARROW_SIZE * 0.6);
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

export function JumpPathBar ({
  graph,
  currentArticleId,
  onNodeClick,
  onEdgeClick,
  onClear
}: JumpPathBarProps) {
  const { arrangementMode, jumpPathCollapsed } = useJumpGraphStore();
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltipData | null>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltipData | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ 'x': 0, 'y': 0 });
  const [zoom, setZoom] = useState(1);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ 'x': 0, 'y': 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleCollapsed = useCallback(() => {
    setJumpPathCollapsed(!jumpPathCollapsed);
  }, [jumpPathCollapsed]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || arrangementMode === 'circular') {
      return;
    }
    const currentIdx = graph.nodes.findIndex(n => n.articleId === currentArticleId);
    if (currentIdx < 0) {
      container.scrollLeft = container.scrollWidth;
      return;
    }
    const targetX = currentIdx * NODE_SPACING + NODE_SPACING / 2;
    const containerWidth = container.clientWidth;
    const scrollTarget = targetX - containerWidth / 2;
    container.scrollLeft = Math.max(0, Math.min(scrollTarget, container.scrollWidth - containerWidth));
  }, [graph.nodes, currentArticleId, arrangementMode]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (arrangementMode !== 'circular') {
      return;
    }
    isPanningRef.current = true;
    lastPointerRef.current = { 'x': e.clientX, 'y': e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [arrangementMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) {
      return;
    }
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { 'x': e.clientX, 'y': e.clientY };
    setPanOffset(prev => ({ 'x': prev.x + dx, 'y': prev.y + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (arrangementMode !== 'circular') {
      return;
    }
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  }, [arrangementMode]);

  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    graph.nodes.forEach((node, i) => {
      map.set(node.articleId, i);
    });
    return map;
  }, [graph.nodes]);

  const getNodeX = useCallback((articleId: string): number | null => {
    const idx = nodeIndexMap.get(articleId);
    if (idx === undefined) {
      return null;
    }
    return idx * NODE_SPACING + NODE_SPACING / 2;
  }, [nodeIndexMap]);

  const isAdjacentEdge = useCallback((edge: { sourceArticleId: string; targetArticleId: string }): boolean => {
    const srcIdx = nodeIndexMap.get(edge.sourceArticleId);
    const tgtIdx = nodeIndexMap.get(edge.targetArticleId);
    if (srcIdx === undefined || tgtIdx === undefined) {
      return false;
    }
    return Math.abs(srcIdx - tgtIdx) === 1;
  }, [nodeIndexMap]);

  const edgeGroups = useMemo(() => {
    const groups = new Map<string, JumpEdge[]>();
    for (const edge of graph.edges) {
      const key = `${edge.sourceArticleId}->${edge.targetArticleId}`;
      const group = groups.get(key) || [];
      group.push(edge);
      groups.set(key, group);
    }
    return groups;
  }, [graph.edges]);

  const bidirectionalPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const key of edgeGroups.keys()) {
      const [src, tgt] = key.split('->');
      const reverseKey = `${tgt}->${src}`;
      if (edgeGroups.has(reverseKey)) {
        const pairKey = [src, tgt].sort().join('<->');
        pairs.add(pairKey);
      }
    }
    return pairs;
  }, [edgeGroups]);

  const isBidirectional = useCallback((edge: { sourceArticleId: string; targetArticleId: string }): boolean => {
    const pairKey = [edge.sourceArticleId, edge.targetArticleId].sort().join('<->');
    return bidirectionalPairs.has(pairKey);
  }, [bidirectionalPairs]);

  const getEdgeIndex = useCallback((edge: JumpEdge): { index: number; total: number } => {
    const key = `${edge.sourceArticleId}->${edge.targetArticleId}`;
    const group = edgeGroups.get(key);
    if (!group) {
      return { 'index': 0, 'total': 1 };
    }
    const index = group.indexOf(edge);
    return { index, 'total': group.length };
  }, [edgeGroups]);

  const adjacentEdges = useMemo(() => graph.edges.filter(isAdjacentEdge), [graph.edges, isAdjacentEdge]);
  const arcEdges = useMemo(() => graph.edges.filter(e => !isAdjacentEdge(e)), [graph.edges, isAdjacentEdge]);

  const handleNodeClick = useCallback((articleId: string) => {
    onNodeClick(articleId);
  }, [onNodeClick]);

  const handleNodeEnter = useCallback((articleTitle: string, e: React.MouseEvent) => {
    setNodeTooltip({
      articleTitle,
      'rect': (e.currentTarget as HTMLElement).getBoundingClientRect()
    });
  }, []);

  const handleNodeLeave = useCallback(() => {
    setNodeTooltip(null);
  }, []);

  const handleEdgeClick = useCallback((edge: JumpEdge) => {
    onEdgeClick(edge);
  }, [onEdgeClick]);

  const handleEdgeEnter = useCallback((edge: JumpEdge, e: React.MouseEvent) => {
    const srcNode = graph.nodes.find(n => n.articleId === edge.sourceArticleId);
    const tgtNode = graph.nodes.find(n => n.articleId === edge.targetArticleId);
    setEdgeTooltip({
      edge,
      'sourceTitle': srcNode?.articleTitle || '',
      'targetTitle': tgtNode?.articleTitle || '',
      'rect': (e.currentTarget as HTMLElement).getBoundingClientRect()
    });
    setHoveredEdgeKey(`${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionLabel ?? ''}`);
  }, [graph.nodes]);

  const handleEdgeLeave = useCallback(() => {
    setEdgeTooltip(null);
    setHoveredEdgeKey(null);
  }, []);

  const handleArrangementChange = useCallback((mode: ArrangementMode) => {
    setPanOffset({ 'x': 0, 'y': 0 });
    setZoom(1);
    setArrangementMode(mode);
  }, []);

  const isEmptyView = graph.edges.length === 0;

  const nodeTooltipEl = nodeTooltip && (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        'left': nodeTooltip.rect.left + nodeTooltip.rect.width / 2,
        'bottom': window.innerHeight - nodeTooltip.rect.top + 8,
        'transform': 'translateX(-50%)'
      }}
    >
      <div className="px-3 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 rounded text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {nodeTooltip.articleTitle}
      </div>
    </div>
  );

  const edgeTooltipEl = edgeTooltip && (() => {
    const { edge, sourceTitle, targetTitle, rect } = edgeTooltip;
    return (
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          'left': rect.left + rect.width / 2,
          'bottom': window.innerHeight - rect.top + 8,
          'transform': 'translateX(-50%)'
        }}
      >
        <div className="px-3 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 rounded text-xs text-slate-700 dark:text-slate-300 max-w-[400px]">
          <span className="font-medium">{sourceTitle}</span>
          {edge.connectionLabel && (
            <span className="text-indigo-500 dark:text-indigo-400"> —{edge.connectionLabel}→ </span>
          )}
          {!edge.connectionLabel && (
            <span className="text-slate-400"> → </span>
          )}
          <span className="font-medium">{targetTitle}</span>
        </div>
      </div>
    );
  })();

  const renderLinearLayout = () => {
    const svgWidth = graph.nodes.length * NODE_SPACING;
    const svgHeight = SVG_HEIGHT;

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="flex-shrink-0"
      >
        {adjacentEdges.map(edge => {
          const x1 = getNodeX(edge.sourceArticleId);
          const x2 = getNodeX(edge.targetArticleId);
          if (x1 === null || x2 === null) {
            return null;
          }
          const srcIdx = nodeIndexMap.get(edge.sourceArticleId)!;
          const tgtIdx = nodeIndexMap.get(edge.targetArticleId)!;
          const isForward = srcIdx < tgtIdx;
          const { index, total } = getEdgeIndex(edge);
          const bidi = isBidirectional(edge);
          const startX = isForward ? x1 + NODE_RADIUS : x1 - NODE_RADIUS;
          const endX = isForward ? x2 - NODE_RADIUS : x2 + NODE_RADIUS;
          const isHovered = hoveredEdgeKey === `${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionLabel ?? ''}`;
          const adjColor = isHovered ? 'text-sky-500 dark:text-sky-400' : 'text-slate-300 dark:text-slate-600';
          const adjFill = isHovered ? 'fill-sky-500 dark:fill-sky-400' : 'fill-slate-300 dark:fill-slate-600';

          if (bidi) {
            const isUp = isForward;
            const heightOffset = index * PARALLEL_ARC_GAP;
            const arcInfo = getAdjacentArcInfo(startX, endX, isUp, heightOffset);
            const arrowPoints = getArcArrowPoints(arcInfo);

            return (
              <g
                key={`adj-${edge.sourceArticleId}-${edge.targetArticleId}-${index}`}
                className="cursor-pointer"
                onClick={() => handleEdgeClick(edge)}
                onMouseEnter={(e) => handleEdgeEnter(edge, e)}
                onMouseLeave={handleEdgeLeave}
              >
                <path
                  d={arcInfo.pathD}
                  fill="none"
                  stroke="currentColor"
                  className={adjColor}
                  strokeWidth={2}
                />
                <path
                  d={arcInfo.pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={10}
                />
                {arrowPoints && (
                  <polygon
                    points={arrowPoints}
                    className={adjFill}
                  />
                )}
              </g>
            );
          }

          const yOffset = total > 1 ? (index - (total - 1) / 2) * PARALLEL_LINE_GAP : 0;
          const y = CHAIN_Y + yOffset;

          return (
            <g
              key={`adj-${edge.sourceArticleId}-${edge.targetArticleId}-${index}`}
              className="cursor-pointer"
              onClick={() => handleEdgeClick(edge)}
              onMouseEnter={(e) => handleEdgeEnter(edge, e)}
              onMouseLeave={handleEdgeLeave}
            >
              <line
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke="currentColor"
                className={adjColor}
                strokeWidth={2}
              />
              <line
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke="transparent"
                strokeWidth={10}
              />
              <polygon
                points={`${endX},${y} ${endX - (isForward ? 5 : -5)},${y - 3} ${endX - (isForward ? 5 : -5)},${y + 3}`}
                className={adjFill}
              />
            </g>
          );
        })}

        {arcEdges.map(edge => {
          const x1 = getNodeX(edge.sourceArticleId);
          const x2 = getNodeX(edge.targetArticleId);
          if (x1 === null || x2 === null) {
            return null;
          }
          const srcIdx = nodeIndexMap.get(edge.sourceArticleId)!;
          const tgtIdx = nodeIndexMap.get(edge.targetArticleId)!;
          const isForward = srcIdx < tgtIdx;
          const isUp = isForward;
          const { index } = getEdgeIndex(edge);
          const heightOffset = index * PARALLEL_ARC_GAP;
          const arcInfo = getArcInfo(x1, x2, isUp, heightOffset);
          const arrowPoints = getArcArrowPoints(arcInfo);
          const isHovered = hoveredEdgeKey === `${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionLabel ?? ''}`;
          const arcColor = isHovered ? 'text-sky-500 dark:text-sky-400' : 'text-indigo-400 dark:text-indigo-500';
          const arcFill = isHovered ? 'fill-sky-500 dark:fill-sky-400' : 'fill-indigo-400 dark:fill-indigo-500';

          return (
            <g
              key={`arc-${edge.sourceArticleId}-${edge.targetArticleId}-${index}`}
              className="cursor-pointer"
              onClick={() => handleEdgeClick(edge)}
              onMouseEnter={(e) => handleEdgeEnter(edge, e)}
              onMouseLeave={handleEdgeLeave}
            >
              <path
                d={arcInfo.pathD}
                fill="none"
                stroke="currentColor"
                className={arcColor}
                strokeWidth={1.5}
                strokeDasharray={isForward ? 'none' : '4 2'}
              />
              <path
                d={arcInfo.pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
              />
              {arrowPoints && (
                <polygon
                  points={arrowPoints}
                  className={arcFill}
                />
              )}
            </g>
          );
        })}

        {graph.nodes.map((node, i) => {
          const x = i * NODE_SPACING + NODE_SPACING / 2;
          const isCurrent = node.articleId === currentArticleId;

          return (
            <g
              key={node.articleId}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node.articleId)}
              onMouseEnter={(e) => handleNodeEnter(node.articleTitle, e)}
              onMouseLeave={handleNodeLeave}
            >
              <circle
                cx={x}
                cy={CHAIN_Y}
                r={NODE_RADIUS + 4}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={CHAIN_Y}
                r={NODE_RADIUS}
                className={isCurrent
                  ? 'fill-sky-500 dark:fill-sky-400'
                  : 'fill-slate-400 dark:fill-slate-500'}
                stroke={isCurrent ? 'currentColor' : 'none'}
                strokeWidth={isCurrent ? 2 : 0}
              />
              {isCurrent && (
                <circle
                  cx={x}
                  cy={CHAIN_Y}
                  r={NODE_RADIUS + 3}
                  fill="none"
                  className="stroke-sky-400 dark:stroke-sky-500"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}
              <text
                x={x}
                y={CHAIN_Y + TEXT_Y_OFFSET}
                textAnchor="middle"
                className={`text-[9px] fill-slate-500 dark:fill-slate-400 ${isCurrent ? 'font-bold' : ''}`}
              >
                {node.articleTitle.length > 6
                  ? `${node.articleTitle.slice(0, 5)}…`
                  : node.articleTitle}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderCircularLayout = () => {
    const svgWidth = 400;
    const svgHeight = DOCK_HEIGHT - 40;
    const cx = svgWidth / 2;
    const cy = svgHeight / 2;
    const radius = Math.min(svgWidth, svgHeight) * 0.38;
    const N = graph.nodes.length;

    const nodePositions = graph.nodes.map((_, i) =>
      getCircularNodePosition({ 'index': i, 'total': N, cx, cy, radius })
    );

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="flex-shrink-0"
        style={{
          'transform': `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          'transformOrigin': 'center center'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {graph.edges.map((edge, edgeIdx) => {
          const srcIdx = nodeIndexMap.get(edge.sourceArticleId);
          const tgtIdx = nodeIndexMap.get(edge.targetArticleId);
          if (srcIdx === undefined || tgtIdx === undefined) {
            return null;
          }
          const srcPos = nodePositions[srcIdx]!;
          const tgtPos = nodePositions[tgtIdx]!;
          const pathD = getCircularEdgePath({ 'x1': srcPos.x, 'y1': srcPos.y, 'x2': tgtPos.x, 'y2': tgtPos.y, cx, cy });
          const isHovered = hoveredEdgeKey === `${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionLabel ?? ''}`;
          const edgeColor = isHovered ? 'text-sky-500 dark:text-sky-400' : 'text-indigo-400 dark:text-indigo-500';
          const edgeFill = isHovered ? 'fill-sky-500 dark:fill-sky-400' : 'fill-indigo-400 dark:fill-indigo-500';
          const arrowPoints = getCircularArrowPoints({ 'cpX': cx, 'cpY': cy, 'x2': tgtPos.x, 'y2': tgtPos.y, 'offset': NODE_RADIUS });

          return (
            <g
              key={`circ-edge-${edgeIdx}-${edge.sourceArticleId}-${edge.targetArticleId}`}
              className="cursor-pointer"
              onClick={() => handleEdgeClick(edge)}
              onMouseEnter={(e) => handleEdgeEnter(edge, e)}
              onMouseLeave={handleEdgeLeave}
            >
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                className={edgeColor}
                strokeWidth={1.5}
              />
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
              />
              {arrowPoints && (
                <polygon
                  points={arrowPoints}
                  className={edgeFill}
                />
              )}
            </g>
          );
        })}

        {graph.nodes.map((node, i) => {
          const pos = nodePositions[i]!;
          const isCurrent = node.articleId === currentArticleId;

          return (
            <g
              key={`circ-node-${node.articleId}`}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node.articleId)}
              onMouseEnter={(e) => handleNodeEnter(node.articleTitle, e)}
              onMouseLeave={handleNodeLeave}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS + 4}
                fill="transparent"
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                className={isCurrent
                  ? 'fill-sky-500 dark:fill-sky-400'
                  : 'fill-slate-400 dark:fill-slate-500'}
                stroke={isCurrent ? 'currentColor' : 'none'}
                strokeWidth={isCurrent ? 2 : 0}
              />
              {isCurrent && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS + 3}
                  fill="none"
                  className="stroke-sky-400 dark:stroke-sky-500"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}
              <text
                x={pos.x}
                y={pos.y + TEXT_Y_OFFSET}
                textAnchor="middle"
                className={`text-[9px] fill-slate-500 dark:fill-slate-400 ${isCurrent ? 'font-bold' : ''}`}
              >
                {node.articleTitle.length > 6
                  ? `${node.articleTitle.slice(0, 5)}…`
                  : node.articleTitle}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <span>跳转路线</span>
          <div className="flex items-center gap-1 border-l border-slate-200/60 dark:border-slate-700/60 pl-2">
            <button
              onClick={() => handleArrangementChange('circular')}
              className={`p-0.5 rounded transition-colors ${arrangementMode === 'circular' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}`}
              title="圆形排列"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleArrangementChange('linear')}
              className={`p-0.5 rounded transition-colors ${arrangementMode === 'linear' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}`}
              title="直线排列"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-500 dark:hover:text-slate-400 rounded hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
            title="清除路线"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleCollapsed}
            className="p-1 text-slate-400 hover:text-slate-500 dark:hover:text-slate-400 rounded hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
            title={jumpPathCollapsed ? '展开' : '收起'}
          >
            {jumpPathCollapsed
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!jumpPathCollapsed && (
          <motion.div
            key="jump-path-body"
            initial={{ 'height': 0, 'opacity': 0 }}
            animate={{ 'height': 'auto', 'opacity': 1 }}
            exit={{ 'height': 0, 'opacity': 0 }}
            transition={dockBodyTransition}
            style={{ 'overflow': 'hidden' }}
          >
            {isEmptyView ? (
              <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                暂无跳转记录
              </div>
            ) : (
              <div className="max-w-7xl mx-auto px-4 pb-2" style={{ 'height': DOCK_HEIGHT - 40 }}>
                {arrangementMode === 'linear' ? (
                  <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scrollbar-none h-full"
                    style={{ 'scrollbarWidth': 'none' }}
                  >
                    {renderLinearLayout()}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center overflow-hidden">
                    {renderCircularLayout()}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {nodeTooltipEl}
      {edgeTooltipEl}
    </div>
  );
}
