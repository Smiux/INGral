/**
 * 图谱性能优化工具类
 * 提供虚拟渲染、节点聚合等性能优化功能
 */

import type { EnhancedNode, EnhancedGraphLink } from '../components/graph/GraphVisualization/types';

/**
 * 视图边界类型定义
 */
export interface ViewBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * 虚拟渲染工具类
 * 只渲染可视区域内的节点和链接，提高大型图谱的渲染性能
 */
export class VirtualRenderingUtils {
  /**
   * 计算视图边界
   * @param containerWidth 容器宽度
   * @param containerHeight 容器高度
   * @param scale 当前缩放比例
   * @param translation 当前平移位置
   * @returns 视图边界
   */
  static calculateViewBounds(
    containerWidth: number,
    containerHeight: number,
    scale: number,
    translation: { x: number; y: number }
  ): ViewBounds {
    return {
      xMin: (-translation.x / scale) - containerWidth / (2 * scale),
      xMax: (-translation.x / scale) + containerWidth / (2 * scale),
      yMin: (-translation.y / scale) - containerHeight / (2 * scale),
      yMax: (-translation.y / scale) + containerHeight / (2 * scale)
    };
  }

  /**
   * 检查节点是否在可视区域内
   * @param node 节点
   * @param bounds 视图边界
   * @param padding 内边距，用于提前渲染即将进入可视区域的节点
   * @returns 是否在可视区域内
   */
  static isNodeInView(
    node: EnhancedNode,
    bounds: ViewBounds,
    padding: number = 100
  ): boolean {
    const nodeX = node.x || 0;
    const nodeY = node.y || 0;
    
    return (
      nodeX >= bounds.xMin - padding &&
      nodeX <= bounds.xMax + padding &&
      nodeY >= bounds.yMin - padding &&
      nodeY <= bounds.yMax + padding
    );
  }

  /**
   * 检查链接是否在可视区域内
   * @param link 链接
   * @param bounds 视图边界
   * @param padding 内边距
   * @returns 是否在可视区域内
   */
  static isLinkInView(
    link: EnhancedGraphLink,
    bounds: ViewBounds,
    padding: number = 100
  ): boolean {
    const source = link.source as EnhancedNode;
    const target = link.target as EnhancedNode;
    
    const sourceX = source.x || 0;
    const sourceY = source.y || 0;
    const targetX = target.x || 0;
    const targetY = target.y || 0;
    
    // 检查链接的两个端点是否都在可视区域外
    const isSourceInView = this.isNodeInView(source, bounds, padding);
    const isTargetInView = this.isNodeInView(target, bounds, padding);
    
    if (isSourceInView || isTargetInView) {
      return true;
    }
    
    // 检查链接是否与可视区域边界相交
    // 使用线段-矩形相交算法
    return this.lineIntersectsRect(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      bounds
    );
  }

  /**
   * 检查线段是否与矩形相交
   * @param p1 线段起点
   * @param p2 线段终点
   * @param rect 矩形边界
   * @returns 是否相交
   */
  private static lineIntersectsRect(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    rect: ViewBounds
  ): boolean {
    // 检查线段是否与矩形的四条边相交
    const edges = [
      // 上边
      { p1: { x: rect.xMin, y: rect.yMin }, p2: { x: rect.xMax, y: rect.yMin } },
      // 右边
      { p1: { x: rect.xMax, y: rect.yMin }, p2: { x: rect.xMax, y: rect.yMax } },
      // 下边
      { p1: { x: rect.xMax, y: rect.yMax }, p2: { x: rect.xMin, y: rect.yMax } },
      // 左边
      { p1: { x: rect.xMin, y: rect.yMax }, p2: { x: rect.xMin, y: rect.yMin } }
    ];
    
    return edges.some(edge => this.lineSegmentsIntersect(p1, p2, edge.p1, edge.p2));
  }

  /**
   * 检查两条线段是否相交
   * @param p1 第一条线段起点
   * @param p2 第一条线段终点
   * @param p3 第二条线段起点
   * @param p4 第二条线段终点
   * @returns 是否相交
   */
  private static lineSegmentsIntersect(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): boolean {
    // 使用叉积算法判断两条线段是否相交
    const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    };
    
    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  }

  /**
   * 获取可视区域内的节点
   * @param nodes 所有节点
   * @param bounds 视图边界
   * @param padding 内边距
   * @returns 可视区域内的节点
   */
  static getVisibleNodes(
    nodes: EnhancedNode[],
    bounds: ViewBounds,
    padding: number = 100
  ): EnhancedNode[] {
    return nodes.filter(node => this.isNodeInView(node, bounds, padding));
  }

  /**
   * 获取可视区域内的链接
   * @param links 所有链接
   * @param bounds 视图边界
   * @param padding 内边距
   * @returns 可视区域内的链接
   */
  static getVisibleLinks(
    links: EnhancedGraphLink[],
    bounds: ViewBounds,
    padding: number = 100
  ): EnhancedGraphLink[] {
    return links.filter(link => this.isLinkInView(link, bounds, padding));
  }

  /**
   * 获取可视区域内的节点和链接
   * @param nodes 所有节点
   * @param links 所有链接
   * @param bounds 视图边界
   * @param padding 内边距
   * @returns 可视区域内的节点和链接
   */
  static getVisibleElements(
    nodes: EnhancedNode[],
    links: EnhancedGraphLink[],
    bounds: ViewBounds,
    padding: number = 100
  ): { nodes: EnhancedNode[]; links: EnhancedGraphLink[] } {
    const visibleNodes = this.getVisibleNodes(nodes, bounds, padding);
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    
    // 只返回连接到可视节点的链接
    const visibleLinks = links.filter(link => {
      const source = link.source as EnhancedNode;
      const target = link.target as EnhancedNode;
      
      return visibleNodeIds.has(source.id) || visibleNodeIds.has(target.id);
    });
    
    return { nodes: visibleNodes, links: visibleLinks };
  }
}

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
    
    // 基于距离的节点聚合算法
    const clusters: EnhancedNode[][] = [];
    
    // 为每个未访问的节点寻找邻近节点形成聚类
    nodesCopy.forEach((node, index) => {
      if (visited.has(node.id)) return;
      
      const cluster: EnhancedNode[] = [node];
      visited.add(node.id);
      
      // 检查其他节点是否与当前节点距离足够近
      nodesCopy.forEach((otherNode, otherIndex) => {
        if (index === otherIndex || visited.has(otherNode.id)) return;
        
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
      
      // 创建聚合节点
      const aggregatedNode: EnhancedNode = {
        id: `aggregate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `聚合节点 (${cluster.length}个)`,
        connections: cluster.reduce((sum, node) => sum + node.connections, 0),
        type: 'aggregate',
        x: centerX,
        y: centerY,
        isExpanded: false, // 初始状态为折叠
        // 添加聚合节点特有的属性
        _aggregatedNodes: cluster,
        _isAggregated: true
      };
      
      aggregatedNodes.push(aggregatedNode);
      aggregatedNodeIds.add(aggregatedNode.id);
      
      // 更新链接：将指向聚类中节点的链接重定向到聚合节点
      cluster.forEach(node => {
        // 处理作为源节点的链接
        links.forEach(link => {
          if ((link.source as EnhancedNode).id === node.id) {
            const newLink: EnhancedGraphLink = {
              ...link,
              id: `aggregated-${link.id}-source`,
              source: aggregatedNode
            };
            aggregatedLinks.push(newLink);
          }
          
          // 处理作为目标节点的链接
          if ((link.target as EnhancedNode).id === node.id) {
            const newLink: EnhancedGraphLink = {
              ...link,
              id: `aggregated-${link.id}-target`,
              target: aggregatedNode
            };
            aggregatedLinks.push(newLink);
          }
        });
      });
      
      // 移除原始链接
      cluster.forEach(node => {
        links.forEach(link => {
          const sourceId = (link.source as EnhancedNode).id;
          const targetId = (link.target as EnhancedNode).id;
          
          if (sourceId === node.id || targetId === node.id) {
            const index = aggregatedLinks.findIndex(l => l.id === link.id);
            if (index > -1) {
              aggregatedLinks.splice(index, 1);
            }
          }
        });
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
