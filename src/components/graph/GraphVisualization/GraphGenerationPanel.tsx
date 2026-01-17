import React, { useState, useCallback } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';
// 导入 ELK.js 用于图布局
import ELK from 'elkjs';

// 创建 ELK 实例
const elk = new ELK();

// ELK 图节点接口
interface ELKNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

// ELK 图连接接口
interface ELKEdge {
  id: string;
  sources: string[];
  targets: string[];
}

// ELK 图结构接口
interface ELKGraph {
  id: string;
  layoutOptions: Record<string, string>;
  children?: ELKNode[];
  edges?: ELKEdge[];
}

interface GraphGenerationPanelProps {
  onGenerate: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

// 图生成类型
type GraphType = 'random' | 'chain' | 'cycle' | 'tree' | 'star' | 'grid';

// 基础配置类型
type BaseGraphConfig = {
  categories: string[];
  edgeCategories: string[];
  weightRange: [number, number];
  curveType: 'default' | 'smoothstep' | 'straight' | 'simplebezier';
};

// 随机图配置
type RandomGraphConfig = BaseGraphConfig & {
  nodeCount: number;
  edgeCount: number;
  connectedComponentsCount: number;
};

// 链状图配置
type ChainGraphConfig = BaseGraphConfig & {
  nodeCount: number;
  direction: 'horizontal' | 'vertical';
};

// 环状图配置
type CycleGraphConfig = BaseGraphConfig & {
  nodeCount: number;
};

// 树图配置
type TreeGraphConfig = BaseGraphConfig & {
  maxDepth: number;
  minDepth: number;
  minChildrenPerNode: number;
  maxChildrenPerNode: number;
  childrenCount: number;
  branchingMode: 'fixed' | 'random';
  countMode: 'fixed' | 'range';
};

// 星状图配置
type StarGraphConfig = BaseGraphConfig & {
  nodeCount: number;
};

// 网格图配置
type GridGraphConfig = BaseGraphConfig & {
  rows: number;
  cols: number;
};

/**
 * 图生成面板组件
 */
export const GraphGenerationPanel: React.FC<GraphGenerationPanelProps> = ({ onGenerate, onClose }) => {
  // 使用useReactFlow获取实例
  const reactFlowInstance = useReactFlow();

  // 图类型选择
  const [graphType, setGraphType] = useState<GraphType>('random');

  // 生成进度状态
  const [generationProgress, setGenerationProgress] = useState<{ active: boolean; stage: string; progress: number }>({
    'active': false,
    'stage': '准备中',
    'progress': 0
  });

  // 基础配置
  const getBaseConfig = (): BaseGraphConfig => ({
    'categories': ['概念', '理论', '方法'],
    'edgeCategories': ['包含', '相关'],
    'weightRange': [1, 10],
    'curveType': 'default'
  });

  // 随机图配置
  const [randomConfig, setRandomConfig] = useState<RandomGraphConfig>({
    ...getBaseConfig(),
    'nodeCount': 50,
    'edgeCount': 150,
    'connectedComponentsCount': 0
  });

  // 链状图配置
  const [chainConfig, setChainConfig] = useState<ChainGraphConfig>({
    ...getBaseConfig(),
    'nodeCount': 20,
    'direction': 'horizontal',
    'curveType': 'straight'
  });

  // 环状图配置
  const [cycleConfig, setCycleConfig] = useState<CycleGraphConfig>({
    ...getBaseConfig(),
    'nodeCount': 15,
    'curveType': 'straight'
  });

  // 树图配置
  const [treeConfig, setTreeConfig] = useState<TreeGraphConfig>({
    ...getBaseConfig(),
    'maxDepth': 3,
    'minDepth': 1,
    'minChildrenPerNode': 1,
    'maxChildrenPerNode': 3,
    'childrenCount': 2,
    'branchingMode': 'random',
    'countMode': 'range',
    'curveType': 'straight'
  });

  // 星状图配置
  const [starConfig, setStarConfig] = useState<StarGraphConfig>({
    ...getBaseConfig(),
    'nodeCount': 12,
    'curveType': 'simplebezier'
  });

  // 网格图配置
  const [gridConfig, setGridConfig] = useState<GridGraphConfig>({
    ...getBaseConfig(),
    'rows': 5,
    'cols': 10,
    'curveType': 'straight'
  });

  // 当前活动的配置
  const [activeConfig, setActiveConfig] = useState<
    RandomGraphConfig | ChainGraphConfig | CycleGraphConfig |
    TreeGraphConfig | StarGraphConfig | GridGraphConfig
  >(randomConfig);

  // 当图类型变化时，切换活动配置
  React.useEffect(() => {
    // 根据不同图类型设置活动配置
    switch (graphType) {
      case 'random':
        setActiveConfig(randomConfig);
        break;
      case 'chain':
        setActiveConfig(chainConfig);
        break;
      case 'cycle':
        setActiveConfig(cycleConfig);
        break;
      case 'tree':
        setActiveConfig(treeConfig);
        break;
      case 'star':
        setActiveConfig(starConfig);
        break;
      case 'grid':
        setActiveConfig(gridConfig);
        break;
      default:
        break;
    }
  }, [graphType, randomConfig, chainConfig, cycleConfig, treeConfig, starConfig, gridConfig]);

  // 生成节点ID
  const generateNodeId = useCallback((index: number) => {
    return `generated-node-${index}`;
  }, []);

  // 生成随机边ID
  const generateEdgeId = useCallback((sourceId: string, targetId: string, index: number) => {
    return `generated-edge-${sourceId}-${targetId}-${index}`;
  }, []);

  // 对生成的图进行布局
  const layoutGraph = useCallback(async (
    nodes: Node<CustomNodeData>[],
    edges: Edge<CustomEdgeData>[],
    graphTypeParam: GraphType
  ): Promise<Node<CustomNodeData>[]> => {
    // 算法ID映射，将短名称映射到完整的ELK算法ID
    const algorithmIdMap: Record<string, string> = {
      'random': 'org.eclipse.elk.random',
      'chain': 'org.eclipse.elk.layered',
      'tree': 'org.eclipse.elk.mrtree',
      'star': 'org.eclipse.elk.radial'
    };

    // 生成ELK图结构
    const elkGraph: ELKGraph = {
      'id': 'root',
      'layoutOptions': {
        'elk.algorithm': algorithmIdMap[graphTypeParam] || 'org.eclipse.elk.force',
        'elk.randomSeed': '0',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
      },
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

    // 根据图类型设置特定布局参数
    switch (graphTypeParam) {
      case 'chain':
        elkGraph.layoutOptions['elk.direction'] = 'RIGHT';
        elkGraph.layoutOptions['elk.spacing.nodeNode'] = '100';
        break;
      case 'tree':
        elkGraph.layoutOptions['elk.direction'] = 'DOWN';
        elkGraph.layoutOptions['elk.spacing.nodeNode'] = '100';
        break;
      case 'star':
        elkGraph.layoutOptions['elk.spacing.nodeNode'] = '50';
        break;
      case 'random':
      default:
        elkGraph.layoutOptions['elk.spacing.nodeNode'] = '30';
        break;
    }

    try {
      // 执行ELK布局
      const layoutedGraph = await elk.layout(elkGraph);

      // 更新节点位置
      if (layoutedGraph.children) {
        return nodes.map(node => {
          const layoutedNode = layoutedGraph.children?.find(n => n.id === node.id);
          if (layoutedNode?.x !== undefined && layoutedNode?.y !== undefined) {
            return {
              ...node,
              'position': {
                'x': layoutedNode.x,
                'y': layoutedNode.y
              }
            };
          }
          return node;
        });
      }
    } catch (error) {
      console.error('Layout failed:', error);
    }

    return nodes;
  }, []);

  // 生成随机节点类别
  const generateNodeCategory = useCallback((categories: string[]): string => {
    if (categories.length === 0) {
      return '默认';
    }
    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex] || '默认';
  }, []);

  // 生成随机连接类别
  const generateEdgeCategory = useCallback((categories: string[]): string => {
    if (categories.length === 0) {
      return '相关';
    }
    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex] || '相关';
  }, []);

  // 生成随机连接权重
  const generateEdgeWeight = useCallback((range: [number, number]): number => {
    const [min, max] = range;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);



  // 生成链状图
  const generateChainGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, edgeCategories, weightRange, curveType } = chainConfig;

    // 生成节点
    for (let i = 0; i < nodeCount; i += 1) {
      const category = generateNodeCategory(categories);

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        'position': { 'x': 0, 'y': 0 },
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          'metadata': {
            'content': `${category} ${i + 1}的内容`
          }
        }
      });
    }

    // 生成边
    for (let i = 0; i < nodeCount - 1; i += 1) {
      const sourceId = generateNodeId(i);
      const targetId = generateNodeId(i + 1);

      newEdges.push({
        'id': generateEdgeId(sourceId, targetId, i),
        'type': 'floating',
        'source': sourceId,
        'target': targetId,
        'data': {
          'type': generateEdgeCategory(edgeCategories),
          curveType,
          'weight': generateEdgeWeight(weightRange),
          'style': {},
          'animation': {
            'dynamicEffect': 'none',
            'isAnimating': false
          }
        }
      });
    }

    return { newNodes, newEdges };
  }, [chainConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成环状图
  const generateCycleGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, edgeCategories, weightRange, curveType } = cycleConfig;

    // 生成节点
    for (let i = 0; i < nodeCount; i += 1) {
      const category = generateNodeCategory(categories);

      // 环状图节点位置：分布在圆周上
      // 动态计算半径，确保节点间有足够空隙
      // 节点大小
      const nodeSize = 100;
      // 节点间最小空隙，大于一个节点
      const minGap = nodeSize * 1.5;
      // 圆周长度
      const circumference = nodeCount * (nodeSize + minGap);
      // 动态计算半径
      const radius = circumference / (2 * Math.PI);
      // 从底部开始（Math.PI/2），逆时针生成节点（-方向）
      const angle = (Math.PI / 2) - (i / nodeCount) * Math.PI * 2;
      const position = {
        'x': Math.cos(angle) * radius + 400,
        'y': Math.sin(angle) * radius + 300
      };

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        position,
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          'metadata': {
            'content': `${category} ${i + 1}的内容`
          }
        }
      });
    }

    // 生成边（环状）
    for (let i = 0; i < nodeCount; i += 1) {
      const sourceId = generateNodeId(i);
      const targetIndex = (i + 1) % nodeCount;
      const targetId = generateNodeId(targetIndex);

      newEdges.push({
        'id': generateEdgeId(sourceId, targetId, i),
        'type': 'floating',
        'source': sourceId,
        'target': targetId,
        'data': {
          'type': generateEdgeCategory(edgeCategories),
          curveType,
          'weight': generateEdgeWeight(weightRange),
          'style': {},
          'animation': {
            'dynamicEffect': 'none',
            'isAnimating': false
          }
        }
      });
    }

    return { newNodes, newEdges };
  }, [cycleConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成随机树图
  const generateTreeGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { categories, edgeCategories, weightRange, curveType, maxDepth, minDepth, minChildrenPerNode, maxChildrenPerNode, childrenCount, branchingMode, countMode } = treeConfig;

    // 递归生成树节点
    interface TreeNodeParams {
      parentId: string | null;
      currentDepth: number;
      indexWrapper: { value: number };
    }

    const generateTreeNode = ({ parentId, currentDepth, indexWrapper }: TreeNodeParams) => {
      const currentIndex = indexWrapper.value;
      const nodeId = generateNodeId(currentIndex);
      indexWrapper.value += 1;

      const category = generateNodeCategory(categories);
      const nextIndex = indexWrapper.value;

      newNodes.push({
        'id': nodeId,
        'type': 'custom',
        'position': { 'x': 0, 'y': 0 },
        'data': {
          'title': `${category} ${nextIndex}`,
          category,
          'metadata': {
            'content': `${category} ${nextIndex}的内容`
          }
        }
      });

      // 如果不是根节点，生成边
      if (parentId) {
        newEdges.push({
          'id': generateEdgeId(parentId, nodeId, newEdges.length),
          'type': 'floating',
          'source': parentId,
          'target': nodeId,
          'data': {
            'type': generateEdgeCategory(edgeCategories),
            curveType,
            'weight': generateEdgeWeight(weightRange),
            'style': {},
            'animation': {
              'dynamicEffect': 'none',
              'isAnimating': false
            }
          }
        });
      }

      // 递归生成子节点
      if (currentDepth < maxDepth) {
        // 计算子节点数量
        let childCount;

        // 首先根据数量模式确定子节点数量
        if (countMode === 'fixed') {
          childCount = childrenCount;
        } else {
          // 范围模式
          childCount = Math.floor(Math.random() * (maxChildrenPerNode - minChildrenPerNode + 1) + minChildrenPerNode);
        }

        // 然后根据分叉模式调整
        if (branchingMode === 'random') {
          // 随机分叉：有一定概率不生成子节点，除非达到最小深度
          const shouldBranch = currentDepth < minDepth || Math.random() > 0.3;
          if (!shouldBranch) {
            childCount = 0;
          }
        }

        // 确保至少有一个子节点，除非达到最大深度
        if (currentDepth < minDepth) {
          childCount = Math.max(1, childCount);
        }

        for (let i = 0; i < childCount; i += 1) {
          generateTreeNode({
            'parentId': nodeId,
            'currentDepth': currentDepth + 1,
            indexWrapper
          });
        }
      }
    };

    // 生成根节点
    const indexWrapper = { 'value': 0 };
    generateTreeNode({
      'parentId': null,
      'currentDepth': 0,
      indexWrapper
    });

    return { newNodes, newEdges };
  }, [treeConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成随机图
  const generateRandomGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, edgeCategories, weightRange, curveType, edgeCount, connectedComponentsCount } = randomConfig;

    // 生成节点 - 只生成节点数据，位置由布局算法计算
    for (let i = 0; i < nodeCount; i += 1) {
      const category = generateNodeCategory(categories);

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        'position': { 'x': 0, 'y': 0 },
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          'metadata': {
            'content': `${category} ${i + 1}的内容`
          }
        }
      });
    }

    // 生成连接
    const existingEdges = new Set<string>();
    let currentEdgeCount = 0;

    // 辅助函数：生成边
    const createEdge = (
      sourceIndex: number,
      targetIndex: number,
      componentEdges?: Set<string>
    ): boolean => {
      const sourceId = generateNodeId(sourceIndex);
      const targetId = generateNodeId(targetIndex);
      const edgeKey = `${sourceId}-${targetId}`;
      const reverseEdgeKey = `${targetId}-${sourceId}`;

      // 确定要检查的边集合
      const edgeSet = componentEdges || existingEdges;

      // 检查边是否已存在
      if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseEdgeKey)) {
        edgeSet.add(edgeKey);
        existingEdges.add(edgeKey);

        const sourceNode = newNodes[sourceIndex];
        const targetNode = newNodes[targetIndex];

        if (sourceNode && targetNode) {
          newEdges.push({
            'id': generateEdgeId(sourceId, targetId, currentEdgeCount),
            'type': 'floating',
            'source': sourceId,
            'target': targetId,
            'data': {
              'type': generateEdgeCategory(edgeCategories),
              curveType,
              'weight': generateEdgeWeight(weightRange),
              'style': {},
              'animation': {
                'dynamicEffect': 'none',
                'isAnimating': false
              }
            }
          });

          currentEdgeCount += 1;
          return true;
        }
      }
      return false;
    };

    // 辅助函数：处理单个连通分支
    const processComponent = (
      componentNodes: number[],
      totalEdgeCount: number,
      totalNodeCount: number
    ) => {
      const componentSize = componentNodes.length;

      // 确保至少有componentSize - 1条边，使分支连通
      const minEdges = componentSize - 1;
      const maxPossibleEdges = componentSize * (componentSize - 1);
      const componentEdgeCount = Math.min(
        Math.max(minEdges, Math.floor(totalEdgeCount * componentSize / totalNodeCount)),
        maxPossibleEdges
      );

      // 生成一棵生成树，确保连通
      const componentExistingEdges = new Set<string>();

      // 使用Prim算法生成生成树
      const visited = new Set<number>();
      // 初始节点索引（在componentNodes中的索引）
      visited.add(0);

      // 生成生成树的边
      let treeGenerationComplete = false;
      while (!treeGenerationComplete && visited.size < componentSize) {
        let found = false;

        // 从已访问节点列表中随机选择源节点
        const visitedArray = Array.from(visited);
        const randomSourceIndex = visitedArray[Math.floor(Math.random() * visitedArray.length)];

        // 已访问节点在newNodes中的实际索引
        const sourceIndex = componentNodes[randomSourceIndex as number]!;

        // 随机选择一个目标节点索引（在componentNodes中的索引）
        const randomTargetIndex = Math.floor(Math.random() * componentSize);

        // 如果目标节点未访问
        if (!visited.has(randomTargetIndex)) {
          // 目标节点在newNodes中的实际索引
          const targetIndex = componentNodes[randomTargetIndex]!;

          // 生成边
          const edgeCreated = createEdge(sourceIndex, targetIndex, componentExistingEdges);
          if (edgeCreated) {
            visited.add(randomTargetIndex);
            found = true;
          }
        }

        if (!found) {
          treeGenerationComplete = true;
        }
      }

      // 添加额外的随机边，直到达到组件的最大边数或总边数限制
      while (componentExistingEdges.size < componentEdgeCount && currentEdgeCount < totalEdgeCount) {
        // 随机选择源节点索引（在componentNodes中的索引）
        const randomSourceIndex = Math.floor(Math.random() * componentSize);
        // 随机选择目标节点索引（在componentNodes中的索引）
        const randomTargetIndex = Math.floor(Math.random() * componentSize);

        // 确保源节点和目标节点不同
        if (randomSourceIndex !== randomTargetIndex) {
          // 源节点在newNodes中的实际索引
          const sourceIndex = componentNodes[randomSourceIndex]!;
          // 目标节点在newNodes中的实际索引
          const targetIndex = componentNodes[randomTargetIndex]!;

          // 生成边
          createEdge(sourceIndex, targetIndex, componentExistingEdges);
        }
      }
    };

    // 如果未指定连通分支数量或为0，使用原始随机连接生成逻辑
    if (connectedComponentsCount === 0) {
      while (currentEdgeCount < edgeCount && currentEdgeCount < nodeCount * (nodeCount - 1)) {
        const sourceIndex = Math.floor(Math.random() * nodeCount);
        const targetIndex = Math.floor(Math.random() * nodeCount);

        if (sourceIndex !== targetIndex) {
          createEdge(sourceIndex, targetIndex);
        }
      }
    } else {
      // 指定了连通分支数量
      const componentsCount = Math.min(connectedComponentsCount, nodeCount);

      // 1. 计算每个连通分支的节点数量
      const componentSizes: number[] = [];
      let remainingNodes = nodeCount;

      for (let i = 0; i < componentsCount - 1; i += 1) {
        // 每个分支至少有1个节点
        const size = Math.floor(Math.random() * (remainingNodes - (componentsCount - i - 1))) + 1;
        componentSizes.push(size);
        remainingNodes -= size;
      }
      componentSizes.push(remainingNodes);

      // 2. 将节点分配到不同的连通分支
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

      // 3. 为每个连通分支生成内部连接，确保分支内部连通
      for (const componentNodes of nodeComponents) {
        const componentSize = componentNodes.length;

        // 单个节点不需要连接，跳过处理
        if (componentSize > 1) {
          processComponent(componentNodes, edgeCount, nodeCount);
        }
      }
    }

    return { newNodes, newEdges };
  }, [randomConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成网格图
  const generateGridGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { categories, edgeCategories, weightRange, curveType, rows, cols } = gridConfig;

    let index = 0;

    // 生成网格节点
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const currentIndex = index;
        const nodeId = generateNodeId(currentIndex);
        index += 1;

        const category = generateNodeCategory(categories);

        newNodes.push({
          'id': nodeId,
          'type': 'custom',
          'position': { 'x': col * 150, 'y': row * 150 },
          'data': {
            'title': `${category} ${index}`,
            category,
            'metadata': {
              'content': `${category} ${index}的内容`
            }
          }
        });
      }
    }

    // 生成水平边
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const sourceIndex = row * cols + col;
        const targetIndex = row * cols + col + 1;
        const sourceId = generateNodeId(sourceIndex);
        const targetId = generateNodeId(targetIndex);

        newEdges.push({
          'id': generateEdgeId(sourceId, targetId, newEdges.length),
          'type': 'floating',
          'source': sourceId,
          'target': targetId,
          'data': {
            'type': generateEdgeCategory(edgeCategories),
            curveType,
            'weight': generateEdgeWeight(weightRange),
            'style': {},
            'animation': {
              'dynamicEffect': 'none',
              'isAnimating': false
            }
          }
        });
      }
    }

    // 生成垂直边
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows - 1; row += 1) {
        const sourceIndex = row * cols + col;
        const targetIndex = (row + 1) * cols + col;
        const sourceId = generateNodeId(sourceIndex);
        const targetId = generateNodeId(targetIndex);

        newEdges.push({
          'id': generateEdgeId(sourceId, targetId, newEdges.length),
          'type': 'floating',
          'source': sourceId,
          'target': targetId,
          'data': {
            'type': generateEdgeCategory(edgeCategories),
            curveType,
            'weight': generateEdgeWeight(weightRange),
            'style': {},
            'animation': {
              'dynamicEffect': 'none',
              'isAnimating': false
            }
          }
        });
      }
    }

    return { newNodes, newEdges };
  }, [gridConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成星状图
  const generateStarGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, edgeCategories, weightRange, curveType } = starConfig;

    // 生成中心节点
    const centerNodeId = generateNodeId(0);
    const centerCategory = generateNodeCategory(categories);

    newNodes.push({
      'id': centerNodeId,
      'type': 'custom',
      'position': { 'x': 0, 'y': 0 },
      'data': {
        'title': `${centerCategory} 中心`,
        'category': centerCategory,
        'metadata': {
          'content': `${centerCategory} 中心节点的内容`
        }
      }
    });

    // 生成外围节点
    for (let i = 1; i < nodeCount; i += 1) {
      const nodeId = generateNodeId(i);
      const category = generateNodeCategory(categories);

      newNodes.push({
        'id': nodeId,
        'type': 'custom',
        'position': { 'x': 0, 'y': 0 },
        'data': {
          'title': `${category} ${i}`,
          category,
          'metadata': {
            'content': `${category} ${i}的内容`
          }
        }
      });

      // 生成连接中心节点的边
      newEdges.push({
        'id': generateEdgeId(centerNodeId, nodeId, i - 1),
        'type': 'floating',
        'source': centerNodeId,
        'target': nodeId,
        'data': {
          'type': generateEdgeCategory(edgeCategories),
          curveType,
          'weight': generateEdgeWeight(weightRange),
          'style': {},
          'animation': {
            'dynamicEffect': 'none',
            'isAnimating': false
          }
        }
      });
    }

    return { newNodes, newEdges };
  }, [starConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 处理图生成
  const handleGenerateGraph = useCallback(async () => {
    let result;

    switch (graphType) {
      case 'chain':
        result = generateChainGraph();
        break;
      case 'cycle':
        result = generateCycleGraph();
        break;
      case 'tree':
        result = generateTreeGraph();
        break;
      case 'star':
        result = generateStarGraph();
        break;
      case 'grid':
        result = generateGridGraph();
        break;
      case 'random':
      default:
        result = generateRandomGraph();
        break;
    }

    const { 'newNodes': nodes, newEdges } = result;
    let newNodes = nodes;

    if (graphType !== 'grid' && graphType !== 'cycle') {
      // 对其他图进行布局
      newNodes = await layoutGraph(newNodes, newEdges, graphType);
    }
    const totalNodes = newNodes.length;
    const totalEdges = newEdges.length;

    const batchSize = Math.max(50, Math.min(200, Math.floor(totalNodes / 20)));
    const delay = 16;

    // 开始生成，更新进度状态
    setGenerationProgress({ 'active': true, 'stage': '生成中', 'progress': 0 });

    // 清空现有图
    onGenerate([], []);

    const requestNextFrame = (callback: () => void) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
      }
      return setTimeout(callback, delay);
    };

    let nodeIndex = 0;
    let edgeIndex = 0;
    let lastProgressUpdate = 0;

    const generateNextBatch = () => {
      // 添加节点批次
      if (nodeIndex < totalNodes) {
        const endNodeIndex = Math.min(nodeIndex + batchSize, totalNodes);
        const batchNodes = newNodes.slice(nodeIndex, endNodeIndex);
        onGenerate(batchNodes, []);
        nodeIndex = endNodeIndex;
      }

      // 添加边批次（一旦有节点，就开始添加边）
      if (nodeIndex > 0 && edgeIndex < totalEdges) {
        const endEdgeIndex = Math.min(edgeIndex + batchSize, totalEdges);
        const batchEdges = newEdges.slice(edgeIndex, endEdgeIndex);
        onGenerate([], batchEdges);
        edgeIndex = endEdgeIndex;
      }

      const now = Date.now();
      if (now - lastProgressUpdate > 100) {
        // 更新进度
        const nodeProgress = (nodeIndex / totalNodes) * (totalNodes / (totalNodes + totalEdges)) * 100;
        const edgeProgress = (edgeIndex / totalEdges) * (totalEdges / (totalNodes + totalEdges)) * 100;
        const currentProgress = Math.min(99, Math.floor(nodeProgress + edgeProgress));
        setGenerationProgress({ 'active': true, 'stage': '生成中', 'progress': currentProgress });
        lastProgressUpdate = now;
      }

      // 检查是否生成完成
      if (nodeIndex >= totalNodes && edgeIndex >= totalEdges) {
        // 所有节点和边添加完成，更新进度并缩放到适合视图
        setGenerationProgress({ 'active': true, 'stage': '完成', 'progress': 100 });

        requestNextFrame(() => {
          reactFlowInstance.fitView({
            'duration': 300
          });
          // 隐藏进度条
          setTimeout(() => {
            setGenerationProgress({ 'active': false, 'stage': '准备中', 'progress': 0 });
          }, 500);
        });
        return;
      }

      // 继续生成下一批
      requestNextFrame(generateNextBatch);
    };

    // 开始生成
    requestNextFrame(generateNextBatch);
  }, [graphType, generateChainGraph, generateCycleGraph, generateTreeGraph, generateStarGraph, generateGridGraph, generateRandomGraph, onGenerate, reactFlowInstance, layoutGraph]);

  // 通用配置更新函数
  const updateConfig = useCallback(<K extends keyof BaseGraphConfig>(
    key: K,
    value: BaseGraphConfig[K]
  ) => {
    switch (graphType) {
      case 'random':
        setRandomConfig(prev => ({ ...prev, [key]: value }));
        break;
      case 'chain':
        setChainConfig(prev => ({ ...prev, [key]: value }));
        break;
      case 'cycle':
        setCycleConfig(prev => ({ ...prev, [key]: value }));
        break;
      case 'tree':
        setTreeConfig(prev => ({ ...prev, [key]: value }));
        break;
      case 'star':
        setStarConfig(prev => ({ ...prev, [key]: value }));
        break;
      case 'grid':
        setGridConfig(prev => ({ ...prev, [key]: value }));
        break;
      default:
        break;
    }
  }, [graphType]);

  // 更新节点类别
  const updateNodeCategories = useCallback((value: string) => {
    const categories = value.split(';').filter(cat => cat.trim() !== '');
    updateConfig('categories', categories);
  }, [updateConfig]);

  // 更新连接类别
  const updateEdgeCategories = useCallback((value: string) => {
    const edgeCategories = value.split(';').filter(cat => cat.trim() !== '');
    updateConfig('edgeCategories', edgeCategories);
  }, [updateConfig]);

  return (
    <div className="w-[40rem] min-w-[40rem] max-w-[40rem] h-full bg-white shadow-lg overflow-y-auto absolute left-0 top-0 z-20 border-r border-gray-200 transition-all duration-300 ease-in-out">
      {/* 面板标题 */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {/* 生成图标 */}
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
              图生成
          </h2>
          <p className="text-sm text-gray-600 mt-1">
              配置并生成不同类型的图
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
        {/* 图类型选择 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
              图类型
          </h3>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as GraphType)}
          >
            <option value="random">🎲 随机图</option>
            <option value="chain">🔗 链状图</option>
            <option value="cycle">🔄 环状图</option>
            <option value="tree">🌳 随机树</option>
            <option value="star">⭐ 星状图</option>
            <option value="grid">📊 网格图</option>
          </select>
        </div>

        {/* 特定图类型的配置 */}
        {(graphType === 'tree' || graphType === 'grid') && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {graphType === 'tree' ? '树图配置' : '网格图配置'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {graphType === 'tree' ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">最大深度</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="5"
                      value={treeConfig.maxDepth === 0 ? '' : treeConfig.maxDepth}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === '') {
                          setTreeConfig(prev => ({ ...prev, 'maxDepth': 0 }));
                          return;
                        }

                        const maxDepth = parseInt(value, 10) || 0;
                        setTreeConfig(prev => ({ ...prev, maxDepth }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">最小深度</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="4"
                      value={treeConfig.minDepth === 0 ? '' : treeConfig.minDepth}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === '') {
                          setTreeConfig(prev => ({ ...prev, 'minDepth': 0 }));
                          return;
                        }

                        const minDepth = parseInt(value, 10) || 0;
                        setTreeConfig(prev => ({ ...prev, minDepth }));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">分叉模式</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={treeConfig.branchingMode}
                      onChange={(e) => {
                        const branchingMode = e.target.value as 'fixed' | 'random';
                        setTreeConfig(prev => ({ ...prev, branchingMode }));
                      }}
                    >
                      <option value="fixed">固定分叉</option>
                      <option value="random">随机分叉</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">数量控制</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={treeConfig.countMode}
                      onChange={(e) => {
                        const countMode = e.target.value as 'fixed' | 'range';
                        setTreeConfig(prev => ({ ...prev, countMode }));
                      }}
                    >
                      <option value="fixed">固定数量</option>
                      <option value="range">范围随机</option>
                    </select>
                  </div>
                  {treeConfig.countMode === 'fixed' ? (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">固定子节点数</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        max="5"
                        value={treeConfig.childrenCount === 0 ? '' : treeConfig.childrenCount}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === '') {
                            setTreeConfig(prev => ({ ...prev, 'childrenCount': 0 }));
                            return;
                          }

                          const childrenCount = parseInt(value, 10) || 0;
                          setTreeConfig(prev => ({ ...prev, childrenCount }));
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">最小子节点数</label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                          max="5"
                          value={treeConfig.minChildrenPerNode === 0 ? '' : treeConfig.minChildrenPerNode}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value === '') {
                              setTreeConfig(prev => ({ ...prev, 'minChildrenPerNode': 0 }));
                              return;
                            }

                            const minChildrenPerNode = parseInt(value, 10) || 0;
                            setTreeConfig(prev => ({ ...prev, minChildrenPerNode }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">最大子节点数</label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                          max="5"

                          value={treeConfig.maxChildrenPerNode === 0 ? '' : treeConfig.maxChildrenPerNode}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value === '') {
                              setTreeConfig(prev => ({ ...prev, 'maxChildrenPerNode': 0 }));
                              return;
                            }

                            const maxChildrenPerNode = parseInt(value, 10) || 0;
                            setTreeConfig(prev => ({ ...prev, maxChildrenPerNode }));
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">行数</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="20"
                      value={gridConfig.rows === 0 ? '' : gridConfig.rows}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === '') {
                          setGridConfig(prev => ({ ...prev, 'rows': 0 }));
                          return;
                        }

                        const rows = parseInt(value, 10) || 0;
                        setGridConfig(prev => ({ ...prev, rows }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">列数</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="20"
                      value={gridConfig.cols === 0 ? '' : gridConfig.cols}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === '') {
                          setGridConfig(prev => ({ ...prev, 'cols': 0 }));
                          return;
                        }

                        const cols = parseInt(value, 10) || 0;
                        setGridConfig(prev => ({ ...prev, cols }));
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 节点配置 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            节点配置
          </h3>

          {/* 根据图类型显示或隐藏节点数量输入 */}
          {(graphType !== 'tree' && graphType !== 'grid') && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">节点数量</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="2"
                max="500"
                value={(() => {
                  switch (graphType) {
                    case 'random':
                      return randomConfig.nodeCount === 0 ? '' : randomConfig.nodeCount;
                    case 'chain':
                      return chainConfig.nodeCount === 0 ? '' : chainConfig.nodeCount;
                    case 'cycle':
                      return cycleConfig.nodeCount === 0 ? '' : cycleConfig.nodeCount;
                    case 'star':
                      return starConfig.nodeCount === 0 ? '' : starConfig.nodeCount;
                    default:
                      return 2;
                  }
                })()}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === '') {
                    switch (graphType) {
                      case 'random':
                        setRandomConfig(prev => ({ ...prev, 'nodeCount': 0 }));
                        break;
                      case 'chain':
                        setChainConfig(prev => ({ ...prev, 'nodeCount': 0 }));
                        break;
                      case 'cycle':
                        setCycleConfig(prev => ({ ...prev, 'nodeCount': 0 }));
                        break;
                      case 'star':
                        setStarConfig(prev => ({ ...prev, 'nodeCount': 0 }));
                        break;
                      default:
                        break;
                    }
                    return;
                  }

                  // 输入非空时，使用用户输入的值
                  const nodeCount = parseInt(value, 10) || 0;

                  switch (graphType) {
                    case 'random':
                      setRandomConfig(prev => ({ ...prev, nodeCount }));
                      break;
                    case 'chain':
                      setChainConfig(prev => ({ ...prev, nodeCount }));
                      break;
                    case 'cycle':
                      setCycleConfig(prev => ({ ...prev, nodeCount }));
                      break;
                    case 'star':
                      setStarConfig(prev => ({ ...prev, nodeCount }));
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
          )}



          {/* 节点类别 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">节点类别（英文分号分隔）</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="概念;理论;方法"
              value={activeConfig.categories.join(';')}
              onChange={(e) => updateNodeCategories(e.target.value)}
            />
          </div>
        </div>

        {/* 连接配置 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            连接配置
          </h3>

          {/* 根据图类型显示或隐藏连接数量输入 */}
          {graphType === 'random' && (
            <>
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">连接数量</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max={randomConfig.nodeCount * (randomConfig.nodeCount - 1)}
                  value={randomConfig.edgeCount === 0 ? '' : randomConfig.edgeCount}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === '') {
                      setRandomConfig(prev => ({ ...prev, 'edgeCount': 0 }));
                      return;
                    }

                    const edgeCount = parseInt(value, 10) || 0;
                    setRandomConfig(prev => ({ ...prev, edgeCount }));
                  }}
                />
              </div>

              {/* 连通分支数量 */}
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">连通分支数量（0表示不限制）</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max={randomConfig.nodeCount}
                  value={randomConfig.connectedComponentsCount === 0 ? '' : randomConfig.connectedComponentsCount}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === '') {
                      setRandomConfig(prev => ({ ...prev, 'connectedComponentsCount': 0 }));
                      return;
                    }

                    const connectedComponentsCount = parseInt(value, 10) || 0;
                    setRandomConfig(prev => ({ ...prev, connectedComponentsCount }));
                  }}
                />
              </div>
            </>
          )}



          {/* 连接类别 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">连接类别（英文分号分隔）</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="包含;相关"
              value={activeConfig.edgeCategories.join(';')}
              onChange={(e) => updateEdgeCategories(e.target.value)}
            />
          </div>

          {/* 连接权重范围 */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">权重最小值</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="100"
                value={activeConfig.weightRange[0]}
                onChange={(e) => {
                  const min = parseInt(e.target.value, 10) || 1;
                  const newRange: [number, number] = [min, Math.max(min, activeConfig.weightRange[1])];
                  switch (graphType) {
                    case 'random':
                      setRandomConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'chain':
                      setChainConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'cycle':
                      setCycleConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'tree':
                      setTreeConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'star':
                      setStarConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'grid':
                      setGridConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">权重最大值</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="100"
                value={activeConfig.weightRange[1]}
                onChange={(e) => {
                  const max = parseInt(e.target.value, 10) || 1;
                  const newRange: [number, number] = [Math.min(max, activeConfig.weightRange[0]), max];
                  switch (graphType) {
                    case 'random':
                      setRandomConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'chain':
                      setChainConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'cycle':
                      setCycleConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'tree':
                      setTreeConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'star':
                      setStarConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    case 'grid':
                      setGridConfig(prev => ({ ...prev, 'weightRange': newRange }));
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
          </div>

          {/* 连接线样式 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">连接线样式</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={activeConfig.curveType}
              onChange={(e) => {
                const curveType = e.target.value as 'default' | 'smoothstep' | 'straight' | 'simplebezier';
                switch (graphType) {
                  case 'random':
                    setRandomConfig(prev => ({ ...prev, curveType }));
                    break;
                  case 'chain':
                    setChainConfig(prev => ({ ...prev, curveType }));
                    break;
                  case 'cycle':
                    setCycleConfig(prev => ({ ...prev, curveType }));
                    break;
                  case 'tree':
                    setTreeConfig(prev => ({ ...prev, curveType }));
                    break;
                  case 'star':
                    setStarConfig(prev => ({ ...prev, curveType }));
                    break;
                  case 'grid':
                    setGridConfig(prev => ({ ...prev, curveType }));
                    break;
                  default:
                    break;
                }
              }}
            >
              <option value="default">贝塞尔曲线</option>
              <option value="smoothstep">平滑阶梯</option>
              <option value="straight">直线</option>
              <option value="simplebezier">简单贝塞尔</option>
            </select>
          </div>
        </div>

        {graphType === 'chain' && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              链状图配置
            </h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">方向</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={chainConfig.direction}
                onChange={(e) => {
                  const direction = e.target.value as 'horizontal' | 'vertical';
                  setChainConfig(prev => ({ ...prev, direction }));
                }}
              >
                <option value="horizontal">水平</option>
                <option value="vertical">垂直</option>
              </select>
            </div>
          </div>
        )}

        {/* 生成按钮 */}
        <div className="space-y-4">
          <button
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white ${generationProgress.active ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'}`}
            onClick={handleGenerateGraph}
            disabled={generationProgress.active}
          >
            {generationProgress.active ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path>
                </svg>
                生成图
              </>
            )}
          </button>
          {generationProgress.active && (
            <div className="mt-2 w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner border border-gray-200">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ 'width': `${generationProgress.progress}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphGenerationPanel;
