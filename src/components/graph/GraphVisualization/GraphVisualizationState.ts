import { graphService } from '../../../services/graphService';
import type { EnhancedNode, EnhancedGraphLink, RecentAction, LayoutType, LayoutDirection } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';
import { PRESET_THEMES } from './ThemeTypes';
import { GraphUtils } from './GraphUtils';

/**
 * 图谱可视化状态管理类，管理核心状态和相关的处理方法
 */
export class GraphVisualizationState {
  private static instance: GraphVisualizationState;
  
  // 状态变量
  private nodes: EnhancedNode[] = [];
  private links: EnhancedGraphLink[] = [];
  private selectedNode: EnhancedNode | null = null;
  private selectedNodes: EnhancedNode[] = [];
  private selectedLink: EnhancedGraphLink | null = null;
  private selectedLinks: EnhancedGraphLink[] = [];
  private isAddingLink: boolean = false;
  private linkSourceNode: EnhancedNode | null = null;
  private mousePosition: { x: number; y: number } | null = null;
  private isSimulationRunning: boolean = true;
  private layoutType: LayoutType = 'force';
  private layoutDirection: LayoutDirection = 'top-bottom';
  private viewMode: '2d' | '3d' = '2d';
  private isLeftPanelCollapsed: boolean = false;
  private isToolbarVisible: boolean = true;
  private isLeftToolbarVisible: boolean = true;
  private activePanel: string | null = null;
  private currentTheme: GraphTheme;
  private copiedStyle: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null = null;
  private toolbarAutoHide: boolean = false;
  private leftToolbarAutoHide: boolean = false;
  private isBoxSelecting: boolean = false;
  private boxSelection: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 0, y2: 0 };
  private isSettingsPanelOpen: boolean = false;
  private isShortcutsOpen: boolean = false;
  private notification: { message: string; type: 'success' | 'info' | 'error' } | null = null;
  private history: RecentAction[] = [];
  private historyIndex: number = -1;
  
  // 回调函数
  private onStateChange: () => void;
  private navigate: (path: string) => void;

  // 私有构造函数，单例模式
  private constructor(onStateChange: () => void, navigate: (path: string) => void) {
    this.onStateChange = onStateChange;
    this.navigate = navigate;
    
    // 初始化主题
    const savedTheme = GraphUtils.loadCurrentThemeFromLocalStorage();
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = PRESET_THEMES[0] || {
        id: 'default',
        name: '默认主题',
        node: {
          fill: '#8b5cf6',
          stroke: '#fff',
          strokeWidth: 2,
          radius: 20,
          fontSize: 12,
          textFill: '#fff'
        },
        link: {
          stroke: '#999',
          strokeWidth: 2,
          strokeOpacity: 0.6
        },
        backgroundColor: '#f9fafb'
      };
    }
    
    // 从localStorage加载其他状态
    this.isLeftPanelCollapsed = JSON.parse(localStorage.getItem('graphLeftPanelCollapsed') || 'false');
    this.toolbarAutoHide = JSON.parse(localStorage.getItem('graphToolbarAutoHide') || 'false');
  }

  /**
   * 获取单例实例
   * @param onStateChange 状态变化回调函数
   * @param navigate React Router navigate函数
   * @returns 状态管理实例
   */
  static getInstance(onStateChange: () => void, navigate: (path: string) => void): GraphVisualizationState {
    if (!GraphVisualizationState.instance) {
      GraphVisualizationState.instance = new GraphVisualizationState(onStateChange, navigate);
    }
    return GraphVisualizationState.instance;
  }

  // 状态访问器
  getNodes(): EnhancedNode[] { return this.nodes; }
  getLinks(): EnhancedGraphLink[] { return this.links; }
  getSelectedNode(): EnhancedNode | null { return this.selectedNode; }
  getSelectedNodes(): EnhancedNode[] { return this.selectedNodes; }
  getSelectedLink(): EnhancedGraphLink | null { return this.selectedLink; }
  getSelectedLinks(): EnhancedGraphLink[] { return this.selectedLinks; }
  getIsAddingLink(): boolean { return this.isAddingLink; }
  getLinkSourceNode(): EnhancedNode | null { return this.linkSourceNode; }
  getMousePosition(): { x: number; y: number } | null { return this.mousePosition; }
  getIsSimulationRunning(): boolean { return this.isSimulationRunning; }
  getLayoutType(): LayoutType { return this.layoutType; }
  getLayoutDirection(): LayoutDirection { return this.layoutDirection; }
  getViewMode(): '2d' | '3d' { return this.viewMode; }
  getIsLeftPanelCollapsed(): boolean { return this.isLeftPanelCollapsed; }
  getIsToolbarVisible(): boolean { return this.isToolbarVisible; }
  getIsLeftToolbarVisible(): boolean { return this.isLeftToolbarVisible; }
  getActivePanel(): string | null { return this.activePanel; }
  getCurrentTheme(): GraphTheme { return this.currentTheme; }
  getCopiedStyle(): { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null { return this.copiedStyle; }
  getToolbarAutoHide(): boolean { return this.toolbarAutoHide; }
  getLeftToolbarAutoHide(): boolean { return this.leftToolbarAutoHide; }
  getIsBoxSelecting(): boolean { return this.isBoxSelecting; }
  getBoxSelection(): { x1: number; y1: number; x2: number; y2: number } { return this.boxSelection; }
  getIsSettingsPanelOpen(): boolean { return this.isSettingsPanelOpen; }
  getIsShortcutsOpen(): boolean { return this.isShortcutsOpen; }
  getNotification(): { message: string; type: 'success' | 'info' | 'error' } | null { return this.notification; }
  getHistory(): RecentAction[] { return this.history; }
  getHistoryIndex(): number { return this.historyIndex; }

  // 状态更新方法
  setNodes(newNodes: EnhancedNode[]): void {
    this.nodes = newNodes;
    this.onStateChange();
  }

  setLinks(newLinks: EnhancedGraphLink[]): void {
    this.links = newLinks;
    this.onStateChange();
  }

  setSelectedNode(node: EnhancedNode | null): void {
    this.selectedNode = node;
    this.onStateChange();
  }

  setSelectedNodes(nodes: EnhancedNode[]): void {
    this.selectedNodes = nodes;
    this.onStateChange();
  }

  setSelectedLink(link: EnhancedGraphLink | null): void {
    this.selectedLink = link;
    this.onStateChange();
  }

  setSelectedLinks(links: EnhancedGraphLink[]): void {
    this.selectedLinks = links;
    this.onStateChange();
  }

  setIsAddingLink(isAdding: boolean): void {
    this.isAddingLink = isAdding;
    this.onStateChange();
  }

  setLinkSourceNode(node: EnhancedNode | null): void {
    this.linkSourceNode = node;
    this.onStateChange();
  }

  setMousePosition(position: { x: number; y: number } | null): void {
    this.mousePosition = position;
    this.onStateChange();
  }

  setIsSimulationRunning(isRunning: boolean): void {
    this.isSimulationRunning = isRunning;
    this.onStateChange();
  }

  setLayoutType(type: LayoutType): void {
    this.layoutType = type;
    this.onStateChange();
  }

  setLayoutDirection(direction: LayoutDirection): void {
    this.layoutDirection = direction;
    this.onStateChange();
  }

  setViewMode(mode: '2d' | '3d'): void {
    this.viewMode = mode;
    this.onStateChange();
  }

  setIsLeftPanelCollapsed(isCollapsed: boolean): void {
    this.isLeftPanelCollapsed = isCollapsed;
    localStorage.setItem('graphLeftPanelCollapsed', JSON.stringify(isCollapsed));
    this.onStateChange();
  }

  setIsToolbarVisible(isVisible: boolean): void {
    this.isToolbarVisible = isVisible;
    this.onStateChange();
  }

  setIsLeftToolbarVisible(isVisible: boolean): void {
    this.isLeftToolbarVisible = isVisible;
    this.onStateChange();
  }

  setActivePanel(panelId: string | null): void {
    this.activePanel = panelId;
    this.onStateChange();
  }

  setCurrentTheme(theme: GraphTheme): void {
    this.currentTheme = theme;
    GraphUtils.saveCurrentThemeToLocalStorage(theme);
    this.onStateChange();
  }

  setCopiedStyle(style: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null): void {
    this.copiedStyle = style;
    this.onStateChange();
  }

  setToolbarAutoHide(autohide: boolean): void {
    this.toolbarAutoHide = autohide;
    localStorage.setItem('graphToolbarAutoHide', JSON.stringify(autohide));
    this.onStateChange();
  }

  setLeftToolbarAutoHide(autohide: boolean): void {
    this.leftToolbarAutoHide = autohide;
    this.onStateChange();
  }

  setIsBoxSelecting(isSelecting: boolean): void {
    this.isBoxSelecting = isSelecting;
    this.onStateChange();
  }

  setBoxSelection(selection: { x1: number; y1: number; x2: number; y2: number }): void {
    this.boxSelection = selection;
    this.onStateChange();
  }

  setIsSettingsPanelOpen(isOpen: boolean): void {
    this.isSettingsPanelOpen = isOpen;
    this.onStateChange();
  }

  setIsShortcutsOpen(isOpen: boolean): void {
    this.isShortcutsOpen = isOpen;
    this.onStateChange();
  }

  setNotification(notification: { message: string; type: 'success' | 'info' | 'error' } | null): void {
    this.notification = notification;
    this.onStateChange();
  }

  setHistory(history: RecentAction[]): void {
    this.history = history;
    this.onStateChange();
  }

  setHistoryIndex(index: number): void {
    this.historyIndex = index;
    this.onStateChange();
  }

  // 通知相关方法
  showNotification(message: string, type: 'success' | 'info' | 'error'): void {
    this.setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => this.setNotification(null), 3000);
  }

  closeNotification(): void {
    this.setNotification(null);
  }

  // 节点点击处理
  handleNodeClick = async (node: EnhancedNode, event: React.MouseEvent): Promise<void> => {
    // 检查是否是聚合节点
    if (node._isAggregated && node._aggregatedNodes) {
      // 切换展开状态 - 不直接修改节点对象，而是创建新对象
      const updatedNode = { ...node, isExpanded: !node.isExpanded };
      
      // 更新节点和链接
      if (updatedNode.isExpanded && node._aggregatedNodes) {
        // 展开聚合节点，添加子节点
        this.setNodes([...this.nodes.filter(n => n.id !== node.id), ...node._aggregatedNodes]);
      } else if (node._aggregatedNodes) {
        // 折叠聚合节点，移除子节点
        const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
        this.setNodes(this.nodes.filter(n => !aggregatedNodeIds.has(n.id)));
      }
      
      this.setSelectedNode(updatedNode);
      this.setSelectedNodes([updatedNode]);
    } else if (event.ctrlKey || event.metaKey) {
      // 如果按住Ctrl/Cmd键，则添加到选中节点列表
      const isSelected = this.selectedNodes.some(n => n.id === node.id);
      if (isSelected) {
        // 已选中，从列表中移除
        this.setSelectedNodes(this.selectedNodes.filter(n => n.id !== node.id));
      } else {
        // 未选中，添加到列表
        this.setSelectedNodes([...this.selectedNodes, node]);
      }
      
      // 更新当前选中节点
      const updatedSelectedNodes = isSelected
        ? this.selectedNodes.filter(n => n.id !== node.id)
        : [...this.selectedNodes, node];
      
      this.setSelectedNode(updatedSelectedNodes.length > 0 ? updatedSelectedNodes[0] || null : null);
    } else {
      // 正常点击，只选中当前节点
      this.setSelectedNode(node);
      this.setSelectedNodes([node]);
      this.setSelectedLink(null);
      
      // Check if this node is linked to an article
      try {
        const articles = await graphService.getArticlesByNodeId(node.id);
        if (articles.length > 0) {
          // Navigate to the first linked article
          const firstArticle = articles[0];
          if (firstArticle && firstArticle.slug) {
            this.navigate(`/article/${firstArticle.slug}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch articles by node id:', error);
      }
    }
  };

  // 节点拖拽开始处理
  handleNodeDragStart = (): void => {
    // 拖拽开始时的处理逻辑
  };

  // 节点拖拽结束处理
  handleNodeDragEnd = (): void => {
    // 拖拽结束时的处理逻辑
  };

  // 链接点击处理
  handleLinkClick = (link: EnhancedGraphLink): void => {
    // 链接点击时的处理逻辑
    this.setSelectedLink(link);
    this.setSelectedNode(null);
    this.setSelectedNodes([]);
  };

  // 画布点击处理
  handleCanvasClick = (): void => {
    // 画布点击时的处理逻辑
    this.setSelectedLink(null);
    this.setSelectedNode(null);
    this.setSelectedNodes([]);
  };

  // 开始框选
  handleBoxSelectStart = (x: number, y: number): void => {
    this.setIsBoxSelecting(true);
    this.setBoxSelection({ x1: x, y1: y, x2: x, y2: y });
  };

  // 更新框选区域
  handleBoxSelectUpdate = (x: number, y: number): void => {
    // 使用函数式更新，直接检查状态
    const prevSelection = this.getBoxSelection();
    if (prevSelection.x1 === prevSelection.x2 && prevSelection.y1 === prevSelection.y2) {
      return;
    }
    this.setBoxSelection({
      ...prevSelection,
      x2: x,
      y2: y
    });
  };

  // 结束框选
  handleBoxSelectEnd = (): void => {
    // 获取当前的框选状态
    const prevBoxSelection = this.getBoxSelection();
    
    // 计算框选区域的边界
    const minX = Math.min(prevBoxSelection.x1, prevBoxSelection.x2);
    const maxX = Math.max(prevBoxSelection.x1, prevBoxSelection.x2);
    const minY = Math.min(prevBoxSelection.y1, prevBoxSelection.y2);
    const maxY = Math.max(prevBoxSelection.y1, prevBoxSelection.y2);

    // 找出所有在框选区域内的节点
    const selected = this.getNodes().filter(node => {
      return node.x !== undefined && node.y !== undefined && 
             node.x >= minX && node.x <= maxX && 
             node.y >= minY && node.y <= maxY;
    });

    // 更新选中节点
    if (selected.length > 0) {
      this.setSelectedNodes(selected);
      this.setSelectedNode(selected[0] || null);
    } else {
      this.setSelectedNodes([]);
      this.setSelectedNode(null);
    }

    this.setIsBoxSelecting(false);
    this.setBoxSelection({ x1: 0, y1: 0, x2: 0, y2: 0 });
  };

  // 更新节点处理
  handleUpdateNode = (updatedNode: EnhancedNode): void => {
    this.setNodes(this.nodes.map(node => {
      if (node.id === updatedNode.id) {
        return updatedNode;
      }
      return node;
    }));
    this.setSelectedNode(updatedNode);
    this.showNotification('节点属性已更新', 'success');
  };

  // 更新链接处理
  handleUpdateLink = (updatedLink: EnhancedGraphLink): void => {
    this.setLinks(this.links.map(link => {
      if (link.id === updatedLink.id) {
        return updatedLink;
      }
      return link;
    }));
    this.setSelectedLink(updatedLink);
    this.showNotification('链接属性已更新', 'success');
  };

  // 记录操作历史
  addHistory = (action: RecentAction): void => {
    // 添加新操作并限制历史记录长度为50
    const newHistory = [...this.history, action].slice(-50);
    this.setHistory(newHistory);
    this.setHistoryIndex(newHistory.length - 1);
  };

  // 撤销操作
  handleUndo = (): void => {
    if (this.historyIndex < 0) return;
    
    const action = this.history[this.historyIndex];
    if (!action) return;
    
    let newNodes = [...this.nodes];
    let newLinks = [...this.links];
    
    // 根据操作类型执行撤销
    switch (action.type) {
      case 'addNode':
        // 撤销添加节点，删除该节点
        newNodes = newNodes.filter(node => node.id !== action.nodeId);
        break;
      case 'deleteNode':
        // 撤销删除节点，重新添加该节点和关联的链接
        newNodes.push(action.data.node);
        newLinks.push(...action.data.links);
        break;
      case 'addLink':
        // 撤销添加链接，删除该链接
        newLinks = newLinks.filter(link => link.id !== action.linkId);
        break;
      case 'deleteLink':
        // 撤销删除链接，重新添加该链接
        newLinks.push(action.data);
        break;
    }
    
    // 更新状态
    this.setNodes(newNodes);
    this.setLinks(newLinks);
    this.setHistoryIndex(this.historyIndex - 1);
    this.showNotification('已撤销操作', 'info');
  };

  // 重做操作
  handleRedo = (): void => {
    if (this.historyIndex >= this.history.length - 1) return;
    
    const nextIndex = this.historyIndex + 1;
    const action = this.history[nextIndex];
    if (!action) return;
    
    let newNodes = [...this.nodes];
    let newLinks = [...this.links];
    
    // 根据操作类型执行重做
    switch (action.type) {
      case 'addNode':
        // 重做添加节点，重新添加该节点
        newNodes.push(action.data.node);
        break;
      case 'deleteNode':
        // 重做删除节点，删除该节点和关联的链接
        newNodes = newNodes.filter(node => node.id !== action.nodeId);
        newLinks = newLinks.filter(link => {
          return !action.data.links.some((l: EnhancedGraphLink) => l.id === link.id);
        });
        break;
      case 'addLink':
        // 重做添加链接，重新添加该链接
        newLinks.push(action.data as EnhancedGraphLink);
        break;
      case 'deleteLink':
        // 重做删除链接，删除该链接
        newLinks = newLinks.filter(link => link.id !== action.linkId);
        break;
    }
    
    // 更新状态
    this.setNodes(newNodes);
    this.setLinks(newLinks);
    this.setHistoryIndex(nextIndex);
    this.showNotification('已重做操作', 'info');
  };

  // 复制节点样式
  handleCopyNodeStyle = (): void => {
    if (!this.selectedNode) {
      this.showNotification('请先选择一个节点', 'error');
      return;
    }
    
    // 复制当前主题的节点样式
    this.setCopiedStyle({
      type: 'node',
      style: this.currentTheme.node
    });
    
    this.showNotification('已复制节点样式', 'success');
  };

  // 复制链接样式
  handleCopyLinkStyle = (): void => {
    if (!this.selectedLink) {
      this.showNotification('请先选择一个链接', 'error');
      return;
    }
    
    // 复制当前主题的链接样式
    this.setCopiedStyle({
      type: 'link',
      style: this.currentTheme.link
    });
    
    this.showNotification('已复制链接样式', 'success');
  };

  // 粘贴样式
  handlePasteStyle = (): void => {
    if (!this.copiedStyle) {
      this.showNotification('没有复制的样式', 'error');
      return;
    }
    
    // 根据复制的样式类型更新主题
    const updatedTheme: GraphTheme = {
      ...this.currentTheme,
      [this.copiedStyle.type]: this.copiedStyle.style
    };
    
    this.setCurrentTheme(updatedTheme);
    this.showNotification(`已粘贴${this.copiedStyle.type === 'node' ? '节点' : '链接'}样式`, 'success');
  };

  // 处理导入图谱
  handleImportGraph = (graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }): void => {
    // 转换导入的节点为EnhancedNode类型
    const newNodes: EnhancedNode[] = GraphUtils.convertToEnhancedNodes(graph.nodes);
    
    // 转换导入的链接为EnhancedGraphLink类型
    const newLinks: EnhancedGraphLink[] = GraphUtils.convertToEnhancedLinks(graph.links);
    
    this.setNodes(newNodes);
    this.setLinks(newLinks);
    this.showNotification('图谱已导入', 'success');
  };

  // 画布拖拽放置处理
  handleCanvasDrop = (_event: React.DragEvent, x: number, y: number): void => {
    // 创建新节点
    const newNode: EnhancedNode = {
      id: GraphUtils.generateNodeId(),
      title: '新节点',
      x,
      y,
      connections: 0,
      is_custom: true,
    };

    // 添加新节点到节点列表
    this.setNodes([...this.nodes, newNode]);
    
    // 记录操作历史
    this.addHistory({
      type: 'addNode',
      nodeId: newNode.id,
      timestamp: Date.now(),
      data: { node: newNode }
    });
    
    this.showNotification('节点创建成功', 'success');
  };

  // 切换面板显示状态
  togglePanel = (panelId: string | null): void => {
    this.setActivePanel(this.activePanel === panelId ? null : panelId);
  };
}
