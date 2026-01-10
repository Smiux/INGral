import React, { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
import ELK from 'elkjs';

interface GraphLayoutPanelProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<CustomEdgeData>[];
  onLayout: (nodes: Node<CustomNodeData>[], edges: Edge<CustomEdgeData>[]) => void;
}

// 布局算法类型
type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial' | 'box' | 'fixed' | 'random';

// 布局方向类型
type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

// ELK图节点接口
interface ELKNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

// ELK图边接口
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
  animate: boolean;

  // Layered布局参数
  layered: {
    rankSpacing: number;
    crossingMinimization: string;
    nodePlacement: string;
  };

  // Force布局参数
  force: {
    coolingFactor: number;
    iterations: number;
    springLength: number;
    springConstant: number;
    repulsion: number;
  };

  // Radial布局参数
  radial: {
    treeSpacing: number;
    nodeSpacing: number;
  };

  // MR Tree布局参数
  mrtree: {
    treeConstruction: string;
    spanningTreeCostFunction: string;
  };

  // Stress布局参数
  stress: {
    iterations: number;
    stopThreshold: number;
  };
}

// 创建ELK实例
const elk = new ELK();

/**
 * 图谱布局面板组件
 * 支持多种布局算法和参数配置
 */
export const GraphLayoutPanel: React.FC<GraphLayoutPanelProps> = React.memo(({
  nodes,
  edges,
  onLayout
}) => {
  // 布局配置状态
  const [layoutOptions, setLayoutOptions] = useState<ELKLayoutOptions>({
    // 通用参数
    'algorithm': 'layered',
    'direction': 'DOWN',
    'nodeSpacing': 50,
    'edgeSpacing': 10,
    'randomSeed': 42,
    'animate': false,

    // Layered布局参数
    'layered': {
      'rankSpacing': 100,
      'crossingMinimization': 'LAYER_SWEEP',
      'nodePlacement': 'NETWORK_SIMPLEX'
    },

    // Force布局参数
    'force': {
      'coolingFactor': 0.95,
      'iterations': 100,
      'springLength': 100,
      'springConstant': 0.001,
      'repulsion': 1000
    },

    // Radial布局参数
    'radial': {
      'treeSpacing': 150,
      'nodeSpacing': 100
    },

    // MR Tree布局参数
    'mrtree': {
      'treeConstruction': 'MINIMUM_SPANNING_TREE',
      'spanningTreeCostFunction': 'ORIGINAL'
    },

    // Stress布局参数
    'stress': {
      'iterations': 100,
      'stopThreshold': 0.01
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
    // 基础布局参数
    const baseOptions: Record<string, string> = {
      'elk.algorithm': layoutOptions.algorithm,
      'elk.randomSeed': layoutOptions.randomSeed.toString(),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      // 使用baseValue作为所有间距的基础值
      'elk.layered.spacing.baseValue': layoutOptions.nodeSpacing.toString()
    };

    // 根据算法类型添加特定参数
    const algorithmOptions: Record<string, string> = {};

    switch (layoutOptions.algorithm) {
      case 'layered':
        algorithmOptions['elk.direction'] = layoutOptions.direction;
        algorithmOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = layoutOptions.layered.rankSpacing.toString();
        algorithmOptions['elk.layered.crossingMinimization'] = layoutOptions.layered.crossingMinimization;
        algorithmOptions['elk.layered.nodePlacement.strategy'] = layoutOptions.layered.nodePlacement;
        algorithmOptions['elk.layered.spacing.edgeEdgeBetweenLayers'] = layoutOptions.edgeSpacing.toString();
        algorithmOptions['elk.layered.spacing.edgeEdge'] = layoutOptions.edgeSpacing.toString();
        break;

      case 'force':
        algorithmOptions['elk.force.coolingFactor'] = layoutOptions.force.coolingFactor.toString();
        algorithmOptions['elk.force.iterations'] = layoutOptions.force.iterations.toString();
        algorithmOptions['elk.force.springLength'] = layoutOptions.force.springLength.toString();
        algorithmOptions['elk.force.springConstant'] = layoutOptions.force.springConstant.toString();
        algorithmOptions['elk.force.repulsion'] = layoutOptions.force.repulsion.toString();
        break;

      case 'mrtree':
        algorithmOptions['elk.direction'] = layoutOptions.direction;
        algorithmOptions['elk.processingOrder.treeConstruction'] = layoutOptions.mrtree.treeConstruction;
        algorithmOptions['elk.processingOrder.spanningTreeCostFunction'] = layoutOptions.mrtree.spanningTreeCostFunction;
        algorithmOptions['elk.spacing.nodeNode'] = layoutOptions.nodeSpacing.toString();
        break;

      case 'radial':
        algorithmOptions['elk.radial.treeSpacing'] = layoutOptions.radial.treeSpacing.toString();
        algorithmOptions['elk.radial.nodeSpacing'] = layoutOptions.radial.nodeSpacing.toString();
        break;

      case 'stress':
        algorithmOptions['elk.stress.iterations'] = layoutOptions.stress.iterations.toString();
        algorithmOptions['elk.stress.stopThreshold'] = layoutOptions.stress.stopThreshold.toString();
        break;

      case 'box':
        break;

      case 'fixed':
        break;

      case 'random':
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
      'edges': edges.map(edge => ({
        'id': edge.id,
        'sources': [edge.source],
        'targets': [edge.target]
      }))
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
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
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

      {/* 内容区域 */}
      <div className="p-6 space-y-6">
        {/* 布局算法选择 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
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
                <option value="mrtree">最小生成树布局 (MR Tree)</option>
                <option value="radial">辐射状布局 (Radial)</option>
                <option value="box">盒布局 (Box)</option>
                <option value="fixed">固定布局 (Fixed)</option>
                <option value="random">随机布局 (Random)</option>
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
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
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
                min="0"
                max="500"
              />
            </div>

            {/* 边间距 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                边间距
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={layoutOptions.edgeSpacing}
                onChange={(e) => updateLayoutOption('edgeSpacing', parseInt(e.target.value, 10))}
                min="0"
                max="200"
              />
            </div>

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
                min="0"
                max="10000"
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
                      min="0"
                      max="1000"
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
                  {/* 冷却因子 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      冷却因子
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.coolingFactor}
                      onChange={(e) => updateNestedLayoutOption('force', 'coolingFactor', parseFloat(e.target.value))}
                      min="0.01"
                      max="1"
                    />
                  </div>

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
                      min="10"
                      max="1000"
                    />
                  </div>

                  {/* 弹簧长度 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      弹簧长度
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.springLength}
                      onChange={(e) => updateNestedLayoutOption('force', 'springLength', parseInt(e.target.value, 10))}
                      min="10"
                      max="500"
                    />
                  </div>

                  {/* 弹簧常量 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      弹簧常量
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.springConstant}
                      onChange={(e) => updateNestedLayoutOption('force', 'springConstant', parseFloat(e.target.value))}
                      min="0.0001"
                      max="0.01"
                    />
                  </div>

                  {/* 排斥力 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      排斥力
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.force.repulsion}
                      onChange={(e) => updateNestedLayoutOption('force', 'repulsion', parseInt(e.target.value, 10))}
                      min="100"
                      max="5000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MR Tree布局参数 */}
            {layoutOptions.algorithm === 'mrtree' && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <h4 className="text-xs font-semibold text-purple-800 mb-3">
                  最小生成树布局 (MR Tree) 参数
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 树构建 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      树构建
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.mrtree.treeConstruction}
                      onChange={(e) => updateNestedLayoutOption('mrtree', 'treeConstruction', e.target.value)}
                    >
                      <option value="MINIMUM_SPANNING_TREE">最小生成树</option>
                      <option value="MAXIMUM_SPANNING_TREE">最大生成树</option>
                    </select>
                  </div>

                  {/* 生成树成本函数 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      生成树成本函数
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.mrtree.spanningTreeCostFunction}
                      onChange={(e) => updateNestedLayoutOption('mrtree', 'spanningTreeCostFunction', e.target.value)}
                    >
                      <option value="ORIGINAL">原始</option>
                      <option value="INVERSE">反向</option>
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
                  {/* 树间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      树间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.radial.treeSpacing}
                      onChange={(e) => updateNestedLayoutOption('radial', 'treeSpacing', parseInt(e.target.value, 10))}
                      min="50"
                      max="500"
                    />
                  </div>

                  {/* 节点间距 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      节点间距
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.radial.nodeSpacing}
                      onChange={(e) => updateNestedLayoutOption('radial', 'nodeSpacing', parseInt(e.target.value, 10))}
                      min="20"
                      max="200"
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
                  {/* 迭代次数 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      迭代次数
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.iterations}
                      onChange={(e) => updateNestedLayoutOption('stress', 'iterations', parseInt(e.target.value, 10))}
                      min="10"
                      max="1000"
                    />
                  </div>

                  {/* 停止阈值 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      停止阈值
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={layoutOptions.stress.stopThreshold}
                      onChange={(e) => updateNestedLayoutOption('stress', 'stopThreshold', parseFloat(e.target.value))}
                      min="0.001"
                      max="0.1"
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
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${isLayouting || nodes.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                应用布局
              </>
            )}
          </button>

          {nodes.length === 0 && (
            <p className="text-xs text-gray-500 text-center">
              请先添加节点再执行布局
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default GraphLayoutPanel;
