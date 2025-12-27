/**
 * 图谱性能优化工具类
 * 提供节点聚合等性能优化功能
 */

import type { GraphNode, GraphConnection } from '../components/graph/GraphVisualization/GraphTypes';

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
  static aggregateNodes (
    nodes: GraphNode[],
    links: GraphConnection[],
    aggregationThreshold: number = 30,
    minNodesForAggregation: number = 3
  ): {
    nodes: GraphNode[];
    links: GraphConnection[];
    aggregated: boolean;
    aggregatedNodeIds: Set<string>;
  } {
    // 如果节点数量较少，不进行聚合
    if (nodes.length <= minNodesForAggregation) {
      return {
        nodes,
        links,
        'aggregated': false,
        'aggregatedNodeIds': new Set()
      };
    }

    // 创建节点副本，避免修改原始数据
    const nodesCopy = [...nodes];
    const aggregatedLinks = [...links];
    const aggregatedNodes: GraphNode[] = [];
    const aggregatedNodeIds = new Set<string>();
    const visited = new Set<string>();

    // 计算节点的重要性评分
    const nodeImportance = this.calculateNodeImportance(nodes, links);

    // 对节点按重要性排序，优先保留重要性高的节点
    nodesCopy.sort((a, b) => (nodeImportance.get(b.id) || 0) - (nodeImportance.get(a.id) || 0));

    // 辅助函数：查找当前节点周围的节点
    const findNearbyNodes = (currentNode: GraphNode, currentIndex: number): GraphNode[] => {
      const nearbyNodes: GraphNode[] = [];

      for (let j = currentIndex + 1; j < nodesCopy.length; j += 1) {
        const otherNode = nodesCopy[j];

        // 仅处理存在且未被访问的节点
        if (otherNode && !visited.has(otherNode.id)) {
          // 计算节点间的距离
          const distance = this.calculateDistance(currentNode, otherNode);

          // 如果距离小于阈值，将其添加到附近节点列表
          if (distance < aggregationThreshold) {
            nearbyNodes.push(otherNode);
          }
        }
      }

      return nearbyNodes;
    };

    // 辅助函数：处理节点聚合或保留
    const processNode = (currentNode: GraphNode, nearbyNodes: GraphNode[]) => {
      if (nearbyNodes.length >= minNodesForAggregation - 1) {
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
      } else {
        // 如果没有足够的附近节点，保留原始节点
        aggregatedNodes.push(currentNode);
        visited.add(currentNode.id);
      }
    };

    // 对每个节点进行聚合检查
    for (let i = 0; i < nodesCopy.length; i += 1) {
      const currentNode = nodesCopy[i];

      // 仅处理有效、未被访问且未被聚合的节点
      if (currentNode && !visited.has(currentNode.id) && !aggregatedNodeIds.has(currentNode.id)) {
        // 查找当前节点周围的节点
        const nearbyNodes = findNearbyNodes(currentNode, i);

        // 处理节点聚合或保留
        processNode(currentNode, nearbyNodes);
      }
    }

    // 移除重复的链接
    const uniqueLinks = new Map<string, GraphConnection>();
    aggregatedLinks.forEach(link => {
      const key = `${String(link.source)}-${String(link.target)}-${link.type}`;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, link);
      }
    });

    return {
      'nodes': aggregatedNodes,
      'links': Array.from(uniqueLinks.values()),
      'aggregated': aggregatedNodes.length < nodes.length,
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
  private static createAggregatedNode (
    mainNode: GraphNode,
    nearbyNodes: GraphNode[],
    nodeImportance: Map<string, number>
  ): GraphNode {
    // 计算平均坐标
    const avgX = ((mainNode.layout.x || 0) + nearbyNodes.reduce((sum, node) => sum + (node.layout.x || 0), 0)) / (nearbyNodes.length + 1);
    const avgY = ((mainNode.layout.y || 0) + nearbyNodes.reduce((sum, node) => sum + (node.layout.y || 0), 0)) / (nearbyNodes.length + 1);

    // 计算平均重要性
    const avgImportance = (nodeImportance.get(mainNode.id) || 0 +
        nearbyNodes.reduce((sum, node) => sum + (nodeImportance.get(node.id) || 0), 0)) / (nearbyNodes.length + 1);

    // 创建聚合节点，使用主要节点的属性作为基础
    const aggregatedNode: GraphNode = {
      ...mainNode,
      'id': `aggregated-${mainNode.id}-${Date.now()}`,
      'title': `${mainNode.title} (${nearbyNodes.length + 1}个节点)`,
      'connections': 0,
      'shape': 'rect',
      'layout': {
        'x': avgX,
        'y': avgY,
        'isFixed': false,
        'isExpanded': false
      },
      'customData': {
        'aggregation': {
          '_aggregatedNodes': [mainNode, ...nearbyNodes],
          '_isAggregated': true,
          '_averageImportance': avgImportance,
          '_clusterCenter': { 'x': avgX, 'y': avgY },
          '_clusterSize': nearbyNodes.length + 1,
          '_aggregationLevel': 1
        }
      }
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
  private static updateLinksForAggregation (
    aggregatedNode: GraphNode,
    aggregatedNodes: GraphNode[],
    originalLinks: GraphConnection[],
    aggregatedLinks: GraphConnection[]
  ): void {
    // 创建被聚合节点ID的集合
    const aggregatedNodeIds = new Set(aggregatedNodes.map(node => node.id));

    // 更新链接，将指向被聚合节点的链接指向聚合节点
    originalLinks.forEach(link => {
      const sourceId = String(link.source);
      const targetId = String(link.target);

      // 如果链接的源或目标是被聚合的节点，更新链接
      if (aggregatedNodeIds.has(sourceId) || aggregatedNodeIds.has(targetId)) {
        // 创建新链接，将被聚合节点替换为聚合节点
        const newLink: GraphConnection = {
          ...link,
          'id': `aggregated-${link.id}-${Date.now()}`,
          'source': aggregatedNodeIds.has(sourceId) ? aggregatedNode.id : link.source,
          'target': aggregatedNodeIds.has(targetId) ? aggregatedNode.id : link.target
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
  private static calculateDistance (node1: GraphNode, node2: GraphNode): number {
    const x1 = node1.layout.x || 0;
    const y1 = node1.layout.y || 0;
    const x2 = node2.layout.x || 0;
    const y2 = node2.layout.y || 0;

    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * 计算节点的重要性评分
   * @param nodes 节点列表
   * @param links 链接列表
   * @returns 节点重要性评分映射
   */
  private static calculateNodeImportance (nodes: GraphNode[], links: GraphConnection[]): Map<string, number> {
    // 初始化节点重要性映射
    const nodeImportance = new Map<string, number>();

    // 为每个节点分配基础分数
    nodes.forEach(node => {
      nodeImportance.set(node.id, 1.0);
    });

    // 根据链接数量调整节点重要性
    links.forEach(link => {
      const sourceId = String(link.source);
      const targetId = String(link.target);

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
  static expandAggregatedNode (
    nodes: GraphNode[],
    links: GraphConnection[],
    aggregatedNodeId: string
  ): {
    nodes: GraphNode[];
    links: GraphConnection[];
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
        'expanded': false,
        'expandedNodeId': aggregatedNodeId
      };
    }

    const aggregatedNode = nodes[aggregatedNodeIndex];

    // 如果节点不是聚合节点，返回原始数据
    const aggregationData = aggregatedNode?.customData?.aggregation as { _isAggregated?: boolean; _aggregatedNodes?: GraphNode[] } | undefined;
    if (!aggregatedNode || !aggregationData?._isAggregated || !aggregationData?._aggregatedNodes) {
      return {
        nodes,
        links,
        'expanded': false,
        'expandedNodeId': aggregatedNodeId
      };
    }

    // 创建节点副本，避免修改原始数据
    const nodesCopy = [...nodes];

    // 移除聚合节点
    nodesCopy.splice(aggregatedNodeIndex, 1);

    // 添加被聚合的节点
    if (aggregatedNode && aggregatedNode.customData && aggregationData && aggregationData._aggregatedNodes) {
      nodesCopy.push(...aggregationData._aggregatedNodes);
    }

    // 移除与聚合节点相关的链接
    const linksWithoutAggregatedNode = links.filter(link => {
      const sourceId = String(link.source);
      const targetId = String(link.target);

      return sourceId !== aggregatedNodeId && targetId !== aggregatedNodeId;
    });

    return {
      'nodes': nodesCopy,
      'links': linksWithoutAggregatedNode,
      'expanded': true,
      'expandedNodeId': aggregatedNodeId
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
  static optimizeForceLayout (
    nodes: GraphNode[],
    allLinks: GraphConnection[]
  ): {
    isOptimized: boolean;
    optimizedLinks: GraphConnection[];
    optimizationDetails: {
      originalLinksCount: number;
      optimizedLinksCount: number;
      reductionPercentage: number;
    };
  } {
    // 如果节点数量较少，不进行优化
    if (nodes.length < 100) {
      return {
        'isOptimized': false,
        'optimizedLinks': allLinks,
        'optimizationDetails': {
          'originalLinksCount': allLinks.length,
          'optimizedLinksCount': allLinks.length,
          'reductionPercentage': 0
        }
      };
    }

    // 创建节点索引，用于快速查找
    const nodeIndex = new Map<string, GraphNode>();
    nodes.forEach(node => {
      nodeIndex.set(node.id, node);
    });

    // 移除无效链接（源或目标节点不存在的链接）
    const validLinks = allLinks.filter(link => {
      const sourceId = String(link.source);
      const targetId = String(link.target);

      return nodeIndex.has(sourceId) && nodeIndex.has(targetId);
    });

    // 移除重复链接
    const uniqueLinks = new Map<string, GraphConnection>();
    validLinks.forEach(link => {
      const key = `${String(link.source)}-${String(link.target)}-${link.type}`;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, link);
      }
    });

    const optimizedLinks = Array.from(uniqueLinks.values());

    return {
      'isOptimized': true,
      optimizedLinks,
      'optimizationDetails': {
        'originalLinksCount': allLinks.length,
        'optimizedLinksCount': optimizedLinks.length,
        'reductionPercentage': Math.round((1 - optimizedLinks.length / allLinks.length) * 100)
      }
    };
  }
}
