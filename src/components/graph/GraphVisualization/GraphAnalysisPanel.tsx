import React, { useState, useCallback, useMemo } from 'react';
import { useStore, useReactFlow, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

// 中心性结果类型
interface CentralityResult {
  nodeId: string;
  value: number;
  node: Node<CustomNodeData>;
}

// 中心性指标类型
interface CentralityMetrics {
  degree: CentralityResult[];
  betweenness: CentralityResult[];
  closeness: CentralityResult[];
  eigenvector: CentralityResult[];
}

// 路径结果类型
interface PathResult {
  path: Node<CustomNodeData>[];
  distance: number;
  weight?: number | undefined;
}

// 分析模式类型
type AnalysisMode = 'unweighted' | 'weighted';

/**
 * 图谱分析面板组件
 */
/* eslint-disable max-depth, no-continue, max-nested-callbacks, react-hooks/exhaustive-deps */
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

export const GraphAnalysisPanel: React.FC = () => {
  // 只获取节点的必要信息：id、position 和 data
  const nodes = useStore<Node<CustomNodeData>[]>((state) =>
    state.nodes.map((node) => ({
      'id': node.id,
      'position': node.position,
      'data': node.data
    })) as Node<CustomNodeData>[],
  nodesEqual
  );

  // 只获取边的必要信息：id、source、target 和 data
  const edges = useStore<Edge<CustomEdgeData>[]>((state) =>
    state.edges.map((edge) => ({
      'id': edge.id,
      'source': edge.source,
      'target': edge.target,
      'data': edge.data
    })) as Edge<CustomEdgeData>[],
  edgesEqual
  );

  // 使用useReactFlow获取实例
  const reactFlowInstance = useReactFlow();

  // 使用useMemo创建节点ID到节点的映射，提高查找效率
  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  // 专门用于路径查找算法的选择器 - 包含加权边信息
  const pathfindingData = useStore((state) => {
    // 只使用边的必要信息构建加权边映射
    const weightedEdges = new Map<string, Array<{ nodeId: string; weight: number }>>();

    state.edges.forEach(edge => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      // 确保weight始终是数字，默认为1
      const weight = typeof edge.data?.weight === 'number' ? edge.data.weight : 1;

      if (!weightedEdges.has(sourceId)) {
        weightedEdges.set(sourceId, []);
      }
      weightedEdges.get(sourceId)!.push({ 'nodeId': targetId, weight });
    });

    return { weightedEdges };
  });



  // 超粒度选择器：仅用于A*算法的启发式函数
  const astarHeuristicData = useStore((state) => {
    // 仅包含A*算法启发式函数所需的节点位置数据
    const nodePositions = new Map(state.nodes.map(node => [
      node.id,
      { 'x': node.position.x, 'y': node.position.y }
    ]));

    return { nodePositions };
  });

  // 为拓扑排序算法创建专门的选择器 - 只包含有向边信息
  const topologicalSortData = useStore((state) => {
    const directedIn = new Map<string, Set<string>>();
    const directedOut = new Map<string, Set<string>>();

    // 只使用边的必要信息构建有向边映射
    state.edges.forEach(edge => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);

      // 有向图入边
      if (!directedIn.has(targetId)) {
        directedIn.set(targetId, new Set());
      }
      directedIn.get(targetId)!.add(sourceId);

      // 有向图出边
      if (!directedOut.has(sourceId)) {
        directedOut.set(sourceId, new Set());
      }
      directedOut.get(sourceId)!.add(targetId);
    });

    return { directedIn, directedOut };
  });


  // 为全局最长路径算法创建专门的选择器 - 包含节点度数和边权重信息
  const globalPathData = useStore((state) => {
    // 计算每个节点的出度和入度
    const outDegreeMap = new Map<string, number>();
    const inDegreeMap = new Map<string, number>();
    const outEdgeWeightSumMap = new Map<string, number>();

    // 只使用边的必要信息计算度数和权重总和
    state.edges.forEach(edge => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      // 确保weight始终是数字，默认为1
      const weight = typeof edge.data?.weight === 'number' ? edge.data.weight : 1;

      // 出度
      outDegreeMap.set(sourceId, (outDegreeMap.get(sourceId) || 0) + 1);
      // 入度
      inDegreeMap.set(targetId, (inDegreeMap.get(targetId) || 0) + 1);
      // 出边权重总和
      outEdgeWeightSumMap.set(sourceId, (outEdgeWeightSumMap.get(sourceId) || 0) + weight);
    });

    // 确保所有节点都有度数记录
    state.nodes.forEach(node => {
      if (!outDegreeMap.has(node.id)) {
        outDegreeMap.set(node.id, 0);
      }
      if (!inDegreeMap.has(node.id)) {
        inDegreeMap.set(node.id, 0);
      }
      if (!outEdgeWeightSumMap.has(node.id)) {
        outEdgeWeightSumMap.set(node.id, 0);
      }
    });

    return { outDegreeMap, inDegreeMap, outEdgeWeightSumMap };
  });

  // 使用useStore创建边映射，直接从状态中构建，提高大型图的性能
  // 优化：只创建必要的边映射，避免不必要的计算
  const edgeMaps = useStore((state) => {
    const stateEdges = state.edges as Edge<CustomEdgeData>[];
    const directedOut = new Map<string, Set<string>>();
    const directedIn = new Map<string, Set<string>>();
    const weightedDirectedOut = new Map<string, Array<{ nodeId: string; weight: number }>>();
    const weightedDirectedIn = new Map<string, Array<{ nodeId: string; weight: number }>>();

    // 只构建必要的边映射，无向图映射通过其他映射动态计算
    stateEdges.forEach(edge => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      const weight = edge.data?.weight || 1;

      // 有向图出边
      if (!directedOut.has(sourceId)) {
        directedOut.set(sourceId, new Set());
      }
      directedOut.get(sourceId)!.add(targetId);

      // 有向图入边
      if (!directedIn.has(targetId)) {
        directedIn.set(targetId, new Set());
      }
      directedIn.get(targetId)!.add(sourceId);

      // 加权有向图出边
      if (!weightedDirectedOut.has(sourceId)) {
        weightedDirectedOut.set(sourceId, []);
      }
      weightedDirectedOut.get(sourceId)!.push({ 'nodeId': targetId, weight });

      // 加权有向图入边
      if (!weightedDirectedIn.has(targetId)) {
        weightedDirectedIn.set(targetId, []);
      }
      weightedDirectedIn.get(targetId)!.push({ 'nodeId': sourceId, weight });
    });

    return {
      directedOut,
      directedIn,
      weightedDirectedOut,
      weightedDirectedIn
    };
  });

  // === 分析相关状态 ===
  const [centralityMetrics, setCentralityMetrics] = useState<CentralityMetrics | null>(null);
  const [centralityMetricsWeighted, setCentralityMetricsWeighted] = useState<CentralityMetrics | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathResultWeighted, setPathResultWeighted] = useState<PathResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPathHighlighted, setIsPathHighlighted] = useState(false);
  // 路径类型：shortest - 最短路径，longest - 最长路径，global - 全局最长路径
  const [pathType, setPathType] = useState<'shortest' | 'longest' | 'global'>('shortest');
  // 分析模式：unweighted - 无权重，weighted - 有权重
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('unweighted');
  // 帮助模态显示状态
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  // 用于跟踪上一次的节点和连接状态，以检测实质性变化
  const [prevGraphState, setPrevGraphState] = useState<{
    nodeCount: number;
    edgeCount: number;
    edgeHashes: string[];
  }>({
    'nodeCount': nodes.length,
    'edgeCount': edges.length,
    'edgeHashes': edges.map(edge => `${edge.source}-${edge.target}-${edge.data?.weight}-${edge.data?.type}`)
  });

  // 路径结果缓存，用于避免重复计算相同路径查询
  // 缓存大小限制为50个结果，避免内存占用过大
  const PATH_CACHE_SIZE = 50;
  const [pathResultCache, setPathResultCache] = useState<Map<string, PathResult>>(new Map());

  // 生成缓存键
  const getCacheKey = useCallback((type: 'shortest' | 'longest' | 'global', mode: AnalysisMode, source: string, target: string) => {
    return `${type}-${mode}-${source}-${target}`;
  }, []);

  // 更新缓存的辅助函数，包含大小限制
  const updateCache = useCallback((cacheKey: string, result: PathResult) => {
    setPathResultCache(prev => {
      const newCache = new Map(prev);

      // 如果缓存中已存在该键，先删除旧记录（确保新记录在最新位置）
      if (newCache.has(cacheKey)) {
        newCache.delete(cacheKey);
      }

      // 添加新记录
      newCache.set(cacheKey, result);

      // 如果缓存大小超过限制，删除最旧的记录
      if (newCache.size > PATH_CACHE_SIZE) {
        // 获取最旧的键并删除
        const oldestKey = newCache.keys().next().value;
        if (oldestKey !== undefined) {
          newCache.delete(oldestKey);
        }
      }

      return newCache;
    });
  }, []);

  /**
   * 获取节点邻居 - 优化版，使用缓存的边映射
   * @param nodeId 节点ID
   * @param directed 是否考虑方向（true: 只返回出连接邻居，false: 返回所有邻居）
   * @param inverse 是否返回入连接邻居（仅在directed为true时生效）
   */
  const getNodeNeighbors = useCallback((nodeId: string, directed: boolean = false, inverse: boolean = false): string[] => {
    // 无向图情况：动态计算所有邻居（出边邻居 + 入边邻居）
    if (!directed) {
      const outNeighbors = edgeMaps.directedOut.get(nodeId) || new Set<string>();
      const inNeighbors = edgeMaps.directedIn.get(nodeId) || new Set<string>();
      // 合并并去重
      const allNeighbors = new Set<string>([...outNeighbors, ...inNeighbors]);
      return Array.from(allNeighbors);
    }

    // 有向图情况：使用edgeMaps
    let neighbors: string[] = [];
    if (inverse) {
      // 入连接邻居：使用缓存的有向入边映射
      neighbors = Array.from(edgeMaps.directedIn.get(nodeId) || []);
    } else {
      // 出连接邻居：使用缓存的有向出边映射
      neighbors = Array.from(edgeMaps.directedOut.get(nodeId) || []);
    }

    return neighbors;
  }, [edgeMaps]);

  /**
   * 获取带权重的节点邻居 - 优化版，使用缓存的边映射
   * @param nodeId 节点ID
   * @param directed 是否考虑方向
   * @param inverse 是否返回入连接邻居（仅在directed为true时生效）
   */
  const getWeightedNeighbors = useCallback((nodeId: string, directed: boolean = false, inverse: boolean = false): { nodeId: string; weight: number }[] => {
    // 有向图出边情况：使用专门的路径查找数据，更高效
    if (directed && !inverse) {
      return pathfindingData.weightedEdges.get(nodeId) || [];
    }

    // 有向图入边情况
    if (directed) {
      // 入连接邻居：使用缓存的加权有向入边映射
      return edgeMaps.weightedDirectedIn.get(nodeId) || [];
    }

    // 无向图情况：动态计算所有加权邻居（出边邻居 + 入边邻居）
    const outNeighbors = pathfindingData.weightedEdges.get(nodeId) || [];
    const inNeighbors = edgeMaps.weightedDirectedIn.get(nodeId) || [];

    // 合并邻居，注意：这里可能会有重复，需要去重
    const neighborMap = new Map<string, { nodeId: string; weight: number }>();

    // 添加出边邻居
    outNeighbors.forEach(neighbor => {
      neighborMap.set(neighbor.nodeId, neighbor);
    });

    // 添加入边邻居（如果不存在的话）
    inNeighbors.forEach(neighbor => {
      if (!neighborMap.has(neighbor.nodeId)) {
        neighborMap.set(neighbor.nodeId, neighbor);
      }
    });

    return Array.from(neighborMap.values());
  }, [edgeMaps, pathfindingData]);

  // 计算中心性指标的辅助函数

  /**
   * 计算度中心性
   */
  const calculateDegreeCentrality = useCallback(() => {
    const result: CentralityResult[] = [];

    for (const node of nodes) {
      // 使用 getNodeNeighbors 函数获取节点的邻居数量
      const degree = getNodeNeighbors(node.id, false).length;

      result.push({
        'nodeId': node.id,
        'value': degree,
        node
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  /**
   * 计算介数中心性 - 优化版
   */
  const calculateBetweennessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);

    // 节点数量，用于优化
    const nodeCount = nodeIds.length;
    if (nodeCount === 0) {
      return result;
    }

    // 对于大型图，只计算部分节点的介数中心性
    // 动态调整采样大小，根据图的大小
    const SAMPLE_SIZE = Math.min(15, Math.max(5, Math.floor(nodeCount * 0.1)));
    const sampledNodeIds = nodeCount > SAMPLE_SIZE
      ? nodeIds
        .map(id => ({ id, 'random': Math.random() }))
        .sort((a, b) => a.random - b.random)
        .slice(0, SAMPLE_SIZE)
        .map(item => item.id)
      : nodeIds;

    // 初始化介数为0
    const betweenness: Record<string, number> = {};
    for (const id of nodeIds) {
      betweenness[id] = 0;
    }

    // 对每个采样节点执行BFS
    for (const s of sampledNodeIds) {
      const stack: string[] = [];
      const predecessors: Record<string, string[]> = {};
      const distance: Record<string, number> = {};
      const sigma: Record<string, number> = {};
      const delta: Record<string, number> = {};

      // 初始化
      for (const id of nodeIds) {
        predecessors[id] = [];
        distance[id] = -1;
        sigma[id] = 0;
        delta[id] = 0;
      }

      distance[s] = 0;
      sigma[s] = 1;
      const bfsQueue: string[] = [s];

      // BFS
      let queueStart = 0;
      while (queueStart < bfsQueue.length) {
        const v = bfsQueue[queueStart];
        queueStart += 1;
        if (v === undefined) {
          continue;
        }
        stack.push(v);

        // 使用getNodeNeighbors获取邻居，避免使用邻接表
        const neighbors = getNodeNeighbors(v, false);

        for (const w of neighbors) {
          // 第一次访问
          if ((distance[w] as number) < 0) {
            bfsQueue.push(w);
            distance[w] = (distance[v] as number) + 1;
          }

          // 最短路径
          if ((distance[w] as number) === (distance[v] as number) + 1) {
            (sigma[w] as number) += (sigma[v] as number);
            if (predecessors[w]) {
              predecessors[w].push(v);
            }
          }
        }
      }

      // 累积介数
      while (stack.length > 0) {
        const w = stack.pop()!;
        const wPredecessors = predecessors[w] || [];
        for (const v of wPredecessors) {
          if (delta[v] !== undefined && sigma[v] !== undefined && sigma[w] !== undefined && delta[w] !== undefined) {
            delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
          }
        }
        if (w !== s && betweenness[w] !== undefined && delta[w] !== undefined) {
          betweenness[w] += delta[w];
        }
      }
    }

    // 如果是采样计算，对结果进行归一化
    if (sampledNodeIds.length < nodeCount) {
      const scaleFactor = nodeCount / sampledNodeIds.length;
      for (const id of nodeIds) {
        if (betweenness[id] !== undefined) {
          betweenness[id] *= scaleFactor;
        }
      }
    }

    // 转换为结果格式
    for (const id of nodeIds) {
      const node = nodeMap.get(id)!;
      result.push({
        'nodeId': id,
        'value': betweenness[id] || 0,
        node
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  /**
   * 计算接近中心性 - 优化版
   */
  const calculateClosenessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];

    const nodeCount = nodes.length;
    if (nodeCount === 0) {
      return result;
    }

    // 对于大型图，只计算部分节点的接近中心性
    const SAMPLE_SIZE = Math.min(20, nodeCount);
    const sampledNodes = nodeCount > SAMPLE_SIZE
      ? nodes.slice(0, SAMPLE_SIZE)
      : nodes;

    for (const node of sampledNodes) {
      // 使用BFS计算到所有其他节点的最短距离
      const distances: Record<string, number> = {};
      const bfsQueue: { nodeId: string; distance: number }[] = [{ 'nodeId': node.id, 'distance': 0 }];
      distances[node.id] = 0;

      // 优化：使用数组索引模拟队列，避免shift()操作的O(n)时间复杂度
      let queueStart = 0;
      while (queueStart < bfsQueue.length) {
        const { nodeId, distance } = bfsQueue[queueStart] as { nodeId: string; distance: number };
        queueStart += 1;

        // 使用getNodeNeighbors获取邻居，避免使用邻接表
        const neighbors = getNodeNeighbors(nodeId, false);

        for (const neighborId of neighbors) {
          if (!(neighborId in distances)) {
            distances[neighborId] = distance + 1;
            bfsQueue.push({ 'nodeId': neighborId, 'distance': distance + 1 });
          }
        }
      }

      // 计算平均距离
      const reachableNodes = Object.keys(distances).length;
      if (reachableNodes <= 1) {
        result.push({
          'nodeId': node.id,
          'value': 0,
          node
        });
      } else {
        const totalDistance = Object.values(distances).reduce((sum, d) => sum + d, 0);
        const closeness = (reachableNodes - 1) / totalDistance;

        result.push({
          'nodeId': node.id,
          'value': closeness,
          node
        });
      }
    }

    // 如果是采样计算，确保结果包含所有节点
    if (sampledNodes.length < nodeCount) {
      // 对于未采样的节点，使用默认值
      for (const node of nodes) {
        if (!result.some(item => item.nodeId === node.id)) {
          result.push({
            'nodeId': node.id,
            'value': 0,
            node
          });
        }
      }
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  /**
   * 计算特征向量中心性 - 优化版
   */
  const calculateEigenvectorCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);
    const n = nodeIds.length;

    if (n === 0) {
      return result;
    }

    // 初始化邻接矩阵（无权重版本，权重默认为1）
    const adjacencyMatrix: number[][] = Array.from({ 'length': n }, () => Array(n).fill(0));
    const idToIndex = new Map(nodeIds.map((id, index) => [id, index]));

    // 构建邻接矩阵（无权重版本，权重默认为1）
    // 使用edgeMaps的无向图邻居映射
    nodeIds.forEach((nodeId, sourceIndex) => {
      const neighbors = getNodeNeighbors(nodeId, false);
      neighbors.forEach(neighborId => {
        const targetIndex = idToIndex.get(neighborId);
        if (targetIndex !== undefined) {
          adjacencyMatrix[sourceIndex] = adjacencyMatrix[sourceIndex] || [];
          adjacencyMatrix[targetIndex] = adjacencyMatrix[targetIndex] || [];
          adjacencyMatrix[sourceIndex][targetIndex] = 1;
        }
      });
    });

    // 幂迭代法计算特征向量中心性 - 优化版
    let eigenvector = Array(n).fill(1 / Math.sqrt(n));
    const iterations = 50;
    const tolerance = 1e-5;

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const newEigenvector = Array(n).fill(0);

      // 优化矩阵乘法
      for (let j = 0; j < n; j += 1) {
        let sum = 0;
        const row = adjacencyMatrix[j] || [];
        for (let k = 0; k < n; k += 1) {
          sum += (row[k] || 0) * (eigenvector[k] || 0);
        }
        newEigenvector[j] = sum;
      }

      // 归一化
      const norm = Math.sqrt(newEigenvector.reduce((sum, v) => sum + v * v, 0));
      if (norm === 0) {
        break;
      }

      const normalized = newEigenvector.map(v => v / norm);

      // 检查收敛
      let diff = 0;
      for (let j = 0; j < n; j += 1) {
        diff += Math.abs((eigenvector[j] || 0) - (normalized[j] || 0));
        if (diff > tolerance) {
          break;
        }
      }

      if (diff < tolerance) {
        eigenvector = normalized;
        break;
      }

      eigenvector = normalized;
    }

    // 转换为结果格式
    for (let index = 0; index < nodeIds.length; index += 1) {
      const id = nodeIds[index];
      if (id) {
        const foundNode = nodes.find(nodeItem => nodeItem.id === id)!;
        result.push({
          'nodeId': id,
          'value': eigenvector[index] || 0,
          'node': foundNode
        });
      }
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  /**
   * 计算所有中心性指标
   */
  const calculateCentralityMetrics = useCallback(() => {
    setIsCalculating(true);

    setTimeout(() => {
      const degree = calculateDegreeCentrality();
      const betweenness = calculateBetweennessCentrality();
      const closeness = calculateClosenessCentrality();
      const eigenvector = calculateEigenvectorCentrality();

      setCentralityMetrics({
        degree,
        betweenness,
        closeness,
        eigenvector
      });
      setIsCalculating(false);
    }, 100);
  }, [calculateDegreeCentrality, calculateBetweennessCentrality, calculateClosenessCentrality, calculateEigenvectorCentrality]);

  /**
   * 高效队列实现，使用双向队列，shift和push操作的时间复杂度为O(1)
   */
  // 定义队列返回类型接口

  interface Queue<T> {
    push: (item: T) => void;
    shift: () => T | undefined;
    isEmpty: () => boolean;
    length: () => number;
  }


  // 高效队列实现，使用双向队列
  function queue<T> (): Queue<T> {
    const items: (T | undefined)[] = [];
    let head = 0;
    let tail = 0;

    const push = (item: T) => {
      items[tail] = item;
      tail += 1;
    };

    const shift = (): T | undefined => {
      if (head === tail) {
        return undefined;
      }
      const item = items[head];
      // 释放内存
      items[head] = undefined;
      head += 1;
      if (head > tail / 2) {
        items.splice(0, head);
        tail -= head;
        head = 0;
      }
      return item;
    };

    const isEmpty = (): boolean => {
      return head === tail;
    };

    const length = (): number => {
      return tail - head;
    };

    return { push, shift, isEmpty, length };
  }

  /**
   * 优先队列实现，使用二叉堆优化，push和pop操作的时间复杂度为O(log n)
   */
  // 定义优先队列返回类型

  interface PriorityQueueReturn {
    push: (distance: number, nodeId: string) => void;
    pop: () => { distance: number; nodeId: string } | undefined;
    isEmpty: () => boolean;
  }


  /**
   * 优先队列实现，使用二叉堆优化，push和pop操作的时间复杂度为O(log n)
   */
  const priorityQueue = function (): PriorityQueueReturn {
    // 最小堆实现，用于Dijkstra算法
    const heap: { distance: number; nodeId: string }[] = [];

    // 向上调整堆
    const heapifyUp = (index: number) => {
      if (index === 0) {
        return;
      }
      const parentIndex = Math.floor((index - 1) / 2);
      const current = heap[index];
      const parent = heap[parentIndex];
      if (current && parent && current.distance < parent.distance) {
        [heap[index], heap[parentIndex]] = [parent, current];
        heapifyUp(parentIndex);
      }
    };

    // 向下调整堆
    const heapifyDown = (index: number) => {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      const left = heap[leftChild];
      const right = heap[rightChild];
      const smallestNode = heap[smallest];

      if (leftChild < heap.length && left && smallestNode && left.distance < smallestNode.distance) {
        smallest = leftChild;
      }

      if (rightChild < heap.length && right && heap[smallest]) {
        const smallestItem = heap[smallest]!;
        if (right.distance < smallestItem.distance) {
          smallest = rightChild;
        }
      }

      if (smallest !== index) {
        // 使用类型断言确保赋值类型正确
        const temp = heap[index]!;
        heap[index] = heap[smallest]!;
        heap[smallest] = temp;
        heapifyDown(smallest);
      }
    };

    const push = (distance: number, nodeId: string) => {
      heap.push({ distance, nodeId });
      heapifyUp(heap.length - 1);
    };

    const pop = (): { distance: number; nodeId: string } | undefined => {
      if (heap.length === 0) {
        return undefined;
      }
      if (heap.length === 1) {
        return heap.pop();
      }

      const root = heap[0];
      heap[0] = heap.pop()!;
      heapifyDown(0);
      return root;
    };

    const isEmpty = (): boolean => {
      return heap.length === 0;
    };

    return { push, pop, isEmpty };
  };

  /**
   * 优先队列实现，用于分支限界法（最大堆）
   */
  const maxPriorityQueue = () => {
    // 最大堆实现，用于分支限界法，按当前路径长度+启发式值降序排序
    type HeapItem = {
      currentId: string;
      visited: Set<string>;
      currentPath: string[];
      currentDistance: number;
      heuristic: number;
      currentWeight?: number;
    };

    const heap: HeapItem[] = [];

    // 向上调整堆
    const heapifyUp = (index: number) => {
      if (index === 0) {
        return;
      }
      const parentIndex = Math.floor((index - 1) / 2);

      const current = heap[index];
      const parent = heap[parentIndex];

      if (current && parent) {
        const currentPriority = current.currentDistance + (current.heuristic || 0);
        const parentPriority = parent.currentDistance + (parent.heuristic || 0);
        if (currentPriority > parentPriority) {
          [heap[index], heap[parentIndex]] = [parent, current];
          heapifyUp(parentIndex);
        }
      }
    };

    // 向下调整堆
    const heapifyDown = (index: number) => {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      // 比较左子节点
      if (leftChild < heap.length) {
        const left = heap[leftChild];
        const largestNode = heap[largest];

        if (left && largestNode) {
          const leftPriority = left.currentDistance + (left.heuristic || 0);
          const largestPriority = largestNode.currentDistance + (largestNode.heuristic || 0);
          if (leftPriority > largestPriority) {
            largest = leftChild;
          }
        }
      }

      // 比较右子节点
      if (rightChild < heap.length) {
        const right = heap[rightChild];
        const largestNode = heap[largest];

        if (right && largestNode) {
          const rightPriority = right.currentDistance + (right.heuristic || 0);
          const largestPriority = largestNode.currentDistance + (largestNode.heuristic || 0);
          if (rightPriority > largestPriority) {
            largest = rightChild;
          }
        }
      }

      // 交换节点
      if (largest !== index) {
        // 使用类型断言确保赋值类型正确
        const temp = heap[index]!;
        heap[index] = heap[largest]!;
        heap[largest] = temp;
        heapifyDown(largest);
      }
    };

    const push = (item: HeapItem) => {
      heap.push(item);
      heapifyUp(heap.length - 1);
    };

    const pop = (): HeapItem | undefined => {
      if (heap.length === 0) {
        return undefined;
      }
      if (heap.length === 1) {
        return heap.pop();
      }

      const root = heap[0];
      const lastItem = heap.pop()!;
      heap[0] = lastItem;
      heapifyDown(0);
      return root;
    };

    const isEmpty = () => {
      return heap.length === 0;
    };

    return { push, pop, isEmpty };
  };

  /**
   * 计算加权介数中心性 - 优化版
   */

  const calculateWeightedBetweennessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);

    // 节点数量，用于优化
    const nodeCount = nodeIds.length;
    if (nodeCount === 0) {
      return result;
    }

    // 对于大型图，只计算部分节点的介数中心性
    const SAMPLE_SIZE = Math.min(20, nodeCount);
    const sampledNodeIds = nodeCount > SAMPLE_SIZE
      ? nodeIds.slice(0, SAMPLE_SIZE)
      : nodeIds;

    // 初始化介数为0
    const betweenness: Record<string, number> = {};
    for (const id of nodeIds) {
      betweenness[id] = 0;
    }

    // 对每个采样节点执行Dijkstra算法（考虑权重）
    for (const s of sampledNodeIds) {
      // 初始化距离和前驱
      const distances: Record<string, number> = {};
      const predecessors: Record<string, string[]> = {};
      const sigma: Record<string, number> = {};
      const delta: Record<string, number> = {};
      const visited = new Set<string>();
      const pq = priorityQueue();

      // 初始化
      for (const id of nodeIds) {
        distances[id] = Infinity;
        predecessors[id] = [];
        sigma[id] = 0;
        delta[id] = 0;
      }

      distances[s] = 0;
      sigma[s] = 1;
      pq.push(0, s);

      // Dijkstra算法计算最短路径
      while (!pq.isEmpty()) {
        const { 'distance': currentDistance, 'nodeId': v } = pq.pop()!;

        if (!visited.has(v)) {
          visited.add(v);

          // 获取加权邻居
          const weightedNeighbors = getWeightedNeighbors(v, false);

          for (const { 'nodeId': w, weight } of weightedNeighbors) {
            if (!visited.has(w)) {
              const newDistance = currentDistance + weight;
              if (newDistance < (distances[w] || Infinity)) {
                distances[w] = newDistance;
                pq.push(newDistance, w);
                predecessors[w] = [v];
                sigma[w] = sigma[v] || 0;
              } else if (newDistance === distances[w]) {
                const wPred = predecessors[w];
                if (wPred) {
                  wPred.push(v);
                  sigma[w] = (sigma[w] || 0) + (sigma[v] || 0);
                }
              }
            }
          }
        }
      }

      // 构建拓扑顺序（基于距离）
      const sortedNodes = [...nodeIds].sort((a, b) => (distances[b] || 0) - (distances[a] || 0));

      // 累积介数
      for (const w of sortedNodes) {
        if (w !== s && (distances[w] || Infinity) !== Infinity) {
          const wPredecessors = predecessors[w] || [];
          for (const v of wPredecessors) {
            if ((sigma[v] || 0) > 0 && (sigma[w] || 0) > 0) {
              const deltaContribution = ((sigma[v] || 0) / (sigma[w] || 1)) * (1 + (delta[w] || 0));
              delta[v] = (delta[v] || 0) + deltaContribution;
            }
          }

          if (w !== s) {
            betweenness[w] = (betweenness[w] || 0) + (delta[w] || 0);
          }
        }
      }
    }

    // 如果是采样计算，对结果进行归一化
    if (sampledNodeIds.length < nodeCount) {
      const scaleFactor = nodeCount / sampledNodeIds.length;
      for (const id of nodeIds) {
        betweenness[id] = (betweenness[id] || 0) * scaleFactor;
      }
    }

    // 转换为结果格式
    for (const id of nodeIds) {
      const node = nodes.find(n => n.id === id)!;
      result.push({
        'nodeId': id,
        'value': betweenness[id] ?? 0,
        node
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getWeightedNeighbors]);

  /**
   * 计算加权接近中心性 - 优化版
   */

  const calculateWeightedClosenessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];

    const nodeCount = nodes.length;
    if (nodeCount === 0) {
      return result;
    }

    // 对于大型图，只计算部分节点的接近中心性
    const SAMPLE_SIZE = Math.min(20, nodeCount);
    const sampledNodes = nodeCount > SAMPLE_SIZE
      ? nodes.slice(0, SAMPLE_SIZE)
      : nodes;

    for (const node of sampledNodes) {
      // 使用Dijkstra算法计算到所有其他节点的最短加权距离
      const distances: Record<string, number> = {};
      const visited = new Set<string>();
      const pq = priorityQueue();

      // 初始化
      for (const n of nodes) {
        distances[n.id] = Infinity;
      }
      distances[node.id] = 0;
      pq.push(0, node.id);

      while (!pq.isEmpty()) {
        const { 'distance': currentDistance, 'nodeId': currentNodeId } = pq.pop()!;

        if (!visited.has(currentNodeId)) {
          visited.add(currentNodeId);

          // 获取加权邻居
          const weightedNeighbors = getWeightedNeighbors(currentNodeId, false);

          for (const { 'nodeId': neighborId, weight } of weightedNeighbors) {
            if (!visited.has(neighborId)) {
              const newDistance = currentDistance + weight;
              if (newDistance < (distances[neighborId] || Infinity)) {
                distances[neighborId] = newDistance;
                pq.push(newDistance, neighborId);
              }
            }
          }
        }
      }

      // 计算接近中心性
      const reachableNodes = Object.values(distances).filter(d => d < Infinity).length;
      if (reachableNodes <= 1) {
        result.push({
          'nodeId': node.id,
          'value': 0,
          node
        });
      } else {
        const totalDistance = Object.values(distances).reduce((sum, d) => sum + (d < Infinity ? d : 0), 0);
        const closeness = (reachableNodes - 1) / totalDistance;

        result.push({
          'nodeId': node.id,
          'value': closeness,
          node
        });
      }
    }

    // 如果是采样计算，确保结果包含所有节点
    if (sampledNodes.length < nodeCount) {
      // 对于未采样的节点，使用默认值
      for (const node of nodes) {
        if (!result.some(item => item.nodeId === node.id)) {
          result.push({
            'nodeId': node.id,
            'value': 0,
            node
          });
        }
      }
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getWeightedNeighbors]);

  /**
   * 计算加权特征向量中心性 - 优化版
   */

  const calculateWeightedEigenvectorCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);
    const n = nodeIds.length;

    if (n === 0) {
      return result;
    }

    // 初始化邻接矩阵（考虑权重）
    const adjacencyMatrix: number[][] = Array.from({ 'length': n }, () => Array(n).fill(0));
    const idToIndex = new Map(nodeIds.map((id, index) => [id, index]));

    // 构建加权邻接矩阵
    // 使用edgeMaps的加权无向图邻居映射
    nodeIds.forEach((nodeId, sourceIndex) => {
      const weightedNeighbors = getWeightedNeighbors(nodeId, false);
      weightedNeighbors.forEach(neighbor => {
        const targetIndex = idToIndex.get(neighbor.nodeId);
        if (targetIndex !== undefined) {
          adjacencyMatrix[sourceIndex] = adjacencyMatrix[sourceIndex] || [];
          adjacencyMatrix[targetIndex] = adjacencyMatrix[targetIndex] || [];
          adjacencyMatrix[sourceIndex][targetIndex] = neighbor.weight;
        }
      });
    });

    // 幂迭代法计算特征向量中心性
    let eigenvector = Array(n).fill(1 / Math.sqrt(n));
    // 迭代次数
    const iterations = 50;
    // 收敛条件
    const tolerance = 1e-5;

    for (let i = 0; i < iterations; i += 1) {
      const newEigenvector = Array(n).fill(0);

      // 优化矩阵乘法
      for (let j = 0; j < n; j += 1) {
        let sum = 0;
        const row = adjacencyMatrix[j] || [];
        for (let k = 0; k < n; k += 1) {
          sum += (row[k] || 0) * (eigenvector[k] || 0);
        }
        newEigenvector[j] = sum;
      }

      // 归一化
      const norm = Math.sqrt(newEigenvector.reduce((sum, v) => sum + v * v, 0));
      if (norm === 0) {
        break;
      }

      const normalized = newEigenvector.map(v => v / norm);

      // 检查收敛
      let diff = 0;
      for (let j = 0; j < n; j += 1) {
        diff += Math.abs((eigenvector[j] || 0) - (normalized[j] || 0));
        if (diff > tolerance) {
          break;
        }
      }

      if (diff < tolerance) {
        eigenvector = normalized;
        break;
      }

      eigenvector = normalized;
    }

    // 转换为结果格式
    for (let index = 0; index < nodeIds.length; index += 1) {
      const id = nodeIds[index];
      if (id) {
        const foundNode = nodes.find(nodeItem => nodeItem.id === id)!;
        result.push({
          'nodeId': id,
          'value': eigenvector[index] || 0,
          'node': foundNode
        });
      }
    }

    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getWeightedNeighbors]);

  /**
   * 计算所有加权中心性指标
   */
  const calculateWeightedCentralityMetrics = useCallback(() => {
    setIsCalculating(true);

    setTimeout(() => {
      // 对于加权图，度中心性是连接权重总和
      const weightedDegree = nodes.map(node => {
        const neighbors = getWeightedNeighbors(node.id, false);
        const totalWeight = neighbors.reduce((sum, neighbor) => sum + neighbor.weight, 0);

        return {
          'nodeId': node.id,
          'value': totalWeight,
          node
        };
      }).sort((a, b) => b.value - a.value);

      // 使用加权版本的中心性算法
      const betweenness = calculateWeightedBetweennessCentrality();
      const closeness = calculateWeightedClosenessCentrality();
      const eigenvector = calculateWeightedEigenvectorCentrality();

      setCentralityMetricsWeighted({
        'degree': weightedDegree,
        betweenness,
        closeness,
        eigenvector
      });
      setIsCalculating(false);
    }, 100);
  }, [nodes, getWeightedNeighbors, calculateWeightedBetweennessCentrality, calculateWeightedClosenessCentrality, calculateWeightedEigenvectorCentrality]);

  // 动态分析和实时同步功能
  React.useEffect(() => {
    // 计算当前图谱状态
    const currentGraphState = {
      'nodeCount': nodes.length,
      'edgeCount': edges.length,
      'edgeHashes': edges.map(edge => `${edge.source}-${edge.target}-${edge.data?.weight}-${edge.data?.type}`)
    };

    // 检查图谱是否发生实质性变化
    const hasSubstantialChange =
      currentGraphState.nodeCount !== prevGraphState.nodeCount ||
      currentGraphState.edgeCount !== prevGraphState.edgeCount ||
      JSON.stringify(currentGraphState.edgeHashes) !== JSON.stringify(prevGraphState.edgeHashes);

    if (hasSubstantialChange) {
      // 只有在图谱发生实质性变化时才触发重新计算

      // 更新上一次的图谱状态
      setPrevGraphState(currentGraphState);

      // 清除之前的计算结果
      setCentralityMetrics(null);
      setCentralityMetricsWeighted(null);
      setPathResult(null);
      setPathResultWeighted(null);
      // 清除路径缓存
      setPathResultCache(new Map());

      // 自动重新计算中心性指标（如果当前有分析结果的话）
      // 这里我们可以选择性地重新计算，或者等待用户手动触发
      // 为了避免频繁计算导致性能问题，我们可以添加防抖机制

      // 100ms防抖，避免频繁计算
      const timer = setTimeout(() => {
        // 自动重新计算中心性指标
        calculateCentralityMetrics();
        calculateWeightedCentralityMetrics();
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [nodes, edges, prevGraphState]);

  /**
   * 计算基础统计信息
   */
  // 辅助函数：计算节点度数
  const calculateNodeDegrees = useMemo(() => {
    return () => {
      const degrees: number[] = [];
      let totalDegree = 0;

      for (const node of nodes) {
        const degree = getNodeNeighbors(node.id, false).length;
        degrees.push(degree);
        totalDegree += degree;
      }

      return { degrees, totalDegree };
    };
  }, [nodes, getNodeNeighbors]);

  // 辅助函数：检查两个节点之间是否有连接
  const hasEdgeBetween = useCallback((node1Id: string, node2Id: string) => {
    // 使用getNodeNeighbors函数检查邻居关系
    const neighbors = getNodeNeighbors(node1Id, false);
    return neighbors.includes(node2Id);
  }, [getNodeNeighbors]);

  // 辅助函数：计算聚类系数
  const calculateClusteringCoefficient = useCallback(() => {
    let totalTriangles = 0;
    let totalPossibleTriangles = 0;

    for (const node of nodes) {
      const uniqueNeighbors = getNodeNeighbors(node.id);
      const k = uniqueNeighbors.length;

      if (k >= 2) {
        totalPossibleTriangles += k * (k - 1) / 2;
      }

      for (let i = 0; i < uniqueNeighbors.length; i += 1) {
        for (let j = i + 1; j < uniqueNeighbors.length; j += 1) {
          const neighbor1 = uniqueNeighbors[i];
          const neighbor2 = uniqueNeighbors[j];

          if (neighbor1 && neighbor2 && hasEdgeBetween(neighbor1, neighbor2)) {
            totalTriangles += 1;
          }
        }
      }
    }

    return totalPossibleTriangles > 0 ? totalTriangles / totalPossibleTriangles : 0;
  }, [nodes, hasEdgeBetween]);

  // 辅助函数：计算平均最短路径长度

  const calculateAverageShortestPath = useCallback((nodeCount: number) => {
    if (nodeCount <= 1) {
      return 0;
    }

    let totalPathLength = 0;
    let reachableNodePairs = 0;

    // 对每个节点执行BFS计算最短路径
    for (const sourceNode of nodes) {
      const distances: Record<string, number> = {};
      const q = queue<{ nodeId: string; distance: number }>();
      q.push({ 'nodeId': sourceNode.id, 'distance': 0 });
      distances[sourceNode.id] = 0;

      while (!q.isEmpty()) {
        const current = q.shift();
        if (!current) {
          break;
        }

        const { nodeId, distance } = current;
        const neighbors = getNodeNeighbors(nodeId, false);

        for (const neighborId of neighbors) {
          if (neighborId && !(neighborId in distances)) {
            distances[neighborId] = distance + 1;
            q.push({ 'nodeId': neighborId, 'distance': distance + 1 });
          }
        }
      }

      // 累加路径长度
      for (const [nodeId, distance] of Object.entries(distances)) {
        if (nodeId !== sourceNode.id) {
          totalPathLength += distance;
          reachableNodePairs += 1;
        }
      }
    }

    return reachableNodePairs > 0 ? totalPathLength / reachableNodePairs : 0;
  }, [nodes, getNodeNeighbors]);

  // 辅助函数：计算节点度分布
  const calculateDegreeDistribution = useCallback((degrees: number[]) => {
    const distribution: Record<number, number> = {};
    degrees.forEach(degree => {
      distribution[degree] = (distribution[degree] || 0) + 1;
    });
    return distribution;
  }, []);

  // 辅助函数：计算同配性
  const calculateAssortativity = useCallback((edgeCount: number, degrees: number[], averageDegree: number) => {
    if (edgeCount === 0) {
      return 0;
    }

    let numerator = 0;
    const avgDegree = averageDegree;

    // 计算每个节点的度数
    const nodeDegrees = new Map<string, number>();
    nodes.forEach((node, index) => {
      nodeDegrees.set(node.id, degrees[index] || 0);
    });

    // 遍历所有连接
    for (const edge of edges) {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      const sourceDegree = nodeDegrees.get(sourceId) || 0;
      const targetDegree = nodeDegrees.get(targetId) || 0;

      numerator += sourceDegree * targetDegree;
    }

    // 计算同配性
    numerator /= edgeCount;

    // 计算度数的方差
    let degreeVariance = 0;
    degrees.forEach(degree => {
      degreeVariance += Math.pow(degree - avgDegree, 2);
    });
    degreeVariance /= nodes.length;

    return degreeVariance > 0 ? (numerator - Math.pow(avgDegree, 2)) / degreeVariance : 0;
  }, [nodes, edges]);

  // 主计算函数 - 使用 useMemo 缓存结果，避免频繁计算
  const calculateGraphStats = useMemo(() => {
    return () => {
      const nodeCount = nodes.length;
      const edgeCount = edges.length;

      // 计算节点度
      const { degrees, totalDegree } = calculateNodeDegrees();
      const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

      // 计算网络密度
      const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
      const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

      // 计算聚类系数
      const clusteringCoefficient = calculateClusteringCoefficient();

      // 计算平均最短路径长度
      const averageShortestPath = calculateAverageShortestPath(nodeCount);

      // 计算节点度分布
      const degreeDistribution = calculateDegreeDistribution(degrees);

      // 计算同配性
      const assortativity = calculateAssortativity(edgeCount, degrees, averageDegree);

      return {
        nodeCount,
        edgeCount,
        averageDegree,
        density,
        clusteringCoefficient,
        averageShortestPath,
        degreeDistribution,
        assortativity
      };
    };
  }, [nodes, edges, getNodeNeighbors, calculateNodeDegrees, calculateClusteringCoefficient, calculateAverageShortestPath, calculateDegreeDistribution, calculateAssortativity]);

  /**
   * 计算连通分量
   */

  const calculateConnectedComponents = useCallback(() => {
    const visited = new Set<string>();
    const components: Node<CustomNodeData>[][] = [];

    // 使用组件级的nodeMap，无需重新创建

    // 辅助函数：BFS处理单个节点
    const processNodeBFS = (startNode: Node<CustomNodeData>) => {
      if (visited.has(startNode.id)) {
        return;
      }

      const q = queue<string>();
      q.push(startNode.id);
      const component: Node<CustomNodeData>[] = [];

      while (!q.isEmpty()) {
        const currentId = q.shift();
        if (!currentId) {
          break;
        }

        if (!visited.has(currentId)) {
          visited.add(currentId);

          const currentNode = nodeMap.get(currentId);
          if (currentNode) {
            component.push(currentNode);
          }

          // 获取邻居
          const neighbors = getNodeNeighbors(currentId, false);

          // 添加未访问的邻居到队列
          for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
              q.push(neighborId);
            }
          }
        }
      }

      components.push(component);
    };

    // BFS遍历找出所有连通分量
    nodes.forEach(node => processNodeBFS(node));

    return components;
  }, [nodes, getNodeNeighbors]);

  /**
   * 计算直径
   */

  const calculateDiameter = useCallback(() => {
    const components = calculateConnectedComponents();
    if (components.length === 0) {
      return 0;
    }

    // 找到最大连通分量
    const largestComponent = components.reduce((max, component) =>
      component.length > (max?.length || 0) ? component : max, components[0]
    );

    let diameter = 0;

    // 辅助函数：BFS计算单源最短路径并返回最大距离
    const bfsAndGetMaxDistance = (sourceNodeId: string) => {
      const distances: Record<string, number> = {};
      const q = queue<{ nodeId: string; distance: number }>();
      q.push({ 'nodeId': sourceNodeId, 'distance': 0 });
      distances[sourceNodeId] = 0;
      let maxDistance = 0;

      while (!q.isEmpty()) {
        const current = q.shift();
        if (!current) {
          break;
        }

        const { nodeId, distance } = current;

        // 获取邻居
        const neighbors = getNodeNeighbors(nodeId, false);

        // 遍历邻居
        for (const neighborId of neighbors) {
          if (neighborId && !(neighborId in distances)) {
            const neighborDistance = distance + 1;
            distances[neighborId] = neighborDistance;
            q.push({ 'nodeId': neighborId, 'distance': neighborDistance });

            // 更新当前BFS的最大距离
            if (neighborDistance > maxDistance) {
              maxDistance = neighborDistance;
            }
          }
        }
      }
      return maxDistance;
    };

    // 对最大连通分量中的每个节点计算BFS
    if (largestComponent) {
      for (const sourceNode of largestComponent) {
        const maxDistance = bfsAndGetMaxDistance(sourceNode.id);
        if (maxDistance > diameter) {
          diameter = maxDistance;
        }
      }
    }

    return diameter;
  }, [calculateConnectedComponents, getNodeNeighbors]);

  /**
   * A*算法的优先队列实现，支持基于f(n) = g(n) + h(n)的优先级排序
   */
  const aStarPriorityQueue = () => {
    // 最小堆实现，f(n) = g(n) + h(n)，其中g(n)是从起点到当前节点的距离，h(n)是启发式函数值
    type HeapItem = {
      nodeId: string;
      // 从起点到当前节点的实际距离
      g: number;
      // f(n) = g(n) + h(n)
      f: number;
    };

    const heap: HeapItem[] = [];

    // 向上调整堆
    const heapifyUp = (index: number) => {
      if (index === 0) {
        return;
      }
      const parentIndex = Math.floor((index - 1) / 2);
      const current = heap[index];
      const parent = heap[parentIndex];
      if (current && parent && current.f < parent.f) {
        [heap[index], heap[parentIndex]] = [parent, current];
        heapifyUp(parentIndex);
      }
    };

    // 向下调整堆
    const heapifyDown = (index: number) => {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      const left = heap[leftChild];
      const right = heap[rightChild];
      const smallestNode = heap[smallest];

      if (leftChild < heap.length && left && smallestNode && left.f < smallestNode.f) {
        smallest = leftChild;
      }

      if (rightChild < heap.length && right && heap[smallest]) {
        const smallestItem = heap[smallest]!;
        if (right.f < smallestItem.f) {
          smallest = rightChild;
        }
      }

      if (smallest !== index) {
        // 使用类型断言确保赋值类型正确
        const temp = heap[index]!;
        heap[index] = heap[smallest]!;
        heap[smallest] = temp;
        heapifyDown(smallest);
      }
    };

    const push = (nodeId: string, g: number, f: number) => {
      heap.push({ nodeId, g, f });
      heapifyUp(heap.length - 1);
    };

    const pop = () => {
      if (heap.length === 0) {
        return undefined;
      }
      if (heap.length === 1) {
        return heap.pop();
      }

      const root = heap[0];
      heap[0] = heap.pop()!;
      heapifyDown(0);
      return root;
    };

    const isEmpty = () => {
      return heap.length === 0;
    };

    return { push, pop, isEmpty };
  };

  /**
   * 使用A*算法寻找最短路径（无权重图），结合节点位置信息提高效率
   * 当没有位置信息时，回退到双向BFS算法
   */

  const findShortestPath = useCallback(() => {
    if (!selectedSource || !selectedTarget) {
      return;
    }

    // 验证源节点和目标节点是否存在
    const sourceNodeExists = nodes.some(node => node.id === selectedSource);
    const targetNodeExists = nodes.some(node => node.id === selectedTarget);

    if (!sourceNodeExists || !targetNodeExists) {
      setPathResult({
        'path': [],
        'distance': Infinity
      });
      setIsCalculating(false);
      setIsPathHighlighted(false);
      return;
    }

    // 如果源节点和目标节点相同，直接返回
    if (selectedSource === selectedTarget) {
      const node = nodeMap.get(selectedSource);
      const path = node ? [node] : [];
      setPathResult({
        path,
        'distance': 0
      });
      setIsCalculating(false);
      setIsPathHighlighted(false);
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      // 检查是否有节点位置信息
      const hasPositionInfo = nodes.every(node => node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number');

      if (hasPositionInfo) {
        // A*算法实现 (使用组件级的nodeMap)

        // 获取目标节点的位置
        const targetPos = astarHeuristicData.nodePositions.get(selectedTarget) || { 'x': 0, 'y': 0 };

        // 启发式函数：使用欧几里得距离作为启发式
        const heuristic = (nodeId: string) => {
          const currentPos = astarHeuristicData.nodePositions.get(nodeId) || { 'x': 0, 'y': 0 };
          const dx = currentPos.x - targetPos.x;
          const dy = currentPos.y - targetPos.y;
          return Math.sqrt(dx * dx + dy * dy);
        };

        // 初始化A*算法所需的数据结构
        const openSet = aStarPriorityQueue();
        const cameFrom = new Map<string, string>();
        const gScore = new Map<string, number>();
        const fScore = new Map<string, number>();

        // 初始化所有节点的gScore为无穷大，fScore为无穷大
        nodes.forEach(node => {
          gScore.set(node.id, Infinity);
          fScore.set(node.id, Infinity);
        });

        // 设置源节点的初始值
        gScore.set(selectedSource, 0);
        fScore.set(selectedSource, heuristic(selectedSource));
        openSet.push(selectedSource, 0, fScore.get(selectedSource)!);

        // A*算法主循环
        while (!openSet.isEmpty()) {
          const current = openSet.pop();
          if (!current) {
            break;
          }

          const { 'nodeId': currentId, 'g': currentG } = current;

          // 如果当前节点是目标节点，提前终止
          if (currentId === selectedTarget) {
            break;
          }

          // 获取当前节点的邻居
          const neighbors = getNodeNeighbors(currentId, true);

          for (const neighborId of neighbors) {
            // 无权重图中，边的权重为1
            const tentativeGScore = currentG + 1;

            // 如果找到更短的路径
            if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
              // 更新路径
              cameFrom.set(neighborId, currentId);
              gScore.set(neighborId, tentativeGScore);
              fScore.set(neighborId, tentativeGScore + heuristic(neighborId));

              // 将邻居节点加入开放集
              openSet.push(neighborId, tentativeGScore, fScore.get(neighborId)!);
            }
          }
        }

        // 构建路径
        const path: Node<CustomNodeData>[] = [];
        let currentId = selectedTarget;

        if (cameFrom.has(currentId) || currentId === selectedSource) {
          while (currentId) {
            path.unshift(nodeMap.get(currentId)!);
            if (currentId === selectedSource) {
              break;
            }
            currentId = cameFrom.get(currentId) || '';
          }
        }

        // 计算距离
        const distance = path.length > 0 ? path.length - 1 : Infinity;

        // 创建结果对象
        const result: PathResult = {
          path,
          distance
        };

        // 更新状态
        setPathResult(result);
        setIsCalculating(false);
        // 重置高亮状态
        setIsPathHighlighted(false);

        // 缓存结果
        const cacheKey = `${'shortest'}-${'unweighted'}-${selectedSource}-${selectedTarget}`;
        updateCache(cacheKey, result);

        return;
      }

      // 双向BFS算法实现（当没有位置信息时使用）
      // 双向BFS初始化
      const sourceQueue = queue<string>();
      const targetQueue = queue<string>();

      // 记录从源节点和目标节点访问的节点
      // 键：节点ID，值：前驱节点ID
      const sourceVisited = new Map<string, string>();
      // 键：节点ID，值：后继节点ID
      const targetVisited = new Map<string, string>();

      // 记录距离信息，用于计算总路径长度
      const sourceDistances = new Map<string, number>();
      const targetDistances = new Map<string, number>();

      sourceQueue.push(selectedSource);
      targetQueue.push(selectedTarget);

      sourceVisited.set(selectedSource, '');
      targetVisited.set(selectedTarget, '');

      sourceDistances.set(selectedSource, 0);
      targetDistances.set(selectedTarget, 0);

      // 相遇节点
      let meetNode = '';

      // 双向BFS遍历 - 基于层级的实现
      while (!sourceQueue.isEmpty() && !targetQueue.isEmpty() && !meetNode) {
        // 收集当前层级所有可能的相遇节点
        let potentialMeetNodes: string[] = [];

        // 处理当前源队列中的所有节点（当前层级）
        const sourceLevelSize = sourceQueue.length();
        for (let i = 0; i < sourceLevelSize; i += 1) {
          const currentId = sourceQueue.shift();
          if (currentId) {
            const currentDistance = sourceDistances.get(currentId) || 0;

            // 获取当前节点的所有邻居（考虑方向）
            const neighbors = getNodeNeighbors(currentId, true);

            for (const neighborId of neighbors) {
              if (!sourceVisited.has(neighborId)) {
                sourceVisited.set(neighborId, currentId);
                sourceQueue.push(neighborId);
                sourceDistances.set(neighborId, currentDistance + 1);

                // 检查是否与目标方向的搜索相遇
                if (targetVisited.has(neighborId)) {
                  potentialMeetNodes.push(neighborId);
                }
              }
            }
          }
        }

        // 检查是否找到相遇节点
        if (potentialMeetNodes.length > 0) {
          // 计算每个潜在相遇节点的总路径长度，选择最短的
          let minTotalDistance = Infinity;
          for (const nodeId of potentialMeetNodes) {
            const sourceDist = sourceDistances.get(nodeId) || 0;
            const targetDist = targetDistances.get(nodeId) || 0;
            const totalDistance = sourceDist + targetDist;

            if (totalDistance < minTotalDistance) {
              minTotalDistance = totalDistance;
              meetNode = nodeId;
            }
          }
          break;
        }

        // 重置潜在相遇节点列表
        potentialMeetNodes = [];

        // 处理当前目标队列中的所有节点（当前层级）
        const targetLevelSize = targetQueue.length();
        for (let i = 0; i < targetLevelSize; i += 1) {
          const currentId = targetQueue.shift();
          if (currentId) {
            const currentDistance = targetDistances.get(currentId) || 0;

            // 获取当前节点的所有入边邻居（使用预计算的逆向邻接表）
            const inNeighbors = getNodeNeighbors(currentId, true, true);

            for (const neighborId of inNeighbors) {
              if (!targetVisited.has(neighborId)) {
                targetVisited.set(neighborId, currentId);
                targetQueue.push(neighborId);
                targetDistances.set(neighborId, currentDistance + 1);

                // 检查是否与源方向的搜索相遇
                if (sourceVisited.has(neighborId)) {
                  potentialMeetNodes.push(neighborId);
                }
              }
            }
          }
        }

        // 检查是否找到相遇节点
        if (potentialMeetNodes.length > 0) {
          // 计算每个潜在相遇节点的总路径长度，选择最短的
          let minTotalDistance = Infinity;
          for (const nodeId of potentialMeetNodes) {
            const sourceDist = sourceDistances.get(nodeId) || 0;
            const targetDist = targetDistances.get(nodeId) || 0;
            const totalDistance = sourceDist + targetDist;

            if (totalDistance < minTotalDistance) {
              minTotalDistance = totalDistance;
              meetNode = nodeId;
            }
          }
          break;
        }
      }

      // 构建路径
      const path: Node<CustomNodeData>[] = [];

      if (meetNode) {
        // 使用组件级的nodeMap，无需重新声明

        // 从源节点到相遇节点
        let currentId = meetNode;
        const sourcePath: string[] = [];
        while (currentId) {
          sourcePath.unshift(currentId);
          if (currentId === selectedSource) {
            break;
          }
          currentId = sourceVisited.get(currentId) || '';
        }

        // 从相遇节点到目标节点（不包含相遇节点，避免重复）
        currentId = targetVisited.get(meetNode) || '';
        const targetPath: string[] = [];
        while (currentId) {
          targetPath.push(currentId);
          if (currentId === selectedTarget) {
            break;
          }
          currentId = targetVisited.get(currentId) || '';
        }

        // 验证路径完整性：确保源路径以selectedSource开始，目标路径以selectedTarget结束
        if (sourcePath.length > 0 && sourcePath[0] === selectedSource &&
            (targetPath.length === 0 || targetPath[targetPath.length - 1] === selectedTarget)) {
          // 合并路径
          const fullPath = [...sourcePath, ...targetPath];

          // 转换为节点对象
          fullPath.forEach(nodeId => {
            const node = nodeMap.get(nodeId);
            if (node) {
              path.push(node);
            }
          });
        }
      }

      // 计算距离
      const distance = path.length > 0 ? path.length - 1 : Infinity;

      // 创建结果对象
      const result: PathResult = {
        path,
        distance
      };

      // 更新状态
      setPathResult(result);
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);

      // 缓存结果
      const cacheKey = `${'shortest'}-${'unweighted'}-${selectedSource}-${selectedTarget}`;
      setPathResultCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, result);
        return newCache;
      });
    }, 100);
  }, [nodes, selectedSource, selectedTarget, getNodeNeighbors]);

  /**
   * 使用A*算法寻找最短路径（有权重图）- 优化版
   * 当没有位置信息时，回退到Dijkstra算法
   */
  const findWeightedShortestPath = useCallback(() => {
    if (!selectedSource || !selectedTarget) {
      return;
    }

    // 验证源节点和目标节点是否存在
    const sourceNodeExists = nodes.some(node => node.id === selectedSource);
    const targetNodeExists = nodes.some(node => node.id === selectedTarget);

    if (!sourceNodeExists || !targetNodeExists) {
      setPathResultWeighted({
        'path': [],
        'distance': Infinity,
        'weight': undefined
      });
      setIsCalculating(false);
      setIsPathHighlighted(false);
      return;
    }

    // 如果源节点和目标节点相同，直接返回
    if (selectedSource === selectedTarget) {
      const node = nodeMap.get(selectedSource);
      const path = node ? [node] : [];
      setPathResultWeighted({
        path,
        'distance': 0,
        'weight': 0
      });
      setIsCalculating(false);
      setIsPathHighlighted(false);
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      // 创建节点ID到节点的映射
      // 使用组件级的nodeMap，无需重新创建

      // 检查是否有节点位置信息
      const hasPositionInfo = nodes.every(node => node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number');

      if (hasPositionInfo) {
        // A*算法实现
        // 获取目标节点位置
        const targetPos = astarHeuristicData.nodePositions.get(selectedTarget) || { 'x': 0, 'y': 0 };

        // 启发式函数：使用欧几里得距离作为启发式，考虑边权重的影响
        // 为了确保启发式函数是可采纳的，我们需要将距离除以最大边权重
        // 这样可以确保启发式函数不会高估实际路径长度
        const maxEdgeWeight = Math.max(
          ...edges.map(edge => edge.data?.weight || 1),
          1
        );

        const heuristic = (nodeId: string) => {
          const currentPos = astarHeuristicData.nodePositions.get(nodeId) || { 'x': 0, 'y': 0 };
          const dx = currentPos.x - targetPos.x;
          const dy = currentPos.y - targetPos.y;
          // 欧几里得距离除以最大边权重，确保启发式函数是可采纳的
          return Math.sqrt(dx * dx + dy * dy) / maxEdgeWeight;
        };

        // 初始化A*算法所需的数据结构
        const openSet = aStarPriorityQueue();
        const cameFrom = new Map<string, string>();
        const gScore = new Map<string, number>();
        const fScore = new Map<string, number>();

        // 初始化所有节点的gScore为无穷大，fScore为无穷大
        nodes.forEach(node => {
          gScore.set(node.id, Infinity);
          fScore.set(node.id, Infinity);
        });

        // 设置源节点的初始值
        gScore.set(selectedSource, 0);
        fScore.set(selectedSource, heuristic(selectedSource));
        openSet.push(selectedSource, 0, fScore.get(selectedSource)!);

        // A*算法主循环
        while (!openSet.isEmpty()) {
          const current = openSet.pop();
          if (!current) {
            break;
          }

          const { 'nodeId': currentId, 'g': currentG } = current;

          // 如果当前节点是目标节点，提前终止
          if (currentId === selectedTarget) {
            break;
          }

          // 获取当前节点的所有邻居（带权重）
          const weightedNeighbors = getWeightedNeighbors(currentId, true);

          for (const { 'nodeId': neighborId, weight } of weightedNeighbors) {
            // 计算从源节点到邻居节点的临时gScore
            const tentativeGScore = currentG + weight;

            // 如果找到更短的路径
            if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
              // 更新路径
              cameFrom.set(neighborId, currentId);
              gScore.set(neighborId, tentativeGScore);
              fScore.set(neighborId, tentativeGScore + heuristic(neighborId));

              // 将邻居节点加入开放集
              openSet.push(neighborId, tentativeGScore, fScore.get(neighborId)!);
            }
          }
        }

        // 构建路径
        const path: Node<CustomNodeData>[] = [];
        const totalWeight = gScore.get(selectedTarget) || Infinity;

        if (totalWeight < Infinity) {
          // 从目标节点回溯到源节点
          let currentId = selectedTarget;
          const pathIds: string[] = [];

          // 收集路径ID
          while (currentId) {
            pathIds.unshift(currentId);

            if (currentId === selectedSource) {
              break;
            }

            currentId = cameFrom.get(currentId) || '';
          }

          // 验证路径完整性：确保路径从源节点开始
          if (pathIds.length > 0 && pathIds[0] === selectedSource) {
            // 转换为节点对象
            pathIds.forEach(nodeId => {
              const node = nodeMap.get(nodeId);
              if (node) {
                path.push(node);
              }
            });
          }
        }

        // 创建结果对象
        const result: PathResult = {
          path,
          'distance': path.length > 1 ? path.length - 1 : Infinity,
          'weight': totalWeight < Infinity ? totalWeight : undefined
        };

        // 更新状态
        setPathResultWeighted(result);
        setIsCalculating(false);
        // 重置高亮状态
        setIsPathHighlighted(false);

        // 缓存结果
        const cacheKey = `${'shortest'}-${'weighted'}-${selectedSource}-${selectedTarget}`;
        setPathResultCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, result);
          return newCache;
        });

        return;
      }

      // Dijkstra算法实现（当没有位置信息时使用）
      // 初始化距离映射，默认为无穷大
      const distances = new Map<string, number>();
      const predecessors = new Map<string, string>();
      const visited = new Set<string>();

      // 使用优先队列优化
      const pq = priorityQueue();

      // 设置源节点距离为0
      distances.set(selectedSource, 0);
      pq.push(0, selectedSource);

      // Dijkstra算法主循环 - 使用优先队列优化
      while (!pq.isEmpty()) {
        // 获取距离最小的节点
        const current = pq.pop();
        if (!current) {
          break;
        }

        const { 'distance': currentDistance, 'nodeId': currentId } = current;

        // 如果当前距离大于已知距离，跳过该节点
        const knownDistance = distances.get(currentId) || Infinity;
        if (currentDistance <= knownDistance) {
          // 标记当前节点为已访问
          visited.add(currentId);

          // 只有当当前节点不是目标节点时，才继续处理邻居
          if (currentId !== selectedTarget) {
            // 获取当前节点的所有邻居（带权重）
            const weightedNeighbors = getWeightedNeighbors(currentId, true);

            // 更新邻居节点的距离
            for (const { 'nodeId': neighborId, weight } of weightedNeighbors) {
              const newDistance = currentDistance + weight;
              const currentNeighborDistance = distances.get(neighborId) || Infinity;

              if (newDistance < currentNeighborDistance) {
                distances.set(neighborId, newDistance);
                predecessors.set(neighborId, currentId);
                pq.push(newDistance, neighborId);
              }
            }
          }
        }
      }

      // 构建路径
      const path: Node<CustomNodeData>[] = [];
      const totalWeight = distances.get(selectedTarget) || Infinity;

      // 检查目标节点是否可达
      if (totalWeight < Infinity) {
        // 从目标节点回溯到源节点
        let currentId = selectedTarget;
        const pathIds: string[] = [];

        // 收集路径ID
        while (currentId) {
          pathIds.unshift(currentId);

          if (currentId === selectedSource) {
            break;
          }

          currentId = predecessors.get(currentId) || '';
        }

        // 验证路径完整性：确保路径从源节点开始
        if (pathIds.length > 0 && pathIds[0] === selectedSource) {
          // 转换为节点对象
          pathIds.forEach(nodeId => {
            const node = nodeMap.get(nodeId);
            if (node) {
              path.push(node);
            }
          });
        }
      }

      // 创建结果对象
      const result: PathResult = {
        path,
        'distance': path.length > 1 ? path.length - 1 : Infinity,
        'weight': totalWeight < Infinity ? totalWeight : undefined
      };

      // 更新状态
      setPathResultWeighted(result);
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);

      // 缓存结果
      const cacheKey = `${'shortest'}-${'weighted'}-${selectedSource}-${selectedTarget}`;
      updateCache(cacheKey, result);
    }, 100);
  }, [nodes, edges, selectedSource, selectedTarget, getWeightedNeighbors]);

  /**
   * 检测图中是否有环
   */
  const hasCycle = useCallback(() => {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    // DFS函数，检测环
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      // 获取邻居
      const neighbors = getNodeNeighbors(nodeId, true);

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          if (dfs(neighborId)) {
            return true;
          }
        } else if (recStack.has(neighborId)) {
          // 发现环
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    // 检查所有节点
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }, [nodes, getNodeNeighbors]);

  /**
   * 拓扑排序算法，用于DAG的最长路径计算 - 优化版
   * 使用专门的topologicalSortData选择器，直接从状态中获取有向边信息
   */
  const topologicalSort = useCallback(() => {
    const visited = new Set<string>();
    const stack: string[] = [];
    const { directedIn } = topologicalSortData;

    // DFS函数，进行拓扑排序
    const dfs = (nodeId: string) => {
      visited.add(nodeId);

      // 直接从拓扑排序数据中获取入边邻居，避免重复计算
      const inNeighbors = directedIn.get(nodeId) || new Set<string>();

      for (const neighborId of inNeighbors) {
        if (!visited.has(neighborId)) {
          dfs(neighborId);
        }
      }

      stack.push(nodeId);
    };

    // 对所有未访问节点进行DFS
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    // 反转栈得到拓扑排序
    return stack.reverse();
  }, [nodes, topologicalSortData]);

  /**
   * 使用拓扑排序寻找最长路径（无权重图）- 优化版
   * 使用专门的topologicalSortData和branchAndBoundData选择器，提高性能
   */

  const findLongestPath = useCallback(() => {
    if (!selectedSource || !selectedTarget) {
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      // 节点ID到节点的映射
      // 使用组件级的nodeMap，无需重新创建
      let longestPath: string[] = [];
      let maxDistance = -1;

      // 超时机制：5秒后终止计算
      const TIMEOUT = 5000;
      let isTimeout = false;
      const startTime = Date.now();

      // 检查是否超时的辅助函数
      const checkTimeout = () => {
        if (Date.now() - startTime > TIMEOUT) {
          isTimeout = true;
        }
        return isTimeout;
      };

      // 检测图是否有环
      const graphHasCycle = hasCycle();
      const { directedOut } = topologicalSortData;

      if (!graphHasCycle) {
        // DAG情况：使用拓扑排序算法
        const topoOrder = topologicalSort();

        // 初始化距离数组
        const distances: Record<string, number> = {};
        const predecessors: Record<string, string> = {};

        // 初始化距离为-∞
        nodes.forEach(node => {
          distances[node.id] = -Infinity;
        });
        distances[selectedSource] = 0;

        // 按照拓扑顺序更新距离
        for (const nodeId of topoOrder) {
          if (checkTimeout()) {
            break;
          }

          const currentDistance = distances[nodeId] as number;
          if (currentDistance !== -Infinity) {
            // 直接从拓扑排序数据中获取出边邻居，避免重复计算
            const neighbors = directedOut.get(nodeId) || new Set<string>();
            neighbors.forEach(neighborId => {
              const neighborDistance = distances[neighborId] || -Infinity;
              if (neighborDistance < currentDistance + 1) {
                distances[neighborId] = currentDistance + 1;
                predecessors[neighborId] = nodeId;
              }
            });
          }
        }

        // 构建最长路径
        const targetDistance = distances[selectedTarget] as number;
        if (targetDistance !== -Infinity) {
          maxDistance = targetDistance;
          const path: string[] = [];
          let currentId = selectedTarget;

          while (currentId !== '') {
            path.unshift(currentId);
            if (currentId === selectedSource) {
              break;
            }
            currentId = predecessors[currentId] || '';
          }

          longestPath = path;
        }
      } else {
        // 有环图情况：使用分支限界法，比DFS更高效
        // 优化版：使用branchAndBoundData选择器，包含节点位置和边权重信息
        const { directedIn } = topologicalSortData;

        // 预计算每个节点到目标节点的最短路径长度，用于更精确的启发式函数
        // 这里使用BFS计算最短路径长度
        const shortestPathToTarget = new Map<string, number>();
        {
          const bfsQueue: string[] = [];
          const visited = new Set<string>();

          // 初始化目标节点的最短路径长度为0
          shortestPathToTarget.set(selectedTarget, 0);
          bfsQueue.push(selectedTarget);
          visited.add(selectedTarget);

          while (bfsQueue.length > 0 && !checkTimeout()) {
            const currentId: string = bfsQueue.shift()!;
            const currentDistance = shortestPathToTarget.get(currentId)!;

            // 直接从拓扑排序数据中获取入边邻居，避免重复计算
            const inNeighbors: Set<string> = directedIn.get(currentId) || new Set<string>();

            for (const neighborId of inNeighbors) {
              if (!visited.has(neighborId)) {
                visited.add(neighborId);
                shortestPathToTarget.set(neighborId, currentDistance + 1);
                bfsQueue.push(neighborId);
              }
            }
          }
        }

        // 预先计算每个节点的可达节点数缓存
        const reachableNodeCache: Map<string, Set<string>> = new Map();

        // 预先计算所有节点的可达节点
        const precomputeReachableNodes = () => {
          for (const node of nodes) {
            if (checkTimeout()) {
              return;
            }

            const reachable = new Set<string>();
            const bfsQueue = [node.id];
            reachable.add(node.id);

            while (bfsQueue.length > 0 && !checkTimeout()) {
              const currentId = bfsQueue.shift()!;
              // 直接从拓扑排序数据中获取出边邻居，避免重复计算
              const neighbors = directedOut.get(currentId) || new Set<string>();

              for (const neighborId of neighbors) {
                if (!reachable.has(neighborId)) {
                  reachable.add(neighborId);
                  bfsQueue.push(neighborId);
                }
              }
            }

            reachableNodeCache.set(node.id, reachable);
          }
        };

        // 预先计算可达节点
        precomputeReachableNodes();

        // 计算可达节点数量的辅助函数，使用缓存
        const getReachableNodeCount = (startId: string, visitedNodes: Set<string>): number => {
          // 获取当前节点的所有可达节点
          const allReachable = reachableNodeCache.get(startId) || new Set<string>();

          // 过滤掉已访问的节点
          let reachableCount = 0;
          for (const nodeId of allReachable) {
            if (!visitedNodes.has(nodeId)) {
              reachableCount += 1;
            }
          }

          return reachableCount;
        };

        // 计算节点的启发式值：使用更精确的上界，结合剩余节点数和当前节点到目标节点的最短路径
        const calculateHeuristic = (nodeId: string, visited: Set<string>): number => {
          const remainingNodes = nodes.length - visited.size;
          if (remainingNodes === 0) {
            return 0;
          }

          // 当前节点到目标节点的最短路径长度
          const shortestToTarget = shortestPathToTarget.get(nodeId) || remainingNodes;

          // 计算可达节点数量，用于更紧的上界
          const reachableCount = getReachableNodeCount(nodeId, visited);

          // 直接从拓扑排序数据中获取节点的出度和入度，避免重复计算
          const currentOutDegree = directedOut.get(nodeId)?.size || 0;
          const currentInDegree = directedIn.get(nodeId)?.size || 0;

          // 改进的调整因子：结合出度和入度，更准确地反映节点的重要性
          const degreeFactor = (currentOutDegree + currentInDegree) / 2;
          const adjustmentFactor = Math.min(1.2, 1 + degreeFactor / 10);

          // 启发式值 = max(0, min(可达节点数-1, 剩余节点数-最短路径长度+1)) * 调整因子
          // 这是一个更紧的上界，提高剪枝效果
          return Math.max(0, Math.min(reachableCount - 1, remainingNodes - shortestToTarget + 1)) * adjustmentFactor;
        };

        // 使用最大堆优先队列，按当前路径长度+启发式值降序排序
        const pq = maxPriorityQueue();

        // 状态缓存：避免重复处理相同的状态
        const stateCache = new Map<string, number>();
        const STATE_CACHE_SIZE = 500;

        // 初始化优先队列
        const initialVisited = new Set<string>([selectedSource]);
        const initialPath: string[] = [selectedSource];
        const initialDistance = 0;
        const initialHeuristic = calculateHeuristic(selectedSource, initialVisited);

        const initialStateKey = `${selectedSource}-${Array.from(initialVisited)
          .sort()
          .join(',')}`;
        stateCache.set(initialStateKey, Date.now());

        pq.push({
          'currentId': selectedSource,
          'visited': initialVisited,
          'currentPath': initialPath,
          'currentDistance': initialDistance,
          'heuristic': initialHeuristic
        });

        // 最大可能路径长度为节点数量-1（不允许重复节点）
        const maxPossibleDistance = nodes.length - 1;

        // 提前终止条件：当找到最大可能路径长度时
        let foundMaxPossible = false;

        while (!pq.isEmpty() && !checkTimeout() && !foundMaxPossible) {
          // 取出当前最有希望的路径
          const current = pq.pop();
          if (!current) {
            break;
          }

          const { currentId, visited, currentPath, currentDistance, heuristic } = current;

          // 如果当前节点是目标节点，检查路径长度
          if (currentId === selectedTarget) {
            if (currentDistance > maxDistance) {
              maxDistance = currentDistance;
              longestPath = [...currentPath];
            }
          } else {
            // 更严格的剪枝条件：当前路径长度 + 启发式值 > 已知最大路径长度
            const potentialMax = currentDistance + heuristic;
            if (potentialMax > maxDistance && currentDistance < maxPossibleDistance) {
              // 直接从拓扑排序数据中获取出边邻居，避免重复计算
              const neighbors = directedOut.get(currentId) || new Set<string>();

              // 预计算邻居的优先级，避免重复计算
              const neighborPriorities = new Map<string, { shortestToTarget: number; outDegree: number; inDegree: number }>();
              neighbors.forEach(neighborId => {
                const shortestToTarget = shortestPathToTarget.get(neighborId) || nodes.length;
                const outDegree = directedOut.get(neighborId)?.size || 0;
                const inDegree = directedIn.get(neighborId)?.size || 0;
                neighborPriorities.set(neighborId, { shortestToTarget, outDegree, inDegree });
              });

              // 遍历所有邻居，按优先级排序
              const sortedNeighbors = [...neighbors].sort((a, b) => {
                const aPriority = neighborPriorities.get(a)!;
                const bPriority = neighborPriorities.get(b)!;

                if (aPriority.shortestToTarget !== bPriority.shortestToTarget) {
                  return aPriority.shortestToTarget - bPriority.shortestToTarget;
                }
                if (aPriority.outDegree !== bPriority.outDegree) {
                  return bPriority.outDegree - aPriority.outDegree;
                }
                return bPriority.inDegree - aPriority.inDegree;
              });

              for (const neighborId of sortedNeighbors) {
                if (checkTimeout()) {
                  break;
                }

                // 不允许重复节点
                if (!visited.has(neighborId)) {
                  const newVisited = new Set(visited);
                  newVisited.add(neighborId);
                  const newPath = [...currentPath, neighborId];
                  const newDistance = currentDistance + 1;

                  // 生成状态键，用于缓存
                  const stateKey = `${neighborId}-${Array.from(newVisited)
                    .sort()
                    .join(',')}`;

                  // 检查状态是否已处理，避免重复计算
                  if (stateCache.has(stateKey)) {
                    stateCache.set(stateKey, Date.now());
                    continue;
                  }

                  // 当缓存大小超过限制时，删除最早的缓存项
                  if (stateCache.size >= STATE_CACHE_SIZE) {
                    let earliestKey: string | undefined;
                    let earliestTime = Infinity;
                    for (const [key, time] of stateCache.entries()) {
                      if (time < earliestTime) {
                        earliestTime = time;
                        earliestKey = key;
                      }
                    }
                    if (earliestKey) {
                      stateCache.delete(earliestKey);
                    }
                  }

                  // 添加新的缓存项
                  stateCache.set(stateKey, Date.now());

                  const newHeuristic = calculateHeuristic(neighborId, newVisited);

                  // 如果新路径有希望超过已知最大路径长度，加入优先队列
                  if (newDistance + newHeuristic > maxDistance) {
                    pq.push({
                      'currentId': neighborId,
                      'visited': newVisited,
                      'currentPath': newPath,
                      'currentDistance': newDistance,
                      'heuristic': newHeuristic
                    });
                  }

                  // 检查新路径是否到达目标节点
                  if (neighborId === selectedTarget && newDistance > maxDistance) {
                    maxDistance = newDistance;
                    longestPath = [...newPath];
                  }

                  // 检查是否找到最大可能路径长度
                  if (newDistance === maxPossibleDistance) {
                    foundMaxPossible = true;
                    break;
                  }
                }
              }
            }
          }
        }

        if (checkTimeout()) {
          console.warn('Longest path calculation timed out after 5 seconds');
        }
      }

      // 构建节点路径
      const path: Node<CustomNodeData>[] = longestPath.map(nodeId => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          throw new Error(`Node with id ${nodeId} not found`);
        }
        return node;
      });

      // 计算距离
      const distance = maxDistance === -1 ? Infinity : maxDistance;

      // 创建结果对象
      const result: PathResult = {
        path,
        distance
      };

      // 更新状态
      setPathResult(result);
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);

      // 缓存结果
      const cacheKey = `${'longest'}-${'unweighted'}-${selectedSource}-${selectedTarget}`;
      updateCache(cacheKey, result);
    }, 100);
  }, [nodes, selectedSource, selectedTarget, getNodeNeighbors, hasCycle, topologicalSort]);

  /**
   * 使用拓扑排序寻找最长路径（有权重图）- 优化版
   */
  const findWeightedLongestPath = useCallback(() => {
    if (!selectedSource || !selectedTarget) {
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      // 节点ID到节点的映射
      // 使用组件级的nodeMap，无需重新创建
      let longestPath: string[] = [];
      let maxWeight = -1;

      // 超时机制：5秒后终止计算
      const TIMEOUT = 5000;
      let isTimeout = false;
      const startTime = Date.now();

      // 检查是否超时的辅助函数
      const checkTimeout = () => {
        if (Date.now() - startTime > TIMEOUT) {
          isTimeout = true;
        }
        return isTimeout;
      };

      // 检测图是否有环
      const graphHasCycle = hasCycle();

      if (!graphHasCycle) {
        // DAG情况：使用拓扑排序算法
        const topoOrder = topologicalSort();

        // 初始化距离数组
        const distances: Record<string, number> = {};
        const predecessors: Record<string, string> = {};

        // 初始化距离为-∞
        nodes.forEach(node => {
          distances[node.id] = -Infinity;
        });
        distances[selectedSource] = 0;

        // 按照拓扑顺序更新距离
        for (const nodeId of topoOrder) {
          if (checkTimeout()) {
            break;
          }

          const currentDistance = distances[nodeId] as number;
          if (currentDistance !== -Infinity) {
            const neighbors = getWeightedNeighbors(nodeId, true);
            neighbors.forEach(({ 'nodeId': neighborId, weight }) => {
              const neighborDistance = distances[neighborId] || -Infinity;
              if (neighborDistance < currentDistance + weight) {
                distances[neighborId] = currentDistance + weight;
                predecessors[neighborId] = nodeId;
              }
            });
          }
        }

        // 构建最长路径
        const targetDistance = distances[selectedTarget] as number;
        if (targetDistance !== -Infinity) {
          maxWeight = targetDistance;
          const path: string[] = [];
          let currentId = selectedTarget;

          while (currentId !== '') {
            path.unshift(currentId);
            if (currentId === selectedSource) {
              break;
            }
            currentId = predecessors[currentId] || '';
          }

          longestPath = path;
        }
      } else {
        // 有环图情况：使用分支限界法，比DFS更高效
        // 预计算每个节点到目标节点的最短路径权重和，用于更精确的启发式函数
        // 这里使用Dijkstra算法的变种，计算最短路径权重和（因为我们需要最长路径）
        const shortestPathWeightToTarget = new Map<string, number>();
        {
          const pq = priorityQueue();
          const visited = new Set<string>();

          // 初始化所有节点的最短路径权重和为无穷大
          nodes.forEach(node => {
            shortestPathWeightToTarget.set(node.id, Infinity);
          });

          // 初始化目标节点的最短路径权重和为0
          shortestPathWeightToTarget.set(selectedTarget, 0);
          pq.push(0, selectedTarget);

          while (!pq.isEmpty() && !checkTimeout()) {
            const current = pq.pop();
            if (!current) {
              break;
            }

            const { 'distance': currentWeight, 'nodeId': currentId } = current;

            if (visited.has(currentId)) {
              continue;
            }
            visited.add(currentId);

            // 获取当前节点的入边邻居（反向Dijkstra）
            const inNeighbors = getWeightedNeighbors(currentId, true, true);

            for (const { 'nodeId': neighborId, weight } of inNeighbors) {
              if (!visited.has(neighborId)) {
                const newWeight = currentWeight + weight;
                const currentNeighborWeight = shortestPathWeightToTarget.get(neighborId) || Infinity;
                if (newWeight < currentNeighborWeight) {
                  shortestPathWeightToTarget.set(neighborId, newWeight);
                  pq.push(newWeight, neighborId);
                }
              }
            }
          }
        }

        // 预先计算每个节点的可达节点数缓存
        const reachableNodeCache: Map<string, Set<string>> = new Map();

        // 预先计算所有节点的可达节点
        const precomputeReachableNodes = () => {
          for (const node of nodes) {
            if (checkTimeout()) {
              return;
            }

            const reachable = new Set<string>();
            const bfsQueue = [node.id];
            reachable.add(node.id);

            while (bfsQueue.length > 0 && !checkTimeout()) {
              const currentId = bfsQueue.shift()!;
              const neighbors = getWeightedNeighbors(currentId, true);

              for (const { 'nodeId': neighborId } of neighbors) {
                if (!reachable.has(neighborId)) {
                  reachable.add(neighborId);
                  bfsQueue.push(neighborId);
                }
              }
            }

            reachableNodeCache.set(node.id, reachable);
          }
        };

        // 预先计算可达节点
        precomputeReachableNodes();

        // 计算可达节点数量的辅助函数，使用缓存
        const getReachableNodeCount = (startId: string, visitedNodes: Set<string>): number => {
          // 获取当前节点的所有可达节点
          const allReachable = reachableNodeCache.get(startId) || new Set<string>();

          // 过滤掉已访问的节点
          let reachableCount = 0;
          for (const nodeId of allReachable) {
            if (!visitedNodes.has(nodeId)) {
              reachableCount += 1;
            }
          }

          return reachableCount;
        };

        // 计算整个图的最大边权重（在循环外部预计算，避免重复计算）
        const maxEdgeWeight = Math.max(
          ...edges.map(edge => edge.data?.weight || 1),
          1
        );

        // 计算节点的启发式值：使用更精确的上界，结合剩余节点数、当前节点到目标节点的最短路径权重和以及边权重
        // 优化：在函数外部预计算maxEdgeWeight
        const calculateHeuristic = (nodeId: string, visited: Set<string>): number => {
          const remainingNodes = nodes.length - visited.size;
          if (remainingNodes === 0) {
            return 0;
          }

          // 当前节点到目标节点的最短路径权重和
          const shortestWeightToTarget = shortestPathWeightToTarget.get(nodeId) || (remainingNodes * maxEdgeWeight);

          // 使用getWeightedNeighbors获取节点的出边权重
          const outEdges = getWeightedNeighbors(nodeId, true);
          const currentMaxOutWeight = outEdges.length > 0
            ? Math.max(...outEdges.map(edge => edge.weight))
            : maxEdgeWeight;

          // 计算可达节点数量
          const reachableCount = getReachableNodeCount(nodeId, visited);

          // 使用更紧的上界：
          // 1. 可达节点数 * 最大边权重：确保只考虑实际可达的节点
          // 2. 减去最短路径权重和的调整项，使用更紧的上界
          // 3. 乘以一个调整因子，根据当前节点的出边权重调整
          const adjustmentFactor = Math.min(1.2, 1 + currentMaxOutWeight / maxEdgeWeight);

          // 启发式值 = max(0, (可达节点数 * 最大边权重 - shortestWeightToTarget * 0.5)) * 调整因子
          // 这是一个更紧的上界，提高剪枝效果
          return Math.max(0, (reachableCount * maxEdgeWeight - shortestWeightToTarget * 0.5)) * adjustmentFactor;
        };

        // 使用最大堆优先队列，按当前路径权重+启发式值降序排序
        const pq = maxPriorityQueue();

        // 状态缓存：避免重复处理相同的状态
        // 优化：使用Map存储状态键和插入时间，便于高效删除最早的缓存项
        const stateCache = new Map<string, number>();
        // 最大缓存大小，防止内存占用过大
        // 优化：调整缓存大小为500，减少内存占用
        const STATE_CACHE_SIZE = 500;

        // 初始化优先队列
        const initialVisited = new Set<string>([selectedSource]);
        const initialPath: string[] = [selectedSource];
        const initialWeight = 0;
        const initialHeuristic = calculateHeuristic(selectedSource, initialVisited);

        // 生成初始状态的唯一键
        const initialStateKey = `${selectedSource}-${Array.from(initialVisited).sort()
          .join(',')}`;
        stateCache.set(initialStateKey, Date.now());

        pq.push({
          'currentId': selectedSource,
          'visited': initialVisited,
          'currentPath': initialPath,
          'currentDistance': initialWeight,
          'currentWeight': initialWeight,
          'heuristic': initialHeuristic
        });

        // 最大可能路径长度为节点数量-1（不允许重复节点）
        const maxPossibleDistance = nodes.length - 1;

        // 提前终止条件：当找到最大可能路径长度时
        let foundMaxPossible = false;

        while (!pq.isEmpty() && !checkTimeout() && !foundMaxPossible) {
          // 取出当前最有希望的路径
          const current = pq.pop();
          if (!current) {
            break;
          }

          const { currentId, visited, currentPath, 'currentWeight': currentWeightOpt, 'currentDistance': currentDistOpt, heuristic } = current;
          // 确保currentWeight有值
          const currentWeight = currentWeightOpt ?? currentDistOpt ?? 0;

          // 如果当前节点是目标节点，检查路径权重
          if (currentId === selectedTarget) {
            if (currentWeight > maxWeight) {
              maxWeight = currentWeight;
              longestPath = [...currentPath];
            }
            continue;
          }

          // 如果当前路径权重加上启发式估算小于已知最大权重，剪枝该路径
          const potentialMax = currentWeight + heuristic;
          if (potentialMax > maxWeight && currentPath.length - 1 < maxPossibleDistance) {
            // 获取当前节点的所有邻居（带权重）
            const weightedNeighbors = getWeightedNeighbors(currentId, true);

            // 预计算邻居的优先级
            const neighborPriorities = new Map<string, { weight: number; shortestWeight: number }>();
            weightedNeighbors.forEach(neighbor => {
              const shortestWeight = shortestPathWeightToTarget.get(neighbor.nodeId) || Infinity;
              neighborPriorities.set(neighbor.nodeId, { 'weight': neighbor.weight, shortestWeight });
            });

            // 遍历所有邻居，按以下优先级排序：
            // 1. 邻居的权重降序
            // 2. 邻居到目标节点的最短路径权重和升序
            const sortedNeighbors = [...weightedNeighbors].sort((a, b) => {
              const aPriority = neighborPriorities.get(a.nodeId)!;
              const bPriority = neighborPriorities.get(b.nodeId)!;

              // 首先按权重降序排序
              if (bPriority.weight !== aPriority.weight) {
                return bPriority.weight - aPriority.weight;
              }
              // 然后按到目标节点的最短路径权重和升序排序
              return aPriority.shortestWeight - bPriority.shortestWeight;
            });

            for (const neighbor of sortedNeighbors) {
              if (!neighbor || checkTimeout()) {
                break;
              }

              const { 'nodeId': neighborId, weight } = neighbor;
              // 不允许重复节点
              if (!visited.has(neighborId)) {
                // 创建新的访问集合和路径
                const newVisited = new Set(visited);
                newVisited.add(neighborId);
                const newPath = [...currentPath, neighborId];
                const newWeight = (currentWeight ?? 0) + weight;

                // 生成状态键，用于缓存
                const stateKey = `${neighborId}-${Array.from(newVisited).sort()
                  .join(',')}`;

                // 检查状态是否已处理，避免重复计算
                if (stateCache.has(stateKey)) {
                  // 更新缓存项的时间戳，将其移到最近使用
                  stateCache.set(stateKey, Date.now());
                  continue;
                }

                // 当缓存大小超过限制时，删除最早的缓存项
                if (stateCache.size >= STATE_CACHE_SIZE) {
                  // 找到最早的缓存项并删除
                  let earliestKey: string | undefined;
                  let earliestTime = Infinity;
                  for (const [key, time] of stateCache.entries()) {
                    if (time < earliestTime) {
                      earliestTime = time;
                      earliestKey = key;
                    }
                  }
                  if (earliestKey) {
                    stateCache.delete(earliestKey);
                  }
                }

                // 添加新的缓存项
                stateCache.set(stateKey, Date.now());

                const newHeuristic = calculateHeuristic(neighborId, newVisited);

                // 如果新路径有希望超过已知最大权重，加入优先队列
                if (newWeight + newHeuristic > maxWeight) {
                  pq.push({
                    'currentId': neighborId,
                    'visited': newVisited,
                    'currentPath': newPath,
                    'currentDistance': newWeight,
                    'currentWeight': newWeight,
                    'heuristic': newHeuristic
                  });
                }

                // 检查新路径是否到达目标节点
                if (neighborId === selectedTarget && newWeight > maxWeight) {
                  maxWeight = newWeight;
                  longestPath = [...newPath];
                }

                // 检查是否找到最大可能路径长度
                if (newPath.length - 1 === maxPossibleDistance) {
                  foundMaxPossible = true;
                  break;
                }
              }
            }
          }
        }

        if (checkTimeout()) {
          console.warn('Longest path calculation timed out after 5 seconds');
        }
      }

      // 构建节点路径
      const path: Node<CustomNodeData>[] = longestPath.map(nodeId => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          throw new Error(`Node with id ${nodeId} not found`);
        }
        return node;
      });

      // 计算距离
      const distance = longestPath.length > 1 ? longestPath.length - 1 : Infinity;

      // 更新状态
      setPathResultWeighted({
        path,
        distance,
        'weight': maxWeight === -1 ? undefined : maxWeight
      });
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);
    }, 100);
  }, [nodes, edges, selectedSource, selectedTarget, getWeightedNeighbors, hasCycle, topologicalSort]);

  /**
   * 寻找全局最长路径（所有节点对之间的最长路径）- 优化版
   * 使用专门的globalPathData选择器，优化节点采样策略和启发式函数
   */

  const findGlobalLongestPath = useCallback(() => {
    setIsCalculating(true);

    setTimeout(() => {
      // 节点ID到节点的映射
      // 使用组件级的nodeMap，无需重新创建
      let globalLongestPath: string[] = [];
      let globalMaxDistance = -1;

      // 超时机制：5秒后终止计算
      const TIMEOUT = 5000;
      let isTimeout = false;
      const startTime = Date.now();

      // 检查是否超时的辅助函数
      const checkTimeout = () => {
        if (Date.now() - startTime > TIMEOUT) {
          isTimeout = true;
        }
        return isTimeout;
      };

      // 检测图是否有环
      const graphHasCycle = hasCycle();

      // 使用专门的选择器数据，避免重复计算
      const { directedOut } = topologicalSortData;
      const { outDegreeMap, inDegreeMap, outEdgeWeightSumMap } = globalPathData;

      // 邻居缓存，避免重复计算
      const neighborCache = new Map<string, string[]>();
      const getCachedNeighbors = (nodeId: string) => {
        if (!neighborCache.has(nodeId)) {
          // 直接从拓扑排序数据中获取出边邻居，避免重复计算
          neighborCache.set(nodeId, Array.from(directedOut.get(nodeId) || new Set<string>()));
        }
        return neighborCache.get(nodeId)!;
      };

      if (!graphHasCycle) {
        // DAG情况：使用拓扑排序算法，优化版
        const topoOrder = topologicalSort();

        // 初始化距离和前驱信息
        const distances: Record<string, number> = {};
        const predecessors: Record<string, string> = {};
        let endNode = '';

        // 改进：考虑所有节点作为潜在起点，而不仅仅是入度为0的节点
        // 这确保了在所有可能的路径中找到最长路径

        // 优化：使用单遍拓扑排序算法，O(V + E)复杂度
        // 初始化所有节点的距离为0（每个节点都可以作为路径起点）
        nodes.forEach(node => {
          distances[node.id] = 0;
        });

        // 按照拓扑顺序更新距离
        for (const nodeId of topoOrder) {
          if (checkTimeout()) {
            break;
          }

          const currentDistance = distances[nodeId];
          if (currentDistance === undefined) {
            continue;
          }

          const neighbors = getCachedNeighbors(nodeId);

          for (const neighborId of neighbors) {
            // 确保邻居节点距离存在，默认为0
            const neighborDistance = distances[neighborId] ?? 0;
            // 如果通过当前节点可以获得更长路径，则更新
            if (neighborDistance < currentDistance + 1) {
              distances[neighborId] = currentDistance + 1;
              predecessors[neighborId] = nodeId;
            }
          }
        }

        // 找到最大距离和对应的终点节点
        for (const nodeId in distances) {
          if (checkTimeout()) {
            break;
          }

          const distance = distances[nodeId];
          if (distance !== undefined && distance > globalMaxDistance) {
            globalMaxDistance = distance;
            endNode = nodeId;
          }
        }

        // 构建全局最长路径
        if (globalMaxDistance !== -Infinity && endNode) {
          // 从终点回溯到起点
          let currentId = endNode;
          const path: string[] = [];

          while (currentId !== '') {
            if (checkTimeout()) {
              break;
            }

            path.unshift(currentId);

            // 如果当前节点没有前驱，说明是路径起点
            if (!predecessors[currentId]) {
              break;
            }

            currentId = predecessors[currentId] || '';
          }

          globalLongestPath = path;
        }
      } else {
        // 有环图情况：使用分支限界法，确保找到正确结果
        const nodeCount = nodes.length;

        // 计算节点的启发式值：基于节点度数、剩余节点数和图结构的改进估算
        const calculateHeuristic = (nodeId: string, visited: Set<string>): number => {
          // 更精确的启发式：结合未访问节点数量、当前节点的出度和图的平均度数
          const remainingNodes = nodes.length - visited.size;
          if (remainingNodes === 0) {
            return 0;
          }

          const currentOutDegree = getCachedNeighbors(nodeId).length;

          // 计算平均出度，用于更准确的估计
          const totalOutDegree = Array.from(neighborCache.values())
            .reduce((sum, neighbors) => sum + neighbors.length, 0);
          const averageOutDegree = totalOutDegree / nodes.length;

          // 改进的启发式：考虑剩余节点数、当前节点出度和平均出度
          // 提供更紧凑的上界，增强剪枝效果
          return remainingNodes * Math.max(currentOutDegree, averageOutDegree, 1);
        };

        // 分支限界法实现，用于有环图的最长路径计算
        const branchAndBoundDfs = (sourceId: string) => {
          // 使用优化的最大堆优先队列，按当前路径长度+启发式值降序排序
          const pq = maxPriorityQueue();

          // 初始化优先队列
          const initialVisited = new Set<string>([sourceId]);
          const initialHeuristic = calculateHeuristic(sourceId, initialVisited);
          pq.push({
            'currentId': sourceId,
            'visited': initialVisited,
            'currentPath': [sourceId],
            'currentDistance': 0,
            'heuristic': initialHeuristic
          });

          // 最大可能路径长度为节点数量-1（不允许重复节点）
          const maxPossibleDistance = nodes.length - 1;

          while (!pq.isEmpty() && !checkTimeout()) {
            // 取出当前最有希望的路径
            const current = pq.pop();
            if (!current) {
              break;
            }

            const { currentId, visited, currentPath, currentDistance, heuristic } = current;

            // 如果当前路径长度加上启发式估算小于已知最大路径长度，剪枝该路径
            if (currentDistance + heuristic > globalMaxDistance) {
              // 检查当前路径是否是目前最长路径
              if (currentDistance > globalMaxDistance) {
                globalMaxDistance = currentDistance;
                globalLongestPath = [...currentPath];

                // 提前终止：如果找到最大可能路径长度，立即退出
                if (currentDistance === maxPossibleDistance) {
                  return;
                }
              }

              // 如果当前路径长度已经是最大可能路径长度，更新结果并剪枝
              if (currentDistance < maxPossibleDistance) {
                // 获取当前节点的所有邻居（考虑方向，使用缓存）
                const neighbors = getCachedNeighbors(currentId);

                // 遍历所有邻居，优先探索出度高的邻居，加速找到长路径
                const sortedNeighbors = [...neighbors].sort((a, b) => {
                  const aOutDegree = getCachedNeighbors(a).length;
                  const bOutDegree = getCachedNeighbors(b).length;
                  return bOutDegree - aOutDegree;
                });

                // 提前剪枝：如果当前路径长度加上剩余可能的节点数不大于已知最大距离，跳过
                if (currentDistance + (nodes.length - visited.size) <= globalMaxDistance) {
                  continue;
                }

                for (const neighborId of sortedNeighbors) {
                  if (checkTimeout()) {
                    break;
                  }

                  // 不允许重复节点
                  if (!visited.has(neighborId)) {
                    // 创建新的访问集合和路径
                    const newVisited = new Set(visited);
                    newVisited.add(neighborId);
                    const newPath = [...currentPath, neighborId];
                    const newDistance = currentDistance + 1;
                    const newHeuristic = calculateHeuristic(neighborId, newVisited);

                    // 如果新路径长度大于已知最大路径长度，更新结果
                    if (newDistance > globalMaxDistance) {
                      globalMaxDistance = newDistance;
                      globalLongestPath = [...newPath];
                    }

                    // 如果新路径有希望超过已知最大路径长度，加入优先队列
                    if (newDistance + newHeuristic > globalMaxDistance) {
                      pq.push({
                        'currentId': neighborId,
                        'visited': newVisited,
                        'currentPath': newPath,
                        'currentDistance': newDistance,
                        'heuristic': newHeuristic
                      });
                    }
                  }
                }
              }
            }
          }
        };

        // 改进的节点采样策略：
        // 1. 对于小型图（节点数 <= 30）：检查所有节点对
        // 2. 对于中型图（30 < 节点数 <= 70）：采样25个节点
        // 3. 对于大型图（节点数 > 70）：采样35个节点
        // 采样策略结合节点度数、入度、边权重和中心性，确保覆盖更多潜在的长路径起点和终点
        let sampleNodes: Node<CustomNodeData>[];
        if (nodeCount <= 30) {
          // 小型图，检查所有节点对
          sampleNodes = nodes;
        } else {
          // 直接使用globalPathData中的出度、入度和边权重总和，避免重复计算
          // 计算每个节点的综合分数，优化采样策略
          // - 出度权重：0.4（优先选择出度高的节点作为起点）
          // - 入度权重：0.3（优先选择入度高的节点作为起点，增加找到长路径的概率）
          // - 出边权重总和权重：0.3（优先选择连接数多的节点）
          const nodeScores = nodes.map(node => {
            const outDegree = outDegreeMap.get(node.id) || 0;
            const inDegree = inDegreeMap.get(node.id) || 0;
            const outEdgeWeightSum = outEdgeWeightSumMap.get(node.id) || 0;

            // 优化：优先选择出度、入度和出边权重总和都高的节点，这些节点更可能在长路径上
            const score = outDegree * 0.4 + inDegree * 0.3 + outEdgeWeightSum * 0.3;
            return { node, score };
          });

          // 按分数降序排序
          nodeScores.sort((a, b) => b.score - a.score);

          // 采样数量根据节点数量动态调整，增加采样数量提高找到最长路径的概率
          const sampleSize = nodeCount <= 70 ? 25 : 35;
          sampleNodes = nodeScores.slice(0, sampleSize).map(item => item.node);

          // 确保采样节点中包含不同类型的节点：
          // 1. 入度最高的5个节点（潜在终点）
          const inDegreeSortedNodes = [...nodes].sort((a, b) => {
            const aInDegree = inDegreeMap.get(a.id) || 0;
            const bInDegree = inDegreeMap.get(b.id) || 0;
            return bInDegree - aInDegree;
          });
          const topInDegreeNodes = inDegreeSortedNodes.slice(0, 5);

          // 2. 出度最高的5个节点（潜在起点）
          const outDegreeSortedNodes = [...nodes].sort((a, b) => {
            const aOutDegree = outDegreeMap.get(a.id) || 0;
            const bOutDegree = outDegreeMap.get(b.id) || 0;
            return bOutDegree - aOutDegree;
          });
          const topOutDegreeNodes = outDegreeSortedNodes.slice(0, 5);

          // 3. 出度为0的节点（潜在终点）
          const outDegreeZeroNodes = nodes.filter(node => (outDegreeMap.get(node.id) || 0) === 0);

          // 4. 入度为0的节点（潜在起点）
          const inDegreeZeroNodes = nodes.filter(node => (inDegreeMap.get(node.id) || 0) === 0);

          // 合并采样节点，去重
          const combinedSampleNodes = [...sampleNodes, ...topInDegreeNodes, ...topOutDegreeNodes, ...outDegreeZeroNodes, ...inDegreeZeroNodes];
          const uniqueSampleNodes = Array.from(new Map(combinedSampleNodes.map(node => [node.id, node])).values());
          sampleNodes = uniqueSampleNodes;

          // 确保采样节点数量不超过节点总数
          sampleNodes = sampleNodes.slice(0, nodeCount);
        }

        // 记录已处理的源节点，避免重复计算
        const processedSources = new Set<string>();

        // 对每个采样源节点执行一次分支限界法，每个源节点只需要搜索一次
        for (const sourceNode of sampleNodes) {
          if (checkTimeout()) {
            break;
          }

          if (sourceNode && !processedSources.has(sourceNode.id)) {
            processedSources.add(sourceNode.id);
            branchAndBoundDfs(sourceNode.id);
          }
        }

        // 额外优化：对于大型图，增加一些随机采样的源节点，提高找到全局最长路径的概率
        if (nodeCount > 50 && !checkTimeout()) {
          const additionalSampleSize = 10;
          let addedRandomSources = 0;
          let attempts = 0;
          const maxAttempts = additionalSampleSize * 5;

          while (addedRandomSources < additionalSampleSize && attempts < maxAttempts && !checkTimeout()) {
            attempts += 1;
            // 随机选择一个源节点
            const sourceIndex = Math.floor(Math.random() * nodes.length);
            const sourceNode = nodes[sourceIndex];
            if (sourceNode && !processedSources.has(sourceNode.id)) {
              processedSources.add(sourceNode.id);
              branchAndBoundDfs(sourceNode.id);
              addedRandomSources += 1;
            }
          }
        }
      }

      if (checkTimeout()) {
        console.warn('Global longest path calculation timed out after 5 seconds');
      }

      // 构建节点路径
      const path: Node<CustomNodeData>[] = globalLongestPath.map(nodeId => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          throw new Error(`Node with id ${nodeId} not found`);
        }
        return node;
      });

      // 计算距离
      const distance = globalMaxDistance === -1 ? 0 : globalMaxDistance;

      // 创建结果对象
      const result: PathResult = {
        path,
        distance
      };

      // 更新状态
      setPathResult(result);
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);

      // 缓存全局最长路径结果
      const cacheKey = `${'longest'}-${'unweighted'}-global-global`;
      updateCache(cacheKey, result);
    }, 100);
  }, [nodes, edges, getNodeNeighbors, hasCycle, topologicalSort]);

  /**
   * 寻找全局最长路径（有权重，所有节点对之间的最长路径）- 优化版
   */
  const findWeightedGlobalLongestPath = useCallback(() => {
    setIsCalculating(true);

    setTimeout(() => {
      // 节点ID到节点的映射
      // 使用组件级的nodeMap，无需重新创建
      let globalLongestPath: string[] = [];
      let globalMaxWeight = -1;

      // 超时机制：5秒后终止计算
      const TIMEOUT = 5000;
      let isTimeout = false;
      const startTime = Date.now();

      // 检查是否超时的辅助函数
      const checkTimeout = () => {
        if (Date.now() - startTime > TIMEOUT) {
          isTimeout = true;
        }
        return isTimeout;
      };

      // 检测图是否有环
      const graphHasCycle = hasCycle();

      // 邻居缓存，避免重复计算
      const weightedNeighborCache = new Map<string, { nodeId: string; weight: number }[]>();
      const getCachedWeightedNeighbors = (nodeId: string) => {
        if (!weightedNeighborCache.has(nodeId)) {
          weightedNeighborCache.set(nodeId, getWeightedNeighbors(nodeId, true));
        }
        return weightedNeighborCache.get(nodeId)!;
      };

      if (!graphHasCycle) {
        // DAG情况：使用拓扑排序算法，优化版
        const topoOrder = topologicalSort();

        // 初始化距离和前驱信息
        const distances: Record<string, number> = {};
        const predecessors: Record<string, string> = {};
        let endNode = '';

        // 初始化所有节点的距离为0（每个节点都可以作为路径起点）
        nodes.forEach(node => {
          distances[node.id] = 0;
        });

        // 按照拓扑顺序更新距离
        for (const nodeId of topoOrder) {
          if (checkTimeout()) {
            break;
          }

          const currentDistance = distances[nodeId];
          if (currentDistance === undefined) {
            continue;
          }

          const neighbors = getCachedWeightedNeighbors(nodeId);

          for (const { 'nodeId': neighborId, weight } of neighbors) {
            // 确保邻居节点距离存在，默认为0
            const neighborDistance = distances[neighborId] ?? 0;
            // 如果通过当前节点可以获得更长路径，则更新
            if (neighborDistance < currentDistance + weight) {
              distances[neighborId] = currentDistance + weight;
              predecessors[neighborId] = nodeId;
            }
          }
        }

        // 找到最大权重和对应的终点节点
        for (const nodeId in distances) {
          if (checkTimeout()) {
            break;
          }

          const distance = distances[nodeId];
          if (distance !== undefined && distance > globalMaxWeight) {
            globalMaxWeight = distance;
            endNode = nodeId;
          }
        }

        // 构建全局最长路径
        if (globalMaxWeight !== -Infinity && endNode) {
          // 从终点回溯到起点
          let currentId = endNode;
          const path: string[] = [];

          while (currentId !== '') {
            if (checkTimeout()) {
              break;
            }

            path.unshift(currentId);

            // 如果当前节点没有前驱，说明是路径起点
            if (!predecessors[currentId]) {
              break;
            }

            currentId = predecessors[currentId] || '';
          }

          globalLongestPath = path;
        }
      } else {
        // 有环图情况：使用分支限界法，确保找到正确结果
        const nodeCount = nodes.length;

        // 计算节点的启发式值：基于节点权重、剩余节点数和图结构的改进估算
        const calculateHeuristic = (nodeId: string, visited: Set<string>): number => {
          // 更精确的启发式：结合未访问节点数量、当前节点的出边权重和图的最大边权重
          const remainingNodes = nodes.length - visited.size;
          if (remainingNodes === 0) {
            return 0;
          }

          // 计算整个图的最大边权重，用于更准确的估计
          const maxEdgeWeight = Math.max(
            ...edges.map(edge => edge.data?.weight || 1),
            1
          );

          // 获取当前节点的出边权重
          const outEdges = getCachedWeightedNeighbors(nodeId);
          const currentMaxOutWeight = outEdges.length > 0
            ? Math.max(...outEdges.map(edge => edge.weight))
            : maxEdgeWeight;

          // 启发式值 = 剩余节点数 * 全局最大边权重
          // 这是一个更紧的上界，不包含currentWeight（已在其他地方使用）
          return remainingNodes * Math.max(currentMaxOutWeight, maxEdgeWeight);
        };

        // 分支限界法实现，用于有环图的加权最长路径计算
        const branchAndBoundDfs = (sourceId: string) => {
          // 使用优化的最大堆优先队列，按当前路径权重+启发式值降序排序
          const pq = maxPriorityQueue();

          // 初始化优先队列
          const initialVisited = new Set<string>([sourceId]);
          const initialWeight = 0;
          const initialHeuristic = calculateHeuristic(sourceId, initialVisited);
          pq.push({
            'currentId': sourceId,
            'visited': initialVisited,
            'currentPath': [sourceId],
            // 复用currentDistance字段存储权重
            'currentDistance': initialWeight,
            'currentWeight': initialWeight,
            'heuristic': initialHeuristic
          });

          while (!pq.isEmpty() && !checkTimeout()) {
            // 取出当前最有希望的路径
            const current = pq.pop();
            if (!current) {
              break;
            }

            // 确保currentWeight有值，默认为0
            const { currentId, visited, currentPath, heuristic } = current;
            const currentWeight = current.currentWeight || current.currentDistance || 0;

            // 如果当前路径的启发式值加上当前权重小于已知最大权重，剪枝该路径
            if (currentWeight + heuristic > globalMaxWeight) {
              // 检查当前路径是否是目前最长路径
              if (currentWeight > globalMaxWeight) {
                globalMaxWeight = currentWeight;
                globalLongestPath = [...currentPath];
              }

              // 获取当前节点的所有邻居（带权重，使用缓存）
              const weightedNeighbors = getCachedWeightedNeighbors(currentId);

              // 遍历所有邻居，按权重降序排序，优先探索权重高的路径
              const sortedNeighbors = [...weightedNeighbors].sort((a, b) => b.weight - a.weight);

              for (const neighbor of sortedNeighbors) {
                if (checkTimeout()) {
                  break;
                }

                // 添加类型守卫，确保邻居对象有效
                if (neighbor) {
                  const { 'nodeId': neighborId, weight } = neighbor;
                  if (!visited.has(neighborId)) {
                    // 创建新的访问集合和路径
                    const newVisited = new Set(visited);
                    newVisited.add(neighborId);
                    const newPath = [...currentPath, neighborId];
                    const newWeight = currentWeight + weight;
                    // 计算新的启发式值
                    const newHeuristic = calculateHeuristic(neighborId, newVisited);

                    // 如果新路径的启发式值加上新权重大于已知最大权重，加入优先队列
                    if (newWeight + newHeuristic > globalMaxWeight) {
                      pq.push({
                        'currentId': neighborId,
                        'visited': newVisited,
                        'currentPath': newPath,
                        // 复用currentDistance字段存储权重
                        'currentDistance': newWeight,
                        'currentWeight': newWeight,
                        'heuristic': newHeuristic
                      });
                    }

                    // 检查新路径是否是目前最长路径
                    if (newWeight > globalMaxWeight) {
                      globalMaxWeight = newWeight;
                      globalLongestPath = [...newPath];
                    }
                  }
                }
              }
            }
          }
        };

        // 改进的节点采样策略：
        // 1. 对于小型图（节点数 <= 30）：检查所有节点对
        // 2. 对于中型图（30 < 节点数 <= 70）：采样20个节点
        // 3. 对于大型图（节点数 > 70）：采样30个节点
        // 采样策略结合节点度数和入度，确保覆盖更多潜在的长路径起点和终点
        let sampleNodes: Node<CustomNodeData>[];
        if (nodeCount <= 30) {
          // 小型图，检查所有节点对
          sampleNodes = nodes;
        } else {
          // 基于节点度数、入度和边权重的综合采样策略
          // 计算每个节点的入度
          const inDegreeMap = new Map<string, number>();
          edges.forEach(edge => {
            const targetId = String(edge.target);
            inDegreeMap.set(targetId, (inDegreeMap.get(targetId) || 0) + 1);
          });

          // 计算每个节点的出边权重总和
          const outEdgeWeightSumMap = new Map<string, number>();
          edges.forEach(edge => {
            const sourceId = String(edge.source);
            const weight = edge.data?.weight || 1;
            outEdgeWeightSumMap.set(sourceId, (outEdgeWeightSumMap.get(sourceId) || 0) + weight);
          });

          // 计算每个节点的综合分数：出边权重总和 * 0.5 + 出度 * 0.3 + 入度 * 0.2
          const nodeScores = nodes.map(node => {
            const outDegree = getCachedWeightedNeighbors(node.id).length;
            const inDegree = inDegreeMap.get(node.id) || 0;
            const outEdgeWeightSum = outEdgeWeightSumMap.get(node.id) || 0;
            const score = outEdgeWeightSum * 0.5 + outDegree * 0.3 + inDegree * 0.2;
            return { node, score };
          });

          // 按分数降序排序
          nodeScores.sort((a, b) => b.score - a.score);

          // 采样数量根据节点数量动态调整
          const sampleSize = nodeCount <= 70 ? 20 : 30;
          sampleNodes = nodeScores.slice(0, sampleSize).map(item => item.node);

          // 确保采样节点中包含一些低度数但可能是长路径终点的节点
          // 添加5个入度最高的节点，确保覆盖潜在的长路径终点
          const inDegreeSortedNodes = [...nodes].sort((a, b) => {
            const aInDegree = inDegreeMap.get(a.id) || 0;
            const bInDegree = inDegreeMap.get(b.id) || 0;
            return bInDegree - aInDegree;
          });
          const topInDegreeNodes = inDegreeSortedNodes.slice(0, 5);

          // 合并采样节点，去重
          const combinedSampleNodes = [...sampleNodes, ...topInDegreeNodes];
          const uniqueSampleNodes = Array.from(new Map(combinedSampleNodes.map(node => [node.id, node])).values());
          sampleNodes = uniqueSampleNodes;
        }

        // 记录已处理的源节点，避免重复计算
        const processedSources = new Set<string>();

        // 对每个采样源节点执行一次分支限界法，每个源节点只需要搜索一次
        for (const sourceNode of sampleNodes) {
          if (checkTimeout()) {
            break;
          }

          if (sourceNode && !processedSources.has(sourceNode.id)) {
            processedSources.add(sourceNode.id);
            branchAndBoundDfs(sourceNode.id);
          }
        }

        // 额外优化：对于大型图，增加一些随机采样的源节点，提高找到全局最长路径的概率
        if (nodeCount > 50 && !checkTimeout()) {
          const additionalSampleSize = 10;
          let addedRandomSources = 0;
          let attempts = 0;
          const maxAttempts = additionalSampleSize * 5;

          while (addedRandomSources < additionalSampleSize && attempts < maxAttempts && !checkTimeout()) {
            attempts += 1;
            // 随机选择一个源节点
            const sourceIndex = Math.floor(Math.random() * nodes.length);
            const sourceNode = nodes[sourceIndex];
            if (sourceNode && !processedSources.has(sourceNode.id)) {
              processedSources.add(sourceNode.id);
              branchAndBoundDfs(sourceNode.id);
              addedRandomSources += 1;
            }
          }
        }
      }

      if (checkTimeout()) {
        console.warn('Weighted global longest path calculation timed out after 5 seconds');
      }

      // 构建节点路径
      const path: Node<CustomNodeData>[] = globalLongestPath.map(nodeId => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          throw new Error(`Node with id ${nodeId} not found`);
        }
        return node;
      });

      // 计算距离
      const distance = globalLongestPath.length > 1 ? globalLongestPath.length - 1 : 0;

      // 创建结果对象
      const result: PathResult = {
        path,
        distance,
        'weight': globalMaxWeight === -1 ? undefined : globalMaxWeight
      };

      // 更新状态
      setPathResultWeighted(result);
      setIsCalculating(false);
      // 重置高亮状态
      setIsPathHighlighted(false);

      // 缓存全局最长路径结果
      const cacheKey = `${'longest'}-${'weighted'}-global-global`;
      updateCache(cacheKey, result);
    }, 100);
  }, [nodes, edges, getWeightedNeighbors, hasCycle, topologicalSort]);

  /**
   * 统一的路径查找函数，根据路径类型和分析模式调用不同的算法
   */

  const findPath = useCallback(() => {
    // 生成缓存键
    const cacheKey = getCacheKey(pathType, analysisMode, selectedSource, selectedTarget);

    // 检查缓存中是否已有结果
    if (pathType !== 'global' && pathResultCache.has(cacheKey)) {
      const cachedResult = pathResultCache.get(cacheKey);
      if (cachedResult) {
        if (analysisMode === 'weighted') {
          setPathResultWeighted(cachedResult);
        } else {
          setPathResult(cachedResult);
        }
        setIsCalculating(false);
        setIsPathHighlighted(false);
        return;
      }
    }



    // 根据分析模式选择调用加权或非加权算法
    if (analysisMode === 'weighted') {
      switch (pathType) {
        case 'shortest':
          // 调用加权最短路径算法
          findWeightedShortestPath();
          break;
        case 'longest':
          findWeightedLongestPath();
          break;
        case 'global':
          findWeightedGlobalLongestPath();
          break;
        default:
          findWeightedShortestPath();
      }
    } else {
      // 非加权算法
      switch (pathType) {
        case 'shortest':
          findShortestPath();
          break;
        case 'longest':
          findLongestPath();
          break;
        case 'global':
          findGlobalLongestPath();
          break;
        default:
          findShortestPath();
      }
    }
  }, [
    pathType,
    analysisMode,
    selectedSource,
    selectedTarget,
    findShortestPath,
    findLongestPath,
    findGlobalLongestPath,
    findWeightedShortestPath,
    findWeightedLongestPath,
    findWeightedGlobalLongestPath,
    getCacheKey,
    pathResultCache
  ]);

  /**
   * 根据路径类型获取按钮文本
   */
  const getPathButtonText = useCallback(() => {
    switch (pathType) {
      case 'shortest':
        return '查找最短路径';
      case 'longest':
        return '查找最长路径';
      case 'global':
        return '查找全局最长路径';
      default:
        return '查找最短路径';
    }
  }, [pathType]);

  /**
   * 根据路径类型获取结果标题
   */
  const getPathResultTitle = useCallback(() => {
    switch (pathType) {
      case 'shortest':
        return '最短路径结果';
      case 'longest':
        return '最长路径结果';
      case 'global':
        return '全局最长路径结果';
      default:
        return '最短路径结果';
    }
  }, [pathType]);

  /**
   * 高亮或取消高亮路径
   */

  const togglePathHighlight = useCallback(() => {
    const currentPathResult = pathResult || pathResultWeighted;
    if (!currentPathResult || currentPathResult.path.length === 0) {
      return;
    }

    // 获取路径中的节点ID列表
    const pathNodeIds = new Set(currentPathResult.path.map(node => node.id));

    // 获取路径中的连接
    const pathEdges: Edge<CustomEdgeData>[] = [];
    const pathLength = currentPathResult.path.length;
    for (let i = 0; i < pathLength - 1; i += 1) {
      // 确保节点存在
      const sourceNode = currentPathResult.path[i];
      const targetNode = currentPathResult.path[i + 1];

      if (sourceNode && targetNode) {
        const sourceId = sourceNode.id;
        const targetId = targetNode.id;

        // 查找连接源节点和目标节点的连接
        const edge = edges.find(e => {
          const edgeSourceId = String(e.source);
          const edgeTargetId = String(e.target);
          return edgeSourceId === sourceId && edgeTargetId === targetId;
        });

        if (edge) {
          pathEdges.push(edge);
        }
      }
    }

    // 获取路径中的连接ID列表
    const pathEdgeIds = new Set(pathEdges.map(edge => edge.id));

    if (!isPathHighlighted) {
      // 高亮路径时：
      // 1. 高亮路径节点和连接
      // 2. 降低其他节点和连接的透明度
      // 3. 为路径添加动画效果

      // 更新节点状态
      reactFlowInstance.setNodes((nds) =>
        nds.map(node => {
          const isPathNode = pathNodeIds.has(node.id);
          return {
            ...node,
            'selected': isPathNode,
            'selectable': isPathNode,
            'draggable': isPathNode,
            // 非路径节点降低透明度
            'style': {
              ...node.style,
              'opacity': isPathNode ? 1 : 0.3,
              'pointerEvents': isPathNode ? 'auto' : 'none'
            }
          };
        })
      );

      // 更新连接状态
      reactFlowInstance.setEdges((eds) =>
        eds.map(edge => {
          const isPathEdge = pathEdgeIds.has(edge.id);
          return {
            ...edge,
            'selected': isPathEdge,
            'selectable': isPathEdge,
            // 非路径连接降低透明度
            'style': {
              ...edge.style,
              'opacity': isPathEdge ? 1 : 0.3,
              'pointerEvents': isPathEdge ? 'auto' : 'none'
            },
            'data': {
              ...edge.data,
              'animation': {
                ...(edge.data?.animation || {}),
                // 只为路径连接启用动画
                'pathAnimation': isPathEdge,
                // 初始进度为0
                'pathAnimationProgress': 0
              }
            }
          };
        })
      );

      // 启动路径动画
      setTimeout(() => {
        reactFlowInstance.setEdges((eds) =>
          eds.map(edge => {
            if (pathEdgeIds.has(edge.id)) {
              return {
                ...edge,
                'data': {
                  ...edge.data,
                  'animation': {
                    ...(edge.data?.animation || {}),
                    // 动画进度设为1，触发绘制动画
                    'pathAnimationProgress': 1
                  }
                }
              };
            }
            return edge;
          })
        );
      }, 100);
    } else {
      // 取消高亮时：
      // 1. 取消所有节点和连接的选中状态
      // 2. 恢复所有节点和连接的透明度
      // 3. 停止所有动画
      // 4. 恢复所有节点和连接的可选中、可拖动和鼠标事件

      // 更新节点状态
      reactFlowInstance.setNodes((nds) =>
        nds.map(node => ({
          ...node,
          'selected': false,
          'selectable': true,
          'draggable': true,
          'style': {
            ...node.style,
            // 恢复透明度
            'opacity': 1,
            'pointerEvents': 'auto'
          }
        }))
      );

      // 更新连接状态
      reactFlowInstance.setEdges((eds) =>
        eds.map(edge => ({
          ...edge,
          'selected': false,
          'selectable': true,
          'style': {
            ...edge.style,
            // 恢复透明度
            'opacity': 1,
            'pointerEvents': 'auto'
          },
          'data': {
            ...edge.data,
            'animation': {
              ...(edge.data?.animation || {}),
              // 停止路径动画
              'pathAnimation': false,
              // 重置动画进度
              'pathAnimationProgress': 0
            }
          }
        }))
      );
    }

    // 切换高亮状态
    setIsPathHighlighted(!isPathHighlighted);
  }, [pathResult, pathResultWeighted, edges, isPathHighlighted, reactFlowInstance]);

  /**
   * 渲染基础统计信息
   */
  const renderBasicStats = () => {
    const graphStats = calculateGraphStats();
    const components = calculateConnectedComponents();
    const diameter = calculateDiameter();

    return (
      <div className="mt-4">
        <div className="relative mb-4">
          <h4 className="text-md font-semibold text-gray-800 text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            基础统计
          </h4>
          <div className="absolute right-0 top-0">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="帮助"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5">
          {/* 基础指标 */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <h5 className="font-medium text-gray-800 mb-4 text-center">基本指标</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">节点数量:</span>
                <span className="font-medium text-gray-900">{graphStats.nodeCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">连接数量:</span>
                <span className="font-medium text-gray-900">{graphStats.edgeCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">平均度:</span>
                <span className="font-medium text-gray-900">{graphStats.averageDegree.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">网络密度:</span>
                <span className="font-medium text-gray-900">{graphStats.density.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">聚类系数:</span>
                <span className="font-medium text-gray-900">{graphStats.clusteringCoefficient.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">网络直径:</span>
                <span className="font-medium text-gray-900">{diameter}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">连通分量数量:</span>
                <span className="font-medium text-gray-900">{components.length}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">平均最短路径长度:</span>
                <span className="font-medium text-gray-900">{graphStats.averageShortestPath.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-sm text-gray-600">同配性:</span>
                <span className="font-medium text-gray-900">{graphStats.assortativity.toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* 连通分量和度分布 */}
          <div className="space-y-5">
            {/* 连通分量 */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <h5 className="font-medium text-gray-800 mb-4 text-center">连通分量</h5>
              <div className="max-h-40 overflow-y-auto">
                <div className="space-y-3">
                  {components.map((component, index) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-800">
                          分量 {index + 1}
                        </span>
                        <span className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-xs font-medium">
                          {component.length} 个节点
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 max-w-full">
                        {component.slice(0, 5).map(node => (
                          <span key={node.id} className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs text-center truncate overflow-hidden max-w-[6rem] flex-shrink-0 hover:bg-gradient-to-r from-gray-200 to-gray-300 transition-all duration-200">
                            {node.data?.title || ''}
                          </span>
                        ))}
                        {component.length > 5 && (
                          <span className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs text-center flex-shrink-0 hover:bg-gradient-to-r from-gray-200 to-gray-300 transition-all duration-200">
                            ... 等 {component.length - 5} 个节点
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 节点度分布 */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <h5 className="font-medium text-gray-800 mb-4 text-center">节点度分布</h5>
              <div className="max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {Object.entries(graphStats.degreeDistribution)
                    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                    .map(([degree, count]) => (
                      <div key={degree} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <span className="text-sm text-gray-600">度数 {degree}:</span>
                        <span className="font-medium text-gray-900">{count} 个节点</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染中心性结果
   */
  const renderCentralityResults = () => {
    // 根据当前分析模式选择要显示的结果
    const currentResults = analysisMode === 'weighted' ? centralityMetricsWeighted : centralityMetrics;

    if (!currentResults) {
      return null;
    }

    return (
      <div className="space-y-6 mt-6">
        {/* 根据当前分析模式显示对应的中心性结果 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 text-center">{analysisMode === 'weighted' ? '有权重' : '无权重'}中心性指标结果</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* 度中心性 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-800 mb-3 text-center">{analysisMode === 'weighted' ? '加权' : ''}度中心性</h5>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentResults.degree.slice(0, 10).map((result, index) => (
                      <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 truncate max-w-[10rem] text-sm font-medium text-gray-900">{result.node.data?.title || ''}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 介数中心性 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-800 mb-3 text-center">{analysisMode === 'weighted' ? '加权' : ''}介数中心性</h5>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentResults.betweenness.slice(0, 10).map((result, index) => (
                      <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.data?.title || ''}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 接近中心性 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-800 mb-3 text-center">{analysisMode === 'weighted' ? '加权' : ''}接近中心性</h5>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentResults.closeness.slice(0, 10).map((result, index) => (
                      <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.data?.title || ''}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 特征向量中心性 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-800 mb-3 text-center">{analysisMode === 'weighted' ? '加权' : ''}特征向量中心性</h5>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentResults.eigenvector.slice(0, 10).map((result, index) => (
                      <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.data?.title || ''}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染路径结果
   */
  const renderPathResult = () => {
    // 根据当前分析模式选择要显示的结果
    const currentPathResult = analysisMode === 'weighted' ? pathResultWeighted : pathResult;

    if (!currentPathResult) {
      return null;
    }

    return (
      <div className="mt-6 max-h-64 overflow-y-auto">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 text-center">{getPathResultTitle()} ({analysisMode === 'weighted' ? '有权重' : '无权重'})</h4>
          <div className="bg-white p-4 rounded-lg shadow-sm mt-2">
            <div className="mb-4">
              <p className="text-sm text-gray-600 text-center">
                路径长度: {currentPathResult.distance === Infinity ? '不可达' : currentPathResult.distance}
              </p>
              {analysisMode === 'weighted' && (
                <p className="text-sm text-gray-600 text-center mt-1">
                  权重总和: {currentPathResult.weight !== undefined ? currentPathResult.weight : '不可达'}
                </p>
              )}
            </div>

            {currentPathResult.path.length > 0 ? (
              <>
                <div className="flex flex-col items-center gap-2 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {Array.from({ 'length': Math.ceil(currentPathResult.path.length / 4) }, (_, batchIndex) => {
                    const startIndex = batchIndex * 4;
                    const endIndex = Math.min(startIndex + 4, currentPathResult.path.length);
                    const batch = currentPathResult.path.slice(startIndex, endIndex);

                    return (
                      <div key={batchIndex} className="flex items-center gap-2 flex-wrap justify-center">
                        {batch.map((node, nodeIndex) => {
                          const globalIndex = startIndex + nodeIndex;
                          return (
                            <React.Fragment key={node.id}>
                              <span className={`px-3 py-1 ${analysisMode === 'weighted' ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full text-sm truncate max-w-[8rem]`}>
                                {node.data?.title || ''}
                              </span>
                              {globalIndex < currentPathResult.path.length - 1 && (
                                <span className="text-gray-500">→</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* 高亮路径按钮 */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={togglePathHighlight}
                    className={`px-4 py-2 rounded-md text-sm transition-colors ${isPathHighlighted ? 'bg-red-600 text-white hover:bg-red-700' : `${analysisMode === 'weighted' ? 'bg-green-600' : 'bg-blue-600'} text-white hover:${analysisMode === 'weighted' ? 'bg-green-700' : 'bg-blue-700'}`}`}
                    title={isPathHighlighted ? '取消高亮路径' : '高亮路径'}
                  >
                    {isPathHighlighted ? '取消高亮路径' : '高亮路径'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center">未找到路径</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* eslint-enable max-depth, no-continue, max-nested-callbacks, react-hooks/exhaustive-deps */
  return (
    <div className="w-full overflow-hidden min-w-0 bg-gradient-to-br from-gray-50 to-gray-100 p-4">

      {/* 基础统计信息 */}
      {renderBasicStats()}

      {/* 分析模式切换 */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setAnalysisMode('unweighted')}
            className={`px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${analysisMode === 'unweighted' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
          >
            无权重分析
          </button>
          <button
            type="button"
            onClick={() => setAnalysisMode('weighted')}
            className={`px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${analysisMode === 'weighted' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
          >
            有权重分析
          </button>
        </div>
      </div>

      {/* 中心性指标计算 */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          中心性指标
        </h4>
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (analysisMode === 'weighted') {
                calculateWeightedCentralityMetrics();
              } else {
                calculateCentralityMetrics();
              }
            }}
            disabled={isCalculating}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white ${isCalculating ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
          >
            {isCalculating ? '计算中...' : `计算${analysisMode === 'weighted' ? '有权重' : '无权重'}中心性`}
          </button>
        </div>
      </div>

      {/* 路径查找 */}
      <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 shadow-sm border border-green-100 hover:shadow-md transition-all duration-300">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          路径查找
        </h4>
        <div className="flex flex-wrap justify-center gap-3 mb-2">
          <select
            value={pathType}
            onChange={(e) => setPathType(e.target.value as 'shortest' | 'longest' | 'global')}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm hover:shadow-md transition-all duration-300"
          >
            <option value="shortest">最短路径</option>
            <option value="longest">最长路径</option>
            <option value="global">全局最长路径</option>
          </select>

          {pathType !== 'global' && (
            <>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                <option value="">选择源节点</option>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.data?.title || ''}
                  </option>
                ))}
              </select>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                <option value="">选择目标节点</option>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.data?.title || ''}
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            onClick={findPath}
            disabled={isCalculating || (pathType !== 'global' && (!selectedSource || !selectedTarget))}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white ${isCalculating ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'}`}
          >
            {isCalculating ? '查找中...' : getPathButtonText()}
          </button>
        </div>
      </div>

      {/* 中心性结果 */}
      {centralityMetrics && renderCentralityResults()}

      {/* 路径结果 */}
      {pathResult && renderPathResult()}

      {/* 帮助模态面板 */}
      {isHelpModalOpen && (
        <>
          {/* 背景模糊层 - z-60确保覆盖普通内容 */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"></div>

          {/* 模态面板 - z-70确保在所有内容之上，包括工具栏 */}
          {/* top-20 是根据工具栏高度调整的，工具栏高度约为5rem (80px) */}
          {/* bottom-5 从底部收缩5，留出间距 */}
          <div className="fixed inset-x-0 top-20 bottom-5 flex items-center justify-center z-70 p-0 m-0 flex-col">
            {/* 帮助面板容器 - 高度从顶部20开始到底部5 */}
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full h-[calc(100vh-5rem-1.25rem)] flex flex-col">
              {/* 模态标题栏 - 固定在顶部 */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-gray-900">图谱分析帮助</h3>
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  title="关闭"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 模态内容区域 - 滚动区域，占满剩余高度 */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* 基础统计部分 */}
                <section className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    基础统计
                  </h4>

                  {/* 基础统计部分内容 - 左右对齐一致，添加右内边距 */}
                  <div className="space-y-6 px-6">
                    {/* 节点数量 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">节点数量</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        节点是图谱中的基本组成单元，可以代表各类实体、概念或事件。节点数量是衡量图谱规模大小的基本指标，数量越多，图谱的规模越大，包含的信息可能越丰富。
                        节点通常包含属性信息，如名称、类型、描述等，这些属性为图谱分析提供了丰富的上下文。
                      </p>
                    </div>

                    {/* 连接数量 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">连接数量</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        连接是节点之间的关系表示，描述了节点之间的关联或交互。连接数量反映了节点之间的连接密度和复杂程度，数量越多，节点之间的关系网络越复杂。
                        连接通常包含类型、权重等属性，用于表示关系的性质和强度，这些属性对于分析节点之间的交互模式至关重要。
                      </p>
                    </div>

                    {/* 平均度 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">平均度</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        所有节点度数的平均值，反映了节点的平均连接程度。度数是指节点拥有的连接数量，包括入连接和出连接。
                        平均度高说明节点之间普遍连接紧密，信息传播效率可能较高；平均度低说明节点比较孤立，信息传播可能受限。
                        平均度是衡量图谱整体连接紧密程度的重要指标。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：总连接数 × 2 / 节点数量
                      </p>
                    </div>

                    {/* 网络密度 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">网络密度</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        网络密度是实际连接数与理论最大可能连接数的比值，反映了图谱中节点之间的连接紧密程度。密度值范围为0到1，值越大表示节点之间的连接越紧密。
                        密度为0表示图谱中没有任何连接，密度为1表示所有节点之间都有连接。
                        高密度图谱通常表示节点之间关系密切，信息传播迅速；低密度图谱则表示节点之间关系松散，信息传播可能受限。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：实际连接数 / (节点数 × (节点数 - 1) / 2)
                      </p>
                    </div>

                    {/* 聚类系数 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">聚类系数</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        聚类系数是节点邻居之间实际连接数与理论最大可能连接数的比值，反映了图谱中节点形成聚类的程度。
                        对于单个节点，聚类系数衡量了其邻居之间相互连接的程度；对于整个图谱，可以计算平均聚类系数来反映整体的聚类特性。
                        聚类系数越高，说明节点之间越容易形成紧密的群组，图谱呈现出明显的社区结构。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：节点邻居之间的实际连接数 / (邻居数量 × (邻居数量 - 1) / 2)
                      </p>
                    </div>

                    {/* 网络直径 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">网络直径</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        网络直径是指图谱中任意两个节点之间最短路径的最大值，即所有节点对之间的最短路径中最长的那条路径的长度。
                        它反映了图谱的最大传播距离，直径越小，信息在图谱中的传播效率越高。
                      </p>
                    </div>

                    {/* 连通分量数量 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">连通分量数量</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        连通分量是指图谱中一组相互连通的节点集合，其中任意两个节点之间都存在至少一条路径。
                        连通分量数量是指图谱中这样的独立子图的总数，反映了图谱的整体连通性。
                        数量为1表示整个图谱是完全连通的，所有节点之间都可以通过路径到达。
                      </p>
                    </div>

                    {/* 平均最短路径长度 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">平均最短路径长度</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        平均最短路径长度是图谱中所有可达节点对之间最短路径长度的平均值，反映了图谱中信息传播的平均效率。
                        该指标衡量了节点之间的平均距离，值越小表示节点之间的平均距离越近，信息传播效率越高。
                        平均最短路径长度是衡量网络小世界特性的重要指标之一。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：所有可达节点对的最短路径长度之和 / 可达节点对总数
                      </p>
                    </div>

                    {/* 节点度分布 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">节点度分布</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        节点度分布描述了图谱中节点度数的出现频率，反映了节点连接的分布特征。
                        度分布可以帮助我们了解图谱的结构特性，例如是否呈现幂律分布（无标度网络的特征）。
                        通过分析度分布，我们可以识别图谱中的枢纽节点和边缘节点，以及整个网络的连接模式。
                      </p>
                    </div>

                    {/* 同配性 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">同配性</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        同配性衡量了节点之间连接的偏好性，即高度数节点是否倾向于连接到其他高度数节点。
                        同配性值为正表示高度数节点倾向于相互连接，负表示高度数节点倾向于连接低度数节点。
                        社交网络通常具有正同配性，而技术网络则通常具有负同配性。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：(E[XY] - (E[X])²) / Var(X)，其中X和Y是连接两端节点的度数
                      </p>
                    </div>
                  </div>
                </section>

                {/* 中心性指标部分 */}
                <section className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    中心性指标
                  </h4>

                  {/* 中心性指标部分内容 - 左右对齐一致 */}
                  <div className="space-y-6 px-6">
                    {/* 度中心性 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">度中心性</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        度中心性是最基本的中心性指标，衡量节点的连接数量，反映了节点在图谱中的直接影响力。
                        在无向图中，度中心性等于节点的连接总数；在有向图中，度中心性可分为入度（指向节点的连接数）和出度（节点发出的连接数）。
                        度数越高，节点在图谱中的直接影响力越大，通常意味着该节点与其他节点的直接交互更多。
                        度中心性简单直观，但只考虑直接连接，忽略了间接连接的影响。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：节点的入连接数 + 出连接数
                      </p>
                    </div>

                    {/* 介数中心性 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">介数中心性</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        介数中心性衡量的是一个节点出现在其他节点对之间最短路径上的频率。
                        具体来说，它计算了图谱中所有节点对的最短路径中，经过当前节点的路径数量。
                        介数中心性高的节点是图谱中重要的信息传递枢纽，在信息传播中扮演着关键的桥梁角色。
                      </p>
                    </div>

                    {/* 接近中心性 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">接近中心性</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        接近中心性衡量节点到所有其他节点的平均距离的倒数，反映了节点在图谱中的可达性和传播效率。
                        接近中心性高的节点能够快速到达图谱中的其他节点，信息传播效率高，是图谱中的核心节点之一。
                        接近中心性的计算基于最短路径，考虑了节点与其他所有节点的间接连接，因此比度中心性更能反映节点的全局影响力。
                        在社交网络中，接近中心性高的节点通常是信息传播的中心，能够快速将信息传递给其他节点。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：(节点数 - 1) / 总距离
                      </p>
                    </div>

                    {/* 特征向量中心性 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">特征向量中心性</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        特征向量中心性是一种基于网络结构的中心性指标，它认为一个节点的重要性取决于其邻居的重要性。
                        具体来说，如果一个节点连接了很多重要节点（即特征向量中心性高的节点），那么该节点本身也会被认为是重要的。
                        特征向量中心性高的节点在图谱中具有全局性的影响力，是连接不同社区或子图的关键节点。
                      </p>
                      <p className="text-sm text-blue-600 font-medium text-center mt-2">
                        计算公式：通过幂迭代法计算，节点得分与其邻居得分之和成正比
                      </p>
                    </div>
                  </div>
                </section>

                {/* 路径查找部分 */}
                <section>
                  <h4 className="text-md font-medium text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    路径查找
                  </h4>

                  {/* 路径查找部分内容 - 左右对齐一致 */}
                  <div className="space-y-6 px-6">
                    {/* 最短路径 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">最短路径</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        最短路径是指两个节点之间连接数最少（无权重图）或总权重最小（有权重图）的路径。
                        在无权重图中，使用广度优先搜索（BFS）算法实现，确保找到连接数最少的路径；
                        在有权重图中，优先使用A*算法（当节点有位置信息时），通过启发式函数加速搜索，否则回退到Dijkstra算法。
                        最短路径反映了节点之间的最短传播路径，是衡量信息传播效率的重要指标，对于优化网络结构和信息传递具有重要意义。
                      </p>
                    </div>

                    {/* 最长路径 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">最长路径</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        最长路径是指两个节点之间连接数最多（无权重图）或总权重最大（有权重图）的路径。
                        在无权重图中，使用深度优先搜索（DFS）算法实现，遍历所有可能路径找到最长路径；
                        在有权重图中，使用分支限界法，结合启发式剪枝优化，高效找到最长路径。
                        最长路径反映了节点之间的最长传播路径，有助于理解节点之间的间接关系和复杂交互。
                        最长路径分析对于识别网络中的关键路径和潜在瓶颈具有重要意义，在项目管理、网络规划等领域有广泛应用。
                      </p>
                    </div>

                    {/* 全局最长路径 */}
                    <div>
                      <h5 className="font-medium text-gray-700 text-center mb-2">全局最长路径</h5>
                      <p className="text-sm text-gray-600 indent-4">
                        全局最长路径是指整个图谱中所有节点对之间的最长路径，反映了图谱的最大传播距离和复杂度。
                        在有向无环图（DAG）中，使用拓扑排序算法，线性时间内找到最长路径；
                        在有环图中，使用分支限界法，结合节点采样策略和启发式剪枝，高效搜索全局最长路径。
                        算法会根据图谱规模动态调整采样策略，确保在合理时间内找到近似最优解。
                        全局最长路径是衡量图谱规模和复杂度的重要指标，对于理解图谱的整体结构和信息传播特性具有重要意义。
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 使用React.memo优化组件渲染性能
export default React.memo(GraphAnalysisPanel);

