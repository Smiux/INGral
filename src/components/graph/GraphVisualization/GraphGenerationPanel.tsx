import React, { useState, useCallback } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './CustomEdge';

interface GraphGenerationPanelProps {
  onGenerate: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
}

// 图生成类型
type GraphType = 'random' | 'chain' | 'cycle' | 'tree' | 'star' | 'grid';

// 连接点生成模式
type HandleGenerationMode = 'range' | 'fixed' | 'list';

// 基础配置类型
type BaseGraphConfig = {
  categories: string[];
  handleMode: HandleGenerationMode;
  handleRange: [number, number];
  handleFixed: number;
  handleList: string;
  edgeCategories: string[];
  weightRange: [number, number];
  curveType: 'default' | 'smoothstep' | 'step' | 'straight' | 'simplebezier';
};

// 随机图配置
type RandomGraphConfig = BaseGraphConfig & {
  nodeCount: number;
  edgeCount: number;
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
 * 图谱生成面板组件
 */
export const GraphGenerationPanel: React.FC<GraphGenerationPanelProps> = ({
  onGenerate
}) => {
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
    'handleMode': 'range',
    'handleRange': [2, 8],
    'handleFixed': 4,
    'handleList': '2;4;6;8',
    'edgeCategories': ['包含', '相关'],
    'weightRange': [1, 10],
    'curveType': 'default'
  });

  // 随机图配置
  const [randomConfig, setRandomConfig] = useState<RandomGraphConfig>({
    ...getBaseConfig(),
    'nodeCount': 50,
    'edgeCount': 150
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

  // 生成边ID
  const generateEdgeId = useCallback((sourceId: string, targetId: string, index: number) => {
    return `generated-edge-${sourceId}-${targetId}-${index}`;
  }, []);

  // 生成随机连接点数量
  const generateHandleCount = useCallback((mode: HandleGenerationMode, config: BaseGraphConfig): number => {
    switch (mode) {
      case 'range':
        const [min, max] = config.handleRange;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      case 'fixed':
        return config.handleFixed;
      case 'list':
        const list = config.handleList.split(';').map(Number)
          .filter(Number.isInteger);
        if (list.length === 0) {
          return 4;
        }
        const randomIndex = Math.floor(Math.random() * list.length);
        return list[randomIndex] || 4;
      default:
        return 4;
    }
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

  // 生成节点位置（随机）
  const generateRandomPosition = useCallback((_index: number, nodeCount: number) => {
    // 使用正态分布生成更均匀的随机位置
    const randomNormal = () => {
      let u = 0, v = 0;
      while (u === 0) {
        u = Math.random();
      }
      while (v === 0) {
        v = Math.random();
      }
      let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      // 放宽范围到[-4, 4]，增加分布的均匀性
      num = Math.max(-4, Math.min(4, num));
      return num;
    };

    // 计算分布范围，增大系数，让节点有更大的分布空间
    const spread = Math.sqrt(nodeCount) * 40;
    const centerX = 400;
    const centerY = 300;

    // 使用正态分布生成位置，节点会有更均匀的分布
    return {
      'x': centerX + randomNormal() * spread,
      'y': centerY + randomNormal() * spread
    };
  }, []);

  // 生成链状图
  const generateChainGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, edgeCategories, weightRange, curveType, direction } = chainConfig;

    // 生成节点
    for (let i = 0; i < nodeCount; i += 1) {
      // 智能连接点数量：链状图中大部分节点有2个连接点，第一个和最后一个节点有1个
      let handleCount;
      if (nodeCount === 1) {
        handleCount = 1;
      } else if (i === 0 || i === nodeCount - 1) {
        handleCount = 1;
      } else {
        handleCount = 2;
      }

      const category = generateNodeCategory(categories);
      const position = direction === 'horizontal'
        ? { 'x': i * 150, 'y': 200 }
        : { 'x': 200, 'y': i * 150 };

      // 根据链的方向和位置设置初始旋转角度，确保连接点位置合理
      // 水平链：中间节点不需要旋转，第一个节点旋转180度（连接点在右），最后一个节点不旋转（连接点在左）
      // 垂直链：中间节点旋转90度，第一个节点旋转180度（连接点在下），最后一个节点不旋转（连接点在上）
      let initialOuterAngle = 0;
      if (direction === 'horizontal') {
        if (i === 0) {
          // 第一个节点：右侧连接点（索引0）
          initialOuterAngle = 0;
        } else if (i === nodeCount - 1) {
          // 最后一个节点：左侧连接点（索引2）
          initialOuterAngle = 180;
        } else {
          // 中间节点：两侧连接点
          initialOuterAngle = 0;
        }
      } else {
        if (i === 0) {
          // 第一个节点：底部连接点（索引1）
          initialOuterAngle = 90;
        } else if (i === nodeCount - 1) {
          // 最后一个节点：顶部连接点（索引3）
          initialOuterAngle = 270;
        } else {
          // 中间节点：上下连接点
          initialOuterAngle = 90;
        }
      }

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        position,
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          handleCount,
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {
            'outerAngle': initialOuterAngle,
            'isSyncRotation': false
          },
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
            'content': `${category} ${i + 1}的内容`
          }
        }
      });
    }

    // 生成边
    for (let i = 0; i < nodeCount - 1; i += 1) {
      const sourceId = generateNodeId(i);
      const targetId = generateNodeId(i + 1);

      // 确保handle索引有效，根据方向使用正确的连接点
      const sourceNode = newNodes[i]!;
      const targetNode = newNodes[i + 1]!;

      let sourceHandleIndex: number;
      let targetHandleIndex: number;

      if (direction === 'horizontal') {
        // 水平链状图：右侧连接点（索引0）连接到左侧连接点（索引2）
        sourceHandleIndex = Math.min(0, (sourceNode.data.handleCount || 2) - 1);
        targetHandleIndex = Math.min(2, (targetNode.data.handleCount || 2) - 1);
      } else {
        // 垂直链状图：底部连接点（索引1）连接到顶部连接点（索引3）
        sourceHandleIndex = Math.min(1, (sourceNode.data.handleCount || 2) - 1);
        targetHandleIndex = Math.min(3, (targetNode.data.handleCount || 2) - 1);
      }

      newEdges.push({
        'id': generateEdgeId(sourceId, targetId, i),
        'type': 'custom',
        'source': sourceId,
        'target': targetId,
        'sourceHandle': `${sourceId}-handle-${sourceHandleIndex}`,
        'targetHandle': `${targetId}-handle-${targetHandleIndex}`,
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
      // 智能连接点数量：环状图中每个节点有2个连接点（连接前一个和后一个节点）
      const handleCount = nodeCount === 1 ? 1 : 2;
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

      // 为环状图节点设置初始旋转角度，确保连接点位置合理
      // 0度保证水平，第一个节点（顶部）旋转角度为0度
      // 每个节点逆时针递增旋转角度，使连接点指向相邻节点
      // 旋转角度 = (i / nodeCount) * 360度
      const initialOuterAngle = (i / nodeCount) * 360;

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        position,
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          handleCount,
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {
            'outerAngle': initialOuterAngle,
            'isSyncRotation': false
          },
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
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

      // 确保handle索引有效，使用正确的连接点索引
      // 每个节点使用右侧连接点（索引0）连接到下一个节点的左侧连接点（索引2）
      const sourceNode = newNodes[i]!;
      const targetNode = newNodes[targetIndex]!;
      const sourceHandleIndex = Math.min(0, (sourceNode.data.handleCount || 2) - 1);
      const targetHandleIndex = Math.min(2, (targetNode.data.handleCount || 2) - 1);

      newEdges.push({
        'id': generateEdgeId(sourceId, targetId, i),
        'type': 'custom',
        'source': sourceId,
        'target': targetId,
        'sourceHandle': `${sourceId}-handle-${sourceHandleIndex}`,
        'targetHandle': `${targetId}-handle-${targetHandleIndex}`,
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

    // 底部向上间距计算：预先计算每一层级的最大宽度
    // 1. 计算每一层级的最大节点数
    // 2. 从最深层开始，计算每一层级的总宽度
    // 3. 基于下一层级的总宽度计算当前层级的节点间距

    // 每层节点的固定宽度（像素）
    const nodeWidth = 100;
    // 节点间的最小间距（像素）
    const minNodeSpacing = 50;
    // 层级间的垂直间距（像素）
    const verticalSpacing = 300;

    // 计算每一层级的最大节点数（基于最大子节点数）
    // maxNodesPerLevel[depth] = 最大子节点数 ^ (maxDepth - depth)
    const maxNodesPerLevel: number[] = [];

    // 确保最大子节点数至少为1，避免无限大数值
    const safeMaxChildrenPerNode = Math.max(1, maxChildrenPerNode);

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      // 从根节点(0)到最深层(maxDepth)
      const exponent = maxDepth - depth;
      // 限制指数增长，防止数值过大导致无穷远
      let maxNodes = 0;
      if (exponent > 5) {
        // 当指数大于5时，使用线性增长代替指数增长，限制增长速度
        maxNodes = safeMaxChildrenPerNode * (exponent + 1);
      } else {
        maxNodes = Math.pow(safeMaxChildrenPerNode, exponent);
      }

      // 限制最大节点数，防止数值过大
      maxNodesPerLevel[depth] = Math.min(maxNodes, 500);
    }

    // 计算每一层级的总宽度
    // 从最深层开始，向上计算
    const levelWidths: number[] = [];

    for (let depth = maxDepth; depth >= 0; depth -= 1) {
      if (depth === maxDepth) {
        // 最深层：根据分支数调整间距
        const maxNodes = maxNodesPerLevel[depth]!;
        // 底层节点间距：根据分支数动态调整，确保足够的空间
        // 分支数越多，节点间间距越小，但总宽度更大
        const dynamicSpacing = Math.max(minNodeSpacing, 100 - safeMaxChildrenPerNode * 10);
        levelWidths[depth] = Math.min(maxNodes * (nodeWidth + dynamicSpacing) - dynamicSpacing, 8000);
      } else {
        // 非最深层：基于下一层的总宽度，但限制增长
        const childLevelWidth = levelWidths[depth + 1]!;
        const maxNodes = maxNodesPerLevel[depth]!;

        // 计算基础宽度
        let baseWidth = maxNodes * (childLevelWidth + minNodeSpacing) - minNodeSpacing;

        // 限制上层节点间距增长
        // 越往上的层级，增长系数越小
        const levelDiff = maxDepth - depth;
        let growthFactor = 1;

        if (levelDiff > 3) {
          // 向上三层级以上，限制增长
          growthFactor = 0.5;
        } else if (levelDiff > 2) {
          // 向上三层层级，适度限制
          growthFactor = 0.7;
        } else if (levelDiff > 1) {
          // 向上两层层级，轻微限制
          growthFactor = 0.9;
        }

        // 应用增长限制
        baseWidth *= growthFactor;

        // 限制总宽度，防止数值过大
        levelWidths[depth] = Math.min(baseWidth, 8000);
      }
    }

    // 递归生成树节点
    interface TreeNodeParams {
      parentId: string | null;
      currentDepth: number;
      position: { x: number; y: number };
      indexWrapper: { value: number };
    }

    const generateTreeNode = ({ parentId, currentDepth, position, indexWrapper }: TreeNodeParams) => {
      const currentIndex = indexWrapper.value;
      const nodeId = generateNodeId(currentIndex);
      indexWrapper.value += 1;

      // 智能连接点数量：根节点1个，内部节点2个，叶子节点1个
      let handleCount: number;
      if (currentDepth === 0) {
        // 根节点：只有1个连接点
        // 所有子节点都连接到这个连接点上
        handleCount = 1;
      } else if (currentDepth >= maxDepth) {
        // 叶子节点：只有1个连接点（连接父节点）
        handleCount = 1;
      } else {
        // 内部节点：2个连接点
        // 1个用于连接父节点（顶部），1个用于连接所有子节点（底部）
        // 所有子节点都连接到同一个连接点上，符合树结构特点
        handleCount = 2;
      }
      const category = generateNodeCategory(categories);
      const nextIndex = indexWrapper.value;

      // 为树图节点设置初始旋转角度，确保连接点位置合理
      // 根节点：使用底部连接点（索引1），旋转0度
      // 内部节点：使用顶部连接点（索引3）连接父节点，底部连接点（索引1）连接子节点，旋转0度
      // 叶子节点：使用顶部连接点（索引3），旋转180度
      let initialOuterAngle = 0;
      if (currentDepth === 0) {
        // 根节点：底部连接点（索引1）
        initialOuterAngle = 270;
      } else if (currentDepth >= maxDepth) {
        // 叶子节点：顶部连接点（索引3）
        initialOuterAngle = 90;
      } else {
        // 内部节点：上下连接点
        initialOuterAngle = 90;
      }

      newNodes.push({
        'id': nodeId,
        'type': 'custom',
        position,
        'data': {
          'title': `${category} ${nextIndex}`,
          category,
          handleCount,
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {
            'outerAngle': initialOuterAngle,
            'isSyncRotation': false
          },
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
            'content': `${category} ${nextIndex}的内容`
          }
        }
      });

      // 如果不是根节点，生成边
      if (parentId) {
        // 确保handle索引有效
        const parentNode = newNodes.find(node => node.id === parentId);
        const childNode = newNodes.find(node => node.id === nodeId);

        // 父节点连接点：使用底部连接点（索引1或最后一个连接点）
        const sourceHandleIndex = parentNode ? Math.min(1, (parentNode.data.handleCount || 2) - 1) : 1;
        // 子节点连接点：使用顶部连接点（索引0）
        const targetHandleIndex = childNode ? 0 : 0;

        newEdges.push({
          'id': generateEdgeId(parentId, nodeId, newEdges.length),
          'type': 'custom',
          'source': parentId,
          'target': nodeId,
          'sourceHandle': `${parentId}-handle-${sourceHandleIndex}`,
          'targetHandle': `${nodeId}-handle-${targetHandleIndex}`,
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

        // 底部向上间距计算：基于下一层级的总宽度
        const childLevelWidth = levelWidths[currentDepth + 1]!;

        // 根节点特殊处理：减少直接子节点的间距
        // 当currentDepth为0时，是根节点，对其子节点间距进行调整
        let adjustedChildLevelWidth = childLevelWidth;
        if (currentDepth === 0) {
          // 根节点直接子节点间距调整系数，根据子节点数量动态调整
          // 子节点数量越少，调整系数越大
          const rootSpacingFactor = Math.max(0.3, 1 - (childCount - 1) * 0.1);
          adjustedChildLevelWidth = childLevelWidth * rootSpacingFactor;
        }

        // 当前父节点的子节点总宽度 = 子节点数量 * (调整后的下一层级总宽度 + 节点间间距) - 节点间间距
        const totalChildWidth = childCount * (adjustedChildLevelWidth + minNodeSpacing) - minNodeSpacing;
        // 子节点起始位置：父节点位置 - 总宽度的一半
        const startX = position.x - totalChildWidth / 2;

        for (let i = 0; i < childCount; i += 1) {
          // 每个子节点的X位置：起始位置 + i * (调整后的下一层级总宽度 + 节点间间距) + 调整后的下一层级总宽度的一半
          const childX = startX + i * (adjustedChildLevelWidth + minNodeSpacing) + adjustedChildLevelWidth / 2;
          const childY = position.y + verticalSpacing;
          generateTreeNode({
            'parentId': nodeId,
            'currentDepth': currentDepth + 1,
            'position': { 'x': childX, 'y': childY },
            indexWrapper
          });
        }
      }
    };

    // 生成根节点
    // 根节点位置：水平居中
    const rootX = 400;
    const rootY = 100;
    const indexWrapper = { 'value': 0 };
    generateTreeNode({
      'parentId': null,
      'currentDepth': 0,
      'position': { 'x': rootX, 'y': rootY },
      indexWrapper
    });

    return { newNodes, newEdges };
  }, [treeConfig, generateNodeId, generateEdgeId, generateNodeCategory, generateEdgeCategory, generateEdgeWeight]);

  // 生成随机图
  const generateRandomGraph = useCallback(() => {
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge<CustomEdgeData>[] = [];
    const { nodeCount, categories, handleMode, edgeCategories, weightRange, curveType, edgeCount } = randomConfig;

    // 计算两个点之间的距离
    const calculateDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
      const dx = pos1.x - pos2.x;
      const dy = pos1.y - pos2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // 节点间最小距离（基于节点数量动态调整）
    // 进一步增大距离参数，确保节点间有足够视觉空间
    const minNodeDistance = Math.max(200, Math.sqrt(nodeCount) * 30);
    // 增加最大尝试次数，提高找到有效位置的概率
    const maxAttempts = 200;

    // 生成节点
    for (let i = 0; i < nodeCount; i += 1) {
      let position;
      let attempts = 0;
      let validPosition = false;

      // 尝试生成有效的节点位置
      while (!validPosition && attempts < maxAttempts) {
        // 生成新位置
        const newPosition = generateRandomPosition(i, nodeCount);
        validPosition = true;

        // 检查与所有已生成节点的距离
        for (const existingNode of newNodes) {
          const distance = calculateDistance(newPosition, existingNode.position);
          if (distance < minNodeDistance) {
            validPosition = false;
            break;
          }
        }

        if (validPosition) {
          position = newPosition;
          break;
        }

        attempts += 1;
      }

      // 如果尝试次数用尽，使用最后生成的位置，但确保与已有节点保持最小距离
      if (!validPosition && position) {
        for (const existingNode of newNodes) {
          const distance = calculateDistance(position, existingNode.position);
          if (distance < minNodeDistance) {
            // 调整位置，确保与现有节点保持最小距离
            const angle = Math.atan2(
              position.y - existingNode.position.y,
              position.x - existingNode.position.x
            );
            position.x = existingNode.position.x + Math.cos(angle) * minNodeDistance;
            position.y = existingNode.position.y + Math.sin(angle) * minNodeDistance;
          }
        }
      }

      // 如果没有生成位置，使用默认位置
      if (!position) {
        position = generateRandomPosition(i, nodeCount);
      }
      const handleCount = generateHandleCount(handleMode, randomConfig);
      const category = generateNodeCategory(categories);

      newNodes.push({
        'id': generateNodeId(i),
        'type': 'custom',
        position,
        'data': {
          'title': `${category} ${i + 1}`,
          category,
          handleCount,
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {
            'isSyncRotation': false
          },
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
            'content': `${category} ${i + 1}的内容`
          }
        }
      });
    }

    // 生成连接
    const existingEdges = new Set<string>();
    let currentEdgeCount = 0;

    while (currentEdgeCount < edgeCount && currentEdgeCount < nodeCount * (nodeCount - 1)) {
      const sourceIndex = Math.floor(Math.random() * nodeCount);
      const targetIndex = Math.floor(Math.random() * nodeCount);

      if (sourceIndex !== targetIndex) {
        const sourceId = generateNodeId(sourceIndex);
        const targetId = generateNodeId(targetIndex);
        const edgeKey = `${sourceId}-${targetId}`;
        const reverseEdgeKey = `${targetId}-${sourceId}`;

        if (!existingEdges.has(edgeKey) && !existingEdges.has(reverseEdgeKey)) {
          existingEdges.add(edgeKey);

          const sourceNode = newNodes[sourceIndex];
          const targetNode = newNodes[targetIndex];
          if (sourceNode && targetNode) {
            const sourceHandleCount = sourceNode.data.handleCount || 4;
            const targetHandleCount = targetNode.data.handleCount || 4;

            const sourceHandleIndex = Math.floor(Math.random() * sourceHandleCount);
            const targetHandleIndex = Math.floor(Math.random() * targetHandleCount);

            newEdges.push({
              'id': generateEdgeId(sourceId, targetId, currentEdgeCount),
              'type': 'custom',
              'source': sourceId,
              'target': targetId,
              'sourceHandle': `${sourceId}-handle-${sourceHandleIndex}`,
              'targetHandle': `${targetId}-handle-${targetHandleIndex}`,
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
          }
        }
      }
    }

    return { newNodes, newEdges };
  }, [randomConfig, generateNodeId, generateEdgeId, generateHandleCount, generateNodeCategory, generateEdgeCategory, generateEdgeWeight, generateRandomPosition]);

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

        // 每个节点固定4个连接点
        // 1个用于顶部连接，1个用于底部连接
        // 1个用于左侧连接，1个用于右侧连接
        // 这样可以确保网格的四个方向都可以扩展
        const handleCount = 4;

        const category = generateNodeCategory(categories);

        // 连接点索引顺序：0=右侧，1=底部，2=左侧，3=顶部
        const initialOuterAngle = 0;

        newNodes.push({
          'id': nodeId,
          'type': 'custom',
          'position': { 'x': col * 150, 'y': row * 150 },
          'data': {
            'title': `${category} ${index}`,
            category,
            handleCount,
            'handles': {
              'lockedHandles': {},
              'handleLabels': {}
            },
            'style': {
              'outerAngle': initialOuterAngle,
              'isSyncRotation': false
            },
            'metadata': {
              'createdAt': Date.now(),
              'updatedAt': Date.now(),
              'version': 1,
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

        // 使用正确的连接点：
        // 连接点索引顺序：0=右侧，1=底部，2=左侧，3=顶部
        // 左侧节点使用右侧连接点（索引0）
        // 右侧节点使用左侧连接点（索引2）
        const sourceHandleIndex = 0;
        const targetHandleIndex = 2;

        newEdges.push({
          'id': generateEdgeId(sourceId, targetId, newEdges.length),
          'type': 'custom',
          'source': sourceId,
          'target': targetId,
          'sourceHandle': `${sourceId}-handle-${sourceHandleIndex}`,
          'targetHandle': `${targetId}-handle-${targetHandleIndex}`,
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

        // 使用正确的连接点：
        // 连接点索引顺序：0=右侧，1=底部，2=左侧，3=顶部
        // 上方节点使用底部连接点（索引1）
        // 下方节点使用顶部连接点（索引3）
        const sourceHandleIndex = 1;
        const targetHandleIndex = 3;

        newEdges.push({
          'id': generateEdgeId(sourceId, targetId, newEdges.length),
          'type': 'custom',
          'source': sourceId,
          'target': targetId,
          'sourceHandle': `${sourceId}-handle-${sourceHandleIndex}`,
          'targetHandle': `${targetId}-handle-${targetHandleIndex}`,
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
    // 智能连接点分配：中心节点需要足够的连接点连接所有外围节点
    const centerNodeId = generateNodeId(0);
    const centerCategory = generateNodeCategory(categories);

    // 中心节点连接点数量 = 外围节点数量（每个外围节点连接到中心的一个连接点）
    const centerHandleCount = Math.max(1, nodeCount - 1);

    // 为中心节点设置初始旋转角度，确保连接点均匀分布
    newNodes.push({
      'id': centerNodeId,
      'type': 'custom',
      'position': { 'x': 400, 'y': 300 },
      'data': {
        'title': `${centerCategory} 中心`,
        'category': centerCategory,
        'handleCount': centerHandleCount,
        'handles': {
          'lockedHandles': {},
          'handleLabels': {}
        },
        'style': {
          'outerAngle': 0,
          'isSyncRotation': false
        },
        'metadata': {
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': `${centerCategory} 中心节点的内容`
        }
      }
    });

    // 生成外围节点
    for (let i = 1; i < nodeCount; i += 1) {
      // 动态计算半径，根据节点数量和节点大小确保节点间有足够距离
      // 估计节点大小
      const nodeSize = 100;
      // 节点间最小间隙
      const minGap = 50;
      const peripheralCount = nodeCount - 1;
      // 计算所需的最小半径：确保外围节点间有足够距离
      // 使用等边三角形边长公式：side = 2 * radius * sin(π/n)
      // 解出 radius = side / (2 * sin(π/n))
      const requiredSide = nodeSize + minGap;
      const minRadius = requiredSide / (2 * Math.sin(Math.PI / Math.max(1, peripheralCount)));
      // 设置基础半径，确保有足够空间，取最大值
      const radius = Math.max(250, minRadius * 1.5);

      const angle = (i / (nodeCount - 1)) * Math.PI * 2;
      const x = Math.cos(angle) * radius + 400;
      const y = Math.sin(angle) * radius + 300;

      const nodeId = generateNodeId(i);
      const category = generateNodeCategory(categories);

      // 智能连接点分配：外围节点只需要1个连接点（连接中心节点）
      const handleCount = 1;

      // 为星状图外围节点设置初始旋转角度，确保连接点指向中心节点
      // 根据用户要求：第一个节点旋转(π - π/(n-1))，然后递减到π，即转一圈
      // 转换为角度单位（用户要求的是弧度，这里转换为角度）
      // 第一个节点旋转角度：(π - π/peripheralCount) 弧度 = (180° - 180°/peripheralCount) 角度
      // 最后一个节点旋转角度：π 弧度 = 180°
      // 角度递减，确保连接点正确朝向中心
      const initialOuterAngle = (180 - 360 / peripheralCount) - (360 / peripheralCount) * (i - 1);

      newNodes.push({
        'id': nodeId,
        'type': 'custom',
        'position': { x, y },
        'data': {
          'title': `${category} ${i}`,
          category,
          handleCount,
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {
            'outerAngle': initialOuterAngle,
            'isSyncRotation': false
          },
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
            'content': `${category} ${i}的内容`
          }
        }
      });

      // 生成连接中心节点的边
      // 外围节点使用唯一的连接点（索引0）连接到中心节点
      const targetHandleIndex = 0;
      // 中心节点使用对应角度的连接点
      const centerHandleIndex = (i - 1) % centerHandleCount;

      newEdges.push({
        'id': generateEdgeId(centerNodeId, nodeId, i - 1),
        'type': 'custom',
        'source': centerNodeId,
        'target': nodeId,
        'sourceHandle': `${centerNodeId}-handle-${centerHandleIndex}`,
        'targetHandle': `${nodeId}-handle-${targetHandleIndex}`,
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
  const handleGenerateGraph = useCallback(() => {
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

    const { newNodes, newEdges } = result;
    const totalNodes = newNodes.length;
    const totalEdges = newEdges.length;

    // 优化1: 增大批次大小，动态调整
    const batchSize = Math.max(50, Math.min(200, Math.floor(totalNodes / 20)));
    // 优化2: 减小延迟时间
    const delay = 16;
    // 约60fps

    // 开始生成，更新进度状态
    setGenerationProgress({ 'active': true, 'stage': '生成中', 'progress': 0 });

    // 清空现有图
    onGenerate([], []);

    // 优化3: 使用requestAnimationFrame代替setTimeout，提高性能和流畅度
    const requestNextFrame = (callback: () => void) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
      }
      return setTimeout(callback, delay);
    };

    // 优化4: 并行处理节点和边
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

      // 优化5: 减少进度更新频率，避免频繁重渲染
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
  }, [graphType, generateChainGraph, generateCycleGraph, generateTreeGraph, generateStarGraph, generateGridGraph, generateRandomGraph, onGenerate, reactFlowInstance]);

  // 更新节点类别
  const updateNodeCategories = useCallback((value: string) => {
    const categories = value.split(';').filter(cat => cat.trim() !== '');

    // 根据当前图类型更新对应的配置
    switch (graphType) {
      case 'random':
        setRandomConfig(prev => ({ ...prev, categories }));
        break;
      case 'chain':
        setChainConfig(prev => ({ ...prev, categories }));
        break;
      case 'cycle':
        setCycleConfig(prev => ({ ...prev, categories }));
        break;
      case 'tree':
        setTreeConfig(prev => ({ ...prev, categories }));
        break;
      case 'star':
        setStarConfig(prev => ({ ...prev, categories }));
        break;
      case 'grid':
        setGridConfig(prev => ({ ...prev, categories }));
        break;
      default:
        break;
    }
  }, [graphType]);

  // 更新连接类别
  const updateEdgeCategories = useCallback((value: string) => {
    const edgeCategories = value.split(';').filter(cat => cat.trim() !== '');

    // 根据当前图类型更新对应的配置
    switch (graphType) {
      case 'random':
        setRandomConfig(prev => ({ ...prev, edgeCategories }));
        break;
      case 'chain':
        setChainConfig(prev => ({ ...prev, edgeCategories }));
        break;
      case 'cycle':
        setCycleConfig(prev => ({ ...prev, edgeCategories }));
        break;
      case 'tree':
        setTreeConfig(prev => ({ ...prev, edgeCategories }));
        break;
      case 'star':
        setStarConfig(prev => ({ ...prev, edgeCategories }));
        break;
      case 'grid':
        setGridConfig(prev => ({ ...prev, edgeCategories }));
        break;
      default:
        break;
    }
  }, [graphType]);

  return (
    <div className="w-128 bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-20">
      <div className="bg-white p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">图生成</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
        {/* 图类型选择 */}
        <div className="mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium mb-2 text-gray-700">图类型</h3>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as GraphType)}
          >
            <option value="random">随机图</option>
            <option value="chain">链状图</option>
            <option value="cycle">环状图</option>
            <option value="tree">随机树</option>
            <option value="star">星状图</option>
            <option value="grid">网格图</option>
          </select>
        </div>

        {/* 特定图类型的配置 */}
        {(graphType === 'tree' || graphType === 'grid') && (
          <div className="mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium mb-2 text-gray-700">
              {graphType === 'tree' ? '树图配置' : '网格图配置'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {graphType === 'tree' ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">最大深度</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="5"
                      // 优化：使用状态值直接绑定，允许为空
                      value={treeConfig.maxDepth === 0 ? '' : treeConfig.maxDepth}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
                        // 0是一个有效的数字，但我们在value属性中会将其转换为空字符串显示
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
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="4"
                      // 优化：使用状态值直接绑定，允许为空
                      value={treeConfig.minDepth === 0 ? '' : treeConfig.minDepth}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
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
                      className="w-full p-2 border border-gray-300 rounded-md"
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
                      className="w-full p-2 border border-gray-300 rounded-md"
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
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="1"
                        max="5"
                        // 优化：使用状态值直接绑定，允许为空
                        value={treeConfig.childrenCount === 0 ? '' : treeConfig.childrenCount}
                        onChange={(e) => {
                          // 优化：正确处理数字输入框的清空行为
                          const value = e.target.value;

                          // 当输入为空时，将状态设置为0表示空
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
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="1"
                          max="5"
                          // 优化：使用状态值直接绑定，允许为空
                          value={treeConfig.minChildrenPerNode === 0 ? '' : treeConfig.minChildrenPerNode}
                          onChange={(e) => {
                            // 优化：正确处理数字输入框的清空行为
                            const value = e.target.value;

                            // 当输入为空时，将状态设置为0表示空
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
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="1"
                          max="5"
                          // 优化：使用状态值直接绑定，允许为空
                          value={treeConfig.maxChildrenPerNode === 0 ? '' : treeConfig.maxChildrenPerNode}
                          onChange={(e) => {
                            // 优化：正确处理数字输入框的清空行为
                            const value = e.target.value;

                            // 当输入为空时，将状态设置为0表示空
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
                      // 优化：使用状态值直接绑定，允许为空
                      value={gridConfig.rows === 0 ? '' : gridConfig.rows}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
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
                      // 优化：使用状态值直接绑定，允许为空
                      value={gridConfig.cols === 0 ? '' : gridConfig.cols}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
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
        <div className="mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium mb-2 text-gray-700">节点配置</h3>

          {/* 根据图类型显示或隐藏节点数量输入 */}
          {(graphType !== 'tree' && graphType !== 'grid') && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">节点数量</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                min="2"
                max="500"
                // 优化：使用状态值直接绑定，允许为空
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
                  // 优化：正确处理数字输入框的清空行为
                  const value = e.target.value;

                  // 当输入为空时，将状态设置为0表示空
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

          {/* 对于树图和网格图，显示计算出的节点数 */}
          {graphType === 'tree' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">节点数量（自动计算）</label>
              <div className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                {/* 计算最小和最大可能的节点数量 */}
                {(() => {
                  if (treeConfig.branchingMode === 'fixed' && treeConfig.countMode === 'fixed') {
                    // 固定分叉且固定数量，节点数量确定
                    const nodeCount = 1 + treeConfig.childrenCount * (Math.pow(treeConfig.childrenCount, treeConfig.maxDepth) - 1) / (treeConfig.childrenCount - 1);
                    return `${Math.round(nodeCount)}（固定树，${treeConfig.maxDepth}层）`;
                  }
                  // 随机情况，显示范围
                  const minPerLevel = Math.pow(treeConfig.minChildrenPerNode, treeConfig.maxDepth);
                  const maxPerLevel = Math.pow(treeConfig.maxChildrenPerNode, treeConfig.maxDepth);
                  const minNodes = 1 + minPerLevel;
                  const maxNodes = 1 + maxPerLevel;
                  return `${Math.round(minNodes)}-${Math.round(maxNodes)}（随机树，${treeConfig.minDepth}-${treeConfig.maxDepth}层）`;
                })()}
              </div>
            </div>
          )}

          {graphType === 'grid' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">节点数量（自动计算）</label>
              <div className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                {gridConfig.rows * gridConfig.cols}（网格图，{gridConfig.rows}行 × {gridConfig.cols}列）
              </div>
            </div>
          )}

          {/* 节点类别 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">节点类别（英文分号分隔）</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="概念;理论;方法"
              value={activeConfig.categories.join(';')}
              onChange={(e) => updateNodeCategories(e.target.value)}
            />
          </div>

          {/* 连接点数量生成模式（仅随机图和星状图显示） */}
          {(graphType === 'random' || graphType === 'star') && (
            <>
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">连接点数量生成模式</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={activeConfig.handleMode}
                  onChange={(e) => {
                    const handleMode = e.target.value as HandleGenerationMode;
                    switch (graphType) {
                      case 'random':
                        setRandomConfig(prev => ({ ...prev, handleMode }));
                        break;
                      case 'star':
                        setStarConfig(prev => ({ ...prev, handleMode }));
                        break;
                      default:
                        break;
                    }
                  }}
                >
                  <option value="range">范围随机</option>
                  <option value="fixed">固定数量</option>
                  <option value="list">特定值列表</option>
                </select>
              </div>

              {/* 根据模式显示不同的配置项 */}
              {activeConfig.handleMode === 'range' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">最小值</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="20"
                      // 优化：使用状态值直接绑定，允许为空
                      value={activeConfig.handleRange[0] === 0 ? '' : activeConfig.handleRange[0]}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
                        if (value === '') {
                          const newRange: [number, number] = [0, activeConfig.handleRange[1]];
                          switch (graphType) {
                            case 'random':
                              setRandomConfig(prev => ({ ...prev, 'handleRange': newRange }));
                              break;
                            case 'star':
                              setStarConfig(prev => ({ ...prev, 'handleRange': newRange }));
                              break;
                            default:
                              break;
                          }
                          return;
                        }

                        const min = parseInt(value, 10) || 0;
                        const newRange: [number, number] = [min, Math.max(min, activeConfig.handleRange[1])];
                        switch (graphType) {
                          case 'random':
                            setRandomConfig(prev => ({ ...prev, 'handleRange': newRange }));
                            break;
                          case 'star':
                            setStarConfig(prev => ({ ...prev, 'handleRange': newRange }));
                            break;
                          default:
                            break;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">最大值</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                      max="20"
                      // 优化：使用状态值直接绑定，允许为空
                      value={activeConfig.handleRange[1] === 0 ? '' : activeConfig.handleRange[1]}
                      onChange={(e) => {
                        // 优化：正确处理数字输入框的清空行为
                        const value = e.target.value;

                        // 当输入为空时，将状态设置为0表示空
                        if (value === '') {
                          const newRange: [number, number] = [activeConfig.handleRange[0], 0];
                          switch (graphType) {
                            case 'random':
                              setRandomConfig(prev => ({ ...prev, 'handleRange': newRange }));
                              break;
                            case 'star':
                              setStarConfig(prev => ({ ...prev, 'handleRange': newRange }));
                              break;
                            default:
                              break;
                          }
                          return;
                        }

                        const max = parseInt(value, 10) || 0;
                        const newRange: [number, number] = [Math.min(max, activeConfig.handleRange[0]), max];
                        switch (graphType) {
                          case 'random':
                            setRandomConfig(prev => ({ ...prev, 'handleRange': newRange }));
                            break;
                          case 'star':
                            setStarConfig(prev => ({ ...prev, 'handleRange': newRange }));
                            break;
                          default:
                            break;
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {activeConfig.handleMode === 'fixed' && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">固定数量</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="1"
                    max="20"
                    // 优化：使用状态值直接绑定，允许为空
                    value={activeConfig.handleFixed === 0 ? '' : activeConfig.handleFixed}
                    onChange={(e) => {
                      // 优化：正确处理数字输入框的清空行为
                      const value = e.target.value;

                      // 当输入为空时，将状态设置为0表示空
                      if (value === '') {
                        const handleFixed = 0;
                        switch (graphType) {
                          case 'random':
                            setRandomConfig(prev => ({ ...prev, handleFixed }));
                            break;
                          case 'star':
                            setStarConfig(prev => ({ ...prev, handleFixed }));
                            break;
                          default:
                            break;
                        }
                        return;
                      }

                      const handleFixed = parseInt(value, 10) || 0;
                      switch (graphType) {
                        case 'random':
                          setRandomConfig(prev => ({ ...prev, handleFixed }));
                          break;
                        case 'star':
                          setStarConfig(prev => ({ ...prev, handleFixed }));
                          break;
                        default:
                          break;
                      }
                    }}
                  />
                </div>
              )}

              {activeConfig.handleMode === 'list' && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">特定值列表（英文分号分隔）</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="2;4;6;8"
                    value={activeConfig.handleList}
                    onChange={(e) => {
                      const handleList = e.target.value;
                      switch (graphType) {
                        case 'random':
                          setRandomConfig(prev => ({ ...prev, handleList }));
                          break;
                        case 'star':
                          setStarConfig(prev => ({ ...prev, handleList }));
                          break;
                        default:
                          break;
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 连接配置 */}
        <div className="mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium mb-2 text-gray-700">连接配置</h3>

          {/* 根据图类型显示或隐藏连接数量输入 */}
          {graphType === 'random' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">连接数量</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                min="0"
                max={randomConfig.nodeCount * (randomConfig.nodeCount - 1)}
                // 优化：使用状态值直接绑定，允许为空
                value={randomConfig.edgeCount === 0 ? '' : randomConfig.edgeCount}
                onChange={(e) => {
                  // 优化：正确处理数字输入框的清空行为
                  const value = e.target.value;

                  // 当输入为空时，将状态设置为0表示空
                  if (value === '') {
                    setRandomConfig(prev => ({ ...prev, 'edgeCount': 0 }));
                    return;
                  }

                  const edgeCount = parseInt(value, 10) || 0;
                  setRandomConfig(prev => ({ ...prev, edgeCount }));
                }}
              />
            </div>
          )}

          {/* 对于非随机图，显示计算出的连接数 */}
          {graphType !== 'random' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">连接数量（自动计算）</label>
              <div className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                {graphType === 'chain' && `${chainConfig.nodeCount - 1}（链状图）`}
                {graphType === 'cycle' && `${cycleConfig.nodeCount}（环状图）`}
                {graphType === 'tree' && (() => {
                  // 计算树图的连接数量
                  if (treeConfig.branchingMode === 'fixed' && treeConfig.countMode === 'fixed') {
                    // 固定分叉且固定数量，连接数量确定
                    const edgeCount = 1 + treeConfig.childrenCount * (Math.pow(treeConfig.childrenCount, treeConfig.maxDepth) - 1) / (treeConfig.childrenCount - 1) - 1;
                    return `${Math.round(edgeCount)}（固定树，${treeConfig.maxDepth}层）`;
                  }
                  // 随机情况，显示范围
                  const minPerLevel = Math.pow(treeConfig.minChildrenPerNode, treeConfig.maxDepth);
                  const maxPerLevel = Math.pow(treeConfig.maxChildrenPerNode, treeConfig.maxDepth);
                  const minEdges = 1 + minPerLevel - 1;
                  const maxEdges = 1 + maxPerLevel - 1;
                  return `${Math.round(minEdges)}-${Math.round(maxEdges)}（随机树，${treeConfig.minDepth}-${treeConfig.maxDepth}层）`;
                })()}
                {graphType === 'star' && `${starConfig.nodeCount - 1}（星状图）`}
                {graphType === 'grid' && `${gridConfig.rows * (gridConfig.cols - 1) + gridConfig.cols * (gridConfig.rows - 1)}（网格图）`}
              </div>
            </div>
          )}

          {/* 连接类别 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">连接类别（英文分号分隔）</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="包含;相关"
              value={activeConfig.edgeCategories.join(';')}
              onChange={(e) => updateEdgeCategories(e.target.value)}
            />
          </div>

          {/* 连接权重范围 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">权重最小值</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
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
                className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
              value={activeConfig.curveType}
              onChange={(e) => {
                const curveType = e.target.value as 'default' | 'smoothstep' | 'step' | 'straight' | 'simplebezier';
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
              <option value="step">阶梯</option>
              <option value="straight">直线</option>
              <option value="simplebezier">简单贝塞尔</option>
            </select>
          </div>
        </div>

        {graphType === 'chain' && (
          <div className="mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium mb-2 text-gray-700">链状图配置</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">方向</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
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
        <div className="mt-6">
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            onClick={handleGenerateGraph}
            disabled={generationProgress.active}
          >
            {generationProgress.active ? '生成中...' : '生成图'}
          </button>

          {/* 进度条 */}
          {generationProgress.active && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{generationProgress.stage}</span>
                <span>{generationProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ 'width': `${generationProgress.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphGenerationPanel;
