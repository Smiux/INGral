import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, SavedLayout, ForceParameters } from './types';
import { GraphUtils } from './GraphUtils';

/**
 * 图谱可视化布局管理类，处理布局相关的逻辑
 */
export class GraphLayoutManager {
  private static instance: GraphLayoutManager;
  
  // 布局参数
  private nodeSpacing: number = 50;
  private levelSpacing: number = 100;
  private forceParameters: ForceParameters = {
    charge: -300,
    linkStrength: 0.1,
    linkDistance: 150,
    gravity: 0.1
  };
  
  // 保存的布局
  private savedLayouts: SavedLayout[] = [];

  private constructor() {
    // 从localStorage加载保存的布局
    this.savedLayouts = GraphUtils.loadSavedLayoutsFromLocalStorage();
  }

  /**
   * 获取单例实例
   * @returns 布局管理实例
   */
  static getInstance(): GraphLayoutManager {
    if (!GraphLayoutManager.instance) {
      GraphLayoutManager.instance = new GraphLayoutManager();
    }
    return GraphLayoutManager.instance;
  }

  // 状态访问器
  getNodeSpacing(): number { return this.nodeSpacing; }
  getLevelSpacing(): number { return this.levelSpacing; }
  getForceParameters(): ForceParameters { return this.forceParameters; }
  getSavedLayouts(): SavedLayout[] { return this.savedLayouts; }

  // 状态更新方法
  setNodeSpacing(spacing: number): void {
    this.nodeSpacing = spacing;
  }

  setLevelSpacing(spacing: number): void {
    this.levelSpacing = spacing;
  }

  setForceParameters(params: ForceParameters): void {
    this.forceParameters = params;
  }

  setSavedLayouts(layouts: SavedLayout[]): void {
    this.savedLayouts = layouts;
    GraphUtils.saveSavedLayoutsToLocalStorage(layouts);
  }

  /**
   * 应用布局到节点数组
   * @param nodes 节点数组
   * @param links 链接数组
   * @param layoutType 布局类型
   * @param direction 布局方向
   * @returns 应用布局后的节点数组
   */
  applyLayout(
    nodes: EnhancedNode[],
    links: EnhancedGraphLink[],
    layoutType: LayoutType,
    direction: LayoutDirection
  ): EnhancedNode[] {
    // 根据布局类型应用不同的布局算法
    switch (layoutType) {
      case 'force':
        return this.applyForceLayout([...nodes]);
      case 'hierarchical':
        return this.applyHierarchicalLayout([...nodes], links, direction);
      case 'circular':
        return this.applyCircularLayout([...nodes]);
      case 'grid':
        return this.applyGridLayout([...nodes]);
      case 'radial':
        return this.applyRadialLayout([...nodes], links);
      case 'tree':
        return this.applyTreeLayout([...nodes], links, direction);
      default:
        return this.applyForceLayout([...nodes]);
    }
  }

  /**
   * 应用力导向布局
   * @param nodes 节点数组
   * @returns 应用布局后的节点数组
   */
  private applyForceLayout(nodes: EnhancedNode[]): EnhancedNode[] {
    // 力导向布局的简化实现，实际应用中可能需要更复杂的物理引擎
    nodes.forEach(node => {
      // 随机初始化位置
      node.x = Math.random() * 400 + 100;
      node.y = Math.random() * 400 + 100;
      node.vx = 0;
      node.vy = 0;
    });
    return nodes;
  }

  /**
   * 应用层级布局
   * @param nodes 节点数组
   * @param links 链接数组
   * @param direction 布局方向
   * @returns 应用布局后的节点数组
   */
  private applyHierarchicalLayout(
    nodes: EnhancedNode[],
    links: EnhancedGraphLink[],
    direction: LayoutDirection
  ): EnhancedNode[] {
    // 层级布局实现
    const nodeMap = new Map<string, EnhancedNode>();
    const childrenMap = new Map<string, string[]>();
    const parentsMap = new Map<string, string[]>();
    
    // 初始化节点映射
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      childrenMap.set(node.id, []);
      parentsMap.set(node.id, []);
    });
    
    // 构建父子关系
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
      
      childrenMap.get(sourceId)?.push(targetId);
      parentsMap.get(targetId)?.push(sourceId);
    });
    
    // 找到根节点
    const rootNodes = nodes.filter(node => parentsMap.get(node.id)?.length === 0);
    
    // 层级布局算法
    const y = 100;
    const levelHeight = this.levelSpacing;
    const nodeWidth = this.nodeSpacing;
    
    // 简单的层级布局实现
    rootNodes.forEach((root, rootIndex) => {
      this.layoutHierarchyNode(
        root, 
        rootIndex * nodeWidth * 2, 
        y, 
        nodeMap, 
        childrenMap, 
        levelHeight, 
        direction
      );
    });
    
    return nodes;
  }

  /**
   * 递归布局层级节点
   * @param node 当前节点
   * @param x x坐标
   * @param y y坐标
   * @param nodeMap 节点映射
   * @param childrenMap 子节点映射
   * @param levelHeight 层级高度
   * @param direction 布局方向
   * @param level 当前层级
   */
  private layoutHierarchyNode(
    node: EnhancedNode,
    x: number,
    y: number,
    nodeMap: Map<string, EnhancedNode>,
    childrenMap: Map<string, string[]>,
    levelHeight: number,
    direction: LayoutDirection,
    level: number = 0
  ): void {
    // 设置节点位置
    switch (direction) {
      case 'top-bottom':
        node.x = x;
        node.y = y + level * levelHeight;
        break;
      case 'bottom-top':
        node.x = x;
        node.y = y - level * levelHeight;
        break;
      case 'left-right':
        node.x = x + level * levelHeight;
        node.y = y;
        break;
      case 'right-left':
        node.x = x - level * levelHeight;
        node.y = y;
        break;
    }
    
    // 布局子节点
    const childrenIds = childrenMap.get(node.id) || [];
    childrenIds.forEach((childId, childIndex) => {
      const child = nodeMap.get(childId);
      if (child) {
        this.layoutHierarchyNode(
          child, 
          x + childIndex * 150, 
          y, 
          nodeMap, 
          childrenMap, 
          levelHeight, 
          direction, 
          level + 1
        );
      }
    });
  }

  /**
   * 应用环形布局
   * @param nodes 节点数组
   * @returns 应用布局后的节点数组
   */
  private applyCircularLayout(nodes: EnhancedNode[]): EnhancedNode[] {
    // 环形布局实现
    const centerX = 300;
    const centerY = 300;
    const radius = 200;
    const angleStep = (2 * Math.PI) / nodes.length;
    
    nodes.forEach((node, index) => {
      const angle = index * angleStep;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });
    
    return nodes;
  }

  /**
   * 应用网格布局
   * @param nodes 节点数组
   * @returns 应用布局后的节点数组
   */
  private applyGridLayout(nodes: EnhancedNode[]): EnhancedNode[] {
    // 网格布局实现
    const gridSize = Math.ceil(Math.sqrt(nodes.length));
    const nodeSpacing = this.nodeSpacing;
    const offsetX = 100;
    const offsetY = 100;
    
    nodes.forEach((node, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      node.x = offsetX + col * nodeSpacing;
      node.y = offsetY + row * nodeSpacing;
    });
    
    return nodes;
  }

  /**
   * 应用放射状布局
   * @param nodes 节点数组
   * @param links 链接数组
   * @returns 应用布局后的节点数组
   */
  private applyRadialLayout(nodes: EnhancedNode[], links: EnhancedGraphLink[]): EnhancedNode[] {
    // 放射状布局实现
    const centerX = 300;
    const centerY = 300;
    
    // 如果节点数组为空，直接返回
    if (nodes.length === 0) {
      return nodes;
    }
    
    // 找到中心节点（连接数最多的节点）
    let centerNode = nodes[0];
    let maxConnections = 0;
    
    nodes.forEach(node => {
      const connections = links.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
        return sourceId === node.id || targetId === node.id;
      }).length;
      
      if (connections > maxConnections) {
        maxConnections = connections;
        centerNode = node;
      }
    });
    
    // 设置中心节点位置
    if (centerNode) {
      centerNode.x = centerX;
      centerNode.y = centerY;
      
      // 布局其他节点
      let angle = 0;
      const angleStep = (2 * Math.PI) / (nodes.length - 1);
      
      nodes.forEach(node => {
        if (node.id !== centerNode!.id) {
          const radius = this.nodeSpacing;
          node.x = centerX + radius * Math.cos(angle);
          node.y = centerY + radius * Math.sin(angle);
          angle += angleStep;
        }
      });
    }
    
    return nodes;
  }

  /**
   * 应用树形布局
   * @param nodes 节点数组
   * @param links 链接数组
   * @param direction 布局方向
   * @returns 应用布局后的节点数组
   */
  private applyTreeLayout(
    nodes: EnhancedNode[],
    links: EnhancedGraphLink[],
    direction: LayoutDirection
  ): EnhancedNode[] {
    // 树形布局实现
    const nodeMap = new Map<string, EnhancedNode>();
    const childrenMap = new Map<string, string[]>();
    const parentsMap = new Map<string, string[]>();
    
    // 初始化节点映射
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      childrenMap.set(node.id, []);
      parentsMap.set(node.id, []);
    });
    
    // 构建父子关系
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
      
      childrenMap.get(sourceId)?.push(targetId);
      parentsMap.get(targetId)?.push(sourceId);
    });
    
    // 找到根节点
    const rootNodes = nodes.filter(node => parentsMap.get(node.id)?.length === 0);
    
    // 树形布局算法
    const y = 100;
    const levelHeight = this.levelSpacing;
    const nodeWidth = this.nodeSpacing;
    
    // 简单的树形布局实现
    rootNodes.forEach((root, rootIndex) => {
      this.layoutTreeNode(
        root, 
        rootIndex * nodeWidth * 3, 
        y, 
        nodeMap, 
        childrenMap, 
        levelHeight, 
        direction
      );
    });
    
    return nodes;
  }

  /**
   * 递归布局树形节点
   * @param node 当前节点
   * @param x x坐标
   * @param y y坐标
   * @param nodeMap 节点映射
   * @param childrenMap 子节点映射
   * @param levelHeight 层级高度
   * @param direction 布局方向
   * @param level 当前层级
   */
  private layoutTreeNode(
    node: EnhancedNode,
    x: number,
    y: number,
    nodeMap: Map<string, EnhancedNode>,
    childrenMap: Map<string, string[]>,
    levelHeight: number,
    direction: LayoutDirection,
    level: number = 0
  ): void {
    // 设置节点位置
    switch (direction) {
      case 'top-bottom':
        node.x = x;
        node.y = y + level * levelHeight;
        break;
      case 'bottom-top':
        node.x = x;
        node.y = y - level * levelHeight;
        break;
      case 'left-right':
        node.x = x + level * levelHeight;
        node.y = y;
        break;
      case 'right-left':
        node.x = x - level * levelHeight;
        node.y = y;
        break;
    }
    
    // 布局子节点
    const childrenIds = childrenMap.get(node.id) || [];
    childrenIds.forEach((childId, childIndex) => {
      const child = nodeMap.get(childId);
      if (child) {
        this.layoutTreeNode(
          child, 
          x + (childIndex - childrenIds.length / 2) * this.nodeSpacing, 
          y, 
          nodeMap, 
          childrenMap, 
          levelHeight, 
          direction, 
          level + 1
        );
      }
    });
  }

  /**
   * 保存布局
   * @param layout 布局对象
   */
  handleSaveLayout(layout: SavedLayout): void {
    this.savedLayouts.push(layout);
    GraphUtils.saveSavedLayoutsToLocalStorage(this.savedLayouts);
  }

  /**
   * 加载布局
   * @param layout 布局对象
   */
  handleLoadLayout(layout: SavedLayout): void {
    // 更新布局参数
    this.setNodeSpacing(layout.layout.nodeSpacing || this.nodeSpacing);
    this.setLevelSpacing(layout.layout.levelSpacing || this.levelSpacing);
    this.setForceParameters(layout.layout.forceParameters || this.forceParameters);
  }

  /**
   * 删除布局
   * @param layoutId 布局ID
   */
  handleDeleteLayout(layoutId: string): void {
    this.savedLayouts = this.savedLayouts.filter(layout => layout.id !== layoutId);
    GraphUtils.saveSavedLayoutsToLocalStorage(this.savedLayouts);
  }

  /**
   * 更新力导向参数
   * @param key 参数键
   * @param value 参数值
   */
  handleForceParameterChange(key: keyof ForceParameters, value: number): void {
    this.forceParameters = {
      ...this.forceParameters,
      [key]: value
    };
  }
}
