import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Loader2, Settings, Link2 } from 'lucide-react';
import MathGraph from './MathGraph';
import { DEFAULT_COSMOS_GL_SETTINGS, type CosmosGLSettings } from './settings';
import MathArticlePanel from './MathArticlePanel';
import MathSettingsPanel from './MathSettingsPanel';
import { type MathNode, type MathEdge, type NodeData, type MathMetadata, type NodeType, NODE_TYPE_SHAPES, NODE_TYPE_LABELS } from './types';

const DATA_BASE = '/data/mathlib';

const nodeDataCache = new Map<string, NodeData>();
const moduleDocsCache = new Map<string, string>();

let metadataPromise: Promise<MathMetadata> | null = null;
let nodesPromise: Promise<MathNode[]> | null = null;
let edgesPromise: Promise<MathEdge[]> | null = null;
let moduleDocsPromise: Promise<Map<string, string>> | null = null;

async function loadMetadata (): Promise<MathMetadata> {
  if (metadataPromise) {
    return metadataPromise;
  }
  metadataPromise = (async () => {
    const res = await fetch(`${DATA_BASE}/metadata.json`);
    const data = (await res.json()) as MathMetadata;
    return data;
  })();
  return metadataPromise;
}

async function loadNodes (): Promise<MathNode[]> {
  if (nodesPromise) {
    return nodesPromise;
  }
  nodesPromise = (async () => {
    const metadata = await loadMetadata();
    const nodes: MathNode[] = [];
    for (let i = 0; i < metadata.nodesChunks; i += 1) {
      const res = await fetch(`${DATA_BASE}/nodes/chunk_${String(i).padStart(3, '0')}.json`);
      const chunk = (await res.json()) as MathNode[];
      for (const n of chunk) {
        nodes.push(n);
      }
    }
    return nodes;
  })();
  return nodesPromise;
}

async function loadEdges (): Promise<MathEdge[]> {
  if (edgesPromise) {
    return edgesPromise;
  }
  edgesPromise = (async () => {
    const metadata = await loadMetadata();
    const edges: MathEdge[] = [];
    for (let i = 0; i < metadata.edgesChunks; i += 1) {
      const res = await fetch(`${DATA_BASE}/edges/chunk_${String(i).padStart(3, '0')}.json`);
      const chunk = (await res.json()) as MathEdge[];
      for (const e of chunk) {
        edges.push(e);
      }
    }
    return edges;
  })();
  return edgesPromise;
}

async function loadModuleDocs (): Promise<Map<string, string>> {
  if (moduleDocsPromise) {
    return moduleDocsPromise;
  }
  moduleDocsPromise = (async () => {
    if (moduleDocsCache.size > 0) {
      return moduleDocsCache;
    }
    const res = await fetch(`${DATA_BASE}/module_docs.json`);
    const data = (await res.json()) as Record<string, string>;
    for (const [mod, doc] of Object.entries(data)) {
      moduleDocsCache.set(mod, doc);
    }
    return moduleDocsCache;
  })();
  return moduleDocsPromise;
}

async function loadNodeData (nodeId: string, modulePath: string): Promise<NodeData | null> {
  if (nodeDataCache.has(nodeId)) {
    return nodeDataCache.get(nodeId)!;
  }

  const metadata = await loadMetadata();
  const chunkIndex = metadata.moduleChunkMap[modulePath];
  if (chunkIndex === undefined) {
    return null;
  }

  const res = await fetch(`${DATA_BASE}/nodesdata/chunk_${String(chunkIndex).padStart(3, '0')}.json`);
  const chunk = (await res.json()) as NodeData[];
  for (const nd of chunk) {
    nodeDataCache.set(nd.id, nd);
  }

  return nodeDataCache.get(nodeId) ?? null;
}

export default function MathGallery () {
  const [metadata, setMetadata] = useState<MathMetadata | null>(null);
  const [nodes, setNodes] = useState<MathNode[]>([]);
  const [edges, setEdges] = useState<MathEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<MathNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MathNode | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);
  const [selectedModuleDoc, setSelectedModuleDoc] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [settings, setSettings] = useState<CosmosGLSettings>(DEFAULT_COSMOS_GL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ 'x': 0, 'y': 0 });
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 'width': window.innerWidth, 'height': window.innerHeight });
  const nodeModuleMapRef = useRef<Map<string, string>>(new Map());
  const [showBranches, setShowBranches] = useState(false);
  const [branchesExpanded, setBranchesExpanded] = useState(false);

  const allBranchEntries = Object.entries(metadata?.branches ?? {}).sort((a, b) => b[1].count - a[1].count);
  const visibleBranches = branchesExpanded ? allBranchEntries : allBranchEntries.slice(0, 15);

  const SHAPE_LABELS: Record<number, string> = {
    '0': '●',
    '1': '■',
    '2': '▲',
    '3': '◆',
    '4': '⬠',
    '6': '★'
  };

  useEffect(() => {
    if (nodes.length > 0) {
      const map = new Map<string, string>();
      for (const n of nodes) {
        map.set(n.id, n.module);
      }
      nodeModuleMapRef.current = map;
    }
  }, [nodes]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ 'width': window.innerWidth, 'height': window.innerHeight });
    };
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ 'x': e.clientX, 'y': e.clientY });
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meta, ns, es] = await Promise.all([loadMetadata(), loadNodes(), loadEdges()]);
        if (cancelled) {
          return;
        }
        setMetadata(meta);
        setNodes(ns);
        setEdges(es);
        setIsLoading(false);
      } catch (e) {
        if (cancelled) {
          return;
        }
        setLoadError(e instanceof Error ? e.message : '加载失败');
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNodeHover = useCallback((node: MathNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleNodeRightClick = useCallback(async (node: MathNode) => {
    const [data, modDocs] = await Promise.all([loadNodeData(node.id, node.module), loadModuleDocs()]);
    setSelectedNode(node);
    setSelectedNodeData(data);
    setSelectedModuleDoc(modDocs.get(node.module) ?? null);
    setIsPanelOpen(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNodeClick = useCallback((_node: MathNode, _event: MouseEvent) => {}, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const handleNavigate = useCallback(async (nodeId: string) => {
    const modulePath = nodeModuleMapRef.current.get(nodeId) ?? nodeId.split('.')
      .slice(0, -1)
      .join('.');
    const [data, modDocs] = await Promise.all([loadNodeData(nodeId, modulePath), loadModuleDocs()]);
    const node = nodes.find(n => n.id === nodeId) ?? null;
    setSelectedNode(node);
    setSelectedNodeData(data);
    setSelectedModuleDoc(modDocs.get(modulePath) ?? null);
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">加载 Mathlib 知识图谱...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-red-400 text-sm">{loadError}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <MathGraph
        nodes={nodes}
        edges={edges}
        metadata={metadata!}
        width={dimensions.width}
        height={dimensions.height}
        settings={settings}
        showEdges={showEdges}
        backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
        onNodeHover={handleNodeHover}
        onNodeRightClick={handleNodeRightClick}
        onNodeClick={handleNodeClick}
      />

      {hoveredNode && metadata && (
        <div
          className="fixed z-30 pointer-events-none px-2.5 py-1.5 rounded bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs whitespace-pre-wrap break-all"
          style={{
            'left': mousePos.x + 12,
            'top': mousePos.y - 8,
            'maxWidth': '320px'
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ 'backgroundColor': metadata.branches[hoveredNode.branch]?.color ?? '#94a3b8' }}
            />
            <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">{hoveredNode.name}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
            <span>{hoveredNode.branch}</span>
            <span>·</span>
            <span className="truncate">{hoveredNode.module.split('.')
              .slice(-2)
              .join('.')}</span>
          </div>
        </div>
      )}

      {metadata && (
        <div className="absolute bottom-4 left-4 z-20 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm rounded border border-slate-200/60 dark:border-slate-700/60 p-3 text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
          <div className="font-semibold text-slate-600 dark:text-slate-300 mb-2">节点类型</div>
          <div className="space-y-1">
            {(Object.entries(NODE_TYPE_SHAPES) as [NodeType, number][])
              .map(([type, shape]) => ({
                type,
                shape,
                'label': NODE_TYPE_LABELS[type],
                'count': metadata.nodeTypes[type] ?? 0
              }))
              .sort((a, b) => b.count - a.count)
              .map(({ type, shape, label, count }) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm w-4 text-center text-slate-400 dark:text-slate-500">{SHAPE_LABELS[shape]}</span>
                  <span className="flex-1 text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-slate-300 dark:text-slate-600">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>

          <button
            onClick={() => setShowBranches(!showBranches)}
            className="flex items-center gap-1 mt-2 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors w-full"
          >
            {showBranches ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="font-semibold text-slate-600 dark:text-slate-300">数学分支</span>
          </button>

          {showBranches && (
            <div className="mt-1.5 space-y-1">
              {visibleBranches.map(([branch, { color, count }]) => (
                <div key={branch} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded shrink-0" style={{ 'backgroundColor': color }} />
                  <span className="flex-1 truncate text-slate-500 dark:text-slate-400">{branch}</span>
                  <span className="text-slate-300 dark:text-slate-600">{count.toLocaleString()}</span>
                </div>
              ))}
              {allBranchEntries.length > 15 && (
                <button
                  onClick={() => setBranchesExpanded(!branchesExpanded)}
                  className="text-xs text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
                >
                  {branchesExpanded ? '收起' : `+${allBranchEntries.length - 15} 更多`}
                </button>
              )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-300 dark:text-slate-600">
            <div>{metadata.totalNodes.toLocaleString()} 节点 · {metadata.totalEdges.toLocaleString()} 边</div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowEdges(!showEdges)}
        className={`absolute top-4 right-14 z-20 p-2 rounded border transition-colors ${
          showEdges
            ? 'bg-sky-100/80 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/30 text-sky-600 dark:text-sky-400'
            : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 text-slate-500 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:text-slate-400 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        title={showEdges ? '隐藏连接' : '显示连接'}
      >
        <Link2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="absolute top-4 right-4 z-20 p-2 rounded bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:text-slate-400 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>

      <MathSettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <MathArticlePanel
        node={selectedNode}
        nodeData={selectedNodeData}
        moduleDoc={selectedModuleDoc}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
