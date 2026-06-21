import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Loader2, Settings, Link2, Languages } from 'lucide-react';
import MathGraph from './MathGraph';
import { DEFAULT_COSMOS_GL_SETTINGS, type CosmosGLSettings } from './settings';
import MathArticlePanel from './MathArticlePanel';
import MathSettingsPanel from './MathSettingsPanel';
import {
  type KnowledgeNode,
  type KnowledgeLink,
  type KnowledgeObject,
  type KnowledgeManifest,
  type GraphMetadata,
  NODE_TYPE_SHAPES,
  NODE_TYPE_LABELS,
  SHAPE_SYMBOLS,
  PRIMARY_LOCALE
} from './types';

const MANIFEST_PATH = '/data/knowledge-build/manifest.json';

function getDisplayName (obj: KnowledgeObject, locale: string): string {
  return obj.name?.[locale]?.[0] ?? obj.name?.zh?.[0] ?? obj.name?.en?.[0] ?? obj.id.split('.').pop() ?? obj.id;
}

function getDisplayDesc (obj: KnowledgeObject, locale: string): string {
  return obj.description?.[locale]?.[0] ?? obj.description?.zh?.[0] ?? obj.description?.en?.[0] ?? '';
}

function getDomain (id: string): string {
  return id.split('.')[0] ?? 'unknown';
}

function buildGraphData (manifest: KnowledgeManifest, locale: string): {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  metadata: GraphMetadata;
  objectMap: Map<string, KnowledgeObject>;
} {
  const { objects, connections } = manifest;

  const links: KnowledgeLink[] = [];
  const degreeMap = new Map<string, number>();

  for (const conn of connections) {
    links.push({ 'source': conn.from, 'target': conn.to });
    degreeMap.set(conn.from, (degreeMap.get(conn.from) ?? 0) + 1);
    degreeMap.set(conn.to, (degreeMap.get(conn.to) ?? 0) + 1);
  }

  const objectMap = new Map<string, KnowledgeObject>();
  const nodes: KnowledgeNode[] = [];
  const domainCount = new Map<string, number>();
  const typeCount = new Map<string, number>();

  for (const obj of objects) {
    objectMap.set(obj.id, obj);
    const domain = getDomain(obj.id);

    domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1);
    typeCount.set(obj.type, (typeCount.get(obj.type) ?? 0) + 1);

    nodes.push({
      'id': obj.id,
      'name': getDisplayName(obj, locale),
      'type': obj.type,
      domain,
      'tags': obj.extension?.tags ?? [],
      'degree': degreeMap.get(obj.id) ?? 0,
      'description': getDisplayDesc(obj, locale)
    });
  }

  const domains: Record<string, { count: number }> = {};
  for (const [d, count] of domainCount) {
    domains[d] = { count };
  }

  const nodeTypes: Record<string, number> = {};
  for (const [t, count] of typeCount) {
    nodeTypes[t] = count;
  }

  return {
    nodes,
    links,
    'metadata': {
      'totalNodes': nodes.length,
      'totalLinks': links.length,
      domains,
      nodeTypes
    },
    objectMap
  };
}

export default function MathGallery () {
  const [manifest, setManifest] = useState<KnowledgeManifest | null>(null);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [links, setLinks] = useState<KnowledgeLink[]>([]);
  const [metadata, setMetadata] = useState<GraphMetadata | null>(null);
  const [objectMap, setObjectMap] = useState<Map<string, KnowledgeObject>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [selectedObject, setSelectedObject] = useState<KnowledgeObject | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [settings, setSettings] = useState<CosmosGLSettings>(DEFAULT_COSMOS_GL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ 'x': 0, 'y': 0 });
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [locale, setLocale] = useState(PRIMARY_LOCALE);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 'width': window.innerWidth, 'height': window.innerHeight });
  const [showDomains, setShowDomains] = useState(false);
  const [domainsExpanded, setDomainsExpanded] = useState(false);

  const allDomainEntries = Object.entries(metadata?.domains ?? {}).sort((a, b) => b[1].count - a[1].count);
  const visibleDomains = domainsExpanded ? allDomainEntries : allDomainEntries.slice(0, 15);

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
        const res = await fetch(MANIFEST_PATH);
        const data = (await res.json()) as KnowledgeManifest;
        if (cancelled) {
          return;
        }

        setManifest(data);
        const graph = buildGraphData(data, locale);
        setNodes(graph.nodes);
        setLinks(graph.links);
        setMetadata(graph.metadata);
        setObjectMap(graph.objectMap);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!manifest) {
      return;
    }
    const graph = buildGraphData(manifest, locale);
    setNodes(graph.nodes);
    setLinks(graph.links);
    setMetadata(graph.metadata);
    setObjectMap(graph.objectMap);

    if (selectedNode) {
      const obj = graph.objectMap.get(selectedNode.id);
      if (obj) {
        setSelectedNode(prev => prev ? {
          ...prev,
          'name': getDisplayName(obj, locale),
          'description': getDisplayDesc(obj, locale)
        } : null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, manifest]);

  const handleNodeHover = useCallback((node: KnowledgeNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleNodeRightClick = useCallback(async (node: KnowledgeNode) => {
    const obj = objectMap.get(node.id) ?? null;
    setSelectedNode(node);
    setSelectedObject(obj);
    setSelectedConnection(null);
    setIsPanelOpen(true);
  }, [objectMap]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNodeClick = useCallback((_node: KnowledgeNode, _event: MouseEvent) => {}, []);

  const handleLinkRightClick = useCallback((sourceId: string, targetId: string) => {
    setSelectedNode(null);
    setSelectedObject(null);
    setSelectedConnection({ sourceId, targetId });
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const handleNavigate = useCallback(async (nodeId: string) => {
    const obj = objectMap.get(nodeId) ?? null;
    const node = nodes.find(n => n.id === nodeId) ?? null;
    setSelectedNode(node);
    setSelectedObject(obj);
  }, [objectMap, nodes]);

  const allConnections = manifest?.connections ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">加载知识图谱...</span>
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
        links={links}
        metadata={metadata!}
        width={dimensions.width}
        height={dimensions.height}
        settings={settings}
        showEdges={showEdges}
        backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
        onNodeHover={handleNodeHover}
        onNodeRightClick={handleNodeRightClick}
        onNodeClick={handleNodeClick}
        onLinkRightClick={handleLinkRightClick}
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
              style={{ 'backgroundColor': '#60A5FA' }}
            />
            <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">{hoveredNode.name}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
            <span>{hoveredNode.domain}</span>
            <span>·</span>
            <span>{NODE_TYPE_LABELS[hoveredNode.type]}</span>
          </div>
          {hoveredNode.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {hoveredNode.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 rounded px-1">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {metadata && (
        <div className="absolute bottom-4 left-4 z-20 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm rounded border border-slate-200/60 dark:border-slate-700/60 p-3 text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
          <div className="font-semibold text-slate-600 dark:text-slate-300 mb-2">节点类型</div>
          <div className="space-y-1">
            {(Object.entries(NODE_TYPE_SHAPES) as [string, number][])
              .map(([type, shape]) => ({
                type,
                shape,
                'label': NODE_TYPE_LABELS[type] ?? type,
                'count': metadata.nodeTypes[type] ?? 0
              }))
              .sort((a, b) => b.count - a.count)
              .map(({ type, shape, label, count }) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm w-4 text-center text-slate-400 dark:text-slate-500">{SHAPE_SYMBOLS[shape]}</span>
                  <span className="flex-1 text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-slate-300 dark:text-slate-600">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>

          <button
            onClick={() => setShowDomains(!showDomains)}
            className="flex items-center gap-1 mt-2 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors w-full"
          >
            {showDomains ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="font-semibold text-slate-600 dark:text-slate-300">领域</span>
          </button>

          {showDomains && (
            <div className="mt-1.5 space-y-1">
              {visibleDomains.map(([domain, { count }]) => (
                <div key={domain} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded shrink-0" style={{ 'backgroundColor': '#60A5FA' }} />
                  <span className="flex-1 truncate text-slate-500 dark:text-slate-400">{domain}</span>
                  <span className="text-slate-300 dark:text-slate-600">{count.toLocaleString()}</span>
                </div>
              ))}
              {allDomainEntries.length > 15 && (
                <button
                  onClick={() => setDomainsExpanded(!domainsExpanded)}
                  className="text-xs text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
                >
                  {domainsExpanded ? '收起' : `+${allDomainEntries.length - 15} 更多`}
                </button>
              )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-300 dark:text-slate-600">
            <div>{metadata.totalNodes.toLocaleString()} 节点 · {metadata.totalLinks.toLocaleString()} 连接</div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowEdges(!showEdges)}
        className={`absolute top-4 right-20 z-20 p-2 rounded border transition-colors ${
          showEdges
            ? 'bg-sky-100/80 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/30 text-sky-600 dark:text-sky-400'
            : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 text-slate-500 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:text-slate-400 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        title={showEdges ? '隐藏连接' : '显示连接'}
      >
        <Link2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => setLocale(l => l === 'zh' ? 'en' : 'zh')}
        className="absolute top-4 right-4 z-20 p-2 rounded bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:text-slate-400 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        title={locale === 'zh' ? '切换至 English' : '切换至 中文'}
      >
        <Languages className="w-4 h-4" />
      </button>

      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="absolute top-4 right-12 z-20 p-2 rounded bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:text-slate-400 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
        object={selectedObject}
        connection={selectedConnection}
        connections={allConnections}
        objectMap={objectMap}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onNavigate={handleNavigate}
        locale={locale}
      />
    </div>
  );
}
