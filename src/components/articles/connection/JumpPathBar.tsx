import { useState, useCallback, useRef, useEffect, useContext, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import {
  ConnectionContext,
  type ExtendedConnectionContextValue,
  type JumpGraph,
  type JumpEdge
} from './types';

interface JumpPathBarProps {
  graph: JumpGraph;
  currentArticleId: string;
  onNodeClick: (articleId: string) => void;
  onEdgeClick: (articleId: string, pointId: string) => void;
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
const DOCK_LEAVE_COLLAPSE_MS = 300;
const dockBodyTransition = {
  'duration': 0.28,
  'ease': [0.33, 1, 0.68, 1] as [number, number, number, number]
};

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

export function JumpPathBar ({ graph, currentArticleId, onNodeClick, onEdgeClick, onClear }: JumpPathBarProps) {
  const ctx = useContext(ConnectionContext) as ExtendedConnectionContextValue | null;
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltipData | null>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltipData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dockLeaveTimerRef = useRef<number | null>(null);

  const clearDockLeaveTimer = useCallback(() => {
    if (dockLeaveTimerRef.current !== null) {
      window.clearTimeout(dockLeaveTimerRef.current);
      dockLeaveTimerRef.current = null;
    }
  }, []);

  const handleTitlePointerEnter = useCallback(() => {
    clearDockLeaveTimer();
    setCollapsed(false);
  }, [clearDockLeaveTimer]);

  const handleRegionPointerLeave = useCallback(() => {
    clearDockLeaveTimer();
    dockLeaveTimerRef.current = window.setTimeout(() => {
      setCollapsed(true);
      dockLeaveTimerRef.current = null;
    }, DOCK_LEAVE_COLLAPSE_MS);
  }, [clearDockLeaveTimer]);

  const handleToggleCollapsed = useCallback(() => {
    clearDockLeaveTimer();
    setCollapsed(c => !c);
  }, [clearDockLeaveTimer]);

  useEffect(() => {
    return () => {
      clearDockLeaveTimer();
    };
  }, [clearDockLeaveTimer]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
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
  }, [graph.nodes, currentArticleId]);

  const enrichedEdges = useMemo(() => {
    if (!ctx) {
      return graph.edges;
    }

    return graph.edges.map(edge => {
      let connectionLabel = edge.connectionLabel;
      if (!connectionLabel && edge.connectionId) {
        const conn = ctx.state.connections.get(edge.connectionId);
        if (conn) {
          connectionLabel = conn.label;
        }
      }
      if (connectionLabel === edge.connectionLabel) {
        return edge;
      }
      return { ...edge, connectionLabel };
    });
  }, [graph.edges, ctx]);

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

  const svgWidth = graph.nodes.length * NODE_SPACING;
  const svgHeight = SVG_HEIGHT;

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
    for (const edge of enrichedEdges) {
      const key = `${edge.sourceArticleId}->${edge.targetArticleId}`;
      const group = groups.get(key) || [];
      group.push(edge);
      groups.set(key, group);
    }
    return groups;
  }, [enrichedEdges]);

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

  const adjacentEdges = useMemo(() => enrichedEdges.filter(isAdjacentEdge), [enrichedEdges, isAdjacentEdge]);
  const arcEdges = useMemo(() => enrichedEdges.filter(e => !isAdjacentEdge(e)), [enrichedEdges, isAdjacentEdge]);

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
    onEdgeClick(
      edge.targetArticleId,
      edge.targetPointId || ''
    );
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
    setHoveredEdgeKey(`${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionId ?? ''}`);
  }, [graph.nodes]);

  const handleEdgeLeave = useCallback(() => {
    setEdgeTooltip(null);
    setHoveredEdgeKey(null);
  }, []);

  if (graph.nodes.length < 2) {
    return null;
  }

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
          <div className="flex items-center gap-1.5 mb-1">
            {edge.sourcePointColor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ 'background': edge.sourcePointColor }} />
            )}
            <span className="font-medium">{sourceTitle}</span>
            {edge.sourcePointText && (
              <span className="text-slate-400">&ldquo;{edge.sourcePointText}&rdquo;</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">→</span>
            {edge.connectionLabel && (
              <span className="text-indigo-500 dark:text-indigo-400">{edge.connectionLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {edge.targetPointColor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ 'background': edge.targetPointColor }} />
            )}
            <span className="font-medium">{targetTitle}</span>
            {edge.targetPointText && (
              <span className="text-slate-400">&ldquo;{edge.targetPointText}&rdquo;</span>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 print:hidden"
      onPointerLeave={handleRegionPointerLeave}
    >
      <div className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60">
        <div
          className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-1.5"
          onPointerEnter={handleTitlePointerEnter}
        >
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
            <span>跳转路线</span>
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
              title={collapsed ? '展开' : '收起'}
            >
              {collapsed
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="jump-path-body"
              initial={{ 'height': 0, 'opacity': 0 }}
              animate={{ 'height': 'auto', 'opacity': 1 }}
              exit={{ 'height': 0, 'opacity': 0 }}
              transition={dockBodyTransition}
              style={{ 'overflow': 'hidden' }}
            >
              <div className="max-w-7xl mx-auto px-4 pb-2">
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto scrollbar-none"
                  style={{ 'scrollbarWidth': 'none' }}
                >
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
                      const isHovered = hoveredEdgeKey === `${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionId ?? ''}`;
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
                      const isHovered = hoveredEdgeKey === `${edge.sourceArticleId}->${edge.targetArticleId}->${edge.connectionId ?? ''}`;
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {nodeTooltipEl}
      {edgeTooltipEl}
    </div>
  );
}
