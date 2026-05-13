import React, { useState, useMemo, useCallback } from 'react';
import { AnalysisHelp } from './AnalysisHelp';
import { useStore } from '@xyflow/react';
import Graph from 'graphology';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import edgeBetweennessCentrality from 'graphology-metrics/centrality/edge-betweenness';
import closenessCentrality from 'graphology-metrics/centrality/closeness';
import eigenvectorCentrality from 'graphology-metrics/centrality/eigenvector';
import pagerank from 'graphology-metrics/centrality/pagerank';
import { density } from 'graphology-metrics/graph/density';
import modularity from 'graphology-metrics/graph/modularity';
import {
  bidirectional as unweightedBidirectional,
  singleSourceLength as unweightedSingleSourceLength,
  undirectedSingleSourceLength
} from 'graphology-shortest-path/unweighted';
import { allSimplePaths } from 'graphology-simple-path';
import {
  connectedComponents,
  countConnectedComponents,
  stronglyConnectedComponents,
  largestConnectedComponent
} from 'graphology-components';
import { hasCycle, topologicalSort, topologicalGenerations } from 'graphology-dag';
import louvain from 'graphology-communities-louvain';
import hits from 'graphology-metrics/centrality/hits';
import { coreNumber } from 'graphology-cores';
import type { CustomNodeData } from '../Node';
import {
  BarChart3,
  X,
  GitBranch,
  Network,
  Target,
  Route,
  CircleDot,
  Layers,
  Hexagon,
  Sparkles,
  ChevronDown,
  ArrowRightLeft,
  TrendingUp,
  ArrowUpDown,
  GitMerge,
  HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PANEL_CONTAINER_CLASS,
  PANEL_HEADER_CLASS,
  PANEL_TITLE_CLASS,
  PANEL_CLOSE_BTN_CLASS,
  TAB_CONTAINER_CLASS,
  getTabButtonClasses,
  INPUT_CLASS,
  LABEL_CLASS,
  getSectionClasses,
  getButtonClasses,
  BUTTON_DISABLED_CLASS,
  PANEL_MOTION_VARIANTS_LEFT,
  PANEL_MOTION_TRANSITION,
  PANEL_CONTENT_CLASS,
  type HoverColorType
} from './panelStyles';
import { SlidingCardSelector } from '@/components/ui/SlidingCardSelector';

const ARROW = '\u2192';

interface AnalysisPanelProps {
  onClose: () => void;
}

type AnalysisTab = 'overview' | 'centrality' | 'path' | 'connectivity' | 'advanced';

type PathType = 'shortest' | 'longest' | 'globalLongest' | 'allSimple' | 'singleSource';

type CentralityType = 'degree' | 'betweenness' | 'edgeBetweenness' | 'closeness' | 'eigenvector' | 'pagerank' | 'hits';

interface CentralityResult {
  nodeId: string;
  value: number;
  title: string;
  hub?: number;
  edgeId?: string;
  sourceTitle?: string;
  targetTitle?: string;
}

interface PathResult {
  path: string[];
  distance: number;
}

interface GlobalLongestResult {
  paths: Array<{ path: string[]; distance: number; startTitle: string; endTitle: string }>;
  maxDistance: number;
}

interface AllSimplePathsResult {
  paths: Array<{ path: string[]; distance: number }>;
  count: number;
}

interface SingleSourceResult {
  sourceId: string;
  distances: Record<string, number>;
  maxDistance: number;
  avgDistance: number;
  reachableCount: number;
}

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  densityVal: number;
  diameter: number;
  componentCount: number;
  clusteringCoeff: number;
  avgPathLength: number;
  radius: number;
  avgEccentricity: number;
}

const buildGraph = (
  nodes: Array<{ id: string; data: CustomNodeData }>,
  edges: Array<{ id: string; source: string; target: string }>
): Graph => {
  const graph = new Graph({ 'type': 'directed' });
  nodes.forEach((node) => {
    graph.addNode(node.id, { 'title': node.data?.title || '', 'category': node.data?.category || '' });
  });
  edges.forEach((edge) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target) && !graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target);
    }
  });
  return graph;
};

const computeClusteringCoefficient = (graph: Graph): number => {
  let total = 0;
  let count = 0;
  graph.forEachNode((node) => {
    const neighbors = graph.neighbors(node);
    if (neighbors.length < 2) {
      return;
    }
    let triangles = 0;
    for (let i = 0; i < neighbors.length; i += 1) {
      for (let j = i + 1; j < neighbors.length; j += 1) {
        if (graph.hasEdge(neighbors[i], neighbors[j])) {
          triangles += 1;
        }
      }
    }
    const possible = (neighbors.length * (neighbors.length - 1)) / 2;
    total += triangles / possible;
    count += 1;
  });
  return count > 0 ? total / count : 0;
};

const computeAvgShortestPath = (graph: Graph): number => {
  const nodes = graph.nodes();
  if (nodes.length <= 1) {
    return 0;
  }
  let totalDist = 0;
  let reachablePairs = 0;
  const n = nodes.length;
  for (let i = 0; i < Math.min(n, 50); i += 1) {
    const source = nodes[i];
    const lengths = unweightedSingleSourceLength(graph, source);
    const entries = Object.entries(lengths);
    for (let j = 0; j < entries.length; j += 1) {
      const entry = entries[j];
      if (entry) {
        const [target, dist] = entry;
        if (source !== target && dist !== Infinity && dist > 0) {
          totalDist += dist;
          reachablePairs += 1;
        }
      }
    }
  }
  if (reachablePairs === 0) {
    return 0;
  }
  return totalDist / reachablePairs;
};

const computeDegreeDistribution = (graph: Graph): Record<string, number> => {
  const dist: Record<string, number> = {};
  graph.forEachNode((node) => {
    const d = graph.degree(node);
    dist[String(d)] = (dist[String(d)] || 0) + 1;
  });
  return dist;
};

const computeLongestSimplePath = (graph: Graph, source: string, target: string): PathResult | null => {
  const paths = allSimplePaths(graph, source, target);
  if (!paths || paths.length === 0) {
    return null;
  }
  let longest: string[] = paths[0]!;
  for (let i = 1; i < paths.length; i += 1) {
    const p = paths[i];
    if (p && p.length > longest.length) {
      longest = p;
    }
  }
  return { 'path': longest, 'distance': longest.length - 1 };
};

const computeGlobalLongestPaths = (graph: Graph): GlobalLongestResult | null => {
  const nodes = graph.nodes();
  if (nodes.length < 2) {
    return null;
  }
  let maxDist = 0;
  const results: Array<{ path: string[]; distance: number; startTitle: string; endTitle: string }> = [];
  for (let si = 0; si < nodes.length; si += 1) {
    for (let ti = si + 1; ti < nodes.length; ti += 1) {
      const s = nodes[si];
      const t = nodes[ti];
      if (s && t) {
        const result = computeLongestSimplePath(graph, s, t);
        if (result && result.distance > maxDist) {
          maxDist = result.distance;
          results.length = 0;
          results.push({
            'path': result.path,
            'distance': result.distance,
            'startTitle': (graph.getNodeAttribute(s, 'title') as string) || s,
            'endTitle': (graph.getNodeAttribute(t, 'title') as string) || t
          });
        } else if (result && result.distance > 0 && result.distance === maxDist) {
          results.push({
            'path': result.path,
            'distance': result.distance,
            'startTitle': (graph.getNodeAttribute(s, 'title') as string) || s,
            'endTitle': (graph.getNodeAttribute(t, 'title') as string) || t
          });
        }
      }
    }
  }
  if (maxDist === 0) {
    return null;
  }
  return { 'paths': results, 'maxDistance': maxDist };
};

const buildCentralityResult = (
  scores: Record<string, number> | { authorities: Record<string, number>; hubs: Record<string, number> },
  type: CentralityType,
  graph: Graph
): CentralityResult[] => {
  if (type === 'hits') {
    const hitsResult = scores as unknown as { authorities: Record<string, number>; hubs: Record<string, number> };
    return Object.entries(hitsResult.authorities)
      .map(([nodeId, authority]) => {
        const hubVal = hitsResult.hubs[nodeId];
        return {
          nodeId,
          'value': authority,
          'title': graph.getNodeAttribute(nodeId, 'title') as string || nodeId,
          ...(hubVal !== undefined ? { 'hub': hubVal } : {})
        };
      })
      .sort((a, b) => b.value - a.value);
  }
  if (type === 'edgeBetweenness') {
    return Object.entries(scores as Record<string, number>)
      .map(([edgeKey, value]) => {
        const source = graph.source(edgeKey);
        const target = graph.target(edgeKey);
        return {
          'nodeId': edgeKey,
          value,
          'title': edgeKey,
          'edgeId': edgeKey,
          'sourceTitle': (graph.getNodeAttribute(source, 'title') as string) || source,
          'targetTitle': (graph.getNodeAttribute(target, 'title') as string) || target
        };
      })
      .sort((a, b) => b.value - a.value);
  }
  return Object.entries(scores as Record<string, number>)
    .map(([nodeId, value]) => ({
      nodeId,
      value,
      'title': graph.getNodeAttribute(nodeId, 'title') as string || nodeId
    }))
    .sort((a, b) => b.value - a.value);
};

const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">{value}</span>
  </div>
);

const CENTRALITY_OPTIONS = [
  { 'value': 'degree', 'label': '度中心性', 'icon': Network },
  { 'value': 'betweenness', 'label': '介数中心性', 'icon': GitBranch },
  { 'value': 'edgeBetweenness', 'label': '连接介数中心性', 'icon': ArrowRightLeft },
  { 'value': 'closeness', 'label': '接近中心性', 'icon': Target },
  { 'value': 'eigenvector', 'label': '特征向量中心性', 'icon': Sparkles },
  { 'value': 'pagerank', 'label': 'PageRank', 'icon': TrendingUp },
  { 'value': 'hits', 'label': 'HITS算法', 'icon': ArrowUpDown }
];

const PATH_OPTIONS = [
  { 'value': 'shortest', 'label': '最短路径', 'icon': Route },
  { 'value': 'longest', 'label': '最长简单路径', 'icon': TrendingUp },
  { 'value': 'globalLongest', 'label': '全局最长路径', 'icon': ArrowRightLeft },
  { 'value': 'allSimple', 'label': '所有简单路径', 'icon': GitBranch },
  { 'value': 'singleSource', 'label': '单源最短路径', 'icon': Target }
];

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ onClose }) => {
  const rawNodes = useStore<Array<{ id: string; data: CustomNodeData }>>(
    (state) => state.nodes.map((n) => ({ 'id': n.id, 'data': n.data })),
    (a, b) =>
      a.length === b.length &&
      a.every((n, i) => n.id === b[i]?.id && n.data?.title === b[i]?.data?.title)
  );

  const rawEdges = useStore<Array<{ id: string; source: string; target: string }>>(
    (state) => state.edges.map((e) => ({ 'id': e.id, 'source': String(e.source), 'target': String(e.target) })),
    (a, b) =>
      a.length === b.length &&
      a.every((e, i) => e.id === b[i]?.id && e.source === b[i]?.source && e.target === b[i]?.target)
  );

  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [showHelp, setShowHelp] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [pathType, setPathType] = useState<PathType>('shortest');
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [globalLongestResult, setGlobalLongestResult] = useState<GlobalLongestResult | null>(null);
  const [allSimpleResult, setAllSimpleResult] = useState<AllSimplePathsResult | null>(null);
  const [singleSourceResult, setSingleSourceResult] = useState<SingleSourceResult | null>(null);

  const [selectedCentralityType, setSelectedCentralityType] = useState<CentralityType>('degree');
  const [centralityResults, setCentralityResults] = useState<CentralityResult[] | null>(null);

  const [showCommunityDetail, setShowCommunityDetail] = useState(false);

  const graph = useMemo(() => buildGraph(rawNodes, rawEdges), [rawNodes, rawEdges]);

  const stats = useMemo<GraphStats>(() => {
    const order = graph.order;
    const size = graph.size;
    if (order === 0) {
      return { 'nodeCount': 0, 'edgeCount': 0, 'avgDegree': 0, 'densityVal': 0, 'diameter': -1, 'componentCount': 0, 'clusteringCoeff': 0, 'avgPathLength': 0, 'radius': -1, 'avgEccentricity': -1 };
    }

    let sumDeg = 0;
    graph.forEachNode((node) => {
      sumDeg += graph.degree(node);
    });

    const densityVal = density(graph);
    let diam = -1;
    let radiusVal = -1;
    let avgEcc = -1;
    try {
      const eccValues: number[] = [];
      graph.forEachNode((node) => {
        const lengths = undirectedSingleSourceLength(graph, node);
        const reachableCount = Object.keys(lengths).length;
        if (reachableCount < graph.order) {
          return;
        }
        const maxDist = Math.max(...Object.values(lengths));
        eccValues.push(maxDist);
      });
      if (eccValues.length > 0) {
        diam = Math.max(...eccValues);
        radiusVal = Math.min(...eccValues);
        avgEcc = eccValues.reduce((a, b) => a + b, 0) / eccValues.length;
      }
    } catch {
      diam = -1;
      radiusVal = -1;
    }
    const compCount = countConnectedComponents(graph);
    const cc = computeClusteringCoefficient(graph);
    const avgPL = computeAvgShortestPath(graph);

    return {
      'nodeCount': order,
      'edgeCount': size,
      'avgDegree': order > 0 ? sumDeg / order : 0,
      'densityVal': typeof densityVal === 'number' ? densityVal : 0,
      'diameter': diam,
      'componentCount': compCount,
      'clusteringCoeff': cc,
      'avgPathLength': avgPL,
      'radius': radiusVal,
      'avgEccentricity': avgEcc
    };
  }, [graph]);

  const degreeDist = useMemo(() => computeDegreeDistribution(graph), [graph]);

  const handleComputeCentrality = useCallback(() => {
    if (graph.order === 0) {
      return;
    }
    setIsComputing(true);
    setTimeout(() => {
      let scores: Record<string, number> | { authorities: Record<string, number>; hubs: Record<string, number> } | Record<string, number> | undefined;
      switch (selectedCentralityType) {
        case 'degree':
          scores = degreeCentrality(graph); break;
        case 'betweenness':
          scores = betweennessCentrality(graph); break;
        case 'edgeBetweenness':
          scores = edgeBetweennessCentrality(graph); break;
        case 'closeness':
          scores = closenessCentrality(graph); break;
        case 'eigenvector':
          scores = eigenvectorCentrality(graph); break;
        case 'pagerank':
          scores = pagerank(graph); break;
        case 'hits':
          scores = hits(graph); break;
      }
      if (!scores) {
        setCentralityResults([]);
        setIsComputing(false);
        return;
      }
      const results = buildCentralityResult(scores, selectedCentralityType, graph);
      setCentralityResults(results);
      setIsComputing(false);
    }, 0);
  }, [graph, selectedCentralityType]);

  const handleFindPath = useCallback(() => {
    if (pathType === 'globalLongest') {
      setIsComputing(true);
      setTimeout(() => {
        const result = computeGlobalLongestPaths(graph);
        setGlobalLongestResult(result);
        setPathResult(null);
        setAllSimpleResult(null);
        setSingleSourceResult(null);
        setIsComputing(false);
      }, 0);
      return;
    }

    if (pathType === 'allSimple') {
      if (!pathSource || !pathTarget || pathSource === pathTarget) {
        return;
      }
      if (!graph.hasNode(pathSource) || !graph.hasNode(pathTarget)) {
        return;
      }
      setIsComputing(true);
      setTimeout(() => {
        try {
          const paths = allSimplePaths(graph, pathSource, pathTarget);
          if (paths && paths.length > 0) {
            setAllSimpleResult({
              'paths': paths.map((p) => ({ 'path': p, 'distance': p.length - 1 })),
              'count': paths.length
            });
          } else {
            setAllSimpleResult({ 'paths': [], 'count': 0 });
          }
        } catch {
          setAllSimpleResult({ 'paths': [], 'count': 0 });
        }
        setPathResult(null);
        setGlobalLongestResult(null);
        setSingleSourceResult(null);
        setIsComputing(false);
      }, 0);
      return;
    }

    if (pathType === 'singleSource') {
      if (!pathSource || !graph.hasNode(pathSource)) {
        return;
      }
      setIsComputing(true);
      setTimeout(() => {
        try {
          const lengthMap = unweightedSingleSourceLength(graph, pathSource);
          const distances = Object.values(lengthMap).filter((d): d is number => isFinite(d));
          const maxDist = distances.length > 0 ? Math.max(...distances) : 0;
          const avgDist = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
          setSingleSourceResult({
            'sourceId': pathSource,
            'distances': lengthMap,
            'maxDistance': maxDist,
            'avgDistance': avgDist,
            'reachableCount': distances.length
          });
        } catch {
          setSingleSourceResult(null);
        }
        setPathResult(null);
        setGlobalLongestResult(null);
        setAllSimpleResult(null);
        setIsComputing(false);
      }, 0);
      return;
    }

    if (!pathSource || !pathTarget || pathSource === pathTarget) {
      return;
    }
    if (!graph.hasNode(pathSource) || !graph.hasNode(pathTarget)) {
      return;
    }
    setIsComputing(true);
    setTimeout(() => {
      try {
        if (pathType === 'shortest') {
          const path = unweightedBidirectional(graph, pathSource, pathTarget);
          if (path) {
            setPathResult({ path, 'distance': path.length - 1 });
          } else {
            setPathResult({ 'path': [], 'distance': Infinity });
          }
        } else if (pathType === 'longest') {
          const result = computeLongestSimplePath(graph, pathSource, pathTarget);
          if (result) {
            setPathResult(result);
          } else {
            setPathResult({ 'path': [], 'distance': -1 });
          }
        }
      } catch {
        setPathResult({ 'path': [], 'distance': -1 });
      }
      setGlobalLongestResult(null);
      setAllSimpleResult(null);
      setSingleSourceResult(null);
      setIsComputing(false);
    }, 0);
  }, [graph, pathSource, pathTarget, pathType]);

  const communities = useMemo(() => {
    if (graph.order === 0) {
      return null;
    }
    try {
      return louvain(graph);
    } catch {
      return null;
    }
  }, [graph]);

  const communityGroups = useMemo(() => {
    if (!communities) {
      return null;
    }
    const groups: Record<number, string[]> = {};
    Object.entries(communities).forEach(([nodeId, commId]) => {
      const id = commId as number;
      if (!groups[id]) {
        groups[id] = [];
      }
      groups[id].push(nodeId);
    });
    return groups;
  }, [communities]);

  const modularityScore = useMemo(() => {
    if (!communities) {
      return null;
    }
    try {
      return modularity(graph, { 'getNodeCommunity': (node) => communities[node] as number });
    } catch {
      return null;
    }
  }, [graph, communities]);

  const hasCycleResult = useMemo(() => {
    if (graph.order === 0) {
      return null;
    }
    try {
      return hasCycle(graph);
    } catch {
      return null;
    }
  }, [graph]);

  const coreNumbers = useMemo(() => {
    if (graph.order === 0) {
      return null;
    }
    try {
      return (coreNumber as unknown as (graph: Graph) => Record<string, number>)(graph);
    } catch {
      return null;
    }
  }, [graph]);

  const coreGroups = useMemo(() => {
    if (!coreNumbers) {
      return null;
    }
    const groups: Record<number, string[]> = {};
    Object.entries(coreNumbers).forEach(([nodeId, val]) => {
      const k = val as number;
      if (!groups[k]) {
        groups[k] = [];
      }
      groups[k].push(nodeId);
    });
    return groups;
  }, [coreNumbers]);

  const sccResult = useMemo(() => {
    if (graph.order === 0) {
      return null;
    }
    try {
      return stronglyConnectedComponents(graph);
    } catch {
      return null;
    }
  }, [graph]);

  const largestComponent = useMemo(() => {
    if (graph.order === 0) {
      return null;
    }
    try {
      return largestConnectedComponent(graph);
    } catch {
      return null;
    }
  }, [graph]);

  const tabItems: Array<{ key: AnalysisTab; icon: React.ReactNode; label: string }> = [
    { 'key': 'overview', 'icon': <BarChart3 size={16} />, 'label': '图统计' },
    { 'key': 'centrality', 'icon': <Network size={16} />, 'label': '中心性' },
    { 'key': 'path', 'icon': <Route size={16} />, 'label': '路径' },
    { 'key': 'connectivity', 'icon': <GitMerge size={16} />, 'label': '连通' },
    { 'key': 'advanced', 'icon': <Sparkles size={16} />, 'label': '高级分析' }
  ];

  const needsNodeSelection = pathType !== 'globalLongest';
  const needsSingleSource = pathType === 'singleSource';
  const needsTwoNodes = needsNodeSelection && !needsSingleSource;

  const getTabIconColor = (tabKey: AnalysisTab, isActive: boolean): string => {
    if (!isActive) {
      return 'text-slate-500';
    }
    if (tabKey === 'centrality') {
      return 'text-emerald-400';
    }
    if (tabKey === 'path') {
      return 'text-blue-400';
    }
    if (tabKey === 'connectivity') {
      return 'text-cyan-400';
    }
    if (tabKey === 'advanced') {
      return 'text-teal-400';
    }
    return 'text-sky-400';
  };

  const getTabColor = (tabKey: AnalysisTab): HoverColorType => {
    if (tabKey === 'centrality') {
      return 'emerald';
    }
    if (tabKey === 'path') {
      return 'blue';
    }
    if (tabKey === 'connectivity') {
      return 'cyan';
    }
    if (tabKey === 'advanced') {
      return 'teal';
    }
    return 'sky';
  };

  return (
    <motion.div
      className={PANEL_CONTAINER_CLASS}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={PANEL_MOTION_VARIANTS_LEFT}
      transition={PANEL_MOTION_TRANSITION}
    >
      <header className={PANEL_HEADER_CLASS}>
        <div className={PANEL_TITLE_CLASS}>
          <BarChart3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          图分析
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
            <X size={16} />
          </button>
        </div>
      </header>

      <nav className={TAB_CONTAINER_CLASS}>
        <div className="flex w-full p-1">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              className={getTabButtonClasses(activeTab === tab.key, getTabColor(tab.key))}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className={getTabIconColor(tab.key, activeTab === tab.key)}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className={`${PANEL_CONTENT_CLASS} overflow-y-auto`}>
        {activeTab === 'overview' && (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">基本信息</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <StatRow label="节点数" value={stats.nodeCount} />
                <StatRow label="连接数" value={stats.edgeCount} />
                <StatRow label="平均度" value={stats.avgDegree.toFixed(2)} />
                <StatRow label="密度" value={stats.densityVal.toFixed(4)} />
                <StatRow label="聚类系数" value={stats.clusteringCoeff.toFixed(4)} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">连通性</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <StatRow label="连通分量" value={stats.componentCount} />
                <StatRow label="直径" value={stats.diameter >= 0 ? stats.diameter : '\u221E'} />
                <StatRow label="半径" value={stats.radius >= 0 ? stats.radius : '\u221E'} />
                <StatRow label="平均离心率" value={stats.avgEccentricity >= 0 ? stats.avgEccentricity.toFixed(2) : '\u221E'} />
                <StatRow label="平均最短路径长" value={stats.avgPathLength.toFixed(2)} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">节点度分布</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {Object.entries(degreeDist)
                  .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                  .map(([deg, count]) => (
                    <div key={deg} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-10 shrink-0">度 {deg}</span>
                      <div className="flex-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-1.5">
                        <div className="bg-sky-400/60 h-1.5 rounded-full transition-all duration-300" style={{ 'width': `${(count / stats.nodeCount) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-6 text-right shrink-0">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'centrality' && (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">选择指标</h3>
              <SlidingCardSelector
                options={CENTRALITY_OPTIONS}
                value={selectedCentralityType}
                onChange={(v) => setSelectedCentralityType(v as CentralityType)}
                color="emerald"
              />
            </div>

            <button
              onClick={handleComputeCentrality}
              disabled={isComputing || stats.nodeCount === 0}
              className={`w-full py-2.5 px-4 rounded font-medium text-sm flex items-center justify-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 ${getButtonClasses('secondary', 'emerald')} ${isComputing || stats.nodeCount === 0 ? BUTTON_DISABLED_CLASS : ''}`}
            >
              <GitBranch size={14} className={isComputing ? 'animate-spin' : ''} />
              {isComputing ? '计算中...' : '计算'}
            </button>

            {centralityResults && centralityResults.length > 0 && (
              <section className={getSectionClasses('teal').container}>
                <h3 className={getSectionClasses('teal').title}>结果 Top {Math.min(15, centralityResults.length)}</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {centralityResults.slice(0, 15).map((r, idx) => (
                    <div key={r.nodeId} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-slate-400 w-6">{idx + 1}</span>
                        {selectedCentralityType === 'edgeBetweenness' && r.sourceTitle && r.targetTitle ? (
                          <span className="text-sm truncate font-medium">{r.sourceTitle} {ARROW} {r.targetTitle}</span>
                        ) : (
                          <span className="text-sm truncate font-medium">{r.title}</span>
                        )}
                      </div>
                      {selectedCentralityType === 'hits' && r.hub !== undefined ? (
                        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                          <span className="text-xs font-mono text-amber-500">A:{r.value.toFixed(4)}</span>
                          <span className="text-xs font-mono text-blue-500">H:{r.hub.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-mono text-teal-500 ml-2 flex-shrink-0">{r.value.toFixed(4)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'path' && (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">路径类型</h3>
              <SlidingCardSelector
                options={PATH_OPTIONS}
                value={pathType}
                onChange={(v) => {
                  setPathType(v as PathType);
                  setPathResult(null);
                  setGlobalLongestResult(null);
                  setAllSimpleResult(null);
                  setSingleSourceResult(null);
                }}
                color="blue"
              />
            </div>

            {needsTwoNodes && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">选择节点</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLASS}>起点</label>
                    <select
                      value={pathSource}
                      onChange={(e) => setPathSource(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">选择起点</option>
                      {rawNodes.map((n) => (
                        <option key={n.id} value={n.id}>{n.data?.title || n.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>终点</label>
                    <select
                      value={pathTarget}
                      onChange={(e) => setPathTarget(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">选择终点</option>
                      {rawNodes.map((n) => (
                        <option key={n.id} value={n.id}>{n.data?.title || n.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {needsSingleSource && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">选择源节点</h3>
                <div>
                  <label className={LABEL_CLASS}>源节点</label>
                  <select
                    value={pathSource}
                    onChange={(e) => setPathSource(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">选择源节点</option>
                    {rawNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.data?.title || n.id}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!needsNodeSelection && (
              <p className="text-xs text-blue-500/80 dark:text-blue-400/70 px-1">
                自动搜索图中所有节点对之间的最长简单路径
              </p>
            )}

            <button
              onClick={handleFindPath}
              disabled={
                isComputing ||
                (needsTwoNodes && (!pathSource || !pathTarget)) ||
                (needsSingleSource && !pathSource) ||
                stats.nodeCount === 0
              }
              className={`w-full py-2.5 px-4 rounded font-medium text-sm flex items-center justify-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 ${getButtonClasses('secondary', 'blue')} ${isComputing ? BUTTON_DISABLED_CLASS : ''}`}
            >
              <Route size={14} className={isComputing ? 'animate-spin' : ''} />
              {isComputing ? '查找中...' : '查找路径'}
            </button>

            {globalLongestResult && (
              <section className={getSectionClasses('teal').container}>
                <h3 className={getSectionClasses('teal').title}>全局最长路径 (距离: {globalLongestResult.maxDistance})</h3>
                <p className="text-xs text-slate-500 mb-2">
                  共找到 {globalLongestResult.paths.length} 条最长路径
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {globalLongestResult.paths.slice(0, 5).map((rp, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-50/60 dark:bg-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-teal-600">
                          {rp.startTitle} {ARROW} {rp.endTitle}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{rp.distance} 步</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rp.path.map((nodeId, i) => (
                          <React.Fragment key={nodeId}>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200/40">
                              {graph.getNodeAttribute(nodeId, 'title') as string || nodeId}
                            </span>
                            {i < rp.path.length - 1 && (
                              <span className="self-center text-slate-300">{ARROW}</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {allSimpleResult && (
              <section className={getSectionClasses('teal').container}>
                <h3 className={getSectionClasses('teal').title}>所有简单路径 (共 {allSimpleResult.count} 条)</h3>
                {allSimpleResult.count === 0 ? (
                  <p className="text-sm text-slate-400">两节点之间不存在简单路径</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSimpleResult.paths.slice(0, 20).map((rp, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50/60 dark:bg-slate-800/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-teal-600">
                            路径 {idx + 1}
                          </span>
                          <span className="text-xs font-mono text-slate-500">{rp.distance} 步</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rp.path.map((nodeId, i) => (
                            <React.Fragment key={`${idx}-${nodeId}`}>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200/40">
                                {graph.getNodeAttribute(nodeId, 'title') as string || nodeId}
                              </span>
                              {i < rp.path.length - 1 && (
                                <span className="self-center text-slate-300">{ARROW}</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                    {allSimpleResult.count > 20 && (
                      <p className="text-xs text-slate-400 text-center pt-1">
                        ... 还有 {allSimpleResult.count - 20} 条路径
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {singleSourceResult && (
              <section className={getSectionClasses('teal').container}>
                <h3 className={getSectionClasses('teal').title}>
                  单源最短路径分布
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    源: <span className="font-semibold text-slate-700 dark:text-slate-300">{graph.getNodeAttribute(singleSourceResult.sourceId, 'title') as string || singleSourceResult.sourceId}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                    <StatRow label="可达节点" value={singleSourceResult.reachableCount} />
                    <StatRow label="最远距离" value={singleSourceResult.maxDistance} />
                    <StatRow label="平均距离" value={singleSourceResult.avgDistance.toFixed(2)} />
                  </div>
                  <div className="mt-2">
                    <span className={LABEL_CLASS}>距离分布</span>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                      {(() => {
                        const distMap: Record<number, string[]> = {};
                        Object.entries(singleSourceResult.distances).forEach(([nid, dist]) => {
                          if (!isFinite(dist)) {
                            return;
                          }
                          const d = dist as number;
                          if (!distMap[d]) {
                            distMap[d] = [];
                          }
                          distMap[d].push(nid);
                        });
                        return Object.entries(distMap)
                          .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                          .map(([dist, nodeIds]) => (
                            <div key={dist} className="p-2 rounded bg-slate-50/60 dark:bg-slate-800/60">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-teal-600">距离 {dist}</span>
                                <span className="text-xs text-slate-400">{nodeIds.length} 节点</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {nodeIds.slice(0, 12).map((nid) => (
                                  <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 truncate max-w-[5rem]">
                                    {graph.getNodeAttribute(nid, 'title') as string || nid}
                                  </span>
                                ))}
                                {nodeIds.length > 12 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">+{nodeIds.length - 12}</span>
                                )}
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {pathResult && !globalLongestResult && !allSimpleResult && !singleSourceResult && (
              <section className={getSectionClasses('teal').container}>
                <h3 className={getSectionClasses('teal').title}>结果</h3>
                {pathResult.distance === Infinity && (
                  <p className="text-sm text-slate-400">两节点之间不存在路径</p>
                )}
                {pathResult.distance === -1 && (
                  <p className="text-sm text-slate-400">两节点之间不存在路径</p>
                )}
                {pathResult.distance >= 0 && pathResult.distance !== Infinity && (
                  <>
                    <p className="text-sm mb-2">
                      距离: <span className="font-mono font-bold text-teal-600">{pathResult.distance}</span> 步
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {pathResult.path.map((nodeId, i) => (
                        <React.Fragment key={nodeId}>
                          <span className="px-2 py-1 rounded text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200/40">
                            {graph.getNodeAttribute(nodeId, 'title') as string || nodeId}
                          </span>
                          {i < pathResult.path.length - 1 && (
                            <span className="self-center text-slate-300">{ARROW}</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'connectivity' && (
          <>
            <section className={getSectionClasses('cyan').container}>
              <h3 className={getSectionClasses('cyan').title}>
                <CircleDot size={14} /> 弱连通分量
              </h3>
              {stats.componentCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    共 <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.componentCount}</span> 个弱连通分量
                    {largestComponent && largestComponent.length > 0 && (
                      <span className="ml-2">
                        最大分量 <span className="font-mono font-semibold text-cyan-600">{largestComponent.length}</span> 节点
                        ({(largestComponent.length / stats.nodeCount * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                  <div className="max-h-36 overflow-y-auto">
                    {connectedComponents(graph)
                      .sort((a, b) => b.length - a.length)
                      .slice(0, 10)
                      .map((comp, i) => (
                        <div key={i} className="p-2 rounded bg-slate-100/40 dark:bg-slate-800/40 flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600">分量 {i + 1}</span>
                          <span className="text-xs text-slate-400">{comp.length} 节点</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">暂无数据</p>
              )}
            </section>

            <section className={getSectionClasses('sky').container}>
              <h3 className={getSectionClasses('sky').title}>
                <GitMerge size={14} /> 强连通分量
              </h3>
              {sccResult && sccResult.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    共 <span className="font-semibold text-slate-700 dark:text-slate-300">{sccResult.length}</span> 个强连通分量
                    {(() => {
                      const maxScc = sccResult.reduce((a, b) => a.length >= b.length ? a : b, []);
                      return maxScc && maxScc.length > 0 ? (
                        <span className="ml-2">
                          最大SCC <span className="font-mono font-semibold text-sky-600">{maxScc.length}</span> 节点
                          ({(maxScc.length / stats.nodeCount * 100).toFixed(1)}%)
                        </span>
                      ) : null;
                    })()}
                  </p>
                  <div className="max-h-44 overflow-y-auto">
                    {sccResult
                      .sort((a, b) => b.length - a.length)
                      .slice(0, 10)
                      .map((comp, i) => (
                        <div key={i} className="p-2 rounded bg-slate-100/40 dark:bg-slate-800/40">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-sky-600">SCC {i + 1}</span>
                            <span className="text-xs text-slate-400">{comp.length} 节点</span>
                          </div>
                          {comp.length <= 8 && (
                            <div className="flex flex-wrap gap-1">
                              {comp.map((nid) => (
                                <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100/60 dark:bg-sky-900/20 text-sky-600 truncate max-w-[6rem]">
                                  {graph.getNodeAttribute(nid, 'title') as string || nid}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">暂无数据</p>
              )}
            </section>

            <section className={getSectionClasses('emerald').container}>
              <h3 className={getSectionClasses('emerald').title}>
                <Target size={14} /> 连通性指标
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <StatRow label="弱连通分量" value={stats.componentCount} />
                <StatRow label="强连通分量" value={sccResult ? sccResult.length : 0} />
                <StatRow label="直径" value={stats.diameter >= 0 ? stats.diameter : '\u221E'} />
                <StatRow label="半径" value={stats.radius >= 0 ? stats.radius : '\u221E'} />
                <StatRow label="平均最短路径" value={stats.avgPathLength.toFixed(2)} />
                <StatRow label="平均离心率" value={stats.avgEccentricity >= 0 ? stats.avgEccentricity.toFixed(2) : '\u221E'} />
              </div>
              {largestComponent && largestComponent.length > 0 && stats.nodeCount > 0 && (
                <div className="mt-2">
                  <StatRow
                    label="最大分量占比"
                    value={`${(largestComponent.length / stats.nodeCount * 100).toFixed(1)}%`}
                  />
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            <section className={getSectionClasses('indigo').container}>
              <h3 className={getSectionClasses('indigo').title}>
                <Layers size={14} /> 社区检测 (Louvain)
              </h3>
              {communities && communityGroups ? (
                <>
                  <p className="text-sm text-slate-500 mb-2">
                    发现 <span className="font-semibold text-slate-700 dark:text-slate-300">{Object.keys(communityGroups).length}</span> 个社区
                    {modularityScore !== null && (
                      <span className="ml-2">
                        模块度 Q = <span className="font-mono font-semibold text-indigo-600">{modularityScore.toFixed(4)}</span>
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => setShowCommunityDetail(!showCommunityDetail)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                  >
                    {showCommunityDetail ? '收起详情' : '展开详情'}
                    <ChevronDown size={12} className={`transition-transform ${showCommunityDetail ? 'rotate-180' : ''}`} />
                  </button>
                  {showCommunityDetail && (
                    <div className="space-y-2 max-h-52 overflow-y-auto mt-2">
                      {Object.entries(communityGroups).map(([commId, nodeIds]) => (
                        <div key={commId} className="p-2 rounded bg-slate-100/40 dark:bg-slate-800/40">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-600">社区 {String(Number(commId) + 1)}</span>
                            <span className="text-xs text-slate-400">{nodeIds.length} 节点</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {nodeIds.slice(0, 8).map((nid) => (
                              <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100/60 dark:bg-indigo-900/20 text-indigo-600 truncate max-w-[6rem]">
                                {graph.getNodeAttribute(nid, 'title') as string || nid}
                              </span>
                            ))}
                            {nodeIds.length > 8 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                                +{nodeIds.length - 8}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">节点不足，无法执行社区检测</p>
              )}
            </section>

            <section className={getSectionClasses('emerald').container}>
              <h3 className={getSectionClasses('emerald').title}>
                <Target size={14} /> DAG 分析
              </h3>
              {hasCycleResult !== null ? (
                <div className="space-y-2">
                  <StatRow
                    label="是否有环"
                    value={
                      <span className={hasCycleResult ? 'text-rose-500' : 'text-emerald-500'}>
                        {hasCycleResult ? '是 (含环)' : '否 (DAG)'}
                      </span>
                    }
                  />
                  {!hasCycleResult && (
                    <>
                      <div>
                        <span className={LABEL_CLASS}>拓扑排序</span>
                        <div className="flex flex-wrap gap-1 mt-1 max-h-28 overflow-y-auto">
                          {topologicalSort(graph)
                            .slice(0, 30)
                            .map((nid, i) => (
                              <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-600">
                                {i + 1}. {graph.getNodeAttribute(nid, 'title') as string || nid}
                              </span>
                            ))}
                          {topologicalSort(graph).length > 30 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                              +{topologicalSort(graph).length - 30}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className={LABEL_CLASS}>拓扑层级</span>
                        <div className="space-y-1.5 mt-1 max-h-48 overflow-y-auto">
                          {topologicalGenerations(graph)
                            .slice(0, 15)
                            .map((gen, i) => (
                              <div key={i} className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-900/10">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-emerald-600">层级 {i + 1}</span>
                                  <span className="text-xs text-slate-400">{gen.length} 节点</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {gen.slice(0, 10).map((nid) => (
                                    <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-600 truncate max-w-[5rem]">
                                      {graph.getNodeAttribute(nid, 'title') as string || nid}
                                    </span>
                                  ))}
                                  {gen.length > 10 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">+{gen.length - 10}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          {topologicalGenerations(graph).length > 15 && (
                            <p className="text-xs text-slate-400 text-center pt-1">
                              ... 还有 {topologicalGenerations(graph).length - 15} 层
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">节点不足，无法执行 DAG 分析</p>
              )}
            </section>

            <section className={getSectionClasses('sky').container}>
              <h3 className={getSectionClasses('sky').title}>
                <Hexagon size={14} /> K-Core 核心分解
              </h3>
              {coreNumbers && coreGroups ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    最大核心数: <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.max(...Object.values(coreNumbers) as number[])}</span>
                  </p>
                  <div className="max-h-44 overflow-y-auto">
                    {Object.entries(coreGroups)
                      .sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
                      .slice(0, 8)
                      .map(([k, nodeIds]) => (
                        <div key={k} className="p-2 rounded bg-slate-100/40 dark:bg-slate-800/40">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-sky-600">{k}-Core</span>
                            <span className="text-xs text-slate-400">{nodeIds.length} 节点</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {nodeIds.slice(0, 6).map((nid) => (
                              <span key={nid} className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100/60 dark:bg-sky-900/20 text-sky-600 truncate max-w-[6rem]">
                                {graph.getNodeAttribute(nid, 'title') as string || nid}
                              </span>
                            ))}
                            {nodeIds.length > 6 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                                +{nodeIds.length - 6}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">节点不足或含自环，无法执行核心分解</p>
              )}
            </section>
          </>
        )}
      </div>
      <AnalysisHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </motion.div>
  );
};

export default AnalysisPanel;
