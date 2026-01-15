import React, { useState, useCallback } from 'react';
import { useStore, Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK from 'elkjs';

// 比较函数，只比较必要的属性
const edgesEqual = (prev: Edge[], next: Edge[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  // 比较边的关键属性：source, target, weight
  for (let i = 0; i < prev.length; i += 1) {
    const prevEdge = prev[i];
    const nextEdge = next[i];

    if (!prevEdge || !nextEdge) {
      return false;
    }

    if (String(prevEdge.source) !== String(nextEdge.source) ||
        String(prevEdge.target) !== String(nextEdge.target) ||
        (prevEdge.data?.weight || 1) !== (nextEdge.data?.weight || 1)) {
      return false;
    }
  }
  return true;
};

const nodesEqual = (prev: Node[], next: Node[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  // 比较节点的关键属性：id
  for (let i = 0; i < prev.length; i += 1) {
    const prevNode = prev[i];
    const nextNode = next[i];

    if (!prevNode || !nextNode || prevNode.id !== nextNode.id) {
      return false;
    }
  }
  return true;
};

interface GraphLayoutPanelProps {
  onLayout: (nodes: Node<CustomNodeData>[], edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

// 布局算法类型
type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial' | 'box' | 'random' | 'sporeOverlap' | 'rectpacking' | 'vertiflex';

// 布局方向类型
type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

// 辐射状布局压缩方式
  type RadialCompaction = 'NONE' | 'RADIAL_COMPACTION' | 'WEDGE_COMPACTION';

  // 矩形打包宽度近似策略
  type RectpackingWidthApproximationStrategy = 'GREEDY' | 'TARGET_WIDTH';

// ELK图节点接口
interface ELKNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

// ELK图连接接口
interface ELKEdge {
  id: string;
  sources: string[];
  targets: string[];
}

// ELK图结构接口
interface ELKGraph {
  id: string;
  layoutOptions: Record<string, string>;
  children?: ELKNode[];
  edges?: ELKEdge[];
}

// ELK布局配置接口
interface ELKLayoutOptions {
  // 通用参数
  algorithm: LayoutAlgorithm;
  direction: LayoutDirection;
  nodeSpacing: number;
  edgeSpacing: number;
  randomSeed: number;

  // Layered布局参数
  layered: {
    rankSpacing: number;
    crossingMinimization: string;
    nodePlacement: string;
    feedbackEdges: boolean;

    edgeEdgeSpacing: number;
    edgeNodeSpacing: number;
    considerModelOrder: string;

    // 新增参数

    postCompactionStrategy: 'NONE' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT_CONSTRAINT_LOCKING' | 'LEFT_RIGHT_CONNECTION_LOCKING' | 'EDGE_LENGTH';
    nodeLayeringStrategy: string;
    thoroughness: number;
    mergeEdges: boolean;
    layerUnzippingStrategy: string;
    longEdgeOrderingStrategy: string;
    nodePromotionStrategy: string;
    directionCongruency: string;

  };

  // Force布局参数
  force: {
    iterations: number;
    forceModel: 'EADES' | 'FRUCHTERMAN_REINGOLD';
    repulsion: number;
    temperature: number;
    interactive: boolean;
  };

  // Radial布局参数
  radial: {
    compaction: RadialCompaction;
    compactionStepSize: number;
  };

  // MR Tree布局参数
  mrtree: {
    weighting: string;
    searchOrder: string;
  };

  // Stress布局参数
  stress: {
    desiredEdgeLength: number;
    epsilon: number;
    dimension: string;
    iterationLimit: number;
    interactive: boolean;
  };

  // Rectpacking布局参数
  rectpacking: {
    tryBox: boolean;
    widthApproximation: {
      strategy: RectpackingWidthApproximationStrategy;
      targetWidth: number;
    };
  };

  // Vertiflex布局参数
  vertiflex: {
    layerDistance: number;
    considerNodeModelOrder: boolean;
  };

  // Box布局参数
  box: {
    // 新增参数
    packingMode: string;
  };

  // SporeOverlap布局参数
  sporeOverlap: {
    iterationLimit: number;
  };

}


// 创建ELK实例
const elk = new ELK();

/**
 * 图谱布局面板组件
 * 支持多种布局算法和参数配置
 */
export const GraphLayoutPanel: React.FC<GraphLayoutPanelProps> = React.memo(({
  onLayout,
  onClose
}) => {
  // 在组件内部使用useStore获取nodes和edges，避免不必要的props传递
  const nodes = useStore<Node<CustomNodeData>[]>((state) =>
    state.nodes.map((node) => ({
      'id': node.id,
      'position': node.position,
      'data': node.data,
      'type': node.type
    })) as Node<CustomNodeData>[],
  nodesEqual
  );

  const edges = useStore<Edge<CustomEdgeData>[]>((state) =>
    state.edges.map((edge) => ({
      'id': edge.id,
      'source': edge.source,
      'target': edge.target,
      'data': edge.data,
      'type': edge.type
    })) as Edge<CustomEdgeData>[],
  edgesEqual
  );
  // 布局配置状态
  const [layoutOptions, setLayoutOptions] = useState<ELKLayoutOptions>({
    // 通用参数
    'algorithm': 'layered',
    'direction': 'DOWN',
    'nodeSpacing': 50,
    'edgeSpacing': 10,
    'randomSeed': 42,

    // Layered布局参数
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

    // Force布局参数
    'force': {
      'iterations': 300,
      'forceModel': 'FRUCHTERMAN_REINGOLD',
      'repulsion': 5.0,
      'temperature': 0.001,
      'interactive': false
    },

    // Radial布局参数
    'radial': {
      'compaction': 'NONE',
      'compactionStepSize': 1
    },

    // MR Tree布局参数
    'mrtree': {
      'weighting': 'MODEL_ORDER',
      'searchOrder': 'DFS'
    },

    // Stress布局参数
    'stress': {
      'desiredEdgeLength': 100,
      'epsilon': 0.0001,
      'dimension': 'XY',
      'iterationLimit': 1000000,
      'interactive': false
    },

    // Rectpacking布局参数
    'rectpacking': {
      'tryBox': false,
      'widthApproximation': {
        'strategy': 'GREEDY',
        'targetWidth': -1
      }
    },

    // Vertiflex布局参数
    'vertiflex': {
      'layerDistance': 50,
      'considerNodeModelOrder': false
    },

    // Box布局参数
    'box': {
      // 新增参数默认值
      'packingMode': 'SIMPLE'
    },

    // SporeOverlap布局参数
    'sporeOverlap': {
      'iterationLimit': 64
    }
  });

  // 布局执行状态
  const [isLayouting, setIsLayouting] = useState(false);

  // 更新布局配置
  const updateLayoutOption = useCallback(<K extends keyof ELKLayoutOptions>(
    key: K,
    value: ELKLayoutOptions[K]
  ) => {
    setLayoutOptions(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // 更新嵌套布局配置
  const updateNestedLayoutOption = useCallback(
    <A extends keyof ELKLayoutOptions,
     B extends keyof ELKLayoutOptions[A]>(
      algorithm: A,
      key: B,
      value: ELKLayoutOptions[A][B]
    ) => {
      setLayoutOptions(prev => {
        const currentValue = prev[algorithm];

        // 检查当前值是否为对象类型
        if (typeof currentValue === 'object' && currentValue !== null) {
          return {
            ...prev,
            [algorithm]: {
              ...currentValue,
              [key]: value
            }
          };
        }

        // 如果不是对象类型，直接赋值
        return {
          ...prev,
          [algorithm]: value
        };
      });
    }, []);

  // 构建ELK图结构
  const buildElkGraph = useCallback((): ELKGraph => {
    // 算法ID映射，将短名称映射到完整的ELK算法ID
    const algorithmIdMap: Record<string, string> = {
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
    };

    // 基础布局参数
    const baseOptions: Record<string, string> = {
      'elk.algorithm': algorithmIdMap[layoutOptions.algorithm] || layoutOptions.algorithm,
      'elk.randomSeed': layoutOptions.randomSeed.toString(),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.spacing.nodeNode': layoutOptions.nodeSpacing.toString(),
      'elk.spacing.edgeEdge': layoutOptions.edgeSpacing.toString(),
      'elk.spacing.nodeEdge': (layoutOptions.edgeSpacing / 2).toString()
    };

    // 根据算法类型添加特定参数
    const algorithmOptions: Record<string, string> = {};

    switch (layoutOptions.algorithm) {
      case 'layered':
        algorithmOptions['elk.direction'] = layoutOptions.direction;
        algorithmOptions['elk.layered.spacing.baseValue'] = layoutOptions.nodeSpacing.toString();
        algorithmOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = layoutOptions.layered.rankSpacing.toString();
        algorithmOptions['elk.layered.spacing.edgeEdgeBetweenLayers'] = layoutOptions.layered.edgeEdgeSpacing.toString();
        algorithmOptions['elk.layered.spacing.edgeNodeBetweenLayers'] = layoutOptions.layered.edgeNodeSpacing.toString();
        algorithmOptions['elk.layered.crossingMinimization.strategy'] = layoutOptions.layered.crossingMinimization;
        algorithmOptions['elk.layered.nodePlacement.strategy'] = layoutOptions.layered.nodePlacement;
        algorithmOptions['elk.layered.feedbackEdges'] = layoutOptions.layered.feedbackEdges.toString();
        algorithmOptions['elk.layered.considerModelOrder.strategy'] = layoutOptions.layered.considerModelOrder;
        algorithmOptions['elk.layered.layering.strategy'] = layoutOptions.layered.nodeLayeringStrategy;
        algorithmOptions['elk.layered.thoroughness'] = layoutOptions.layered.thoroughness.toString();
        algorithmOptions['elk.layered.mergeEdges'] = layoutOptions.layered.mergeEdges.toString();
        algorithmOptions['elk.layered.layerUnzipping.strategy'] = layoutOptions.layered.layerUnzippingStrategy;
        algorithmOptions['elk.layered.considerModelOrder.longEdgeStrategy'] = layoutOptions.layered.longEdgeOrderingStrategy;
        algorithmOptions['elk.layered.layering.nodePromotion.strategy'] = layoutOptions.layered.nodePromotionStrategy;
        algorithmOptions['elk.layered.directionCongruency'] = layoutOptions.layered.directionCongruency;

        algorithmOptions['org.eclipse.elk.layered.compaction.postCompaction.strategy'] = layoutOptions.layered.postCompactionStrategy;
        break;

      case 'force':
        algorithmOptions['org.eclipse.elk.force.iterations'] = layoutOptions.force.iterations.toString();
        algorithmOptions['org.eclipse.elk.force.model'] = layoutOptions.force.forceModel;
        algorithmOptions['org.eclipse.elk.force.spacing.nodeNode'] = layoutOptions.nodeSpacing.toString();
        algorithmOptions['org.eclipse.elk.force.repulsion'] = layoutOptions.force.repulsion.toString();
        algorithmOptions['org.eclipse.elk.force.temperature'] = layoutOptions.force.temperature.toString();
        algorithmOptions['org.eclipse.elk.interactive'] = layoutOptions.force.interactive.toString();
        algorithmOptions['org.eclipse.elk.randomSeed'] = layoutOptions.randomSeed.toString();
        break;

      case 'mrtree':
        algorithmOptions['elk.direction'] = layoutOptions.direction;
        algorithmOptions['org.eclipse.elk.mrtree.weighting'] = layoutOptions.mrtree.weighting;
        algorithmOptions['org.eclipse.elk.mrtree.searchOrder'] = layoutOptions.mrtree.searchOrder;
        break;

      case 'radial':
        algorithmOptions['elk.direction'] = layoutOptions.direction;
        algorithmOptions['org.eclipse.elk.radial.compactor'] = layoutOptions.radial.compaction;
        algorithmOptions['org.eclipse.elk.radial.compactionStepSize'] = layoutOptions.radial.compactionStepSize.toString();
        break;

      case 'stress':
        algorithmOptions['org.eclipse.elk.stress.desiredEdgeLength'] = layoutOptions.stress.desiredEdgeLength.toString();
        algorithmOptions['org.eclipse.elk.stress.epsilon'] = layoutOptions.stress.epsilon.toString();
        algorithmOptions['org.eclipse.elk.stress.dimension'] = layoutOptions.stress.dimension;
        algorithmOptions['org.eclipse.elk.stress.iterationLimit'] = layoutOptions.stress.iterationLimit.toString();
        algorithmOptions['org.eclipse.elk.interactive'] = layoutOptions.stress.interactive.toString();
        break;

      case 'rectpacking':
        algorithmOptions['elk.rectpacking.trybox'] = layoutOptions.rectpacking.tryBox.toString();
        algorithmOptions['elk.rectpacking.widthApproximation.strategy'] = layoutOptions.rectpacking.widthApproximation.strategy;
        algorithmOptions['elk.rectpacking.widthApproximation.targetWidth'] = layoutOptions.rectpacking.widthApproximation.targetWidth.toString();
        break;

      case 'vertiflex':
        algorithmOptions['elk.vertiflex.layerDistance'] = layoutOptions.vertiflex.layerDistance.toString();
        algorithmOptions['elk.vertiflex.considerNodeModelOrder'] = layoutOptions.vertiflex.considerNodeModelOrder.toString();
        break;

      case 'box':
        algorithmOptions['org.eclipse.elk.box.packingMode'] = layoutOptions.box.packingMode;
        break;

      case 'sporeOverlap':
        algorithmOptions['org.eclipse.elk.overlapRemoval.maxIterations'] = layoutOptions.sporeOverlap.iterationLimit.toString();
        break;
    }

    // 合并所有选项
    const allOptions = {
      ...baseOptions,
      ...algorithmOptions
    };

    // 调试：打印所有布局选项
    console.log('ELK.js布局选项:', allOptions);

    return {
      'id': 'root',
      'layoutOptions': allOptions,
      // 默认节点宽度和高度
      'children': nodes.map(node => ({
        'id': node.id,
        'width': 150,
        'height': 50
      })),
      'edges': edges.map(edge => {
        const edgeData = edge.data;
        const edgeObj: {
          id: string;
          sources: string[];
          targets: string[];
          weight?: number;
        } = {
          'id': edge.id,
          'sources': [edge.source],
          'targets': [edge.target]
        };

        // 直接将权重添加到边对象中，用于PRIORITIES策略
        if (edgeData && typeof (edgeData as { weight?: number }).weight === 'number') {
          edgeObj.weight = (edgeData as { weight: number }).weight;
        }

        return edgeObj;
      })
    };
  }, [nodes, edges, layoutOptions]);

  // 更新节点位置 - 使用类型守卫和更安全的类型处理
  const updateNodePositions = useCallback((layoutedGraph: { children?: Array<{ id: string; x?: number; y?: number }> }) => {
    const updatedNodes: Node<CustomNodeData>[] = [];

    for (const node of nodes) {
      let updatedNode = node;

      if (layoutedGraph.children) {
        for (const layoutedNode of layoutedGraph.children) {
          if (layoutedNode.id === node.id && layoutedNode.x !== undefined && layoutedNode.y !== undefined) {
            updatedNode = {
              ...node,
              'position': {
                'x': layoutedNode.x,
                'y': layoutedNode.y
              }
            };
            break;
          }
        }
      }

      updatedNodes.push(updatedNode);
    }

    return updatedNodes;
  }, [nodes]);

  // 执行布局
  const executeLayout = useCallback(async () => {
    if (nodes.length === 0) {
      return;
    }

    setIsLayouting(true);

    try {
      const elkGraph = buildElkGraph();
      // 执行布局
      const layoutedGraph = await elk.layout(elkGraph);
      // 更新节点位置
      const updatedNodes = updateNodePositions(layoutedGraph);
      // 调用回调函数更新布局
      onLayout(updatedNodes, edges);
    } catch (error) {
      console.error('Layout failed:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, edges, buildElkGraph, updateNodePositions, onLayout]);

  return (
    <div className="w-full h-full bg-white shadow-lg overflow-y-auto">
      {/* 面板标题 */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {/* 布局图标 */}
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            布局管理
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            配置并应用不同的图谱布局算法
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
          title="关闭面板"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6 space-y-6">
        {/* 布局算法选择 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            布局算法
          </h3>

          <div className="space-y-3">
            {/* 算法选择 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                选择算法
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={layoutOptions.algorithm}
                onChange={(e) => updateLayoutOption('algorithm', e.target.value as LayoutAlgorithm)}
              >
                <option value="layered">层次布局 (Layered)</option>
                <option value="force">力导向布局 (Force)</option>
                <option value="stress">应力布局 (Stress)</option>
                <option value="mrtree">树布局 (Mr.Tree)</option>
                <option value="radial">辐射状布局 (Radial)</option>
                <option value="rectpacking">矩形打包布局 (Rectpacking)</option>
                <option value="vertiflex">垂直约束布局 (Vertiflex)</option>
                <option value="box">盒布局 (Box)</option>
                <option value="random">随机布局 (Random)</option>

                <option value="sporeOverlap">Spore重叠布局 (SporeOverlap)</option>
              </select>
            </div>

            {/* 布局方向 */}
            {['layered', 'mrtree', 'radial'].includes(layoutOptions.algorithm) && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  布局方向
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={layoutOptions.direction}
                  onChange={(e) => updateLayoutOption('direction', e.target.value as LayoutDirection)}
                >
                  <option value="DOWN">从上到下</option>
                  <option value="RIGHT">从左到右</option>
                  <option value="UP">从下到上</option>
                  <option value="LEFT">从右到左</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 布局参数 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            布局参数
          </h3>

          {/* 通用参数 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* 节点间距 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                节点间距
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={layoutOptions.nodeSpacing}
                onChange={(e) => updateLayoutOption('nodeSpacing', parseInt(e.target.value, 10))}
              />
            </div>

            {/* 连接间距 */}
            {/* 连接间距 */}
            {layoutOptions.algorithm === 'layered' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  连接间距
                </label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={layoutOptions.edgeSpacing}
                  onChange={(e) => updateLayoutOption('edgeSpacing', parseInt(e.target.value, 10))}
                />
              </div>
            )}

            {/* 随机种子 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                随机种子
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={layoutOptions.randomSeed}
                onChange={(e) => updateLayoutOption('randomSeed', parseInt(e.target.value, 10))}
              />
            </div>


          </div>

          {/* 算法特定参数 */}
          <div className="space-y-6">
            {/* Layered布局参数 */}
            {layoutOptions.algorithm === 'layered' && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="text-xs font-semibold text-blue-800 mb-3">
                  层次布局 (Layered) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 层级间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      层级间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.rankSpacing}
                      onChange={(e) => updateNestedLayoutOption('layered', 'rankSpacing', parseInt(e.target.value, 10))}

                    />
                  </div>

                  {/* 交叉最小化 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      交叉最小化
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.crossingMinimization}
                      onChange={(e) => updateNestedLayoutOption('layered', 'crossingMinimization', e.target.value)}
                    >
                      <option value="LAYER_SWEEP">层扫描</option>
                      <option value="MEDIAN_LAYER_SWEEP">中位数层扫描</option>
                      <option value="INTERACTIVE">交互式</option>
                      <option value="NONE">无</option>
                    </select>
                  </div>

                  {/* 节点放置 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      节点放置
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.nodePlacement}
                      onChange={(e) => updateNestedLayoutOption('layered', 'nodePlacement', e.target.value)}
                    >
                      <option value="NETWORK_SIMPLEX">网络单纯形法</option>
                      <option value="BRANDES_KOEPF">Brandes-Koepf</option>
                      <option value="LINEAR_SEGMENTS">线性分段</option>
                    </select>
                  </div>



                  {/* 反馈连接处理 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      反馈连接处理
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.layered.feedbackEdges}
                        onChange={(e) => updateNestedLayoutOption('layered', 'feedbackEdges', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">允许反馈连接（形成环的连接）</span>
                    </div>
                  </div>





                  {/* 连接间间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      连接间间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.edgeEdgeSpacing}
                      onChange={(e) => updateNestedLayoutOption('layered', 'edgeEdgeSpacing', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 连接节点间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      连接节点间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.edgeNodeSpacing}
                      onChange={(e) => updateNestedLayoutOption('layered', 'edgeNodeSpacing', parseInt(e.target.value, 10))}
                    />
                  </div>





                  {/* 考虑模型顺序 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      考虑模型顺序
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.considerModelOrder}
                      onChange={(e) => updateNestedLayoutOption('layered', 'considerModelOrder', e.target.value)}
                    >
                      <option value="NONE">无</option>
                      <option value="NODES_AND_EDGES">节点和连接</option>
                    </select>
                  </div>



                  {/* 后紧凑化策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      后紧凑化策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.postCompactionStrategy}
                      onChange={(e) => updateNestedLayoutOption('layered', 'postCompactionStrategy', e.target.value as 'NONE' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT_CONSTRAINT_LOCKING' | 'LEFT_RIGHT_CONNECTION_LOCKING' | 'EDGE_LENGTH')}
                    >
                      <option value="NONE">无</option>
                      <option value="LEFT">向左紧凑</option>
                      <option value="RIGHT">向右紧凑</option>
                      <option value="LEFT_RIGHT_CONSTRAINT_LOCKING">左右约束锁定</option>
                      <option value="LEFT_RIGHT_CONNECTION_LOCKING">左右连接锁定</option>
                      <option value="EDGE_LENGTH">连接长度</option>
                    </select>
                  </div>

                  {/* 节点分层策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      节点分层策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.nodeLayeringStrategy}
                      onChange={(e) => updateNestedLayoutOption('layered', 'nodeLayeringStrategy', e.target.value)}
                    >
                      <option value="NETWORK_SIMPLEX">网络单纯形法</option>
                      <option value="LONGEST_PATH">最长路径</option>
                      <option value="COFFMAN_GRAHAM">Coffman-Graham</option>
                      <option value="SIMPLE">简单</option>
                    </select>
                  </div>

                  {/* 彻底性 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      彻底性
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.thoroughness}
                      onChange={(e) => updateNestedLayoutOption('layered', 'thoroughness', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 合并边 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      合并边
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.layered.mergeEdges}
                        onChange={(e) => updateNestedLayoutOption('layered', 'mergeEdges', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">合并平行边</span>
                    </div>
                  </div>

                  {/* 层解压缩策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      层解压缩策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.layerUnzippingStrategy}
                      onChange={(e) => updateNestedLayoutOption('layered', 'layerUnzippingStrategy', e.target.value)}
                    >
                      <option value="NONE">无</option>
                      <option value="ALTERNATING">交替</option>
                    </select>
                  </div>

                  {/* 长边排序策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      长边排序策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.longEdgeOrderingStrategy}
                      onChange={(e) => updateNestedLayoutOption('layered', 'longEdgeOrderingStrategy', e.target.value)}
                    >
                      <option value="DUMMY_NODE_OVER">虚拟节点上方</option>
                      <option value="DUMMY_NODE_UNDER">虚拟节点下方</option>
                      <option value="EQUAL">相等</option>
                    </select>
                  </div>

                  {/* 节点提升策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      节点提升策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.nodePromotionStrategy}
                      onChange={(e) => updateNestedLayoutOption('layered', 'nodePromotionStrategy', e.target.value)}
                    >
                      <option value="NONE">无</option>
                      <option value="NIKOLOV">Nikolov算法</option>
                      <option value="NIKOLOV_PIXEL">Nikolov像素算法</option>
                      <option value="MODEL_ORDER_LEFT_TO_RIGHT">模型顺序从左到右</option>
                      <option value="MODEL_ORDER_RIGHT_TO_LEFT">模型顺序从右到左</option>
                    </select>
                  </div>

                  {/* 方向一致性 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      方向一致性
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.layered.directionCongruency}
                      onChange={(e) => updateNestedLayoutOption('layered', 'directionCongruency', e.target.value)}
                    >
                      <option value="READING_DIRECTION">阅读方向</option>
                      <option value="ROTATION">旋转</option>
                    </select>
                  </div>


                </div>
              </div>
            )}

            {/* Force布局参数 */}
            {layoutOptions.algorithm === 'force' && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="text-xs font-semibold text-green-800 mb-3">
                  力导向布局 (Force) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 迭代次数 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      迭代次数
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.iterations}
                      onChange={(e) => updateNestedLayoutOption('force', 'iterations', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 力模型 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      力模型
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.forceModel}
                      onChange={(e) => updateNestedLayoutOption('force', 'forceModel', e.target.value as 'EADES' | 'FRUCHTERMAN_REINGOLD')}
                    >
                      <option value="EADES">Eades模型</option>
                      <option value="FRUCHTERMAN_REINGOLD">Fruchterman-Reingold模型</option>
                    </select>
                  </div>

                  {/* 排斥力 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Eades模型排斥力
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.repulsion}
                      onChange={(e) => updateNestedLayoutOption('force', 'repulsion', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* 温度 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      FR模型温度
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.temperature}
                      onChange={(e) => updateNestedLayoutOption('force', 'temperature', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* 交互式布局 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      交互式布局
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.force.interactive}
                        onChange={(e) => updateNestedLayoutOption('force', 'interactive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">启用交互式布局</span>
                    </div>
                  </div>


                </div>
              </div>
            )}

            {/* MR Tree布局参数 */}
            {layoutOptions.algorithm === 'mrtree' && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <h4 className="text-xs font-semibold text-purple-800 mb-3">
                  树布局 (Mr.Tree) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 节点加权 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      节点加权
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.mrtree.weighting}
                      onChange={(e) => updateNestedLayoutOption('mrtree', 'weighting', e.target.value)}
                    >
                      <option value="MODEL_ORDER">模型顺序</option>
                      <option value="DESCENDANTS">后代数量</option>
                      <option value="FAN">扇出数量</option>
                    </select>
                  </div>

                  {/* 搜索顺序 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      搜索顺序
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.mrtree.searchOrder}
                      onChange={(e) => updateNestedLayoutOption('mrtree', 'searchOrder', e.target.value)}
                    >
                      <option value="DFS">深度优先搜索</option>
                      <option value="BFS">广度优先搜索</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Radial布局参数 */}
            {layoutOptions.algorithm === 'radial' && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <h4 className="text-xs font-semibold text-orange-800 mb-3">
                  辐射状布局 (Radial) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 压缩策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      压缩策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.radial.compaction}
                      onChange={(e) => updateNestedLayoutOption('radial', 'compaction', e.target.value as 'NONE' | 'RADIAL_COMPACTION' | 'WEDGE_COMPACTION')}
                    >
                      <option value="NONE">无</option>
                      <option value="RADIAL_COMPACTION">径向压缩</option>
                      <option value="WEDGE_COMPACTION">楔形压缩</option>
                    </select>
                  </div>

                  {/* 压缩步长 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      压缩步长
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.radial.compactionStepSize}
                      onChange={(e) => updateNestedLayoutOption('radial', 'compactionStepSize', parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stress布局参数 */}
            {layoutOptions.algorithm === 'stress' && (
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                <h4 className="text-xs font-semibold text-pink-800 mb-3">
                  应力布局 (Stress) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 期望连接长度 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      期望连接长度
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.desiredEdgeLength}
                      onChange={(e) => updateNestedLayoutOption('stress', 'desiredEdgeLength', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 应力阈值 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      应力阈值
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.epsilon}
                      onChange={(e) => updateNestedLayoutOption('stress', 'epsilon', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* 布局维度 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      布局维度
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.dimension}
                      onChange={(e) => updateNestedLayoutOption('stress', 'dimension', e.target.value)}
                    >
                      <option value="XY">XY轴</option>
                      <option value="X">X轴</option>
                      <option value="Y">Y轴</option>
                    </select>
                  </div>



                  {/* 迭代限制 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      迭代限制
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.iterationLimit}
                      onChange={(e) => updateNestedLayoutOption('stress', 'iterationLimit', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 交互式布局 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      交互式布局
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.stress.interactive}
                        onChange={(e) => updateNestedLayoutOption('stress', 'interactive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">启用交互式布局</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rectpacking布局参数 */}
            {layoutOptions.algorithm === 'rectpacking' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <h4 className="text-xs font-semibold text-yellow-800 mb-3">
                  矩形打包布局 (Rectpacking) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 尝试盒布局 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      尝试盒布局
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.rectpacking.tryBox}
                        onChange={(e) => updateNestedLayoutOption('rectpacking', 'tryBox', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">先检查是否适合盒布局</span>
                    </div>
                  </div>

                  {/* 宽度近似策略 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      宽度近似策略
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.rectpacking.widthApproximation.strategy}
                      onChange={(e) => updateNestedLayoutOption('rectpacking', 'widthApproximation', { ...layoutOptions.rectpacking.widthApproximation, 'strategy': e.target.value as RectpackingWidthApproximationStrategy })}
                    >
                      <option value="GREEDY">贪心算法</option>
                      <option value="TARGET_WIDTH">按目标宽度</option>
                    </select>
                  </div>

                  {/* 目标宽度 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      目标宽度
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.rectpacking.widthApproximation.targetWidth}
                      onChange={(e) => updateNestedLayoutOption('rectpacking', 'widthApproximation', { ...layoutOptions.rectpacking.widthApproximation, 'targetWidth': parseInt(e.target.value, 10) })}
                    />
                  </div>


                </div>
              </div>
            )}

            {/* Vertiflex布局参数 */}
            {layoutOptions.algorithm === 'vertiflex' && (
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                <h4 className="text-xs font-semibold text-teal-800 mb-3">
                  Vertiflex布局 (特殊树布局) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 层间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      层间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.vertiflex.layerDistance}
                      onChange={(e) => updateNestedLayoutOption('vertiflex', 'layerDistance', parseInt(e.target.value, 10))}
                    />
                  </div>

                  {/* 考虑节点模型顺序 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      考虑节点模型顺序
                    </label>
                    <div className="flex items-center p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <input
                        type="checkbox"
                        checked={layoutOptions.vertiflex.considerNodeModelOrder}
                        onChange={(e) => updateNestedLayoutOption('vertiflex', 'considerNodeModelOrder', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">考虑节点模型顺序</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Box布局参数 */}
            {layoutOptions.algorithm === 'box' && (
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="text-xs font-semibold text-indigo-800 mb-3">
                  盒布局 (Box) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 打包模式 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      打包模式
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.box.packingMode}
                      onChange={(e) => updateNestedLayoutOption('box', 'packingMode', e.target.value)}
                    >
                      <option value="SIMPLE">简单</option>
                      <option value="GROUP_MIXED">分组混合</option>
                    </select>
                  </div>
                </div>
              </div>
            )}



            {/* SporeOverlap布局参数 */}
            {layoutOptions.algorithm === 'sporeOverlap' && (
              <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                <h4 className="text-xs font-semibold text-rose-800 mb-3">
                  Spore重叠布局 (SporeOverlap) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 迭代限制 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      迭代限制
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.sporeOverlap.iterationLimit}
                      onChange={(e) => updateNestedLayoutOption('sporeOverlap', 'iterationLimit', parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>

        {/* 执行布局 */}
        <div className="space-y-4">
          <button
            onClick={executeLayout}
            disabled={isLayouting || nodes.length === 0}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white ${isLayouting || nodes.length === 0 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'}`}
          >
            {isLayouting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                布局中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                应用布局
              </>
            )}
          </button>

          {nodes.length === 0 && (
            <p className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded-lg border border-gray-100">
              请先添加节点再执行布局
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default GraphLayoutPanel;
