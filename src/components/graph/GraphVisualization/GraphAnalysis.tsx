import React, { useState, useCallback } from 'react';
import type { EnhancedNode, EnhancedGraphLink } from './types';

interface GraphAnalysisProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
}

interface CentralityResult {
  nodeId: string;
  value: number;
  node: EnhancedNode;
}

interface PathResult {
  path: EnhancedNode[];
  distance: number;
}

interface CentralityMetrics {
  degree: CentralityResult[];
  betweenness: CentralityResult[];
  closeness: CentralityResult[];
  eigenvector: CentralityResult[];
}

export const GraphAnalysis: React.FC<GraphAnalysisProps> = React.memo(({ nodes, links }) => {
  const [centralityMetrics, setCentralityMetrics] = useState<CentralityMetrics | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  
  // 通用工具函数：获取节点的邻居
  const getNodeNeighbors = useCallback((nodeId: string, unique: boolean = true): string[] => {
    const neighbors: string[] = [];
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      if (sourceId === nodeId) neighbors.push(targetId);
      if (targetId === nodeId) neighbors.push(sourceId);
    });
    
    return unique ? Array.from(new Set(neighbors)) : neighbors;
  }, [links]);
  
  // 新增：基础统计信息
  const calculateBasicStats = useCallback(() => {
    const nodeCount = nodes.length;
    const linkCount = links.length;
    
    // 计算平均度
    const totalDegree = nodes.reduce((sum, node) => {
      const degree = links.filter(link => 
        (typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source)) === node.id ||
        (typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target)) === node.id
      ).length;
      return sum + degree;
    }, 0);
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    
    // 计算网络密度
    const maxPossibleLinks = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    
    // 计算聚类系数（简化版）
    let totalTriangles = 0;
    let totalPossibleTriangles = 0;
    
    nodes.forEach(node => {
      // 获取邻居
      const uniqueNeighbors = getNodeNeighbors(node.id);
      const k = uniqueNeighbors.length;
      
      // 计算可能的三角形数量
      if (k >= 2) {
        totalPossibleTriangles += k * (k - 1) / 2;
      }
      
      // 计算实际的三角形数量
      for (let i = 0; i < uniqueNeighbors.length; i++) {
        for (let j = i + 1; j < uniqueNeighbors.length; j++) {
          const neighbor1 = uniqueNeighbors[i];
          const neighbor2 = uniqueNeighbors[j];
          
          // 检查是否存在链接
          const hasLink = links.some(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
            const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
            
            return (sourceId === neighbor1 && targetId === neighbor2) ||
                   (sourceId === neighbor2 && targetId === neighbor1);
          });
          
          if (hasLink) {
            totalTriangles += 1;
          }
        }
      }
    });
    
    // 全局聚类系数
    const clusteringCoefficient = totalPossibleTriangles > 0 ? totalTriangles / totalPossibleTriangles : 0;
    
    return {
      nodeCount,
      linkCount,
      averageDegree,
      density,
      clusteringCoefficient
    };
  }, [nodes, getNodeNeighbors, links]);
  
  // 新增：连通分量分析
  const calculateConnectedComponents = useCallback(() => {
    const visited = new Set<string>();
    const components: EnhancedNode[][] = [];
    
    // BFS遍历找出所有连通分量
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const queue: string[] = [node.id];
        const component: EnhancedNode[] = [];
        
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          
          visited.add(currentId);
          const currentNode = nodes.find(n => n.id === currentId)!;
          component.push(currentNode);
          
          // 获取邻居
          const neighbors = getNodeNeighbors(currentId, false);
          
          // 添加未访问的邻居到队列
          neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
              queue.push(neighborId);
            }
          });
        }
        
        components.push(component);
      }
    });
    
    return components;
  }, [nodes, getNodeNeighbors]);
  
  // 新增：计算直径（简化版，只计算最大连通分量的直径）
  const calculateDiameter = useCallback(() => {
    const components = calculateConnectedComponents();
    if (components.length === 0) return 0;
    
    // 找到最大连通分量
    const largestComponent = components.reduce((max, component) => 
      max && component.length > max.length ? component : max, components[0]
    );
    
    let diameter = 0;
    
    // 对最大连通分量中的每个节点计算BFS
    if (largestComponent) {
      largestComponent.forEach(sourceNode => {
        // BFS计算到所有其他节点的最短距离
        const distances: Record<string, number> = {};
        const queue: { nodeId: string; distance: number }[] = [{ nodeId: sourceNode.id, distance: 0 }];
        distances[sourceNode.id] = 0;
        
        while (queue.length > 0) {
          const { nodeId, distance } = queue.shift()!;
          
          // 获取邻居
        const neighbors = getNodeNeighbors(nodeId, false);
        
        neighbors.forEach(neighborId => {
            if (!(neighborId in distances)) {
              const neighborDistance = distance + 1;
              distances[neighborId] = neighborDistance;
              queue.push({ nodeId: neighborId, distance: neighborDistance });
              
              // 更新直径
              if (neighborDistance > diameter) {
                diameter = neighborDistance;
              }
            }
          });
        }
      });
    }
    
    return diameter;
  }, [calculateConnectedComponents, getNodeNeighbors]);

  // 计算度中心性
  const calculateDegreeCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    
    nodes.forEach(node => {
      const degree = links.filter(link => 
        (typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source)) === node.id ||
        (typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target)) === node.id
      ).length;
      
      result.push({
        nodeId: node.id,
        value: degree,
        node
      });
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [nodes, links]);

  // 计算介数中心性
  const calculateBetweennessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);
    
    // 初始化介数为0
    const betweenness: Record<string, number> = {};
    nodeIds.forEach(id => betweenness[id] = 0);
    
    // 对每个节点执行BFS
    nodeIds.forEach(s => {
      const stack: string[] = [];
      const predecessors: Record<string, string[]> = {};
      const distance: Record<string, number> = {};
      const sigma: Record<string, number> = {};
      const delta: Record<string, number> = {};
      
      // 初始化
      nodeIds.forEach(id => {
        predecessors[id] = [];
        distance[id] = -1;
        sigma[id] = 0;
        delta[id] = 0;
      });
      
      distance[s] = 0;
      sigma[s] = 1;
      const queue: string[] = [s];
      
      // BFS
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        
        // 获取邻居
        const neighbors = getNodeNeighbors(v, false);
        
        neighbors.forEach(w => {
          // 第一次访问
          if ((distance[w] ?? -1) < 0) {
            queue.push(w);
            distance[w] = (distance[v] ?? 0) + 1;
          }
          
          // 最短路径
          if ((distance[w] ?? -1) === (distance[v] ?? 0) + 1) {
            sigma[w] = (sigma[w] ?? 0) + (sigma[v] ?? 0);
            predecessors[w] = predecessors[w] || [];
            predecessors[w].push(v);
          }
        });
      }
      
      // 累积介数
      while (stack.length > 0) {
        const w = stack.pop()!;
        const wPredecessors = predecessors[w] || [];
        wPredecessors.forEach(v => {
          delta[v] = (delta[v] ?? 0) + ((sigma[v] ?? 0) / (sigma[w] ?? 1)) * (1 + (delta[w] ?? 0));
        });
        if (w !== s) {
          betweenness[w] = (betweenness[w] ?? 0) + (delta[w] ?? 0);
        }
      }
    });
    
    // 转换为结果格式
    nodeIds.forEach(id => {
      const node = nodes.find(n => n.id === id)!;
      result.push({
        nodeId: id,
        value: betweenness[id] ?? 0,
        node
      });
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  // 计算接近中心性
  const calculateClosenessCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    
    nodes.forEach(node => {
      // 使用BFS计算到所有其他节点的最短距离
      const distances: Record<string, number> = {};
      const queue: { nodeId: string; distance: number }[] = [{ nodeId: node.id, distance: 0 }];
      distances[node.id] = 0;
      
      while (queue.length > 0) {
        const { nodeId, distance } = queue.shift()!;
        
        // 获取邻居
        const neighbors = getNodeNeighbors(nodeId, false);
        
        neighbors.forEach(neighborId => {
          if (!(neighborId in distances)) {
            distances[neighborId] = distance + 1;
            queue.push({ nodeId: neighborId, distance: distance + 1 });
          }
        });
      }
      
      // 计算平均距离
      const reachableNodes = Object.keys(distances).length;
      if (reachableNodes <= 1) {
        result.push({
          nodeId: node.id,
          value: 0,
          node
        });
        return;
      }
      
      const totalDistance = Object.values(distances).reduce((sum, d) => sum + d, 0);
      const closeness = (reachableNodes - 1) / totalDistance;
      
      result.push({
        nodeId: node.id,
        value: closeness,
        node
      });
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [nodes, getNodeNeighbors]);

  // 计算特征向量中心性（简化版）
  const calculateEigenvectorCentrality = useCallback(() => {
    const result: CentralityResult[] = [];
    const nodeIds = nodes.map(node => node.id);
    const n = nodeIds.length;
    
    // 初始化邻接矩阵
    const adjacencyMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const idToIndex = new Map(nodeIds.map((id, index) => [id, index]));
    
    // 构建邻接矩阵
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      const sourceIndex = idToIndex.get(sourceId);
      const targetIndex = idToIndex.get(targetId);
      
      if (sourceIndex !== undefined && targetIndex !== undefined && adjacencyMatrix[sourceIndex] && adjacencyMatrix[targetIndex]) {
        adjacencyMatrix[sourceIndex][targetIndex] = 1;
        adjacencyMatrix[targetIndex][sourceIndex] = 1;
      }
    });
    
    // 幂迭代法计算特征向量中心性
    let eigenvector = Array(n).fill(1 / Math.sqrt(n));
    const iterations = 100;
    const tolerance = 1e-6;
    
    for (let i = 0; i < iterations; i++) {
      const newEigenvector = Array(n).fill(0);
      
      for (let j = 0; j < n; j++) {
        const row = adjacencyMatrix[j];
        if (row) {
          for (let k = 0; k < n; k++) {
            newEigenvector[j] += (row[k] || 0) * eigenvector[k];
          }
        }
      }
      
      // 归一化
      const norm = Math.sqrt(newEigenvector.reduce((sum, v) => sum + v * v, 0));
      const normalized = newEigenvector.map(v => v / norm);
      
      // 检查收敛
      const diff = eigenvector.reduce((sum, v, idx) => sum + Math.abs(v - (normalized[idx] || 0)), 0);
      if (diff < tolerance) {
        eigenvector = normalized;
        break;
      }
      
      eigenvector = normalized;
    }
    
    // 转换为结果格式
    nodeIds.forEach((id, index) => {
      const node = nodes.find(n => n.id === id)!;
      result.push({
        nodeId: id,
        value: eigenvector[index] || 0,
        node
      });
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [nodes, links]);

  // 计算所有中心性指标
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

  // Dijkstra算法寻找最短路径
  const findShortestPath = useCallback(() => {
    if (!selectedSource || !selectedTarget) return;
    
    setIsCalculating(true);
    
    setTimeout(() => {
      // 初始化距离和前驱
      const distances: Record<string, number> = {};
      const predecessors: Record<string, string | null> = {};
      const visited: Set<string> = new Set();
      
      // 初始化所有节点的距离为无穷大
      nodes.forEach(node => {
        distances[node.id] = Infinity;
        predecessors[node.id] = null;
      });
      
      // 源节点距离为0
      distances[selectedSource] = 0;
      
      // 优先队列（简化版）
      const getUnvisitedNodeWithMinDistance = () => {
        let minDistance = Infinity;
        let minNodeId = '';
        
        nodes.forEach(node => {
          const nodeDistance = distances[node.id] || Infinity;
          if (!visited.has(node.id) && nodeDistance < minDistance) {
            minDistance = nodeDistance;
            minNodeId = node.id;
          }
        });
        
        return minNodeId;
      };
      
      // 执行Dijkstra算法
      for (let i = 0; i < nodes.length; i++) {
        const current = getUnvisitedNodeWithMinDistance();
        const currentDistance = distances[current] || Infinity;
        if (current === '' || currentDistance === Infinity) break;
        
        visited.add(current);
        
        // 获取邻居
        const neighbors = getNodeNeighbors(current, false);
        
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            const distance = currentDistance + 1; // 假设所有边权重为1
            const neighborDistance = distances[neighbor] || Infinity;
            if (distance < neighborDistance) {
              distances[neighbor] = distance;
              predecessors[neighbor] = current;
            }
          }
        });
      }
      
      // 构建路径
      const path: EnhancedNode[] = [];
      let current = selectedTarget;
      
      while (current && current !== selectedSource) {
        const node = nodes.find(n => n.id === current);
        if (node) {
          path.unshift(node);
          current = predecessors[current] || '';
        } else {
          break;
        }
      }
      
      // 添加源节点
      const sourceNode = nodes.find(n => n.id === selectedSource);
      if (sourceNode) {
        path.unshift(sourceNode);
      }
      
      setPathResult({
        path,
        distance: distances[selectedTarget] || Infinity
      });
      setIsCalculating(false);
    }, 100);
  }, [nodes, selectedSource, selectedTarget, getNodeNeighbors]);

  // 渲染中心性结果
  const renderCentralityResults = () => {
    if (!centralityMetrics) return null;
    
    return (
      <div className="space-y-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900">中心性指标结果</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 度中心性 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-2">度中心性</h5>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {centralityMetrics.degree.slice(0, 10).map((result, index) => (
                    <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 介数中心性 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-2">介数中心性</h5>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {centralityMetrics.betweenness.slice(0, 10).map((result, index) => (
                    <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 接近中心性 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-2">接近中心性</h5>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {centralityMetrics.closeness.slice(0, 10).map((result, index) => (
                    <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 特征向量中心性 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-2">特征向量中心性</h5>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">值</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {centralityMetrics.eigenvector.slice(0, 10).map((result, index) => (
                    <tr key={result.nodeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{result.node.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">{result.value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染路径结果
  const renderPathResult = () => {
    if (!pathResult) return null;
    
    return (
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-gray-900">最短路径结果</h4>
        <div className="bg-white p-4 rounded-lg shadow-sm mt-2">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              路径长度: {pathResult.distance === Infinity ? '不可达' : pathResult.distance}
            </p>
          </div>
          
          {pathResult.path.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pathResult.path.map((node, index) => (
                <React.Fragment key={node.id}>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                    {node.title}
                  </span>
                  {index < pathResult.path.length - 1 && (
                    <span className="text-gray-500">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">未找到路径</p>
          )}
        </div>
      </div>
    );
  };

  // 渲染基础统计信息
  const renderBasicStats = () => {
    const stats = calculateBasicStats();
    const components = calculateConnectedComponents();
    const diameter = calculateDiameter();
    
    return (
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-gray-900">基础统计信息</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* 基础指标 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-3">基础指标</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">节点数量:</span>
                <span className="font-medium text-gray-900">{stats.nodeCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">链接数量:</span>
                <span className="font-medium text-gray-900">{stats.linkCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">平均度:</span>
                <span className="font-medium text-gray-900">{stats.averageDegree.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">网络密度:</span>
                <span className="font-medium text-gray-900">{stats.density.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">聚类系数:</span>
                <span className="font-medium text-gray-900">{stats.clusteringCoefficient.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">网络直径:</span>
                <span className="font-medium text-gray-900">{diameter}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">连通分量数量:</span>
                <span className="font-medium text-gray-900">{components.length}</span>
              </div>
            </div>
          </div>
          
          {/* 连通分量 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-800 mb-3">连通分量</h5>
            <div className="max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {components.map((component, index) => (
                  <div key={index} className="border-l-2 border-blue-500 pl-3 py-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-800">
                        分量 {index + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {component.length} 个节点
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {component.slice(0, 5).map(node => (
                        <span key={node.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {node.title}
                        </span>
                      ))}
                      {component.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                          ... 等 {component.length - 5} 个节点
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">图谱分析</h3>
      
      {/* 基础统计信息 */}
      {renderBasicStats()}
      
      {/* 中心性指标计算 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">中心性指标</h4>
        <button
          onClick={calculateCentralityMetrics}
          disabled={isCalculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isCalculating ? '计算中...' : '计算中心性指标'}
        </button>
      </div>
      
      {/* 最短路径查找 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">最短路径查找</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">选择源节点</option>
            {nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">选择目标节点</option>
            {nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
          <button
            onClick={findShortestPath}
            disabled={isCalculating || !selectedSource || !selectedTarget}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isCalculating ? '查找中...' : '查找最短路径'}
          </button>
        </div>
      </div>
      
      {/* 结果显示 */}
      {renderCentralityResults()}
      {renderPathResult()}
    </div>
  );
});
