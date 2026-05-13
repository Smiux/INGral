import React, { useState } from 'react';
import { Node, Edge, useReactFlow, useStore } from '@xyflow/react';
import {
  Layout, X, RefreshCw,
  Layers, Share2, Minimize2, GitBranch, Target, Square,
  ArrowDown, ArrowUp, ArrowRight, ArrowLeft
} from 'lucide-react';
import type { CustomNodeData } from '../Node';
import type { CustomEdgeData } from '../Edge';
import ELK, { ElkNode } from 'elkjs';
import { SlidingCardSelector, type SlidingCardOption } from '@/components/ui/SlidingCardSelector';
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
  BUTTON_DISABLED_CLASS,
  type HoverColorType,
  PANEL_MOTION_VARIANTS_LEFT,
  PANEL_MOTION_TRANSITION
} from './panelStyles';
import { motion } from 'framer-motion';

type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial' | 'box';
type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

interface LayoutPanelProps {
  onLayout: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

type FieldConfig =
  | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: string }
  | { key: string; label: string; type: 'select'; options: ReadonlyArray<{ value: string; label: string }> }
  | { key: string; label: string; type: 'checkbox'; description?: string };

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

const ALGORITHM_CONFIGS: Record<LayoutAlgorithm, { title: string; fields: FieldConfig[]; color: HoverColorType }> = {
  'layered': {
    'title': '层次布局参数',
    'color': 'sky',
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
    'title': '力导向布局参数',
    'color': 'cyan',
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
    'title': '树布局参数',
    'color': 'lime',
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
    'title': '辐射状布局参数',
    'color': 'blue',
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
    'title': '应力布局参数',
    'color': 'teal',
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
    'title': '盒布局参数',
    'color': 'emerald',
    'fields': [
      { 'key': 'packingMode', 'label': '打包模式', 'type': 'select' as const, 'options': [
        { 'value': 'SIMPLE', 'label': '简单' },
        { 'value': 'GROUP_MIXED', 'label': '分组混合' }
      ]}
    ]
  }
};

const ALGORITHM_OPTIONS = [
  { 'value': 'layered', 'label': '层次布局', 'icon': Layers },
  { 'value': 'force', 'label': '力导向布局', 'icon': Share2 },
  { 'value': 'stress', 'label': '应力布局', 'icon': Minimize2 },
  { 'value': 'mrtree', 'label': '树布局', 'icon': GitBranch },
  { 'value': 'radial', 'label': '辐射状布局', 'icon': Target },
  { 'value': 'box', 'label': '盒布局', 'icon': Square }
] as const;

const DIRECTION_OPTIONS = [
  { 'value': 'DOWN', 'label': '从上到下', 'icon': ArrowDown },
  { 'value': 'UP', 'label': '从下到上', 'icon': ArrowUp },
  { 'value': 'RIGHT', 'label': '从左到右', 'icon': ArrowRight },
  { 'value': 'LEFT', 'label': '从右到左', 'icon': ArrowLeft }
] as const;

const elk = new ELK();

export const LayoutPanel: React.FC<LayoutPanelProps> = ({ onLayout, onClose }) => {
  const reactFlowInstance = useReactFlow();
  const [layoutOptions, setLayoutOptions] = useState(DEFAULT_OPTIONS);
  const [isLayouting, setIsLayouting] = useState(false);
  const nodeCount = useStore((state) => state.nodes.length);

  const config = ALGORITHM_CONFIGS[layoutOptions.algorithm];
  const algorithmConfig = layoutOptions[layoutOptions.algorithm] as Record<string, unknown>;

  const hasDirection = ['layered', 'mrtree', 'radial'].includes(layoutOptions.algorithm);

  const algorithmOptions: SlidingCardOption[] = ALGORITHM_OPTIONS.map(opt => ({
    'value': opt.value,
    'label': opt.label,
    'icon': opt.icon
  }));

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

  const updateAlgorithmOption = (key: string, value: unknown) => {
    setLayoutOptions(prev => ({
      ...prev,
      [layoutOptions.algorithm]: { ...(prev[layoutOptions.algorithm] as object), [key]: value }
    }));
  };

  const renderField = (field: FieldConfig, color: HoverColorType) => {
    const fieldValue = algorithmConfig[field.key];

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label className={LABEL_CLASS}>{field.label}</label>
          <select
            className={getInputClass(color)}
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
          <label className={LABEL_CLASS}>{field.label}</label>
          <label className="flex items-center gap-2 p-2 border border-slate-200/60 dark:border-slate-700/60 rounded cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/60 bg-slate-200/50 dark:bg-slate-800/80">
            <input
              type="checkbox"
              checked={fieldValue as boolean}
              onChange={(e) => updateAlgorithmOption(field.key, e.target.checked)}
              className={`rounded border-slate-300 dark:border-slate-600 text-${color}-600 focus:ring-2 focus:ring-${color}-500`}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">{field.description || field.label}</span>
          </label>
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className={LABEL_CLASS}>{field.label}</label>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          className={getInputClass(color)}
          value={fieldValue as number}
          onChange={(e) => updateAlgorithmOption(field.key, parseFloat(e.target.value))}
        />
      </div>
    );
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
          <Layout className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          布局管理
        </div>
        <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
          <X size={16} />
        </button>
      </header>

      <div className={`${PANEL_CONTENT_CLASS} space-y-6`}>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">布局算法</h3>

          <SlidingCardSelector
            options={algorithmOptions}
            value={layoutOptions.algorithm}
            onChange={(value) => setLayoutOptions(prev => ({ ...prev, 'algorithm': value as LayoutAlgorithm }))}
            color={config.color}
          />
        </div>

        {hasDirection && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500">布局方向</h3>

            <div className="grid grid-cols-4 gap-2">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLayoutOptions(prev => ({ ...prev, 'direction': opt.value as LayoutDirection }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded transition-all ${
                    layoutOptions.direction === opt.value
                      ? 'border-2 border-sky-400 bg-sky-50/60 dark:bg-sky-900/20'
                      : 'border border-slate-200/40 dark:border-slate-700/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <opt.icon className={`w-4 h-4 ${layoutOptions.direction === opt.value ? 'text-sky-500' : 'text-slate-400'}`} />
                  <span className={`text-xs ${layoutOptions.direction === opt.value ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <section className={getSectionClasses('indigo').container}>
          <h3 className={getSectionClasses('indigo').title}>通用参数</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>节点间距</label>
              <input
                type="number"
                className={getInputClass('indigo')}
                value={layoutOptions.nodeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'nodeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>连接间间距</label>
              <input
                type="number"
                className={getInputClass('indigo')}
                value={layoutOptions.edgeEdgeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'edgeEdgeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>连接节点间间距</label>
              <input
                type="number"
                className={getInputClass('indigo')}
                value={layoutOptions.edgeNodeSpacing}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'edgeNodeSpacing': parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>随机种子</label>
              <input
                type="number"
                className={getInputClass('indigo')}
                value={layoutOptions.randomSeed}
                onChange={(e) => setLayoutOptions(prev => ({ ...prev, 'randomSeed': parseFloat(e.target.value) }))}
              />
            </div>
          </div>
        </section>

        <section className={getSectionClasses(config.color).container}>
          <h3 className={getSectionClasses(config.color).title}>{config.title}</h3>

          <div className="grid grid-cols-2 gap-4">
            {config.fields.map(field => renderField(field, config.color))}
          </div>
        </section>

        <button
          onClick={executeLayout}
          disabled={isLayouting || nodeCount === 0}
          className={`w-full py-3 px-4 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 ${getButtonClasses('secondary', 'sky')} ${isLayouting || nodeCount === 0 ? BUTTON_DISABLED_CLASS : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isLayouting ? 'animate-spin' : ''}`} />
          {isLayouting ? '布局中...' : '应用布局'}
        </button>

        {nodeCount === 0 && (
          <p className="text-xs text-slate-400/70 dark:text-slate-500/70 text-center py-2">
            请先添加节点再执行布局
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default LayoutPanel;
