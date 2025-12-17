/**
 * 图谱性能优化工具类
 * 提供节点聚合等性能优化功能
 */

import type { EnhancedNode, EnhancedGraphConnection } from '../components/graph/GraphVisualization/types';

/**
 * 节点聚合工具类
 * 将距离较近的节点聚合为一个节点，提高大型图谱的渲染性能
 */
export class NodeAggregationUtils {
  /**
   * 聚合节点
   * @param nodes 节点列表
   * @param links 链接列表
   * @param aggregationThreshold 聚合距离阈值
   * @param minNodesForAggregation 最小聚合节点数量
   * @returns 聚合后的节点和链接
   */
  static aggregateNodes(
    nodes: EnhancedNode[],
    links: EnhancedGraphConnection[],
    aggregationThreshold: number = 30,
    minNodesForAggregation: number = 3
  ): { 
    nodes: EnhancedNode[]; 
    links: EnhancedGraphConnection[]; 
    aggregated: boolean;
    aggregatedNodeIds: Set<string>;
  } {
    // 如果节点数量较少，不进行聚合
    if (nodes.length <= minNodesForAggregation) {
      return { 
        nodes, 
        links, 
        aggregated: false,
        aggregatedNodeIds: new Set()
      };
    }
    
    // 创建节点副本，避免修改原始数据
    const nodesCopy = [...nodes];
    const aggregatedLinks = [...links];
    const aggregatedNodes: EnhancedNode[] = [];
    const aggregatedNodeIds = new Set<string>();
    const visited = new Set<string>();
    
    // 计算节点的重要性评分
    const nodeImportance = this.calculateNodeImportance(nodes, links);
    
    // 对节点按重要性排序，优先保留重要性高的节点
    nodesCopy.sort((a, b) => (nodeImportance.get(b.id) || 0) - (nodeImportance.get(a.id) || 0));
    
    // 对每个节点进行聚合检查
    for (let i = 0; i < nodesCopy.length; i++) {
      const currentNode = nodesCopy[i];
      
      // 如果节点已被访问或已被聚合，跳过
      if (currentNode && (visited.has(currentNode.id) || aggregatedNodeIds.has(currentNode.id))) {
        continue;
      }
      
      // 查找当前节点周围的节点
      const nearbyNodes: EnhancedNode[] = [];
      
      for (let j = i + 1; j < nodesCopy.length; j++) {
        const otherNode = nodesCopy[j];
        
        // 如果节点已被访问，跳过
        if (!otherNode || visited.has(otherNode.id)) {
          continue;
        }
        
        // 计算节点间的距离
        if (currentNode && otherNode) {
          const distance = this.calculateDistance(currentNode, otherNode);
          
          // 如果距离小于阈值，将其添加到附近节点列表
          if (distance < aggregationThreshold) {
            nearbyNodes.push(otherNode);
          }
        }
      }
      
      // 如果当前节点存在且附近节点数量足够，进行聚合
      if (currentNode && nearbyNodes.length >= minNodesForAggregation - 1) {
        // 创建聚合节点
        const aggregatedNode = this.createAggregatedNode(currentNode, nearbyNodes, nodeImportance);
        
        // 将聚合节点添加到结果列表
        aggregatedNodes.push(aggregatedNode);
        aggregatedNodeIds.add(aggregatedNode.id);
        
        // 标记当前节点和附近节点为已访问
        visited.add(currentNode.id);
        nearbyNodes.forEach(node => visited.add(node.id));
        
        // 更新链接，将指向附近节点的链接指向聚合节点
        this.updateLinksForAggregation(aggregatedNode, nearbyNodes, links, aggregatedLinks);
      } else if (currentNode) {
        // 如果没有足够的附近节点，保留原始节点
        aggregatedNodes.push(currentNode);
        visited.add(currentNode.id);
      }
    }
    
    // 移除重复的链接
    const uniqueLinks = new Map<string, EnhancedGraphConnection>();
    aggregatedLinks.forEach(link => {
      const key = `${link.source}-${link.target}-${link.type}`;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, link);
      }
    });
    
    return {
      nodes: aggregatedNodes,
      links: Array.from(uniqueLinks.values()),
      aggregated: aggregatedNodes.length < nodes.length,
      aggregatedNodeIds
    };
  }
  
  /**
   * 创建聚合节点
   * @param mainNode 主要节点
   * @param nearbyNodes 附近节点列表
   * @param nodeImportance 节点重要性评分
   * @returns 聚合节点
   */
  private static createAggregatedNode(
    mainNode: EnhancedNode,
    nearbyNodes: EnhancedNode[],
    nodeImportance: Map<string, number>
  ): EnhancedNode {
    // 创建聚合节点，使用主要节点的属性作为基础
    const aggregatedNode: EnhancedNode = {
      ...mainNode,
      id: `aggregated-${mainNode.id}-${Date.now()}`,
      title: `${mainNode.title} (${nearbyNodes.length + 1}个节点)`,
      _isAggregated: true,
      _aggregatedNodes: [mainNode, ...nearbyNodes],
      connections: 0,
      shape: 'rect',
      // 计算平均坐标
      x: ((mainNode.x || 0) + nearbyNodes.reduce((sum, node) => sum + (node.x || 0), 0)) / (nearbyNodes.length + 1),
      y: ((mainNode.y || 0) + nearbyNodes.reduce((sum, node) => sum + (node.y || 0), 0)) / (nearbyNodes.length + 1),
      // 更新聚合节点的连接数
      _averageImportance: (nodeImportance.get(mainNode.id) || 0 + 
        nearbyNodes.reduce((sum, node) => sum + (nodeImportance.get(node.id) || 0), 0)) / (nearbyNodes.length + 1)
    };
    
    return aggregatedNode;
  }
  
  /**
   * 更新链接，将指向被聚合节点的链接指向聚合节点
   * @param aggregatedNode 聚合节点
   * @param aggregatedNodes 被聚合节点列表
   * @param originalLinks 原始链接列表
   * @param aggregatedLinks 聚合后的链接列表
   */
  private static updateLinksForAggregation(
    aggregatedNode: EnhancedNode,
    aggregatedNodes: EnhancedNode[],
    originalLinks: EnhancedGraphConnection[],
    aggregatedLinks: EnhancedGraphConnection[]
  ): void {
    // 创建被聚合节点ID的集合
    const aggregatedNodeIds = new Set(aggregatedNodes.map(node => node.id));
    
    // 更新链接，将指向被聚合节点的链接指向聚合节点
    originalLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      // 如果链接的源或目标是被聚合的节点，更新链接
      if (aggregatedNodeIds.has(sourceId) || aggregatedNodeIds.has(targetId)) {
        // 创建新链接，将被聚合节点替换为聚合节点
        const newLink: EnhancedGraphConnection = {
          ...link,
          id: `aggregated-${link.id}-${Date.now()}`,
          source: aggregatedNodeIds.has(sourceId) ? aggregatedNode : link.source,
          target: aggregatedNodeIds.has(targetId) ? aggregatedNode : link.target
        };
        
        // 将新链接添加到聚合链接列表
        aggregatedLinks.push(newLink);
      }
    });
  }
  
  /**
   * 计算节点间的距离
   * @param node1 节点1
   * @param node2 节点2
   * @returns 节点间的距离
   */
  private static calculateDistance(node1: EnhancedNode, node2: EnhancedNode): number {
    const x1 = node1.x || 0;
    const y1 = node1.y || 0;
    const x2 = node2.x || 0;
    const y2 = node2.y || 0;
    
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  /**
   * 计算节点的重要性评分
   * @param nodes 节点列表
   * @param links 链接列表
   * @returns 节点重要性评分映射
   */
  private static calculateNodeImportance(nodes: EnhancedNode[], links: EnhancedGraphConnection[]): Map<string, number> {
    // 初始化节点重要性映射
    const nodeImportance = new Map<string, number>();
    
    // 为每个节点分配基础分数
    nodes.forEach(node => {
      nodeImportance.set(node.id, 1.0);
    });
    
    // 根据链接数量调整节点重要性
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      // 增加源节点和目标节点的重要性
      nodeImportance.set(sourceId, (nodeImportance.get(sourceId) || 0) + 0.5);
      nodeImportance.set(targetId, (nodeImportance.get(targetId) || 0) + 0.5);
    });
    
    return nodeImportance;
  }
  
  /**
   * 展开聚合节点
   * @param nodes 节点列表
   * @param links 链接列表
   * @param aggregatedNodeId 要展开的聚合节点ID
   * @returns 展开后的节点和链接
   */
  static expandAggregatedNode(
    nodes: EnhancedNode[],
    links: EnhancedGraphConnection[],
    aggregatedNodeId: string
  ): { 
    nodes: EnhancedNode[]; 
    links: EnhancedGraphConnection[]; 
    expanded: boolean;
    expandedNodeId: string;
  } {
    // 查找要展开的聚合节点
    const aggregatedNodeIndex = nodes.findIndex(node => node.id === aggregatedNodeId);
    
    // 如果没有找到聚合节点，返回原始数据
    if (aggregatedNodeIndex === -1) {
      return { 
        nodes, 
        links, 
        expanded: false,
        expandedNodeId: aggregatedNodeId
      };
    }
    
    const aggregatedNode = nodes[aggregatedNodeIndex];
    
    // 如果节点不是聚合节点，返回原始数据
    if (!aggregatedNode || !aggregatedNode._isAggregated || !aggregatedNode._aggregatedNodes) {
      return { 
        nodes, 
        links, 
        expanded: false,
        expandedNodeId: aggregatedNodeId
      };
    }
    
    // 创建节点副本，避免修改原始数据
    const nodesCopy = [...nodes];
    const linksCopy = [...links];
    
    // 移除聚合节点
    nodesCopy.splice(aggregatedNodeIndex, 1);
    
    // 添加被聚合的节点
    if (aggregatedNode && aggregatedNode._aggregatedNodes) {
      nodesCopy.push(...aggregatedNode._aggregatedNodes);
    }
    
    // 移除与聚合节点相关的链接
    const linksWithoutAggregatedNode = linksCopy.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      return sourceId !== aggregatedNodeId && targetId !== aggregatedNodeId;
    });
    
    // 重新添加原始链接
    const originalLinks = links.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      return aggregatedNode._aggregatedNodes?.some(node => 
        node.id === sourceId || node.id === targetId
      ) || false;
    });
    
    // 合并链接
    const allLinks = [...linksWithoutAggregatedNode, ...originalLinks];
    
    // 移除重复的链接
    const uniqueLinks = new Map<string, EnhancedGraphConnection>();
    allLinks.forEach(link => {
      const key = `${link.source}-${link.target}-${link.type}`;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, link);
      }
    });
    
    return {
      nodes: nodesCopy,
      links: Array.from(uniqueLinks.values()),
      expanded: true,
      expandedNodeId: aggregatedNodeId
    };
  }
}

/**
 * 图谱布局优化工具类
 * 提供布局优化功能，提高大型图谱的布局性能
 */
export class GraphLayoutOptimizationUtils {
  /**
   * 优化力导向布局性能
   * @param nodes 节点列表
   * @param allLinks 链接列表
   * @returns 优化后的布局参数
   */
  static optimizeForceLayout(
    nodes: EnhancedNode[],
    allLinks: EnhancedGraphConnection[]
  ): { 
    isOptimized: boolean;
    optimizedLinks: EnhancedGraphConnection[];
    optimizationDetails: {
      originalLinksCount: number;
      optimizedLinksCount: number;
      reductionPercentage: number;
    };
  } {
    // 如果节点数量较少，不进行优化
    if (nodes.length < 100) {
      return {
        isOptimized: false,
        optimizedLinks: allLinks,
        optimizationDetails: {
          originalLinksCount: allLinks.length,
          optimizedLinksCount: allLinks.length,
          reductionPercentage: 0
        }
      };
    }
    
    // 创建节点索引，用于快速查找
    const nodeIndex = new Map<string, EnhancedNode>();
    nodes.forEach(node => {
      nodeIndex.set(node.id, node);
    });
    
    // 移除无效链接（源或目标节点不存在的链接）
    const validLinks = allLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      return nodeIndex.has(sourceId) && nodeIndex.has(targetId);
    });
    
    // 移除重复链接
    const uniqueLinks = new Map<string, EnhancedGraphConnection>();
    validLinks.forEach(link => {
      const key = `${link.source}-${link.target}-${link.type}`;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, link);
      }
    });
    
    const optimizedLinks = Array.from(uniqueLinks.values());
    
    return {
      isOptimized: true,
      optimizedLinks,
      optimizationDetails: {
        originalLinksCount: allLinks.length,
        optimizedLinksCount: optimizedLinks.length,
        reductionPercentage: Math.round((1 - optimizedLinks.length / allLinks.length) * 100)
      }
    };
  }
}