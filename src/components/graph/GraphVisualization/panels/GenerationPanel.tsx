import { useState } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import {
  Clipboard, X, Plus, Dices, CircleDot, TreeDeciduous, Sparkles,
  Box, Grid3X3, Columns2, Hexagon, Globe, Dice6, GitFork, Link2, ArrowLeftRight,
  type LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { CustomNodeData } from '../Node';
import type { CustomEdgeData } from '../Edge';
import ELK from 'elkjs';
import { SlidingCardSelector } from '@/components/ui/SlidingCardSelector';
import Graph from 'graphology';
import { erdosRenyi, clusters as generateClusters } from 'graphology-generators/random';
import { caveman, connectedCaveman } from 'graphology-generators/community';
import generators from 'ngraph.generators';
import {
  PANEL_CONTAINER_CLASS,
  PANEL_HEADER_CLASS,
  PANEL_TITLE_CLASS,
  PANEL_CONTENT_CLASS,
  PANEL_CLOSE_BTN_CLASS,
  getInputClass,
  LABEL_CLASS,
  getButtonClasses,
  getSectionClasses,
  type HoverColorType,
  PANEL_MOTION_VARIANTS_LEFT,
  PANEL_MOTION_TRANSITION
} from './panelStyles';

type CurveType = 'default' | 'smoothstep' | 'straight' | 'simplebezier';

type GraphType =
  | 'random'
  | 'cycle'
  | 'tree'
  | 'star'
  | 'complete'
  | 'grid'
  | 'completeBipartite'
  | 'circularLadder'
  | 'cliqueCircle'
  | 'wattsStrogatz'
  | 'erdosRenyi'
  | 'clustered'
  | 'caveman'
  | 'connectedCaveman';

interface BaseConfig {
  curveType: CurveType;
}

interface RandomConfig extends BaseConfig {
  graphType: 'random';
  nodeCount: number;
  edgeCount: number;
}

interface CycleConfig extends BaseConfig {
  graphType: 'cycle';
  nodeCount: number;
}

interface TreeConfig extends BaseConfig {
  graphType: 'tree';
  maxDepth: number;
  minDepth: number;
  minChildrenPerNode: number;
  maxChildrenPerNode: number;
  childrenCount: number;
  branchingMode: 'fixed' | 'random';
  countMode: 'fixed' | 'range';
}

interface StarConfig extends BaseConfig {
  graphType: 'star';
  nodeCount: number;
}

interface CompleteConfig extends BaseConfig {
  graphType: 'complete';
  nodeCount: number;
}

interface GridConfig extends BaseConfig {
  graphType: 'grid';
  rows: number;
  cols: number;
}

interface BipartiteConfig extends BaseConfig {
  graphType: 'completeBipartite';
  leftNodes: number;
  rightNodes: number;
}

interface CircularLadderConfig extends BaseConfig {
  graphType: 'circularLadder';
  steps: number;
}

interface CliqueCircleConfig extends BaseConfig {
  graphType: 'cliqueCircle';
  cliqueCount: number;
  cliqueSize: number;
}

interface WattsStrogatzConfig extends BaseConfig {
  graphType: 'wattsStrogatz';
  nodeCount: number;
  neighbors: number;
  probability: number;
}

interface ErdosRenyiConfig extends BaseConfig {
  graphType: 'erdosRenyi';
  order: number;
  probability: number;
}

interface ClusteredConfig extends BaseConfig {
  graphType: 'clustered';
  order: number;
  size: number;
  clusterCount: number;
  clusterDensity: number;
}

interface CavemanConfig extends BaseConfig {
  graphType: 'caveman' | 'connectedCaveman';
  cliques: number;
  cliqueSize: number;
}

type GraphConfig =
  | RandomConfig
  | CycleConfig
  | TreeConfig
  | StarConfig
  | CompleteConfig
  | GridConfig
  | BipartiteConfig
  | CircularLadderConfig
  | CliqueCircleConfig
  | WattsStrogatzConfig
  | ErdosRenyiConfig
  | ClusteredConfig
  | CavemanConfig;

type GraphResult = { nodes: Node<CustomNodeData>[]; edges: Edge<CustomEdgeData>[] };

interface GenerationPanelProps {
  onGenerate: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

const elk = new ELK();

const DEFAULT_CONFIGS: Record<GraphType, GraphConfig> = {
  'random': { 'graphType': 'random', 'curveType': 'default', 'nodeCount': 50, 'edgeCount': 150 },
  'cycle': { 'graphType': 'cycle', 'curveType': 'straight', 'nodeCount': 15 },
  'tree': { 'graphType': 'tree', 'curveType': 'straight', 'maxDepth': 3, 'minDepth': 1, 'minChildrenPerNode': 1, 'maxChildrenPerNode': 3, 'childrenCount': 2, 'branchingMode': 'random', 'countMode': 'range' },
  'star': { 'graphType': 'star', 'curveType': 'simplebezier', 'nodeCount': 12 },
  'complete': { 'graphType': 'complete', 'curveType': 'straight', 'nodeCount': 10 },
  'grid': { 'graphType': 'grid', 'curveType': 'straight', 'rows': 5, 'cols': 5 },
  'completeBipartite': { 'graphType': 'completeBipartite', 'curveType': 'straight', 'leftNodes': 5, 'rightNodes': 5 },
  'circularLadder': { 'graphType': 'circularLadder', 'curveType': 'straight', 'steps': 8 },
  'cliqueCircle': { 'graphType': 'cliqueCircle', 'curveType': 'default', 'cliqueCount': 6, 'cliqueSize': 4 },
  'wattsStrogatz': { 'graphType': 'wattsStrogatz', 'curveType': 'default', 'nodeCount': 50, 'neighbors': 4, 'probability': 0.1 },
  'erdosRenyi': { 'graphType': 'erdosRenyi', 'curveType': 'default', 'order': 50, 'probability': 0.1 },
  'clustered': { 'graphType': 'clustered', 'curveType': 'default', 'order': 100, 'size': 300, 'clusterCount': 4, 'clusterDensity': 0.7 },
  'caveman': { 'graphType': 'caveman', 'curveType': 'default', 'cliques': 4, 'cliqueSize': 5 },
  'connectedCaveman': { 'graphType': 'connectedCaveman', 'curveType': 'default', 'cliques': 4, 'cliqueSize': 5 }
};

type LayoutMode = 'elk' | 'circular';

interface LayoutConfig {
  mode: LayoutMode;
  algorithm?: string;
  options?: Record<string, string>;
}

const LAYOUT_CONFIGS: Record<GraphType, LayoutConfig> = {
  'random': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.random', 'options': { 'elk.spacing.nodeNode': '30' } },
  'cycle': { 'mode': 'circular' },
  'tree': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.mrtree', 'options': { 'elk.spacing.nodeNode': '100', 'elk.direction': 'DOWN' } },
  'star': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.radial', 'options': { 'elk.spacing.nodeNode': '50' } },
  'complete': { 'mode': 'circular' },
  'grid': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '400', 'elk.stress.dimension': 'XY' } },
  'completeBipartite': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.layered', 'options': { 'elk.spacing.nodeNode': '80', 'elk.direction': 'RIGHT', 'elk.layered.spacing.nodeNodeBetweenLayers': '120' } },
  'circularLadder': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '350', 'elk.stress.dimension': 'XY' } },
  'cliqueCircle': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '350', 'elk.stress.dimension': 'XY' } },
  'wattsStrogatz': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '300', 'elk.stress.dimension': 'XY' } },
  'erdosRenyi': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.random', 'options': { 'elk.spacing.nodeNode': '30' } },
  'clustered': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.random', 'options': { 'elk.spacing.nodeNode': '30' } },
  'caveman': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '400', 'elk.stress.dimension': 'XY' } },
  'connectedCaveman': { 'mode': 'elk', 'algorithm': 'org.eclipse.elk.stress', 'options': { 'elk.stress.desiredEdgeLength': '400', 'elk.stress.dimension': 'XY' } }
};

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

const applyCircularLayout = (nodes: Node<CustomNodeData>[], centerX = 600, centerY = 400): Node<CustomNodeData>[] => {
  const count = nodes.length;
  if (count === 0) {
    return nodes;
  }
  const minGap = Math.max(NODE_WIDTH * 0.8, NODE_HEIGHT * 2);
  const circumference = count * (NODE_WIDTH + minGap);
  const radius = Math.max(circumference / (2 * Math.PI), 100);
  return nodes.map((node, i) => {
    const angle = (Math.PI / 2) - (i / count) * Math.PI * 2;
    return { ...node, 'position': { 'x': Math.cos(angle) * radius + centerX, 'y': Math.sin(angle) * radius + centerY } };
  });
};

const layoutGraph = async (
  nodes: Node<CustomNodeData>[],
  edges: Edge<CustomEdgeData>[],
  graphType: GraphType
): Promise<Node<CustomNodeData>[]> => {
  const cfg = LAYOUT_CONFIGS[graphType];
  if (!cfg) {
    return nodes;
  }

  if (cfg.mode === 'circular') {
    return applyCircularLayout(nodes);
  }

  const layoutOptions: Record<string, string> = {
    'elk.algorithm': cfg.algorithm!,
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    ...cfg.options
  };

  try {
    const layoutedGraph = await elk.layout({
      'id': 'root',
      layoutOptions,
      'children': nodes.map(node => ({ 'id': node.id, 'width': NODE_WIDTH, 'height': NODE_HEIGHT })),
      'edges': edges.map(edge => ({ 'id': edge.id, 'sources': [edge.source], 'targets': [edge.target] }))
    });

    if (!layoutedGraph.children) {
      return nodes;
    }

    return nodes.map(node => {
      const layoutedNode = layoutedGraph.children?.find(n => n.id === node.id);
      if (layoutedNode?.x !== undefined && layoutedNode?.y !== undefined) {
        return { ...node, 'position': { 'x': layoutedNode.x, 'y': layoutedNode.y } };
      }
      return node;
    });
  } catch {
    return nodes;
  }
};

const GRAPH_TYPE_OPTIONS: Array<{ value: GraphType; label: string; icon: LucideIcon; group: string }> = [
  { 'value': 'random', 'label': '随机图', 'icon': Dices, 'group': '基础' },
  { 'value': 'complete', 'label': '完全图', 'icon': Box, 'group': '基础' },
  { 'value': 'grid', 'label': '网格图', 'icon': Grid3X3, 'group': '基础' },
  { 'value': 'star', 'label': '星状图', 'icon': Sparkles, 'group': '基础' },
  { 'value': 'cycle', 'label': '环状图', 'icon': CircleDot, 'group': '基础' },
  { 'value': 'tree', 'label': '随机树', 'icon': TreeDeciduous, 'group': '基础' },

  { 'value': 'erdosRenyi', 'label': 'ER随机图', 'icon': Dice6, 'group': '随机模型' },
  { 'value': 'wattsStrogatz', 'label': 'WS小世界', 'icon': Globe, 'group': '随机模型' },
  { 'value': 'clustered', 'label': '聚类随机图', 'icon': GitFork, 'group': '随机模型' },

  { 'value': 'completeBipartite', 'label': '完全二分图', 'icon': Columns2, 'group': '结构' },
  { 'value': 'circularLadder', 'label': '圆形梯形', 'icon': ArrowLeftRight, 'group': '结构' },
  { 'value': 'cliqueCircle', 'label': '团环图', 'icon': Hexagon, 'group': '结构' },
  { 'value': 'caveman', 'label': '洞穴人图', 'icon': Hexagon, 'group': '社区' },
  { 'value': 'connectedCaveman', 'label': '连通洞穴人', 'icon': Link2, 'group': '社区' }
];

const createNode = (index: number, position = { 'x': 0, 'y': 0 }, title?: string): Node<CustomNodeData> => ({
  'id': `generated-node-${index}`,
  'type': 'custom',
  position,
  'data': {
    'title': title ?? `默认 ${index + 1}`,
    'category': '默认',
    'metadata': { 'content': title ? `${title}的内容` : `默认 ${index + 1}的内容` }
  }
});

const createEdge = (sourceId: string, targetId: string, index: number, config: BaseConfig): Edge<CustomEdgeData> => ({
  'id': `generated-edge-${sourceId}-${targetId}-${index}`,
  'type': 'floating',
  'source': sourceId,
  'target': targetId,
  'sourceHandle': 'source',
  'targetHandle': 'target',
  'data': {
    'type': '默认',
    'curveType': config.curveType
  },
  'markerEnd': { 'type': 'arrowclosed', 'color': '#3b82f6' }
});

const ngraphToReactFlow = (ngGraph: ReturnType<typeof generators.complete>, config: BaseConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  let edgeIndex = 0;
  ngGraph.forEachNode((node: { id: string | number }) => {
    const idx = typeof node.id === 'number' ? node.id : parseInt(node.id, 10) || nodes.length;
    nodes.push(createNode(idx));
  });
  ngGraph.forEachLink((link: { fromId: string | number; toId: string | number }) => {
    edges.push(createEdge(`generated-node-${link.fromId}`, `generated-node-${link.toId}`, edgeIndex, config));
    edgeIndex += 1;
  });
  return { nodes, edges };
};

const graphologyToReactFlow = (graph: Graph, config: BaseConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  let edgeIndex = 0;
  graph.forEachNode((node: string) => {
    nodes.push(createNode(parseInt(node, 10)));
  });
  graph.forEachEdge((_edge: string, _attr: unknown, source: string, target: string) => {
    edges.push(createEdge(`generated-node-${source}`, `generated-node-${target}`, edgeIndex, config));
    edgeIndex += 1;
  });
  return { nodes, edges };
};

const generateRandomGraph = (config: RandomConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  for (let i = 0; i < config.nodeCount; i += 1) {
    nodes.push(createNode(i));
  }
  const existingEdges = new Set<string>();
  const maxEdges = config.nodeCount * (config.nodeCount - 1);
  let currentEdgeCount = 0;
  while (currentEdgeCount < config.edgeCount && currentEdgeCount < maxEdges) {
    const sourceIndex = Math.floor(Math.random() * config.nodeCount);
    const targetIndex = Math.floor(Math.random() * config.nodeCount);
    if (sourceIndex !== targetIndex) {
      const sourceId = `generated-node-${sourceIndex}`;
      const targetId = `generated-node-${targetIndex}`;
      const edgeKey = `${sourceId}-${targetId}`;
      if (!existingEdges.has(edgeKey)) {
        existingEdges.add(edgeKey);
        edges.push(createEdge(sourceId, targetId, currentEdgeCount, config));
        currentEdgeCount += 1;
      }
    }
  }
  return { nodes, edges };
};

const generateCycleGraph = (config: CycleConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  for (let i = 0; i < config.nodeCount; i += 1) {
    nodes.push(createNode(i));
  }
  for (let i = 0; i < config.nodeCount; i += 1) {
    edges.push(createEdge(`generated-node-${i}`, `generated-node-${(i + 1) % config.nodeCount}`, i, config));
  }
  return { nodes, edges };
};

const generateTreeGraph = (config: TreeConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  let nodeIndex = 0;

  const generateTreeNode = (parentId: string | null, currentDepth: number): void => {
    const nodeId = `generated-node-${nodeIndex}`;
    nodes.push(createNode(nodeIndex));
    nodeIndex += 1;

    if (parentId) {
      edges.push(createEdge(parentId, nodeId, edges.length, config));
    }

    if (currentDepth >= config.maxDepth) {
      return;
    }

    let childCount = config.countMode === 'fixed'
      ? config.childrenCount
      : Math.floor(Math.random() * (config.maxChildrenPerNode - config.minChildrenPerNode + 1)) + config.minChildrenPerNode;

    if (config.branchingMode === 'random' && currentDepth >= config.minDepth && Math.random() <= 0.3) {
      childCount = 0;
    }

    if (currentDepth < config.minDepth) {
      childCount = Math.max(1, childCount);
    }

    for (let i = 0; i < childCount; i += 1) {
      generateTreeNode(nodeId, currentDepth + 1);
    }
  };

  generateTreeNode(null, 0);
  return { nodes, edges };
};

const generateStarGraph = (config: StarConfig): GraphResult => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  nodes.push(createNode(0, { 'x': 0, 'y': 0 }, '默认 中心'));
  for (let i = 1; i < config.nodeCount; i += 1) {
    nodes.push(createNode(i));
    edges.push(createEdge('generated-node-0', `generated-node-${i}`, i - 1, config));
  }
  return { nodes, edges };
};

const generateCompleteGraph = (config: CompleteConfig): GraphResult => {
  return ngraphToReactFlow(generators.complete(config.nodeCount), config);
};

const generateGridGraph = (config: GridConfig): GraphResult => {
  return ngraphToReactFlow(generators.grid(config.rows, config.cols), config);
};

const generateBipartiteGraph = (config: BipartiteConfig): GraphResult => {
  return ngraphToReactFlow(generators.completeBipartite(config.leftNodes, config.rightNodes), config);
};

const generateCircularLadderGraph = (config: CircularLadderConfig): GraphResult => {
  return ngraphToReactFlow(generators.circularLadder(config.steps), config);
};

const generateCliqueCircleGraph = (config: CliqueCircleConfig): GraphResult => {
  return ngraphToReactFlow(generators.cliqueCircle(config.cliqueCount, config.cliqueSize), config);
};

const generateWattsStrogatzGraph = (config: WattsStrogatzConfig): GraphResult => {
  return ngraphToReactFlow(generators.wattsStrogatz(config.nodeCount, config.neighbors, config.probability), config);
};

const generateErdosRenyiGraph = (config: ErdosRenyiConfig): GraphResult => {
  return graphologyToReactFlow(erdosRenyi(Graph, { 'order': config.order, 'probability': config.probability }), config);
};

const generateClusteredGraph = (config: ClusteredConfig): GraphResult => {
  return graphologyToReactFlow(generateClusters(Graph, { 'order': config.order, 'size': config.size, 'clusters': config.clusterCount, 'clusterDensity': config.clusterDensity }), config);
};

const generateCavemanGraph = (config: CavemanConfig): GraphResult => {
  return graphologyToReactFlow(caveman(Graph, config.cliques, config.cliqueSize), config);
};

const generateConnectedCavemanGraph = (config: CavemanConfig): GraphResult => {
  return graphologyToReactFlow(connectedCaveman(Graph, config.cliques, config.cliqueSize), config);
};

const generateGraph = (config: GraphConfig): GraphResult => {
  switch (config.graphType) {
    case 'random': return generateRandomGraph(config);
    case 'cycle': return generateCycleGraph(config);
    case 'tree': return generateTreeGraph(config);
    case 'star': return generateStarGraph(config);
    case 'complete': return generateCompleteGraph(config);
    case 'grid': return generateGridGraph(config);
    case 'completeBipartite': return generateBipartiteGraph(config);
    case 'circularLadder': return generateCircularLadderGraph(config);
    case 'cliqueCircle': return generateCliqueCircleGraph(config);
    case 'wattsStrogatz': return generateWattsStrogatzGraph(config);
    case 'erdosRenyi': return generateErdosRenyiGraph(config);
    case 'clustered': return generateClusteredGraph(config);
    case 'caveman': return generateCavemanGraph(config);
    case 'connectedCaveman': return generateConnectedCavemanGraph(config);
    default: throw new Error('Unhandled graph type');
  }
};

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: HoverColorType;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min, max, step = 1, color = 'emerald' }) => (
  <label className="block">
    {label && <span className={LABEL_CLASS}>{label}</span>}
    <input
      type="number"
      className={getInputClass(color)}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  </label>
);

interface SelectInputProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  color?: HoverColorType;
}

const SelectInput = <T extends string, >({ label, value, onChange, options, color = 'emerald' }: SelectInputProps<T>) => (
  <label className="block">
    {label && <span className={LABEL_CLASS}>{label}</span>}
    <select className={getInputClass(color)} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </label>
);

export const GenerationPanel: React.FC<GenerationPanelProps> = ({ onGenerate, onClose }) => {
  const reactFlowInstance = useReactFlow();
  const [config, setConfig] = useState<GraphConfig>(DEFAULT_CONFIGS.random);

  const graphType = config.graphType;

  const graphTypeOptions = GRAPH_TYPE_OPTIONS.map(opt => ({
    'value': opt.value,
    'label': opt.label,
    'icon': opt.icon
  }));

  const handleGenerate = async () => {
    const { nodes, edges } = generateGraph(config);
    const layoutedNodes = await layoutGraph(nodes, edges, graphType);
    onGenerate(layoutedNodes, edges);
    reactFlowInstance.fitView({ 'duration': 300 });
  };

  const treeConfig = graphType === 'tree' ? config : null;
  const randomConfig = graphType === 'random' ? config : null;
  const erdosRenyiConfig = graphType === 'erdosRenyi' ? config : null;
  const wsConfig = graphType === 'wattsStrogatz' ? config : null;
  const clusteredConfig = graphType === 'clustered' ? config : null;
  const gridConfig = graphType === 'grid' ? config : null;
  const bipartiteConfig = graphType === 'completeBipartite' ? config : null;
  const circularLadderConfig = graphType === 'circularLadder' ? config : null;
  const cliqueCircleConfig = graphType === 'cliqueCircle' ? config : null;
  const cavemanConfig = (graphType === 'caveman' || graphType === 'connectedCaveman') ? config : null;

  return (
    <motion.div
      className={PANEL_CONTAINER_CLASS}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={PANEL_MOTION_VARIANTS_LEFT}
      transition={PANEL_MOTION_TRANSITION}
    >
      <div className={PANEL_HEADER_CLASS}>
        <div className={PANEL_TITLE_CLASS}>
          <Clipboard className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          图生成
        </div>
        <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
          <X size={16} />
        </button>
      </div>

      <div className={`${PANEL_CONTENT_CLASS} space-y-5`}>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">图类型</h3>
          <SlidingCardSelector
            options={graphTypeOptions}
            value={graphType}
            onChange={(value) => {
              setConfig(DEFAULT_CONFIGS[value]);
            }}
            color="emerald"
          />
        </div>

        {treeConfig && (
          <section className={getSectionClasses('lime').container}>
            <h3 className={getSectionClasses('lime').title}>树图配置</h3>

            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="最大深度" value={treeConfig.maxDepth} onChange={(v) => setConfig({ ...treeConfig, 'maxDepth': v })} min={1} max={5} color="lime" />
              <NumberInput label="最小深度" value={treeConfig.minDepth} onChange={(v) => setConfig({ ...treeConfig, 'minDepth': v })} min={1} max={4} color="lime" />
              <SelectInput
                label="分叉模式"
                value={treeConfig.branchingMode}
                onChange={(v) => setConfig({ ...treeConfig, 'branchingMode': v })}
                options={[{ 'value': 'fixed', 'label': '固定分叉' }, { 'value': 'random', 'label': '随机分叉' }]}
                color="lime"
              />
              <SelectInput
                label="数量控制"
                value={treeConfig.countMode}
                onChange={(v) => setConfig({ ...treeConfig, 'countMode': v })}
                options={[{ 'value': 'fixed', 'label': '固定数量' }, { 'value': 'range', 'label': '范围随机' }]}
                color="lime"
              />
              {treeConfig.countMode === 'fixed' ? (
                <NumberInput label="固定子节点数" value={treeConfig.childrenCount} onChange={(v) => setConfig({ ...treeConfig, 'childrenCount': v })} min={1} max={5} color="lime" />
              ) : (
                <>
                  <NumberInput label="最小子节点数" value={treeConfig.minChildrenPerNode} onChange={(v) => setConfig({ ...treeConfig, 'minChildrenPerNode': v })} min={1} max={5} color="lime" />
                  <NumberInput label="最大子节点数" value={treeConfig.maxChildrenPerNode} onChange={(v) => setConfig({ ...treeConfig, 'maxChildrenPerNode': v })} min={1} max={5} color="lime" />
                </>
              )}
            </div>
          </section>
        )}

        {('nodeCount' in config || 'order' in config) && (
          <section className={getSectionClasses('emerald').container}>
            <h3 className={getSectionClasses('emerald').title}>节点配置</h3>

            {'nodeCount' in config && (
              <NumberInput
                label="节点数量"
                value={config.nodeCount}
                onChange={(v) => setConfig({ ...config, 'nodeCount': v })}
                min={2}
                max={500}
              />
            )}

            {'order' in config && (
              <NumberInput
                label="节点数量"
                value={config.order}
                onChange={(v) => setConfig({ ...config, 'order': v })}
                min={2}
                max={500}
              />
            )}
          </section>
        )}

        {randomConfig && (
          <section className={getSectionClasses('teal').container}>
            <h3 className={getSectionClasses('teal').title}>连接配置</h3>
            <NumberInput
              label="连接数量"
              value={randomConfig.edgeCount}
              onChange={(v) => setConfig({ ...randomConfig, 'edgeCount': v })}
              min={0}
              max={randomConfig.nodeCount * (randomConfig.nodeCount - 1)}
              color="teal"
            />
          </section>
        )}

        {erdosRenyiConfig && (
          <section className={getSectionClasses('teal').container}>
            <h3 className={getSectionClasses('teal').title}>ER参数</h3>
            <NumberInput
              label="边概率 p"
              value={erdosRenyiConfig.probability}
              onChange={(v) => setConfig({ ...erdosRenyiConfig, 'probability': v })}
              min={0}
              max={1}
              step={0.01}
              color="teal"
            />
          </section>
        )}

        {wsConfig && (
          <section className={getSectionClasses('sky').container}>
            <h3 className={getSectionClasses('sky').title}>WS参数</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="邻居数 k" value={wsConfig.neighbors} onChange={(v) => setConfig({ ...wsConfig, 'neighbors': v })} min={2} max={20} step={2} color="sky" />
              <NumberInput label="重连概率 β" value={wsConfig.probability} onChange={(v) => setConfig({ ...wsConfig, 'probability': v })} min={0} max={1} step={0.01} color="sky" />
            </div>
          </section>
        )}

        {clusteredConfig && (
          <section className={getSectionClasses('indigo').container}>
            <h3 className={getSectionClasses('indigo').title}>聚类参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="社区数量" value={clusteredConfig.clusterCount} onChange={(v) => setConfig({ ...clusteredConfig, 'clusterCount': v })} min={2} max={10} color="indigo" />
              <NumberInput label="边总数" value={clusteredConfig.size} onChange={(v) => setConfig({ ...clusteredConfig, 'size': v })} min={1} max={2000} color="indigo" />
              <NumberInput label="社区内密度" value={clusteredConfig.clusterDensity} onChange={(v) => setConfig({ ...clusteredConfig, 'clusterDensity': v })} min={0} max={1} step={0.05} color="indigo" />
            </div>
          </section>
        )}

        {gridConfig && (
          <section className={getSectionClasses('cyan').container}>
            <h3 className={getSectionClasses('cyan').title}>网格参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="行数" value={gridConfig.rows} onChange={(v) => setConfig({ ...gridConfig, 'rows': v })} min={2} max={20} color="cyan" />
              <NumberInput label="列数" value={gridConfig.cols} onChange={(v) => setConfig({ ...gridConfig, 'cols': v })} min={2} max={20} color="cyan" />
            </div>
          </section>
        )}

        {bipartiteConfig && (
          <section className={getSectionClasses('blue').container}>
            <h3 className={getSectionClasses('blue').title}>二分图参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="左部节点数" value={bipartiteConfig.leftNodes} onChange={(v) => setConfig({ ...bipartiteConfig, 'leftNodes': v })} min={1} max={50} color="blue" />
              <NumberInput label="右部节点数" value={bipartiteConfig.rightNodes} onChange={(v) => setConfig({ ...bipartiteConfig, 'rightNodes': v })} min={1} max={50} color="blue" />
            </div>
          </section>
        )}

        {circularLadderConfig && (
          <section className={getSectionClasses('emerald').container}>
            <h3 className={getSectionClasses('emerald').title}>梯形参数</h3>
            <NumberInput label="梯形阶数" value={circularLadderConfig.steps} onChange={(v) => setConfig({ ...circularLadderConfig, 'steps': v })} min={3} max={20} color="emerald" />
          </section>
        )}

        {cliqueCircleConfig && (
          <section className={getSectionClasses('indigo').container}>
            <h3 className={getSectionClasses('indigo').title}>团环参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="团数量" value={cliqueCircleConfig.cliqueCount} onChange={(v) => setConfig({ ...cliqueCircleConfig, 'cliqueCount': v })} min={3} max={15} color="indigo" />
              <NumberInput label="每团大小" value={cliqueCircleConfig.cliqueSize} onChange={(v) => setConfig({ ...cliqueCircleConfig, 'cliqueSize': v })} min={3} max={8} color="indigo" />
            </div>
          </section>
        )}

        {cavemanConfig && (
          <section className={getSectionClasses('lime').container}>
            <h3 className={getSectionClasses('lime').title}>洞穴人参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="团数量 l" value={cavemanConfig.cliques} onChange={(v) => setConfig({ ...cavemanConfig, 'cliques': v })} min={2} max={10} color="lime" />
              <NumberInput label="每团大小 k" value={cavemanConfig.cliqueSize} onChange={(v) => setConfig({ ...cavemanConfig, 'cliqueSize': v })} min={3} max={10} color="lime" />
            </div>
          </section>
        )}

        <section className={getSectionClasses('emerald').container}>
          <h3 className={getSectionClasses('emerald').title}>连接线样式</h3>
          <SelectInput
            label="曲线类型"
            value={config.curveType}
            onChange={(v) => setConfig({ ...config, 'curveType': v })}
            options={[
              { 'value': 'default', 'label': '贝塞尔曲线' },
              { 'value': 'smoothstep', 'label': '平滑阶梯' },
              { 'value': 'straight', 'label': '直线' },
              { 'value': 'simplebezier', 'label': '简单贝塞尔' }
            ]}
            color="emerald"
          />
        </section>

        <button
          className={`w-full py-3 px-4 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 ${getButtonClasses('secondary', 'emerald')}`}
          onClick={handleGenerate}
        >
          <Plus className="w-4 h-4" />生成图
        </button>
      </div>
    </motion.div>
  );
};

export default GenerationPanel;
