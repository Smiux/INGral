import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence, motion } from 'framer-motion';
import { Signpost, Compass } from 'lucide-react';
import { getGalleryById } from '@/services/galleryService';
import type { ArticleEdge, ArticleNode, ArticleNodeData } from '@/components/gallerys/gallery';

type ExploreRole = 'current' | 'incoming' | 'outgoing' | 'both';

interface ExploreArticleNodeData extends Record<string, unknown> {
  role: ExploreRole;
  title: string;
  navId: string;
  isEmbedded: boolean;
}

const NODE_W = 200;
const NODE_H = 80;
const STACK_GAP = 28;
const SIDE_X = 64;
const INCOMING_STROKE = '#d97706';
const OUTGOING_STROKE = '#0284c7';
const BIDIRECTIONAL_STROKE = '#7c3aed';

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
  'opacity': 0,
  'pointerEvents': 'none',
  'width': 1,
  'height': 1,
  'minWidth': 0,
  'minHeight': 0,
  'border': 'none',
  'background': 'transparent'
};

const dockBodyTransition = {
  'duration': 0.28,
  'ease': [0.33, 1, 0.68, 1] as [number, number, number, number]
};

function pickEdgeHandles (
  source: string,
  target: string,
  currentId: string,
  bothSet: Set<string>
): { sourceHandle: string; targetHandle: string } {
  if (bothSet.has(source) && target === currentId) {
    return { 'sourceHandle': 'bo', 'targetHandle': 'ti' };
  }
  if (source === currentId && bothSet.has(target)) {
    return { 'sourceHandle': 'to', 'targetHandle': 'bi' };
  }
  return { 'sourceHandle': 'ro', 'targetHandle': 'li' };
}

function uniq (ids: string[]): string[] {
  return [...new Set(ids)];
}

interface NeighborhoodLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  contentWidth: number;
  contentHeight: number;
}

function layoutExploreNeighborhood (params: {
  currentId: string;
  incomingOnly: string[];
  outgoingOnly: string[];
  bothIds: string[];
}): NeighborhoodLayoutResult {
  const { currentId, incomingOnly, outgoingOnly, bothIds } = params;
  const positions = new Map<string, { x: number; y: number }>();

  const bothRowTop = 24;
  const contentWidth = Math.max(800, 360 + bothIds.length * (NODE_W + 32));
  const mainTop = bothIds.length > 0 ? bothRowTop + NODE_H + 52 : 40;
  const stackCount = Math.max(incomingOnly.length, outgoingOnly.length, 1);
  const stackPixelHeight = stackCount * (NODE_H + STACK_GAP) - STACK_GAP;
  const contentHeight = Math.max(440, mainTop + stackPixelHeight + 96);

  const midY = mainTop + (contentHeight - mainTop) / 2;
  const cx = contentWidth / 2 - NODE_W / 2;
  positions.set(currentId, { 'x': cx, 'y': midY - NODE_H / 2 });

  if (bothIds.length > 0) {
    const innerLeft = SIDE_X + Math.floor(NODE_W * 0.25);
    const innerRight = contentWidth - innerLeft - NODE_W;
    const span = Math.max(innerRight - innerLeft, NODE_W);
    const step = NODE_W + 28;
    const rowWidth = bothIds.length * step - 28;
    const startX = innerLeft + Math.max(0, (span - rowWidth) / 2);
    bothIds.forEach((id, i) => {
      positions.set(id, { 'x': startX + i * step, 'y': bothRowTop });
    });
  }

  const leftX = SIDE_X;
  const rightX = contentWidth - SIDE_X - NODE_W;

  incomingOnly.forEach((id, i) => {
    const total = incomingOnly.length * (NODE_H + STACK_GAP) - STACK_GAP;
    const y0 = midY - total / 2;
    positions.set(id, { 'x': leftX, 'y': y0 + i * (NODE_H + STACK_GAP) });
  });

  outgoingOnly.forEach((id, i) => {
    const total = outgoingOnly.length * (NODE_H + STACK_GAP) - STACK_GAP;
    const y0 = midY - total / 2;
    positions.set(id, { 'x': rightX, 'y': y0 + i * (NODE_H + STACK_GAP) });
  });

  return { positions, contentWidth, contentHeight };
}

function directedEdgeKey (e: ArticleEdge): string {
  return `${e.source}->${e.target}`;
}

function undirectedPairKey (u: string, v: string): string {
  return u < v ? `${u}~~${v}` : `${v}~~${u}`;
}

interface NeighborhoodGraphBuild {
  flowNodes: Node<ExploreArticleNodeData>[];
  flowEdges: Edge[];
  contentWidth: number;
  contentHeight: number;
}

function buildNeighborhoodGraph (
  nodes: ArticleNode[],
  edges: ArticleEdge[],
  currentNode: ArticleNode
): NeighborhoodGraphBuild {
  const currentId = currentNode.id;
  const incomingEdges = edges.filter((e) => e.target === currentId && e.source !== e.target);
  const outgoingEdges = edges.filter((e) => e.source === currentId && e.source !== e.target);

  const incomingSources = incomingEdges.map((e) => e.source);
  const outgoingTargets = outgoingEdges.map((e) => e.target);
  const incomingSet = new Set(incomingSources);
  const outgoingSet = new Set(outgoingTargets);

  const incomingOnly = uniq(incomingSources).filter((id) => !outgoingSet.has(id));
  const outgoingOnly = uniq(outgoingTargets).filter((id) => !incomingSet.has(id));
  const bothIds = uniq(incomingSources).filter((id) => outgoingSet.has(id));

  const { positions, contentWidth, contentHeight } = layoutExploreNeighborhood({
    currentId,
    incomingOnly,
    outgoingOnly,
    bothIds
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const flowNodes: Node<ExploreArticleNodeData>[] = [];
  const seen = new Set<string>();

  const pushNode = (id: string, role: ExploreRole): void => {
    if (seen.has(id)) {
      return;
    }
    const n = nodeById.get(id);
    const pos = positions.get(id);
    if (!n || !pos) {
      return;
    }
    const d = n.data as ArticleNodeData;
    const navId = d.isEmbedded ? (d.embeddedArticleId || d.articleSlug) : d.articleSlug;
    seen.add(id);
    flowNodes.push({
      'id': n.id,
      'type': 'exploreArticle',
      'position': pos,
      'width': NODE_W,
      'height': NODE_H,
      'data': {
        role,
        'title': d.articleTitle || '未命名',
        navId,
        'isEmbedded': Boolean(d.isEmbedded)
      },
      'selectable': role !== 'current'
    });
  };

  pushNode(currentId, 'current');

  incomingOnly.forEach((id) => {
    pushNode(id, 'incoming');
  });
  outgoingOnly.forEach((id) => {
    pushNode(id, 'outgoing');
  });
  bothIds.forEach((id) => {
    pushNode(id, 'both');
  });

  const inSubgraph = new Set(flowNodes.map((n) => n.id));
  const candidates = [...incomingEdges, ...outgoingEdges].filter(
    (e) => inSubgraph.has(e.source) && inSubgraph.has(e.target)
  );

  const uniqueByDirection = new Map<string, ArticleEdge>();
  for (const e of candidates) {
    const dk = directedEdgeKey(e);
    if (!uniqueByDirection.has(dk)) {
      uniqueByDirection.set(dk, e);
    }
  }
  const uniqueEdges = [...uniqueByDirection.values()];

  const mergedPairKeys = new Set<string>();
  const bothSet = new Set(bothIds);
  for (const e of uniqueEdges) {
    const pk = undirectedPairKey(e.source, e.target);
    if (!mergedPairKeys.has(pk)) {
      const reverse = uniqueByDirection.get(`${e.target}->${e.source}`);
      if (reverse) {
        mergedPairKeys.add(pk);
      }
    }
  }

  const flowEdges: Edge[] = [];
  const usedEdgeKeys = new Set<string>();

  for (const pk of mergedPairKeys) {
    const parts = pk.split('~~');
    const idA = parts[0];
    const idB = parts[1];
    if (idA && idB) {
      const neighborId = idA === currentId ? idB : idA;
      const source = currentId;
      const target = neighborId;
      const handles = pickEdgeHandles(source, target, currentId, bothSet);
      const stroke = BIDIRECTIONAL_STROKE;
      const marker = {
        'type': MarkerType.ArrowClosed,
        'width': 16,
        'height': 16,
        'color': stroke
      };
      const mergedId = `merged-${pk}`;
      usedEdgeKeys.add(mergedId);
      flowEdges.push({
        'id': mergedId,
        source,
        target,
        'sourceHandle': handles.sourceHandle,
        'targetHandle': handles.targetHandle,
        'type': 'smoothstep',
        'style': { stroke, 'strokeWidth': 2 },
        'markerEnd': marker,
        'markerStart': marker
      });
    }
  }

  for (const e of uniqueEdges) {
    const pk = undirectedPairKey(e.source, e.target);
    if (!mergedPairKeys.has(pk)) {
      const outgoing = e.source === currentId;
      const stroke = outgoing ? OUTGOING_STROKE : INCOMING_STROKE;
      const ek = e.id && String(e.id).length > 0 ? String(e.id) : `explore-${e.source}-${e.target}`;
      let edgeId = ek;
      let n = 0;
      while (usedEdgeKeys.has(edgeId)) {
        n += 1;
        edgeId = `${ek}~${n}`;
      }
      usedEdgeKeys.add(edgeId);
      const handles = pickEdgeHandles(e.source, e.target, currentId, bothSet);
      flowEdges.push({
        'id': edgeId,
        'source': e.source,
        'target': e.target,
        'sourceHandle': handles.sourceHandle,
        'targetHandle': handles.targetHandle,
        'type': 'smoothstep',
        'style': { stroke, 'strokeWidth': 2 },
        'markerEnd': {
          'type': MarkerType.ArrowClosed,
          'width': 18,
          'height': 18,
          'color': stroke
        }
      });
    }
  }

  return {
    flowNodes,
    flowEdges,
    contentWidth,
    contentHeight
  };
}

function exploreNodeRoleClass (role: ExploreRole): string {
  if (role === 'current') {
    return 'cursor-default border-sky-500 bg-sky-100/90 text-sky-900 ring-2 ring-sky-400/80 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-500/50';
  }
  if (role === 'incoming') {
    return 'cursor-pointer border-amber-500 bg-amber-50/90 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100';
  }
  if (role === 'outgoing') {
    return 'cursor-pointer border-sky-400 bg-sky-50/90 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100';
  }
  return 'cursor-pointer border-violet-500 bg-violet-50/90 text-violet-950 dark:bg-violet-950/35 dark:text-violet-100';
}

const ExploreArticleNode = memo((props: NodeProps<Node<ExploreArticleNodeData>>) => {
  const d = props.data;
  const base =
    'flex h-full w-full items-center justify-center rounded border-2 px-2 text-center text-xs font-medium leading-tight break-words';
  const roleClass = exploreNodeRoleClass(d.role);

  return (
    <div
      className="relative box-border"
      style={{ 'width': NODE_W, 'height': NODE_H }}
    >
      <Handle type="target" id="li" position={Position.Left} style={HIDDEN_HANDLE_STYLE} />
      <Handle type="source" id="ro" position={Position.Right} style={HIDDEN_HANDLE_STYLE} />
      <Handle
        type="target"
        id="ti"
        position={Position.Top}
        style={{ ...HIDDEN_HANDLE_STYLE, 'left': '40%' }}
      />
      <Handle
        type="source"
        id="to"
        position={Position.Top}
        style={{ ...HIDDEN_HANDLE_STYLE, 'left': '60%' }}
      />
      <Handle
        type="target"
        id="bi"
        position={Position.Bottom}
        style={{ ...HIDDEN_HANDLE_STYLE, 'left': '40%' }}
      />
      <Handle
        type="source"
        id="bo"
        position={Position.Bottom}
        style={{ ...HIDDEN_HANDLE_STYLE, 'left': '60%' }}
      />
      <div className={`${base} ${roleClass} box-border h-full w-full overflow-hidden`} title={d.title}>
        <span className="line-clamp-3">{d.title}</span>
      </div>
    </div>
  );
});

ExploreArticleNode.displayName = 'ExploreArticleNode';

const exploreNodeTypes: NodeTypes = {
  'exploreArticle': ExploreArticleNode
};

function ExploreGraphInner ({
  flowNodes,
  flowEdges,
  galleryId,
  contentWidth,
  contentHeight
}: {
  flowNodes: Node<ExploreArticleNodeData>[];
  flowEdges: Edge[];
  galleryId: string;
  contentWidth: number;
  contentHeight: number;
}) {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();

  useEffect(() => {
    const t = window.setTimeout(() => {
      fitView({
        'padding': 0.2,
        'duration': 220,
        'includeHiddenNodes': false
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [flowNodes, flowEdges, fitView, contentWidth, contentHeight]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<ExploreArticleNodeData>) => {
      const d = node.data;
      if (d.role === 'current') {
        return;
      }
      const q = d.isEmbedded ? `embedded=${encodeURIComponent(d.navId)}` : `article=${encodeURIComponent(d.navId)}`;
      navigate(`/gallerys/${galleryId}/explore?${q}`);
    },
    [galleryId, navigate]
  );

  return (
    <div style={{ 'width': '100%', 'height': '100%', 'minWidth': contentWidth, 'minHeight': contentHeight }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={exploreNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.25}
        maxZoom={1.6}
        onNodeClick={onNodeClick}
        colorMode="system"
        proOptions={{ 'hideAttribution': true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="!bg-slate-100/80 dark:!bg-slate-900/80" />
        <Controls showInteractive={false} className="!bg-slate-50/95 dark:!bg-slate-800/95 !border-slate-200/60 dark:!border-slate-600/60 !shadow-sm" />
      </ReactFlow>
    </div>
  );
}

function ExplorationDockTitleBar ({
  modeSwitch,
  onTitlePointerEnter
}: {
  modeSwitch?: ReactNode;
  onTitlePointerEnter: () => void;
}) {
  return (
    <div
      className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-2"
      onPointerEnter={onTitlePointerEnter}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Compass className="h-5 w-5 shrink-0 text-sky-500" />
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
          探索模式
        </span>
      </div>
      {modeSwitch}
    </div>
  );
}

interface ExplorationGraphPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSwitchToBeacon: () => void;
  onDockTitlePointerEnter: () => void;
  onDockRegionPointerLeave: () => void;
}

export const ExplorationGraphPanel = ({
  collapsed,
  onSwitchToBeacon,
  onDockTitlePointerEnter,
  onDockRegionPointerLeave
}: ExplorationGraphPanelProps) => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [searchParams] = useSearchParams();
  const articleSlug = searchParams.get('article');
  const embeddedArticleId = searchParams.get('embedded');

  const [isLoading, setIsLoading] = useState(true);
  const [flowNodes, setFlowNodes] = useState<Node<ExploreArticleNodeData>[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [contentSize, setContentSize] = useState({ 'w': 720, 'h': 400 });

  useEffect(() => {
    const load = async () => {
      if (!galleryId || (!articleSlug && !embeddedArticleId)) {
        setIsLoading(false);
        setFlowNodes([]);
        setFlowEdges([]);
        return;
      }

      setIsLoading(true);
      try {
        const gallery = await getGalleryById(galleryId);
        if (!gallery) {
          setFlowNodes([]);
          setFlowEdges([]);
          return;
        }

        const currentNode = gallery.nodes.find((n: ArticleNode) => {
          if (embeddedArticleId) {
            return n.data.embeddedArticleId === embeddedArticleId;
          }
          return n.data.articleSlug === articleSlug && !n.data.isEmbedded;
        });

        if (!currentNode) {
          setFlowNodes([]);
          setFlowEdges([]);
          return;
        }

        const built = buildNeighborhoodGraph(
          gallery.nodes,
          gallery.edges,
          currentNode
        );
        setFlowNodes(built.flowNodes);
        setFlowEdges(built.flowEdges);
        setContentSize({ 'w': built.contentWidth, 'h': built.contentHeight });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [galleryId, articleSlug, embeddedArticleId]);

  const hasNeighbors = useMemo(() => {
    return flowNodes.length > 1;
  }, [flowNodes.length]);

  if (!galleryId || (!articleSlug && !embeddedArticleId)) {
    return null;
  }

  const modeSwitch = (
    <button
      type="button"
      onClick={onSwitchToBeacon}
      title="切换到路标导航"
      className="rounded border border-slate-200/70 bg-slate-100/50 p-1.5 text-slate-600 transition-colors hover:bg-slate-200/60 dark:border-slate-600/60 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/50"
    >
      <Signpost className="h-4 w-4" />
    </button>
  );

  if (isLoading) {
    return (
      <div
        className="w-full shrink-0 border-b border-slate-200/60 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900"
        onPointerLeave={onDockRegionPointerLeave}
      >
        <ExplorationDockTitleBar
          modeSwitch={modeSwitch}
          onTitlePointerEnter={onDockTitlePointerEnter}
        />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="exploration-dock-body"
              initial={{ 'height': 0, 'opacity': 0 }}
              animate={{ 'height': 'auto', 'opacity': 1 }}
              exit={{ 'height': 0, 'opacity': 0 }}
              transition={dockBodyTransition}
              style={{ 'overflow': 'hidden' }}
            >
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!hasNeighbors) {
    return null;
  }

  return (
    <div
      className="w-full shrink-0 border-b border-slate-200/60 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900"
      onPointerLeave={onDockRegionPointerLeave}
    >
      <ExplorationDockTitleBar
        modeSwitch={modeSwitch}
        onTitlePointerEnter={onDockTitlePointerEnter}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="exploration-dock-body"
            initial={{ 'height': 0, 'opacity': 0 }}
            animate={{ 'height': 'auto', 'opacity': 1 }}
            exit={{ 'height': 0, 'opacity': 0 }}
            transition={dockBodyTransition}
            style={{ 'overflow': 'hidden' }}
          >
            <>
              <div className="max-w-7xl mx-auto px-4 pb-1">
                <p className="m-0 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  琥珀色为入边，天蓝色为出边，紫色为双向连接
                </p>
              </div>
              <div className="max-w-7xl mx-auto px-2 pb-2">
                <div className="h-[min(48vh,420px)] w-full min-h-[280px] overflow-hidden rounded border border-slate-200/60 dark:border-slate-700/60">
                  <ReactFlowProvider>
                    <ExploreGraphInner
                      flowNodes={flowNodes}
                      flowEdges={flowEdges}
                      galleryId={galleryId}
                      contentWidth={contentSize.w}
                      contentHeight={contentSize.h}
                    />
                  </ReactFlowProvider>
                </div>
              </div>
            </>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
