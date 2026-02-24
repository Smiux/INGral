import { useState } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import { Clipboard, X, Network, Users, Layers, Plus } from 'lucide-react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK from 'elkjs';

const elk = new ELK();

const INPUT_CLASS = 'w-full p-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-neutral-50 text-neutral-800';
const SECTION_CLASS = 'bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 border border-primary-100 transition-shadow';
const SECTION_TITLE_CLASS = 'text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800';

type GraphType = 'random' | 'chain' | 'cycle' | 'tree' | 'star';
type CurveType = 'default' | 'smoothstep' | 'straight' | 'simplebezier';

interface BaseConfig {
  curveType: CurveType;
}

interface RandomConfig extends BaseConfig {
  nodeCount: number;
  edgeCount: number;
}

interface ChainConfig extends BaseConfig {
  nodeCount: number;
  direction: 'horizontal' | 'vertical';
}

interface CycleConfig extends BaseConfig {
  nodeCount: number;
}

interface TreeConfig extends BaseConfig {
  maxDepth: number;
  minDepth: number;
  minChildrenPerNode: number;
  maxChildrenPerNode: number;
  childrenCount: number;
  branchingMode: 'fixed' | 'random';
  countMode: 'fixed' | 'range';
}

interface StarConfig extends BaseConfig {
  nodeCount: number;
}

type GraphConfig = RandomConfig | ChainConfig | CycleConfig | TreeConfig | StarConfig;

interface GraphGenerationPanelProps {
  onGenerate: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

const DEFAULT_CONFIGS: Record<GraphType, GraphConfig> = {
  'random': { 'curveType': 'default', 'nodeCount': 50, 'edgeCount': 150 },
  'chain': { 'curveType': 'straight', 'nodeCount': 20, 'direction': 'horizontal' },
  'cycle': { 'curveType': 'straight', 'nodeCount': 15 },
  'tree': { 'curveType': 'straight', 'maxDepth': 3, 'minDepth': 1, 'minChildrenPerNode': 1, 'maxChildrenPerNode': 3, 'childrenCount': 2, 'branchingMode': 'random', 'countMode': 'range' },
  'star': { 'curveType': 'simplebezier', 'nodeCount': 12 }
} as const;

const LAYOUT_CONFIG: Record<GraphType, { algorithm: string; spacing: string; direction?: string }> = {
  'random': { 'algorithm': 'org.eclipse.elk.random', 'spacing': '30' },
  'chain': { 'algorithm': 'org.eclipse.elk.layered', 'spacing': '100', 'direction': 'RIGHT' },
  'tree': { 'algorithm': 'org.eclipse.elk.mrtree', 'spacing': '100', 'direction': 'DOWN' },
  'star': { 'algorithm': 'org.eclipse.elk.radial', 'spacing': '50' },
  'cycle': { 'algorithm': 'org.eclipse.elk.force', 'spacing': '30' }
};

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
  'data': {
    'type': '默认',
    'curveType': config.curveType
  },
  'markerEnd': { 'type': 'arrowclosed', 'color': '#3b82f6' }
});

const layoutGraph = async (
  nodes: Node<CustomNodeData>[],
  edges: Edge<CustomEdgeData>[],
  graphType: GraphType
): Promise<Node<CustomNodeData>[]> => {
  const { algorithm, spacing, direction } = LAYOUT_CONFIG[graphType];
  const layoutOptions: Record<string, string> = {
    'elk.algorithm': algorithm,
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.spacing.nodeNode': spacing
  };

  if (direction) {
    layoutOptions['elk.direction'] = direction;
  }

  try {
    const layoutedGraph = await elk.layout({
      'id': 'root',
      layoutOptions,
      'children': nodes.map(node => ({ 'id': node.id, 'width': 150, 'height': 50 })),
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

const generateChainGraph = (config: ChainConfig) => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  for (let i = 0; i < config.nodeCount; i += 1) {
    nodes.push(createNode(i));
  }
  for (let i = 0; i < config.nodeCount - 1; i += 1) {
    edges.push(createEdge(`generated-node-${i}`, `generated-node-${i + 1}`, i, config));
  }
  return { nodes, edges };
};

const generateCycleGraph = (config: CycleConfig) => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  const nodeSize = 100;
  const minGap = nodeSize * 1.5;
  const circumference = config.nodeCount * (nodeSize + minGap);
  const radius = circumference / (2 * Math.PI);
  for (let i = 0; i < config.nodeCount; i += 1) {
    const angle = (Math.PI / 2) - (i / config.nodeCount) * Math.PI * 2;
    nodes.push(createNode(i, { 'x': Math.cos(angle) * radius + 400, 'y': Math.sin(angle) * radius + 300 }));
  }
  for (let i = 0; i < config.nodeCount; i += 1) {
    edges.push(createEdge(`generated-node-${i}`, `generated-node-${(i + 1) % config.nodeCount}`, i, config));
  }
  return { nodes, edges };
};

const generateTreeGraph = (config: TreeConfig) => {
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

const generateStarGraph = (config: StarConfig) => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  nodes.push(createNode(0, { 'x': 0, 'y': 0 }, '默认 中心'));
  for (let i = 1; i < config.nodeCount; i += 1) {
    nodes.push(createNode(i));
    edges.push(createEdge('generated-node-0', `generated-node-${i}`, i - 1, config));
  }
  return { nodes, edges };
};

const generateRandomGraph = (config: RandomConfig) => {
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
      const reverseEdgeKey = `${targetId}-${sourceId}`;

      if (!existingEdges.has(edgeKey) && !existingEdges.has(reverseEdgeKey)) {
        existingEdges.add(edgeKey);
        edges.push(createEdge(sourceId, targetId, currentEdgeCount, config));
        currentEdgeCount += 1;
      }
    }
  }

  return { nodes, edges };
};

const generateGraph = (graphType: GraphType, config: GraphConfig) => {
  switch (graphType) {
    case 'chain': return generateChainGraph(config as ChainConfig);
    case 'cycle': return generateCycleGraph(config as CycleConfig);
    case 'tree': return generateTreeGraph(config as TreeConfig);
    case 'star': return generateStarGraph(config as StarConfig);
    default: return generateRandomGraph(config as RandomConfig);
  }
};

const NumberInput = ({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <label className="block">
    {label && <span className="text-xs text-neutral-600 mb-1 block">{label}</span>}
    <input
      type="number"
      className={INPUT_CLASS}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    />
  </label>
);

const SelectInput = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <label className="block">
    {label && <span className="text-xs text-neutral-600 mb-1 block">{label}</span>}
    <select className={INPUT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </label>
);

const Section = ({ 'icon': Icon, title, children }: { 'icon': React.ElementType; title: string; children: React.ReactNode }) => (
  <section className={SECTION_CLASS}>
    <h3 className={SECTION_TITLE_CLASS}>
      <Icon className="w-4 h-4 text-primary-400" />
      {title}
    </h3>
    {children}
  </section>
);

export const GraphGenerationPanel: React.FC<GraphGenerationPanelProps> = ({ onGenerate, onClose, isOpen }) => {
  const reactFlowInstance = useReactFlow();
  const [graphType, setGraphType] = useState<GraphType>('random');
  const [config, setConfig] = useState<GraphConfig>(DEFAULT_CONFIGS.random);

  const handleGenerate = async () => {
    const { nodes, edges } = generateGraph(graphType, config);
    const layoutedNodes = graphType === 'cycle' ? nodes : await layoutGraph(nodes, edges, graphType);
    onGenerate(layoutedNodes, edges);
    reactFlowInstance.fitView({ 'duration': 300 });
  };

  const treeConfig = graphType === 'tree' ? (config as TreeConfig) : null;
  const randomConfig = graphType === 'random' ? (config as RandomConfig) : null;
  const chainConfig = graphType === 'chain' ? (config as ChainConfig) : null;
  const nodeCountConfig = (config as { nodeCount?: number }).nodeCount;

  return (
    <div className={`panel-container ${isOpen ? 'panel-open' : 'panel-closing'}`}>
      <div className="panel-header">
        <div className="panel-title">
          <Clipboard className="w-5 h-5 text-primary-400" />
          图生成
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors flex-shrink-0" title="关闭面板">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="panel-content space-y-6">
        <Section icon={Network} title="图类型">
          <SelectInput
            label=""
            value={graphType}
            onChange={(v) => {
              const newType = v as GraphType;
              setGraphType(newType);
              setConfig(DEFAULT_CONFIGS[newType]);
            }}
            options={[
              { 'value': 'random', 'label': '🎲 随机图' },
              { 'value': 'chain', 'label': '🔗 链状图' },
              { 'value': 'cycle', 'label': '🔄 环状图' },
              { 'value': 'tree', 'label': '🌳 随机树' },
              { 'value': 'star', 'label': '⭐ 星状图' }
            ]}
          />
        </Section>

        {treeConfig && (
          <Section icon={Layers} title="树图配置">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="最大深度" value={treeConfig.maxDepth} onChange={(v) => setConfig({ ...config, 'maxDepth': v })} min={1} max={5} />
              <NumberInput label="最小深度" value={treeConfig.minDepth} onChange={(v) => setConfig({ ...config, 'minDepth': v })} min={1} max={4} />
              <SelectInput
                label="分叉模式"
                value={treeConfig.branchingMode}
                onChange={(v) => setConfig({ ...config, 'branchingMode': v as 'fixed' | 'random' })}
                options={[{ 'value': 'fixed', 'label': '固定分叉' }, { 'value': 'random', 'label': '随机分叉' }]}
              />
              <SelectInput
                label="数量控制"
                value={treeConfig.countMode}
                onChange={(v) => setConfig({ ...config, 'countMode': v as 'fixed' | 'range' })}
                options={[{ 'value': 'fixed', 'label': '固定数量' }, { 'value': 'range', 'label': '范围随机' }]}
              />
              {treeConfig.countMode === 'fixed' ? (
                <NumberInput label="固定子节点数" value={treeConfig.childrenCount} onChange={(v) => setConfig({ ...config, 'childrenCount': v })} min={1} max={5} />
              ) : (
                <>
                  <NumberInput label="最小子节点数" value={treeConfig.minChildrenPerNode} onChange={(v) => setConfig({ ...config, 'minChildrenPerNode': v })} min={1} max={5} />
                  <NumberInput label="最大子节点数" value={treeConfig.maxChildrenPerNode} onChange={(v) => setConfig({ ...config, 'maxChildrenPerNode': v })} min={1} max={5} />
                </>
              )}
            </div>
          </Section>
        )}

        {!treeConfig && nodeCountConfig !== undefined && (
          <Section icon={Users} title="节点配置">
            <NumberInput
              label="节点数量"
              value={nodeCountConfig}
              onChange={(v) => setConfig({ ...config, 'nodeCount': v })}
              min={2}
              max={500}
            />
          </Section>
        )}

        <Section icon={Network} title="连接配置">
          <div className="space-y-4">
            {randomConfig && (
              <NumberInput
                label="连接数量"
                value={randomConfig.edgeCount}
                onChange={(v) => setConfig({ ...config, 'edgeCount': v })}
                min={0}
                max={randomConfig.nodeCount * (randomConfig.nodeCount - 1)}
              />
            )}
            <SelectInput
              label="连接线样式"
              value={config.curveType}
              onChange={(v) => setConfig({ ...config, 'curveType': v as CurveType })}
              options={[
                { 'value': 'default', 'label': '贝塞尔曲线' },
                { 'value': 'smoothstep', 'label': '平滑阶梯' },
                { 'value': 'straight', 'label': '直线' },
                { 'value': 'simplebezier', 'label': '简单贝塞尔' }
              ]}
            />
          </div>
        </Section>

        {chainConfig && (
          <Section icon={Network} title="链状图配置">
            <SelectInput
              label="方向"
              value={chainConfig.direction}
              onChange={(v) => setConfig({ ...config, 'direction': v as 'horizontal' | 'vertical' })}
              options={[{ 'value': 'horizontal', 'label': '水平' }, { 'value': 'vertical', 'label': '垂直' }]}
            />
          </Section>
        )}

        <button
          className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white"
          onClick={handleGenerate}
        >
          <Plus className="w-5 h-5" />生成图
        </button>
      </div>
    </div>
  );
};

export default GraphGenerationPanel;
