import React, { useState } from 'react';
import { Node, Edge, useReactFlow, useStore } from '@xyflow/react';
import { Layout, Settings, X, Zap, RefreshCw } from 'lucide-react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK, { ElkNode } from 'elkjs';

type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial' | 'box';
type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

interface GraphLayoutPanelProps {
  onLayout: (nodes: Node<CustomNodeData>[], edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

const INPUT_CLASSES = 'w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200';
const LABEL_CLASSES = 'block text-xs text-neutral-600 dark:text-neutral-400 mb-1';

const ALGORITHM_ID_MAP = {
  'layered': 'org.eclipse.elk.layered',
  'force': 'org.eclipse.elk.force',
  'stress': 'org.eclipse.elk.stress',
  'mrtree': 'org.eclipse.elk.mrtree',
  'radial': 'org.eclipse.elk.radial',
  'box': 'org.eclipse.elk.box'
} as const;

const DEFAULT_OPTIONS = {
  'algorithm': 'layered' as LayoutAlgorithm,
  'direction': 'DOWN' as LayoutDirection,
  'nodeSpacing': 50 as number,
  'edgeEdgeSpacing': 10 as number,
  'edgeNodeSpacing': 10 as number,
  'randomSeed': 0 as number,
  'layered': {
    'rankSpacing': 100,
    'crossingMinimization': 'LAYER_SWEEP',
    'nodePlacement': 'NETWORK_SIMPLEX',
    'feedbackEdges': false,
    'considerModelOrder': 'NODES_AND_EDGES',
    'nodeLayeringStrategy': 'NETWORK_SIMPLEX',
    'mergeEdges': false
  },
  'force': {
    'iterations': 300,
    'forceModel': 'FRUCHTERMAN_REINGOLD',
    'repulsion': 5.0,
    'temperature': 0.001
  },
  'radial': {
    'compaction': 'NONE',
    'compactionStepSize': 1
  },
  'mrtree': {
    'weighting': 'MODEL_ORDER',
    'searchOrder': 'DFS'
  },
  'stress': {
    'desiredEdgeLength': 100,
    'epsilon': 0.0001,
    'dimension': 'XY',
    'iterationLimit': 1000000
  },
  'box': {
    'packingMode': 'SIMPLE'
  }
};

type FieldConfig =
  | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: string }
  | { key: string; label: string; type: 'select'; options: ReadonlyArray<{ value: string; label: string }> }
  | { key: string; label: string; type: 'checkbox'; description?: string };

const ALGORITHM_CONFIGS = {
  'layered': {
    'title': '层次布局 (Layered) 参数',
    'bgColor': 'bg-blue-50 dark:bg-blue-950/30',
    'borderColor': 'border-blue-100 dark:border-blue-900',
    'titleColor': 'text-blue-800 dark:text-blue-300',
    'fields': [
      { 'key': 'rankSpacing', 'label': '层级间距', 'type': 'number' as const },
      { 'key': 'crossingMinimization', 'label': '交叉最小化', 'type': 'select' as const, 'options': [
        { 'value': 'LAYER_SWEEP', 'label': '层扫描' },
        { 'value': 'MEDIAN_LAYER_SWEEP', 'label': '中位数层扫描' },
        { 'value': 'INTERACTIVE', 'label': '交互式' },
        { 'value': 'NONE', 'label': '无' }
      ]},
      { 'key': 'nodePlacement', 'label': '节点放置', 'type': 'select' as const, 'options': [
        { 'value': 'NETWORK_SIMPLEX', 'label': '网络单纯形法' },
        { 'value': 'BRANDES_KOEPF', 'label': 'Brandes-Koepf' },
        { 'value': 'LINEAR_SEGMENTS', 'label': '线性分段' }
      ]},
      { 'key': 'feedbackEdges', 'label': '反馈连接处理', 'type': 'checkbox' as const, 'description': '允许反馈连接（形成环的连接）' },
      { 'key': 'considerModelOrder', 'label': '考虑模型顺序', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'NODES_AND_EDGES', 'label': '节点和连接' }
      ]},
      { 'key': 'nodeLayeringStrategy', 'label': '节点分层策略', 'type': 'select' as const, 'options': [
        { 'value': 'NETWORK_SIMPLEX', 'label': '网络单纯形法' },
        { 'value': 'LONGEST_PATH', 'label': '最长路径' },
        { 'value': 'COFFMAN_GRAHAM', 'label': 'Coffman-Graham' },
        { 'value': 'SIMPLE', 'label': '简单' }
      ]},
      { 'key': 'mergeEdges', 'label': '合并边', 'type': 'checkbox' as const, 'description': '合并平行边' }
    ]
  },
  'force': {
    'title': '力导向布局 (Force) 参数',
    'bgColor': 'bg-green-50 dark:bg-green-950/30',
    'borderColor': 'border-green-100 dark:border-green-900',
    'titleColor': 'text-green-800 dark:text-green-300',
    'fields': [
      { 'key': 'iterations', 'label': '迭代次数', 'type': 'number' as const },
      { 'key': 'forceModel', 'label': '力模型', 'type': 'select' as const, 'options': [
        { 'value': 'EADES', 'label': 'Eades模型' },
        { 'value': 'FRUCHTERMAN_REINGOLD', 'label': 'Fruchterman-Reingold模型' }
      ]},
      { 'key': 'repulsion', 'label': 'Eades模型排斥力', 'type': 'number' as const },
      { 'key': 'temperature', 'label': 'FR模型温度', 'type': 'number' as const, 'step': '0.0001' }
    ]
  },
  'mrtree': {
    'title': '树布局 (Mr.Tree) 参数',
    'bgColor': 'bg-purple-50 dark:bg-purple-950/30',
    'borderColor': 'border-purple-100 dark:border-purple-900',
    'titleColor': 'text-purple-800 dark:text-purple-300',
    'fields': [
      { 'key': 'weighting', 'label': '节点加权', 'type': 'select' as const, 'options': [
        { 'value': 'MODEL_ORDER', 'label': '模型顺序' },
        { 'value': 'DESCENDANTS', 'label': '后代数量' },
        { 'value': 'FAN', 'label': '扇出数量' }
      ]},
      { 'key': 'searchOrder', 'label': '搜索顺序', 'type': 'select' as const, 'options': [
        { 'value': 'DFS', 'label': '深度优先搜索' },
        { 'value': 'BFS', 'label': '广度优先搜索' }
      ]}
    ]
  },
  'radial': {
    'title': '辐射状布局 (Radial) 参数',
    'bgColor': 'bg-orange-50 dark:bg-orange-950/30',
    'borderColor': 'border-orange-100 dark:border-orange-900',
    'titleColor': 'text-orange-800 dark:text-orange-300',
    'fields': [
      { 'key': 'compaction', 'label': '压缩策略', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'RADIAL_COMPACTION', 'label': '径向压缩' },
        { 'value': 'WEDGE_COMPACTION', 'label': '楔形压缩' }
      ]},
      { 'key': 'compactionStepSize', 'label': '压缩步长', 'type': 'number' as const }
    ]
  },
  'stress': {
    'title': '应力布局 (Stress) 参数',
    'bgColor': 'bg-pink-50 dark:bg-pink-950/30',
    'borderColor': 'border-pink-100 dark:border-pink-900',
    'titleColor': 'text-pink-800 dark:text-pink-300',
    'fields': [
      { 'key': 'desiredEdgeLength', 'label': '期望连接长度', 'type': 'number' as const },
      { 'key': 'epsilon', 'label': '应力阈值', 'type': 'number' as const, 'step': '0.0001' },
      { 'key': 'dimension', 'label': '布局维度', 'type': 'select' as const, 'options': [
        { 'value': 'XY', 'label': 'XY轴' },
        { 'value': 'X', 'label': 'X轴' },
        { 'value': 'Y', 'label': 'Y轴' }
      ]},
      { 'key': 'iterationLimit', 'label': '迭代限制', 'type': 'number' as const }
    ]
  },
  'box': {
    'title': '盒布局 (Box) 参数',
    'bgColor': 'bg-sky-50 dark:bg-sky-950/30',
    'borderColor': 'border-sky-100 dark:border-sky-900',
    'titleColor': 'text-sky-600 dark:text-sky-400',
    'fields': [
      { 'key': 'packingMode', 'label': '打包模式', 'type': 'select' as const, 'options': [
        { 'value': 'SIMPLE', 'label': '简单' },
        { 'value': 'GROUP_MIXED', 'label': '分组混合' }
      ]}
    ]
  }
} as const;

const ALGORITHM_OPTIONS = [
  { 'value': 'layered', 'label': '层次布局' },
  { 'value': 'force', 'label': '力导向布局' },
  { 'value': 'stress', 'label': '应力布局' },
  { 'value': 'mrtree', 'label': '树布局' },
  { 'value': 'radial', 'label': '辐射状布局' },
  { 'value': 'box', 'label': '盒布局' }
] as const;

const DIRECTION_OPTIONS = [
  { 'value': 'DOWN', 'label': '从上到下' },
  { 'value': 'RIGHT', 'label': '从左到右' },
  { 'value': 'UP', 'label': '从下到上' },
  { 'value': 'LEFT', 'label': '从右到左' }
] as const;

const elk = new ELK();

export const GraphLayoutPanel: React.FC<GraphLayoutPanelProps> = ({ onLayout, onClose, isOpen }) => {
  const reactFlowInstance = useReactFlow();
  const [layoutOptions, setLayoutOptions] = useState(DEFAULT_OPTIONS);
  const [isLayouting, setIsLayouting] = useState(false);
  const nodeCount = useStore((state) => state.nodes.length);

  const executeLayout = async () => {
    const currentNodes = reactFlowInstance.getNodes() as Node<CustomNodeData>[];
    const currentEdges = reactFlowInstance.getEdges() as Edge<CustomEdgeData>[];

    if (currentNodes.length === 0) {
      return;
    }

    setIsLayouting(true);

    try {
      const baseOptions: Record<string, string> = {
        'elk.algorithm': ALGORITHM_ID_MAP[layoutOptions.algorithm],
        'elk.randomSeed': layoutOptions.randomSeed.toString(),
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.spacing.nodeNode': layoutOptions.nodeSpacing.toString(),
        'elk.spacing.edgeEdge': layoutOptions.edgeEdgeSpacing.toString(),
        'elk.spacing.edgeNode': layoutOptions.edgeNodeSpacing.toString()
      };

      const algorithmOptionsMap: Record<LayoutAlgorithm, Record<string, string>> = {
        'layered': {
          'elk.direction': layoutOptions.direction,
          'elk.layered.spacing.baseValue': layoutOptions.nodeSpacing.toString(),
          'elk.layered.spacing.nodeNodeBetweenLayers': layoutOptions.layered.rankSpacing.toString(),
          'elk.layered.crossingMinimization.strategy': layoutOptions.layered.crossingMinimization,
          'elk.layered.nodePlacement.strategy': layoutOptions.layered.nodePlacement,
          'elk.layered.feedbackEdges': layoutOptions.layered.feedbackEdges.toString(),
          'elk.layered.considerModelOrder.strategy': layoutOptions.layered.considerModelOrder,
          'elk.layered.layering.strategy': layoutOptions.layered.nodeLayeringStrategy,
          'elk.layered.mergeEdges': layoutOptions.layered.mergeEdges.toString()
        },
        'force': {
          'org.eclipse.elk.force.iterations': layoutOptions.force.iterations.toString(),
          'org.eclipse.elk.force.model': layoutOptions.force.forceModel,
          'org.eclipse.elk.force.spacing.nodeNode': layoutOptions.nodeSpacing.toString(),
          'org.eclipse.elk.force.repulsion': layoutOptions.force.repulsion.toString(),
          'org.eclipse.elk.force.temperature': layoutOptions.force.temperature.toString(),
          'elk.randomSeed': layoutOptions.randomSeed.toString()
        },
        'mrtree': {
          'elk.direction': layoutOptions.direction,
          'org.eclipse.elk.mrtree.weighting': layoutOptions.mrtree.weighting,
          'org.eclipse.elk.mrtree.searchOrder': layoutOptions.mrtree.searchOrder
        },
        'radial': {
          'elk.direction': layoutOptions.direction,
          'org.eclipse.elk.radial.compactor': layoutOptions.radial.compaction,
          'org.eclipse.elk.radial.compactionStepSize': layoutOptions.radial.compactionStepSize.toString()
        },
        'stress': {
          'org.eclipse.elk.stress.desiredEdgeLength': layoutOptions.stress.desiredEdgeLength.toString(),
          'org.eclipse.elk.stress.epsilon': layoutOptions.stress.epsilon.toString(),
          'org.eclipse.elk.stress.dimension': layoutOptions.stress.dimension,
          'org.eclipse.elk.stress.iterationLimit': layoutOptions.stress.iterationLimit.toString()
        },
        'box': {
          'org.eclipse.elk.box.packingMode': layoutOptions.box.packingMode
        }
      };

      const elkGraph: ElkNode = {
        'id': 'root',
        'layoutOptions': { ...baseOptions, ...algorithmOptionsMap[layoutOptions.algorithm] },
        'children': currentNodes.map(node => ({ 'id': node.id, 'width': 150, 'height': 50 })),
        'edges': currentEdges.map(edge => ({
          'id': edge.id,
          'sources': [edge.source],
          'targets': [edge.target]
        }))
      };

      const layoutedGraph = await elk.layout(elkGraph);

      const layoutedNodesMap = new Map<string, { x: number; y: number }>();
      layoutedGraph.children?.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          layoutedNodesMap.set(node.id, { 'x': node.x, 'y': node.y });
        }
      });

      const updatedNodes = currentNodes.map(node => {
        const pos = layoutedNodesMap.get(node.id);
        return pos ? { ...node, 'position': { 'x': pos.x, 'y': pos.y } } : node;
      });

      onLayout(updatedNodes, currentEdges);
    } finally {
      setIsLayouting(false);
    }
  };

  const config = ALGORITHM_CONFIGS[layoutOptions.algorithm];
  const algorithmConfig = layoutOptions[layoutOptions.algorithm] as Record<string, unknown>;

  const updateAlgorithmOption = (key: string, value: unknown) => {
    setLayoutOptions(prev => ({
      ...prev,
      [layoutOptions.algorithm]: { ...(prev[layoutOptions.algorithm] as object), [key]: value }
    }));
  };

  const renderField = (field: FieldConfig) => {
    const fieldValue = algorithmConfig[field.key];

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label className={LABEL_CLASSES}>{field.label}</label>
          <select
            className={INPUT_CLASSES}
            value={fieldValue as string}
            onChange={(e) => updateAlgorithmOption(field.key, e.target.value)}
          >
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.key}>
          <label className={LABEL_CLASSES}>{field.label}</label>
          <label className="flex items-center gap-2 p-2 border border-neutral-300 dark:border-neutral-600 rounded-md cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 bg-white dark:bg-neutral-800">
            <input
              type="checkbox"
              checked={fieldValue as boolean}
              onChange={(e) => updateAlgorithmOption(field.key, e.target.checked)}
              className="rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{field.description || field.label}</span>
          </label>
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className={LABEL_CLASSES}>{field.label}</label>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          className={INPUT_CLASSES}
          value={fieldValue as number}
          onChange={(e) => updateAlgorithmOption(field.key, parseFloat(e.target.value))}
        />
      </div>
    );
  };

  return (
    <div className={`panel-container ${isOpen ? 'panel-open' : 'panel-closing'}`}>
      <div className="panel-header">
        <div className="panel-title">
          <Layout className="w-5 h-5 text-sky-400" />
          布局管理
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors flex-shrink-0"
          title="关闭面板"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="panel-content space-y-6">
        <div className="rounded-xl p-5 border border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <Zap className="w-4 h-4 text-sky-400" />
            布局算法
          </h3>

          <div className="space-y-3">
            <div>
              <label className={LABEL_CLASSES}>选择算法</label>
              <select
                className={INPUT_CLASSES}
                value={layoutOptions.algorithm}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'algorithm': e.target.value as LayoutAlgorithm }))}
              >
                {ALGORITHM_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {['layered', 'mrtree', 'radial'].includes(layoutOptions.algorithm) && (
              <div>
                <label className={LABEL_CLASSES}>布局方向</label>
                <select
                  className={INPUT_CLASSES}
                  value={layoutOptions.direction}
                  onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'direction': e.target.value as LayoutDirection }))}
                >
                  {DIRECTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <Settings className="w-4 h-4 text-sky-400" />
            布局参数
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className={LABEL_CLASSES}>节点间距</label>
              <input
                type="number"
                className={INPUT_CLASSES}
                value={layoutOptions.nodeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'nodeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASSES}>连接间间距</label>
              <input
                type="number"
                className={INPUT_CLASSES}
                value={layoutOptions.edgeEdgeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'edgeEdgeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASSES}>连接节点间间距</label>
              <input
                type="number"
                className={INPUT_CLASSES}
                value={layoutOptions.edgeNodeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'edgeNodeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASSES}>随机种子</label>
              <input
                type="number"
                className={INPUT_CLASSES}
                value={layoutOptions.randomSeed}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'randomSeed': parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          {config && (
            <div className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor}`}>
              <h4 className={`text-xs font-semibold ${config.titleColor} mb-3`}>{config.title}</h4>
              <div className="grid grid-cols-2 gap-4">
                {config.fields.map(renderField)}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={executeLayout}
          disabled={isLayouting || nodeCount === 0}
          className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${isLayouting || nodeCount === 0 ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
        >
          <RefreshCw className={`w-5 h-5 ${isLayouting ? 'animate-spin' : ''}`} />
          {isLayouting ? '布局中...' : '应用布局'}
        </button>

        {nodeCount === 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center p-3 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
            请先添加节点再执行布局
          </p>
        )}
      </div>
    </div>
  );
};

export default GraphLayoutPanel;
