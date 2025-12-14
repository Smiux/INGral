/**
 * 图谱性能优化工具类
 * 提供节点聚合等性能优化功能
 */

import type { EnhancedNode, EnhancedGraphLink } from '../components/graph/GraphVisualization/types';

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
    links: EnhancedGraphLink[],
    aggregationThreshold: number = 30,
    minNodesForAggregation: number = 3
  ): { 
    nodes: EnhancedNode[]; 
    links: EnhancedGraphLink[]; 
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
    
    // 基于距离和重要性的节点聚合算法
    const clusters: EnhancedNode[][] = [];
    
    // 为每个未访问的节点寻找邻近节点形成聚类
    nodesCopy.forEach((node, index) => {
      if (visited.has(node.id)) return;
      
      // 如果节点重要性较高，不进行聚合
      if ((nodeImportance[node.id] ?? 0) > 0.7) {
        aggregatedNodes.push(node);
        visited.add(node.id);
        return;
      }
      
      const cluster: EnhancedNode[] = [node];
      visited.add(node.id);
      
      // 检查其他节点是否与当前节点距离足够近且重要性较低
      nodesCopy.forEach((otherNode, otherIndex) => {
        if (index === otherIndex || visited.has(otherNode.id)) return;
        
        // 如果节点重要性较高，不进行聚合
        if ((nodeImportance[otherNode.id] ?? 0) > 0.7) {
          aggregatedNodes.push(otherNode);
          visited.add(otherNode.id);
          return;
        }
        
        const distance = this.calculateDistance(node, otherNode);
        if (distance < aggregationThreshold) {
          cluster.push(otherNode);
          visited.add(otherNode.id);
        }
      });
      
      // 只有当聚类节点数量达到最小值时才进行聚合
      if (cluster.length >= minNodesForAggregation) {
        clusters.push(cluster);
      } else {
        // 单独节点不聚合
        aggregatedNodes.push(...cluster);
      }
    });
    
    // 为每个聚类创建聚合节点
    clusters.forEach(cluster => {
      // 计算聚合节点的中心位置（平均值）
      const centerX = cluster.reduce((sum, node) => sum + (node.x || 0), 0) / cluster.length;
      const centerY = cluster.reduce((sum, node) => sum + (node.y || 0), 0) / cluster.length;
      
      // 计算聚合节点的总连接数
      const totalConnections = cluster.reduce((sum, node) => sum + (node.connections || 0), 0);
      
      // 计算聚合节点的平均重要性
      const avgImportance = cluster.reduce((sum, node) => sum + (nodeImportance[node.id] || 0), 0) / cluster.length;
      
      // 创建聚合节点
      const aggregatedNode: EnhancedNode = {
        id: `aggregate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `聚合节点 (${cluster.length}个)`,
        connections: totalConnections,
        type: 'aggregate',
        x: centerX,
        y: centerY,
        isExpanded: false, // 初始状态为折叠
        // 添加聚合节点特有的属性
        _aggregatedNodes: cluster,
        _isAggregated: true,
        // 添加重要性信息
        _averageImportance: avgImportance,
        // 添加聚类中心信息
        _clusterCenter: { x: centerX, y: centerY },
        // 添加聚类节点数量信息
        _clusterSize: cluster.length
      };
      
      aggregatedNodes.push(aggregatedNode);
      aggregatedNodeIds.add(aggregatedNode.id);
      
      // 更新链接：将指向聚类中节点的链接重定向到聚合节点
      const clusterNodeIds = new Set(cluster.map(node => node.id));
      
      // 收集需要更新的链接
      const linksToUpdate = links.filter(link => {
        const sourceId = (link.source as EnhancedNode).id;
        const targetId = (link.target as EnhancedNode).id;
        return clusterNodeIds.has(sourceId) || clusterNodeIds.has(targetId);
      });
      
      // 去重处理，避免重复添加相同的链接
      const uniqueLinks = new Map<string, EnhancedGraphLink>();
      
      linksToUpdate.forEach(link => {
        // 处理作为源节点的链接
        if (clusterNodeIds.has((link.source as EnhancedNode).id)) {
          const targetId = (link.target as EnhancedNode).id;
          const linkKey = `source-${aggregatedNode.id}-${targetId}-${link.type}`;
          if (!uniqueLinks.has(linkKey)) {
            uniqueLinks.set(linkKey, {
              ...link,
              id: linkKey,
              source: aggregatedNode
            });
          }
        }
        
        // 处理作为目标节点的链接
        if (clusterNodeIds.has((link.target as EnhancedNode).id)) {
          const sourceId = (link.source as EnhancedNode).id;
          const linkKey = `target-${sourceId}-${aggregatedNode.id}-${link.type}`;
          if (!uniqueLinks.has(linkKey)) {
            uniqueLinks.set(linkKey, {
              ...link,
              id: linkKey,
              target: aggregatedNode
            });
          }
        }
      });
      
      // 添加新的链接
      uniqueLinks.forEach(link => aggregatedLinks.push(link));
      
      // 移除原始链接
      links.forEach(link => {
        const sourceId = (link.source as EnhancedNode).id;
        const targetId = (link.target as EnhancedNode).id;
        
        if (clusterNodeIds.has(sourceId) || clusterNodeIds.has(targetId)) {
          const index = aggregatedLinks.findIndex(l => l.id === link.id);
          if (index > -1) {
            aggregatedLinks.splice(index, 1);
          }
        }
      });
    });
    
    return { 
      nodes: aggregatedNodes, 
      links: aggregatedLinks, 
      aggregated: clusters.length > 0,
      aggregatedNodeIds
    };
  }
  
  /**
   * 计算节点的重要性评分
   * @param nodes 节点列表
   * @param links 链接列表
   * @returns 节点重要性评分映射
   */
  private static calculateNodeImportance(
    nodes: EnhancedNode[],
    links: EnhancedGraphLink[]
  ): Record<string, number> {
    const importance: Record<string, number> = {};
    
    // 初始化重要性
    nodes.forEach(node => {
      importance[node.id] = 0.0;
    });
    
    // 计算节点的连接度
    const degreeCentrality: Record<string, number> = {};
    nodes.forEach(node => {
      degreeCentrality[node.id] = 0;
    });
    
    links.forEach(link => {
      const sourceId = (link.source as EnhancedNode).id;
      const targetId = (link.target as EnhancedNode).id;
      if (degreeCentrality[sourceId] !== undefined) {
        degreeCentrality[sourceId]++;
      }
      if (degreeCentrality[targetId] !== undefined) {
        degreeCentrality[targetId]++;
      }
    });
    
    // 归一化连接度
    const maxDegree = Math.max(...Object.values(degreeCentrality));
    if (maxDegree > 0) {
      nodes.forEach(node => {
        importance[node.id] = (importance[node.id] || 0) + (degreeCentrality[node.id] || 0) / maxDegree * 0.6;
      });
    }
    
    // 计算节点的中间度中心性（简化版本）
    const betweennessCentrality: Record<string, number> = {};
    nodes.forEach(node => {
      betweennessCentrality[node.id] = 0;
    });
    
    // 简化的中间度计算：统计节点作为最短路径中间节点的次数
    // 这里使用简化版本，只考虑直接连接
    links.forEach(link => {
      const sourceId = (link.source as EnhancedNode).id;
      const targetId = (link.target as EnhancedNode).id;
      betweennessCentrality[sourceId] = (betweennessCentrality[sourceId] || 0) + 1;
      betweennessCentrality[targetId] = (betweennessCentrality[targetId] || 0) + 1;
    });
    
    // 归一化中间度
    const maxBetweenness = Math.max(...Object.values(betweennessCentrality));
    if (maxBetweenness > 0) {
      nodes.forEach(node => {
        importance[node.id] = (importance[node.id] || 0) + (betweennessCentrality[node.id] || 0) / maxBetweenness * 0.3;
      });
    }
    
    // 考虑节点的连接权重（如果有）
    if (links.some(link => (link.weight || 0) > 1)) {
      const weightCentrality: Record<string, number> = {};
      nodes.forEach(node => {
        weightCentrality[node.id] = 0;
      });
      
      links.forEach(link => {
        const sourceId = (link.source as EnhancedNode).id;
        const targetId = (link.target as EnhancedNode).id;
        const weight = link.weight || 1;
        weightCentrality[sourceId] = (weightCentrality[sourceId] || 0) + weight;
        weightCentrality[targetId] = (weightCentrality[targetId] || 0) + weight;
      });
      
      // 归一化权重中心性
      const maxWeight = Math.max(...Object.values(weightCentrality));
      if (maxWeight > 0) {
        nodes.forEach(node => {
          importance[node.id] = (importance[node.id] || 0) + (weightCentrality[node.id] || 0) / maxWeight * 0.1;
        });
      }
    }
    
    // 确保重要性在0到1之间
    nodes.forEach(node => {
      importance[node.id] = Math.min(1.0, Math.max(0.0, importance[node.id] || 0));
    });
    
    return importance;
  }
  
  /**
   * 展开聚合节点
   * @param aggregatedNode 聚合节点
   * @param allNodes 所有原始节点
   * @param allLinks 所有原始链接
   * @returns 展开后的节点和链接
   */
  static expandAggregatedNode(
    aggregatedNode: EnhancedNode,
    allLinks: EnhancedGraphLink[]
  ): { nodes: EnhancedNode[]; links: EnhancedGraphLink[] } {
    if (!aggregatedNode._aggregatedNodes) {
      return { nodes: [aggregatedNode], links: [] };
    }
    
    // 获取聚合的原始节点
    const originalNodes = aggregatedNode._aggregatedNodes;
    
    // 筛选出与这些节点相关的链接
    const relevantLinks = allLinks.filter(link => {
      const source = link.source as EnhancedNode;
      const target = link.target as EnhancedNode;
      
      return originalNodes.some(node => node.id === source.id || node.id === target.id);
    });
    
    return { nodes: originalNodes, links: relevantLinks };
  }
  
  /**
   * 计算两个节点之间的欧几里得距离
   * @param node1 节点1
   * @param node2 节点2
   * @returns 距离
   */
  private static calculateDistance(node1: EnhancedNode, node2: EnhancedNode): number {
    const x1 = node1.x || 0;
    const y1 = node1.y || 0;
    const x2 = node2.x || 0;
    const y2 = node2.y || 0;
    
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
}
