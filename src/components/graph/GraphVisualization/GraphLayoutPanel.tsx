import React, { useState } from 'react';
import { Node, Edge, useReactFlow, useStore } from '@xyflow/react';
import { Layout, Settings, X, Zap, RefreshCw } from 'lucide-react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK, { ElkNode } from 'elkjs';

type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial' | 'box' | 'random' | 'sporeOverlap' | 'rectpacking' | 'vertiflex';
type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

interface GraphLayoutPanelProps {
  onLayout: (nodes: Node<CustomNodeData>[], edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

const INPUT_CLASSES = 'w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const LABEL_CLASSES = 'block text-xs text-gray-600 mb-1';

const ALGORITHM_ID_MAP = {
  'layered': 'org.eclipse.elk.layered',
  'force': 'org.eclipse.elk.force',
  'stress': 'org.eclipse.elk.stress',
  'mrtree': 'org.eclipse.elk.mrtree',
  'radial': 'org.eclipse.elk.radial',
  'box': 'org.eclipse.elk.box',
  'random': 'org.eclipse.elk.random',
  'sporeOverlap': 'org.eclipse.elk.sporeOverlap',
  'rectpacking': 'org.eclipse.elk.rectpacking',
  'vertiflex': 'org.eclipse.elk.vertiflex'
} as const;

const DEFAULT_OPTIONS = {
  'algorithm': 'layered' as LayoutAlgorithm,
  'direction': 'DOWN' as LayoutDirection,
  'nodeSpacing': 50 as number,
  'edgeEdgeSpacing': 10 as number,
  'edgeNodeSpacing': 10 as number,
  'randomSeed': 42 as number,
  'layered': {
    'rankSpacing': 100,
    'crossingMinimization': 'LAYER_SWEEP',
    'nodePlacement': 'NETWORK_SIMPLEX',
    'feedbackEdges': false,
    'edgeEdgeSpacing': 10,
    'edgeNodeSpacing': 5,
    'considerModelOrder': 'NODES_AND_EDGES',
    'postCompactionStrategy': 'NONE',
    'nodeLayeringStrategy': 'NETWORK_SIMPLEX',
    'thoroughness': 7,
    'mergeEdges': false,
    'layerUnzippingStrategy': 'NONE',
    'longEdgeOrderingStrategy': 'DUMMY_NODE_OVER',
    'nodePromotionStrategy': 'NONE',
    'directionCongruency': 'READING_DIRECTION'
  },
  'force': {
    'iterations': 300,
    'forceModel': 'FRUCHTERMAN_REINGOLD',
    'repulsion': 5.0,
    'temperature': 0.001,
    'interactive': false
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
    'iterationLimit': 1000000,
    'interactive': false
  },
  'rectpacking': {
    'tryBox': false,
    'widthApproximation': {
      'strategy': 'GREEDY',
      'targetWidth': -1
    }
  },
  'vertiflex': {
    'layerDistance': 50,
    'considerNodeModelOrder': false
  },
  'box': {
    'packingMode': 'SIMPLE'
  },
  'sporeOverlap': {
    'iterationLimit': 64
  }
};

type FieldConfig =
  | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: string }
  | { key: string; label: string; type: 'select'; options: ReadonlyArray<{ value: string; label: string }> }
  | { key: string; label: string; type: 'checkbox'; description?: string };

const ALGORITHM_CONFIGS = {
  'layered': {
    'title': '层次布局 (Layered) 参数',
    'bgColor': 'bg-blue-50',
    'borderColor': 'border-blue-100',
    'titleColor': 'text-blue-800',
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
      { 'key': 'edgeEdgeSpacing', 'label': '连接间间距', 'type': 'number' as const },
      { 'key': 'edgeNodeSpacing', 'label': '连接节点间间距', 'type': 'number' as const },
      { 'key': 'considerModelOrder', 'label': '考虑模型顺序', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'NODES_AND_EDGES', 'label': '节点和连接' }
      ]},
      { 'key': 'postCompactionStrategy', 'label': '后紧凑化策略', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'LEFT', 'label': '向左紧凑' },
        { 'value': 'RIGHT', 'label': '向右紧凑' },
        { 'value': 'LEFT_RIGHT_CONSTRAINT_LOCKING', 'label': '左右约束锁定' },
        { 'value': 'LEFT_RIGHT_CONNECTION_LOCKING', 'label': '左右连接锁定' },
        { 'value': 'EDGE_LENGTH', 'label': '连接长度' }
      ]},
      { 'key': 'nodeLayeringStrategy', 'label': '节点分层策略', 'type': 'select' as const, 'options': [
        { 'value': 'NETWORK_SIMPLEX', 'label': '网络单纯形法' },
        { 'value': 'LONGEST_PATH', 'label': '最长路径' },
        { 'value': 'COFFMAN_GRAHAM', 'label': 'Coffman-Graham' },
        { 'value': 'SIMPLE', 'label': '简单' }
      ]},
      { 'key': 'thoroughness', 'label': '彻底性', 'type': 'number' as const, 'min': 1, 'max': 10 },
      { 'key': 'mergeEdges', 'label': '合并边', 'type': 'checkbox' as const, 'description': '合并平行边' },
      { 'key': 'layerUnzippingStrategy', 'label': '层解压缩策略', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'ALTERNATING', 'label': '交替' }
      ]},
      { 'key': 'longEdgeOrderingStrategy', 'label': '长边排序策略', 'type': 'select' as const, 'options': [
        { 'value': 'DUMMY_NODE_OVER', 'label': '虚拟节点上方' },
        { 'value': 'DUMMY_NODE_UNDER', 'label': '虚拟节点下方' },
        { 'value': 'EQUAL', 'label': '相等' }
      ]},
      { 'key': 'nodePromotionStrategy', 'label': '节点提升策略', 'type': 'select' as const, 'options': [
        { 'value': 'NONE', 'label': '无' },
        { 'value': 'NIKOLOV', 'label': 'Nikolov算法' },
        { 'value': 'NIKOLOV_PIXEL', 'label': 'Nikolov像素算法' },
        { 'value': 'MODEL_ORDER_LEFT_TO_RIGHT', 'label': '模型顺序从左到右' },
        { 'value': 'MODEL_ORDER_RIGHT_TO_LEFT', 'label': '模型顺序从右到左' }
      ]},
      { 'key': 'directionCongruency', 'label': '方向一致性', 'type': 'select' as const, 'options': [
        { 'value': 'READING_DIRECTION', 'label': '阅读方向' },
        { 'value': 'ROTATION', 'label': '旋转' }
      ]}
    ]
  },
  'force': {
    'title': '力导向布局 (Force) 参数',
    'bgColor': 'bg-green-50',
    'borderColor': 'border-green-100',
    'titleColor': 'text-green-800',
    'fields': [
      { 'key': 'iterations', 'label': '迭代次数', 'type': 'number' as const },
      { 'key': 'forceModel', 'label': '力模型', 'type': 'select' as const, 'options': [
        { 'value': 'EADES', 'label': 'Eades模型' },
        { 'value': 'FRUCHTERMAN_REINGOLD', 'label': 'Fruchterman-Reingold模型' }
      ]},
      { 'key': 'repulsion', 'label': 'Eades模型排斥力', 'type': 'number' as const },
      { 'key': 'temperature', 'label': 'FR模型温度', 'type': 'number' as const, 'step': '0.0001' },
      { 'key': 'interactive', 'label': '交互式布局', 'type': 'checkbox' as const, 'description': '启用交互式布局' }
    ]
  },
  'mrtree': {
    'title': '树布局 (Mr.Tree) 参数',
    'bgColor': 'bg-purple-50',
    'borderColor': 'border-purple-100',
    'titleColor': 'text-purple-800',
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
    'bgColor': 'bg-orange-50',
    'borderColor': 'border-orange-100',
    'titleColor': 'text-orange-800',
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
    'bgColor': 'bg-pink-50',
    'borderColor': 'border-pink-100',
    'titleColor': 'text-pink-800',
    'fields': [
      { 'key': 'desiredEdgeLength', 'label': '期望连接长度', 'type': 'number' as const },
      { 'key': 'epsilon', 'label': '应力阈值', 'type': 'number' as const, 'step': '0.0001' },
      { 'key': 'dimension', 'label': '布局维度', 'type': 'select' as const, 'options': [
        { 'value': 'XY', 'label': 'XY轴' },
        { 'value': 'X', 'label': 'X轴' },
        { 'value': 'Y', 'label': 'Y轴' }
      ]},
      { 'key': 'iterationLimit', 'label': '迭代限制', 'type': 'number' as const },
      { 'key': 'interactive', 'label': '交互式布局', 'type': 'checkbox' as const, 'description': '启用交互式布局' }
    ]
  },
  'rectpacking': {
    'title': '矩形打包布局 (Rectpacking) 参数',
    'bgColor': 'bg-yellow-50',
    'borderColor': 'border-yellow-100',
    'titleColor': 'text-yellow-800',
    'fields': [
      { 'key': 'tryBox', 'label': '尝试盒布局', 'type': 'checkbox' as const, 'description': '先检查是否适合盒布局' },
      { 'key': 'widthApproximation.strategy', 'label': '宽度近似策略', 'type': 'select' as const, 'options': [
        { 'value': 'GREEDY', 'label': '贪心算法' },
        { 'value': 'TARGET_WIDTH', 'label': '按目标宽度' }
      ]},
      { 'key': 'widthApproximation.targetWidth', 'label': '目标宽度', 'type': 'number' as const }
    ]
  },
  'vertiflex': {
    'title': 'Vertiflex布局 (特殊树布局) 参数',
    'bgColor': 'bg-secondary-50',
    'borderColor': 'border-secondary-100',
    'titleColor': 'text-secondary-800',
    'fields': [
      { 'key': 'layerDistance', 'label': '层间距', 'type': 'number' as const },
      { 'key': 'considerNodeModelOrder', 'label': '考虑节点模型顺序', 'type': 'checkbox' as const, 'description': '考虑节点模型顺序' }
    ]
  },
  'box': {
    'title': '盒布局 (Box) 参数',
    'bgColor': 'bg-primary-50',
    'borderColor': 'border-primary-100',
    'titleColor': 'text-primary-800',
    'fields': [
      { 'key': 'packingMode', 'label': '打包模式', 'type': 'select' as const, 'options': [
        { 'value': 'SIMPLE', 'label': '简单' },
        { 'value': 'GROUP_MIXED', 'label': '分组混合' }
      ]}
    ]
  },
  'sporeOverlap': {
    'title': 'Spore重叠布局 (SporeOverlap) 参数',
    'bgColor': 'bg-primary-50',
    'borderColor': 'border-primary-100',
    'titleColor': 'text-primary-800',
    'fields': [
      { 'key': 'iterationLimit', 'label': '迭代限制', 'type': 'number' as const }
    ]
  }
} as const;

const ALGORITHM_OPTIONS = [
  { 'value': 'layered', 'label': '层次布局 (Layered)' },
  { 'value': 'force', 'label': '力导向布局 (Force)' },
  { 'value': 'stress', 'label': '应力布局 (Stress)' },
  { 'value': 'mrtree', 'label': '树布局 (Mr.Tree)' },
  { 'value': 'radial', 'label': '辐射状布局 (Radial)' },
  { 'value': 'rectpacking', 'label': '矩形打包布局 (Rectpacking)' },
  { 'value': 'vertiflex', 'label': '垂直约束布局 (Vertiflex)' },
  { 'value': 'box', 'label': '盒布局 (Box)' },
  { 'value': 'random', 'label': '随机布局 (Random)' },
  { 'value': 'sporeOverlap', 'label': 'Spore重叠布局 (SporeOverlap)' }
] as const;

const DIRECTION_OPTIONS = [
  { 'value': 'DOWN', 'label': '从上到下' },
  { 'value': 'RIGHT', 'label': '从左到右' },
  { 'value': 'UP', 'label': '从下到上' },
  { 'value': 'LEFT', 'label': '从右到左' }
] as const;

const elk = new ELK();

export const GraphLayoutPanel: React.FC<GraphLayoutPanelProps> = ({ onLayout, onClose }) => {
  const reactFlowInstance = useReactFlow();
  const [layoutOptions, setLayoutOptions] = useState(DEFAULT_OPTIONS);
  const [isLayouting, setIsLayouting] = useState(false);
  const nodeCount = useStore(
    (state) => state.nodes.length,
    (prev, next) => prev === next
  );

  const executeLayout = async () => {
    const currentNodes = reactFlowInstance.getNodes() as Node<CustomNodeData>[];
    const currentEdges = reactFlowInstance.getEdges() as Edge<CustomEdgeData>[];

    if (currentNodes.length === 0) {
      return;
    }

    setIsLayouting(true);

    try {
      const baseOptions: Record<string, string> = {
        'elk.algorithm': ALGORITHM_ID_MAP[layoutOptions.algorithm] || layoutOptions.algorithm,
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
          'elk.layered.spacing.edgeEdgeBetweenLayers': layoutOptions.layered.edgeEdgeSpacing.toString(),
          'elk.layered.spacing.edgeNodeBetweenLayers': layoutOptions.layered.edgeNodeSpacing.toString(),
          'elk.layered.crossingMinimization.strategy': layoutOptions.layered.crossingMinimization,
          'elk.layered.nodePlacement.strategy': layoutOptions.layered.nodePlacement,
          'elk.layered.feedbackEdges': layoutOptions.layered.feedbackEdges.toString(),
          'elk.layered.considerModelOrder.strategy': layoutOptions.layered.considerModelOrder,
          'elk.layered.layering.strategy': layoutOptions.layered.nodeLayeringStrategy,
          'elk.layered.thoroughness': layoutOptions.layered.thoroughness.toString(),
          'elk.layered.mergeEdges': layoutOptions.layered.mergeEdges.toString(),
          'elk.layered.layerUnzipping.strategy': layoutOptions.layered.layerUnzippingStrategy,
          'elk.layered.considerModelOrder.longEdgeStrategy': layoutOptions.layered.longEdgeOrderingStrategy,
          'elk.layered.layering.nodePromotion.strategy': layoutOptions.layered.nodePromotionStrategy,
          'elk.layered.directionCongruency': layoutOptions.layered.directionCongruency,
          'org.eclipse.elk.layered.compaction.postCompaction.strategy': layoutOptions.layered.postCompactionStrategy
        },
        'force': {
          'org.eclipse.elk.force.iterations': layoutOptions.force.iterations.toString(),
          'org.eclipse.elk.force.model': layoutOptions.force.forceModel,
          'org.eclipse.elk.force.spacing.nodeNode': layoutOptions.nodeSpacing.toString(),
          'org.eclipse.elk.force.repulsion': layoutOptions.force.repulsion.toString(),
          'org.eclipse.elk.force.temperature': layoutOptions.force.temperature.toString(),
          'org.eclipse.elk.interactive': layoutOptions.force.interactive.toString(),
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
          'org.eclipse.elk.stress.iterationLimit': layoutOptions.stress.iterationLimit.toString(),
          'org.eclipse.elk.interactive': layoutOptions.stress.interactive.toString()
        },
        'rectpacking': {
          'elk.rectpacking.trybox': layoutOptions.rectpacking.tryBox.toString(),
          'elk.rectpacking.widthApproximation.strategy': layoutOptions.rectpacking.widthApproximation.strategy,
          'elk.rectpacking.widthApproximation.targetWidth': layoutOptions.rectpacking.widthApproximation.targetWidth.toString()
        },
        'vertiflex': {
          'elk.vertiflex.layerDistance': layoutOptions.vertiflex.layerDistance.toString(),
          'elk.vertiflex.considerNodeModelOrder': layoutOptions.vertiflex.considerNodeModelOrder.toString()
        },
        'box': {
          'org.eclipse.elk.box.packingMode': layoutOptions.box.packingMode
        },
        'sporeOverlap': {
          'org.eclipse.elk.overlapRemoval.maxIterations': layoutOptions.sporeOverlap.iterationLimit.toString()
        },
        'random': {}
      };

      const elkGraph: ElkNode = {
        'id': 'root',
        'layoutOptions': { ...baseOptions, ...algorithmOptionsMap[layoutOptions.algorithm] },
        'children': currentNodes.map(node => ({ 'id': node.id, 'width': 150, 'height': 50 })),
        'edges': currentEdges.map(edge => {
          const edgeObj: { 'id': string; 'sources': string[]; 'targets': string[]; 'weight'?: number } = {
            'id': edge.id,
            'sources': [edge.source],
            'targets': [edge.target]
          };
          if (edge.data && typeof (edge.data as { weight?: number }).weight === 'number') {
            edgeObj.weight = (edge.data as { weight: number }).weight;
          }
          return edgeObj;
        })
      };

      const layoutedGraph = await elk.layout(elkGraph);

      const layoutedNodesMap = new Map<string, { 'x': number; 'y': number }>();
      if (layoutedGraph.children) {
        for (const layoutedNode of layoutedGraph.children) {
          if (layoutedNode.x !== undefined && layoutedNode.y !== undefined) {
            layoutedNodesMap.set(layoutedNode.id, { 'x': layoutedNode.x, 'y': layoutedNode.y });
          }
        }
      }

      const updatedNodes = currentNodes.map(node => {
        const layoutedPosition = layoutedNodesMap.get(node.id);
        if (layoutedPosition) {
          return { ...node, 'position': { 'x': layoutedPosition.x, 'y': layoutedPosition.y } };
        }
        return node;
      });

      onLayout(updatedNodes, currentEdges);
    } finally {
      setIsLayouting(false);
    }
  };

  const config = ALGORITHM_CONFIGS[layoutOptions.algorithm as keyof typeof ALGORITHM_CONFIGS];
  const algorithmConfig = layoutOptions[layoutOptions.algorithm as keyof typeof DEFAULT_OPTIONS] as Record<string, unknown>;

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <Layout className="w-5 h-5 text-primary-400" />
          布局管理
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors flex-shrink-0"
          title="关闭面板"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="panel-content space-y-6">
        <div className="rounded-xl p-5 border border-primary-100 hover:shadow-md transition-all duration-300 bg-primary-50">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800">
            <Zap className="w-4 h-4 text-primary-400" />
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
                {ALGORITHM_OPTIONS.map((opt) => (
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
                  {DIRECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5 border border-blue-100 hover:shadow-md transition-all duration-300 bg-primary-50">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800">
            <Settings className="w-4 h-4 text-primary-400" />
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

          <div className="space-y-6">
            {config && (
              <div className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor}`}>
                <h4 className={`text-xs font-semibold ${config.titleColor} mb-3`}>{config.title}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.fields.map((field) => {
                    const getFieldValue = () => {
                      if (field.key.includes('.')) {
                        const [parentKey, childKey] = field.key.split('.');
                        const parentValue = algorithmConfig[parentKey as string];
                        if (typeof parentValue === 'object' && parentValue !== null) {
                          return (parentValue as Record<string, unknown>)[childKey as string];
                        }
                      }
                      return algorithmConfig[field.key];
                    };

                    const fieldValue = getFieldValue();

                    const handleChange = (value: unknown) => {
                      if (field.key.includes('.')) {
                        const [parentKey, childKey] = field.key.split('.');
                        setLayoutOptions(prev => {
                          const currentValue = prev[layoutOptions.algorithm as keyof typeof DEFAULT_OPTIONS];
                          if (typeof currentValue !== 'object' || currentValue === null) {
                            return prev;
                          }
                          const parentValue = (currentValue as Record<string, unknown>)[parentKey as string];
                          if (typeof parentValue === 'object' && parentValue !== null) {
                            const newParentValue = { ...(parentValue as Record<string, unknown>) };
                            (newParentValue as Record<string, unknown>)[childKey as string] = value;
                            const newAlgorithmValue = { ...currentValue };
                            (newAlgorithmValue as Record<string, unknown>)[parentKey as string] = newParentValue;
                            return { ...prev, [layoutOptions.algorithm]: newAlgorithmValue };
                          }
                          return prev;
                        });
                      } else {
                        setLayoutOptions(prev => {
                          const currentValue = prev[layoutOptions.algorithm as keyof typeof DEFAULT_OPTIONS];
                          if (typeof currentValue === 'object' && currentValue !== null) {
                            return { ...prev, [layoutOptions.algorithm]: { ...currentValue, [field.key]: value } };
                          }
                          return { ...prev, [layoutOptions.algorithm]: value };
                        });
                      }
                    };

                    if (field.type === 'select') {
                      return (
                        <div key={field.key}>
                          <label className={LABEL_CLASSES}>{field.label}</label>
                          <select
                            className={INPUT_CLASSES}
                            value={fieldValue as string}
                            onChange={(e) => handleChange(e.target.value)}
                          >
                            {field.options.map((opt) => (
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
                          <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                            <input
                              type="checkbox"
                              checked={fieldValue as boolean}
                              onChange={(e) => handleChange(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-xs text-gray-600">{(field as FieldConfig & { type: 'checkbox' }).description || field.label}</span>
                          </div>
                        </div>
                      );
                    }

                    const numberField = field as FieldConfig & { type: 'number' };
                    return (
                      <div key={field.key}>
                        <label className={LABEL_CLASSES}>{field.label}</label>
                        <input
                          type="number"
                          min={numberField.min}
                          max={numberField.max}
                          step={numberField.step}
                          className={INPUT_CLASSES}
                          value={fieldValue as number}
                          onChange={(e) => handleChange(parseFloat(e.target.value))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={executeLayout}
            disabled={isLayouting || nodeCount === 0}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white ${isLayouting || nodeCount === 0 ? 'bg-gradient-to-r from-neutral-300 to-neutral-400 text-neutral-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700'}`}
          >
            {isLayouting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                布局中...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                应用布局
              </>
            )}
          </button>

          {nodeCount === 0 && (
            <p className="text-xs text-neutral-500 text-center bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              请先添加节点再执行布局
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphLayoutPanel;
