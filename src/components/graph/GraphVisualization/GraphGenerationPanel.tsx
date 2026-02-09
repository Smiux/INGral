import React, { useState } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import { Clipboard, X, Zap, Users, Layers, Plus } from 'lucide-react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK from 'elkjs';

const elk = new ELK();

const INPUT_CLASS = 'w-full p-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-neutral-50 text-neutral-800';
const SECTION_CLASS = 'bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 shadow-sm border border-primary-100 hover:shadow-md transition-shadow';
const SECTION_TITLE_CLASS = 'text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800';

type GraphType = 'random' | 'chain' | 'cycle' | 'tree' | 'star' | 'grid';

interface BaseConfig {
  weightRange: [number, number];
  curveType: 'default' | 'smoothstep' | 'straight' | 'simplebezier';
}

interface RandomConfig extends BaseConfig {
  nodeCount: number;
  edgeCount: number;
  connectedComponentsCount: number;
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

interface GridConfig extends BaseConfig {
  rows: number;
  cols: number;
}

type GraphConfig = RandomConfig | ChainConfig | CycleConfig | TreeConfig | StarConfig | GridConfig;

interface GraphGenerationPanelProps {
  onGenerate: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

const DEFAULT_CONFIGS: Record<GraphType, GraphConfig> = {
  'random': { 'weightRange': [1, 10], 'curveType': 'default', 'nodeCount': 50, 'edgeCount': 150, 'connectedComponentsCount': 0 },
  'chain': { 'weightRange': [1, 10], 'curveType': 'straight', 'nodeCount': 20, 'direction': 'horizontal' },
  'cycle': { 'weightRange': [1, 10], 'curveType': 'straight', 'nodeCount': 15 },
  'tree': { 'weightRange': [1, 10], 'curveType': 'straight', 'maxDepth': 3, 'minDepth': 1, 'minChildrenPerNode': 1, 'maxChildrenPerNode': 3, 'childrenCount': 2, 'branchingMode': 'random', 'countMode': 'range' },
  'star': { 'weightRange': [1, 10], 'curveType': 'simplebezier', 'nodeCount': 12 },
  'grid': { 'weightRange': [1, 10], 'curveType': 'straight', 'rows': 5, 'cols': 10 }
} as const;

const createNode = (index: number, position = { 'x': 0, 'y': 0 }, title?: string): Node<CustomNodeData> => ({
  'id': `generated-node-${index}`,
  'type': 'custom',
  position,
  'data': {
    'title': title ?? `默认 ${index + 1}`,
    'category': '默认',
    'metadata': {
      'content': title ? `${title}的内容` : `默认 ${index + 1}的内容`
    }
  }
});

const createEdge = (sourceId: string, targetId: string, index: number, config: BaseConfig): Edge<CustomEdgeData> => ({
  'id': `generated-edge-${sourceId}-${targetId}-${index}`,
  'type': 'floating',
  'source': sourceId,
  'target': targetId,
  'data': {
    'type': '默认',
    'curveType': config.curveType,
    'weight': Math.floor(Math.random() * (config.weightRange[1] - config.weightRange[0] + 1)) + config.weightRange[0]
  },
  'markerEnd': {
    'type': 'arrowclosed',
    'color': '#3b82f6'
  }
});

const layoutGraph = async (
  nodes: Node<CustomNodeData>[],
  edges: Edge<CustomEdgeData>[],
  graphType: GraphType
): Promise<Node<CustomNodeData>[]> => {
  const algorithmMap: Record<GraphType, string> = {
    'random': 'org.eclipse.elk.random',
    'chain': 'org.eclipse.elk.layered',
    'tree': 'org.eclipse.elk.mrtree',
    'star': 'org.eclipse.elk.radial',
    'cycle': 'org.eclipse.elk.force',
    'grid': 'org.eclipse.elk.force'
  };

  const spacingMap: Record<GraphType, string> = {
    'chain': '100',
    'tree': '100',
    'star': '50',
    'random': '30',
    'cycle': '30',
    'grid': '30'
  };

  const layoutOptions: Record<string, string> = {
    'elk.algorithm': algorithmMap[graphType],
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.spacing.nodeNode': spacingMap[graphType]
  };

  if (graphType === 'chain') {
    layoutOptions['elk.direction'] = 'RIGHT';
  } else if (graphType === 'tree') {
    layoutOptions['elk.direction'] = 'DOWN';
  }

  try {
    const layoutedGraph = await elk.layout({
      'id': 'root',
      layoutOptions,
      'children': nodes.map(node => ({
        'id': node.id,
        'width': 150,
        'height': 50
      })),
      'edges': edges.map(edge => ({
        'id': edge.id,
        'sources': [edge.source],
        'targets': [edge.target]
      }))
    });

    return layoutedGraph.children ? nodes.map(node => {
      const layoutedNode = layoutedGraph.children?.find(n => n.id === node.id);
      if (layoutedNode?.x !== undefined && layoutedNode?.y !== undefined) {
        return { ...node, 'position': { 'x': layoutedNode.x, 'y': layoutedNode.y } };
      }
      return node;
    }) : nodes;
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
    const targetIndex = (i + 1) % config.nodeCount;
    edges.push(createEdge(`generated-node-${i}`, `generated-node-${targetIndex}`, i, config));
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

    if (currentDepth < config.maxDepth) {
      let childCount = config.countMode === 'fixed'
        ? config.childrenCount
        : Math.floor(Math.random() * (config.maxChildrenPerNode - config.minChildrenPerNode + 1 + config.minChildrenPerNode));

      if (config.branchingMode === 'random') {
        const shouldBranch = currentDepth < config.minDepth || Math.random() > 0.3;
        if (!shouldBranch) {
          childCount = 0;
        }
      }

      if (currentDepth < config.minDepth) {
        childCount = Math.max(1, childCount);
      }

      for (let i = 0; i < childCount; i += 1) {
        generateTreeNode(nodeId, currentDepth + 1);
      }
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

const generateGridGraph = (config: GridConfig) => {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge<CustomEdgeData>[] = [];
  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      nodes.push(createNode(row * config.cols + col, { 'x': col * 150, 'y': row * 150 }));
    }
  }
  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols - 1; col += 1) {
      const sourceIndex = row * config.cols + col;
      edges.push(createEdge(`generated-node-${sourceIndex}`, `generated-node-${sourceIndex + 1}`, edges.length, config));
    }
  }
  for (let col = 0; col < config.cols; col += 1) {
    for (let row = 0; row < config.rows - 1; row += 1) {
      const sourceIndex = row * config.cols + col;
      edges.push(createEdge(`generated-node-${sourceIndex}`, `generated-node-${sourceIndex + config.cols}`, edges.length, config));
    }
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
  let currentEdgeCount = 0;

  const addEdge = (sourceIndex: number, targetIndex: number, componentEdges?: Set<string>): boolean => {
    const sourceId = `generated-node-${sourceIndex}`;
    const targetId = `generated-node-${targetIndex}`;
    const edgeKey = `${sourceId}-${targetId}`;
    const reverseEdgeKey = `${targetId}-${sourceId}`;
    const edgeSet = componentEdges || existingEdges;

    if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseEdgeKey)) {
      edgeSet.add(edgeKey);
      existingEdges.add(edgeKey);
      edges.push(createEdge(sourceId, targetId, currentEdgeCount, config));
      currentEdgeCount += 1;
      return true;
    }
    return false;
  };

  const processComponent = (componentNodes: number[], totalEdgeCount: number, totalNodeCount: number): void => {
    const componentSize = componentNodes.length;
    const minEdges = componentSize - 1;
    const maxPossibleEdges = componentSize * (componentSize - 1);
    const componentEdgeCount = Math.min(
      Math.max(minEdges, Math.floor(totalEdgeCount * componentSize / totalNodeCount)),
      maxPossibleEdges
    );

    const componentExistingEdges = new Set<string>();
    const visited = new Set<number>([0]);

    while (visited.size < componentSize) {
      const visitedArray = Array.from(visited);
      const randomSourceIndex = visitedArray[Math.floor(Math.random() * visitedArray.length)]!;
      const randomTargetIndex = Math.floor(Math.random() * componentSize);

      if (!visited.has(randomTargetIndex)) {
        const edgeCreated = addEdge(componentNodes[randomSourceIndex]!, componentNodes[randomTargetIndex]!, componentExistingEdges);
        if (edgeCreated) {
          visited.add(randomTargetIndex);
        }
      }
    }

    while (componentExistingEdges.size < componentEdgeCount && currentEdgeCount < totalEdgeCount) {
      const randomSourceIndex = Math.floor(Math.random() * componentSize);
      const randomTargetIndex = Math.floor(Math.random() * componentSize);

      if (randomSourceIndex !== randomTargetIndex) {
        addEdge(componentNodes[randomSourceIndex]!, componentNodes[randomTargetIndex]!, componentExistingEdges);
      }
    }
  };

  if (config.connectedComponentsCount === 0) {
    while (currentEdgeCount < config.edgeCount && currentEdgeCount < config.nodeCount * (config.nodeCount - 1)) {
      const sourceIndex = Math.floor(Math.random() * config.nodeCount);
      const targetIndex = Math.floor(Math.random() * config.nodeCount);

      if (sourceIndex !== targetIndex) {
        addEdge(sourceIndex, targetIndex);
      }
    }
  } else {
    const componentsCount = Math.min(config.connectedComponentsCount, config.nodeCount);
    const componentSizes: number[] = [];
    let remainingNodes = config.nodeCount;

    for (let i = 0; i < componentsCount - 1; i += 1) {
      const size = Math.floor(Math.random() * (remainingNodes - (componentsCount - i - 1))) + 1;
      componentSizes.push(size);
      remainingNodes -= size;
    }
    componentSizes.push(remainingNodes);

    const nodeComponents: number[][] = Array.from({ 'length': componentsCount }, () => []);
    let nodeIndex = 0;

    for (let componentIndex = 0; componentIndex < componentsCount; componentIndex += 1) {
      const componentSize = componentSizes[componentIndex]!;
      const component = nodeComponents[componentIndex]!;
      for (let i = 0; i < componentSize; i += 1) {
        component.push(nodeIndex);
        nodeIndex += 1;
      }
    }

    for (const componentNodes of nodeComponents) {
      if (componentNodes.length > 1) {
        processComponent(componentNodes, config.edgeCount, config.nodeCount);
      }
    }
  }

  return { nodes, edges };
};

const generateGraph = (graphType: GraphType, config: GraphConfig) => {
  switch (graphType) {
    case 'chain':
      return generateChainGraph(config as ChainConfig);
    case 'cycle':
      return generateCycleGraph(config as CycleConfig);
    case 'tree':
      return generateTreeGraph(config as TreeConfig);
    case 'star':
      return generateStarGraph(config as StarConfig);
    case 'grid':
      return generateGridGraph(config as GridConfig);
    default:
      return generateRandomGraph(config as RandomConfig);
  }
};

const NumberInput = ({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <label className="block">
    <span className="text-xs text-neutral-600 mb-1 block">{label}</span>
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
    <span className="text-xs text-neutral-600 mb-1 block">{label}</span>
    <select
      className={INPUT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
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

export const GraphGenerationPanel: React.FC<GraphGenerationPanelProps> = ({ onGenerate, onClose }) => {
  const reactFlowInstance = useReactFlow();
  const [graphType, setGraphType] = useState<GraphType>('random');
  const [config, setConfig] = useState<GraphConfig>(DEFAULT_CONFIGS.random);

  const isTree = graphType === 'tree';
  const isGrid = graphType === 'grid';
  const isRandom = graphType === 'random';
  const isChain = graphType === 'chain';

  const updateConfig = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    const { nodes, edges } = generateGraph(graphType, config);
    const layoutedNodes = (isGrid || graphType === 'cycle')
      ? nodes
      : await layoutGraph(nodes, edges, graphType);
    onGenerate(layoutedNodes, edges);
    reactFlowInstance.fitView({ 'duration': 300 });
  };

  return (
    <div className="panel-container">
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
        <Section icon={Zap} title="图类型">
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
              { 'value': 'star', 'label': '⭐ 星状图' },
              { 'value': 'grid', 'label': '📊 网格图' }
            ]}
          />
        </Section>

        {isTree && (
          <Section icon={Layers} title="树图配置">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="最大深度"
                value={(config as TreeConfig).maxDepth}
                onChange={(v) => updateConfig('maxDepth', v)}
                min={1}
                max={5}
              />
              <NumberInput
                label="最小深度"
                value={(config as TreeConfig).minDepth}
                onChange={(v) => updateConfig('minDepth', v)}
                min={1}
                max={4}
              />
              <SelectInput
                label="分叉模式"
                value={(config as TreeConfig).branchingMode}
                onChange={(v) => updateConfig('branchingMode', v as 'fixed' | 'random')}
                options={[
                  { 'value': 'fixed', 'label': '固定分叉' },
                  { 'value': 'random', 'label': '随机分叉' }
                ]}
              />
              <SelectInput
                label="数量控制"
                value={(config as TreeConfig).countMode}
                onChange={(v) => updateConfig('countMode', v as 'fixed' | 'range')}
                options={[
                  { 'value': 'fixed', 'label': '固定数量' },
                  { 'value': 'range', 'label': '范围随机' }
                ]}
              />
              {(config as TreeConfig).countMode === 'fixed' ? (
                <NumberInput
                  label="固定子节点数"
                  value={(config as TreeConfig).childrenCount}
                  onChange={(v) => updateConfig('childrenCount', v)}
                  min={1}
                  max={5}
                />
              ) : (
                <>
                  <NumberInput
                    label="最小子节点数"
                    value={(config as TreeConfig).minChildrenPerNode}
                    onChange={(v) => updateConfig('minChildrenPerNode', v)}
                    min={1}
                    max={5}
                  />
                  <NumberInput
                    label="最大子节点数"
                    value={(config as TreeConfig).maxChildrenPerNode}
                    onChange={(v) => updateConfig('maxChildrenPerNode', v)}
                    min={1}
                    max={5}
                  />
                </>
              )}
            </div>
          </Section>
        )}

        {isGrid && (
          <Section icon={Layers} title="网格图配置">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="行数"
                value={(config as GridConfig).rows}
                onChange={(v) => updateConfig('rows', v)}
                min={1}
                max={20}
              />
              <NumberInput
                label="列数"
                value={(config as GridConfig).cols}
                onChange={(v) => updateConfig('cols', v)}
                min={1}
                max={20}
              />
            </div>
          </Section>
        )}

        {!isTree && !isGrid && (
          <Section icon={Users} title="节点配置">
            <NumberInput
              label="节点数量"
              value={(config as { nodeCount: number }).nodeCount}
              onChange={(v) => updateConfig('nodeCount', v)}
              min={2}
              max={500}
            />
          </Section>
        )}

        <Section icon={Zap} title="连接配置">
          <div className="space-y-4">
            {isRandom && (
              <>
                <NumberInput
                  label="连接数量"
                  value={(config as RandomConfig).edgeCount}
                  onChange={(v) => updateConfig('edgeCount', v)}
                  min={0}
                  max={(config as RandomConfig).nodeCount * ((config as RandomConfig).nodeCount - 1)}
                />
                <NumberInput
                  label="连通分支数量（0表示不限制）"
                  value={(config as RandomConfig).connectedComponentsCount}
                  onChange={(v) => updateConfig('connectedComponentsCount', v)}
                  min={0}
                  max={(config as RandomConfig).nodeCount}
                />
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="权重最小值"
                value={config.weightRange[0]}
                onChange={(v) => updateConfig('weightRange', [v, Math.max(v, config.weightRange[1])] as [number, number])}
                min={1}
                max={100}
              />
              <NumberInput
                label="权重最大值"
                value={config.weightRange[1]}
                onChange={(v) => updateConfig('weightRange', [Math.min(v, config.weightRange[0]), v] as [number, number])}
                min={1}
                max={100}
              />
            </div>
            <SelectInput
              label="连接线样式"
              value={config.curveType}
              onChange={(v) => updateConfig('curveType', v as BaseConfig['curveType'])}
              options={[
                { 'value': 'default', 'label': '贝塞尔曲线' },
                { 'value': 'smoothstep', 'label': '平滑阶梯' },
                { 'value': 'straight', 'label': '直线' },
                { 'value': 'simplebezier', 'label': '简单贝塞尔' }
              ]}
            />
          </div>
        </Section>

        {isChain && (
          <Section icon={Zap} title="链状图配置">
            <SelectInput
              label="方向"
              value={(config as ChainConfig).direction}
              onChange={(v) => updateConfig('direction', v as 'horizontal' | 'vertical')}
              options={[
                { 'value': 'horizontal', 'label': '水平' },
                { 'value': 'vertical', 'label': '垂直' }
              ]}
            />
          </Section>
        )}

        <button
          className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:scale-[1.02]"
          onClick={handleGenerate}
        >
          <Plus className="w-5 h-5" />生成图
        </button>
      </div>
    </div>
  );
};

export default GraphGenerationPanel;
