import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { graphService } from '../../../services/graphService';

// 导入类型
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

// 导入服务类
import { GraphHistoryManager } from './GraphHistoryManager';
import { GraphThemeManager } from './GraphThemeManager';
import { GraphLayoutParamsManager } from './GraphLayoutParamsManager';

// 导入预设主题
import { PRESET_THEMES } from './ThemeTypes';

/**
 * 知识图谱可视化Hook
 * 管理图谱可视化的核心状态和业务逻辑
 */
export function useGraphVisualization() {
  const navigate = useNavigate();
  
  // 保留与子组件兼容的状态和setter
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<EnhancedNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<EnhancedNode[]>([]);
  const [selectedLink, setSelectedLink] = useState<EnhancedGraphLink | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<EnhancedGraphLink[]>([]);
  const [isAddingLink, setIsAddingLink] = useState<boolean>(false);
  const [linkSourceNode, setLinkSourceNode] = useState<EnhancedNode | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(true);
  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('top-bottom');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isRightPanelVisible, setIsRightPanelVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('graphRightPanelVisible');
    return saved ? JSON.parse(saved) : true;
  });
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);
  const [isLeftToolbarVisible, setIsLeftToolbarVisible] = useState<boolean>(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<GraphTheme>(() => {
    const savedTheme = localStorage.getItem('graphCurrentTheme');
    if (savedTheme) {
      return JSON.parse(savedTheme);
    }
    return PRESET_THEMES[0] || {
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
  });
  const [copiedStyle, setCopiedStyle] = useState<{ type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null>(null);
  const [toolbarAutoHide, setToolbarAutoHide] = useState<boolean>(() => {
    const saved = localStorage.getItem('graphToolbarAutoHide');
    return saved ? JSON.parse(saved) : false;
  });
  const [leftToolbarAutoHide, setLeftToolbarAutoHide] = useState<boolean>(false);
  const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);
  const [boxSelection, setBoxSelection] = useState<{ x1: number; y1: number; x2: number; y2: number }>({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  
  // 布局参数状态
  const [nodeSpacing, setNodeSpacing] = useState<number>(50);
  const [levelSpacing, setLevelSpacing] = useState<number>(100);
  const [forceParameters, setForceParameters] = useState<ForceParameters>({
    charge: -300,
    linkStrength: 0.1,
    linkDistance: 150,
    gravity: 0.1
  });
  
  // 保存的布局状态
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);

  // 通知状态
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  // 操作历史记录
  const [history, setHistory] = useState<RecentAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 添加showNotification函数，用于显示通知
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 关闭通知
  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // 初始化服务类
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const themeManager = useMemo(() => new GraphThemeManager(currentTheme, setCurrentTheme, () => {}), [currentTheme, setCurrentTheme]);
  const historyManager = useMemo(() => new GraphHistoryManager(), []);
  const layoutParamsManager = useMemo(() => new GraphLayoutParamsManager(savedLayouts, setSavedLayouts), [savedLayouts, setSavedLayouts]);

  // 初始化服务状态
  useEffect(() => {
    if (!servicesInitialized) {
      // 初始化主题管理器
      themeManager.handleThemeChange(currentTheme);
      
      // 初始化历史记录管理器
      historyManager.updateGraphData();
      
      // 初始化布局参数管理器
      // 从localStorage加载保存的布局
      try {
        const savedLayoutsStr = localStorage.getItem('savedLayouts');
        if (savedLayoutsStr) {
          const layouts = JSON.parse(savedLayoutsStr);
          setSavedLayouts(layouts);
        }
      } catch (error) {
        console.error('从localStorage加载布局失败:', error);
      }
      
      setServicesInitialized(true);
    }
  }, [servicesInitialized, currentTheme, historyManager, themeManager]);

  // 加载用户图表
  useEffect(() => {
    const loadData = async () => {
      try {
        // 安全地更新状态
        setNodes([]);
        setLinks([]);
        setIsSimulationRunning(true);

        // 尝试从服务加载数据
        const graphs = await graphService.getAllGraphs('unlisted');
        if (graphs && graphs.length > 0 && graphs[0] && graphs[0].id) {
          // 获取第一个图谱的详情
          const graphData = await graphService.getGraphById(graphs[0].id);
          if (graphData && graphData.nodes && graphData.links) {
            // 转换GraphNode[]为EnhancedNode[]
            const enhancedNodes = graphData.nodes.map(node => ({
              ...node,
              // 添加EnhancedNode所需的额外属性
              isExpanded: false,
              _isAggregated: false,
              _aggregatedNodes: [],
              type: node.type || 'concept'
            }));
            
            // 转换GraphLink[]为EnhancedGraphLink[]
            const enhancedLinks = graphData.links.map(link => ({
              ...link,
              // 添加EnhancedGraphLink所需的id属性
              id: `link-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              // source和target已经是字符串类型，不需要额外转换
              source: link.source as string,
              target: link.target as string
            }));
            
            setNodes(enhancedNodes);
            setLinks(enhancedLinks);
            showNotification('知识图谱加载成功', 'success');
          } else {
            // 没有数据时显示提示
            showNotification('知识图谱数据为空，您可以创建新节点', 'info');
          }
        } else {
          // 没有图谱时显示提示
          showNotification('没有找到知识图谱，您可以创建新图谱', 'info');
        }
      } catch (error) {
        console.error('Unexpected error in loadData:', error);

        // 确保状态正确更新，使用空数据
        setNodes([]);
        setLinks([]);
        setIsSimulationRunning(false);

        // 显示错误通知
        try {
          if (typeof showNotification === 'function') {
            showNotification('加载数据失败，请稍后重试', 'error');
          }
        } catch (notifyError) {
          console.error('Error showing notification:', notifyError);
        }
      } finally {
        setIsSimulationRunning(false);
      }
    };

    loadData();
  }, [showNotification]);

  // 顶部工具栏自动隐藏功能
  useEffect(() => {
    if (!toolbarAutoHide) return;

    let timeoutId: number | undefined;

    const handleMouseMove = (e: MouseEvent) => {
      // 清除之前的定时器
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      // 如果鼠标在顶部区域，显示工具栏
      if (e.clientY < 100) {
        setIsToolbarVisible(true);
      }

      // 设置定时器，3秒后隐藏工具栏
      timeoutId = window.setTimeout(() => {
        setIsToolbarVisible(false);
      }, 3000);
    };

    // 添加鼠标移动事件监听
    window.addEventListener('mousemove', handleMouseMove);

    // 组件卸载时清除定时器和事件监听
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [toolbarAutoHide]);

  // 左侧工具栏自动隐藏功能
  useEffect(() => {
    if (!leftToolbarAutoHide) return;

    let timeoutId: number | undefined;

    const handleMouseMove = (e: MouseEvent) => {
      // 清除之前的定时器
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      // 如果鼠标在左侧区域，显示左侧工具栏
      if (e.clientX < 200) {
        setIsLeftToolbarVisible(true);
      }

      // 设置定时器，3秒后隐藏左侧工具栏
      timeoutId = window.setTimeout(() => {
        setIsLeftToolbarVisible(false);
      }, 3000);
    };

    // 添加鼠标移动事件监听
    window.addEventListener('mousemove', handleMouseMove);

    // 组件卸载时清除定时器和事件监听
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [leftToolbarAutoHide]);

  // 保存右侧面板可见状态到localStorage
  useEffect(() => {
    localStorage.setItem('graphRightPanelVisible', JSON.stringify(isRightPanelVisible));
  }, [isRightPanelVisible]);

  // 保存工具栏自动隐藏状态到localStorage
  useEffect(() => {
    localStorage.setItem('graphToolbarAutoHide', JSON.stringify(toolbarAutoHide));
  }, [toolbarAutoHide]);

  // 保存当前主题到localStorage
  useEffect(() => {
    localStorage.setItem('graphCurrentTheme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  // 节点点击处理
  const handleNodeClick = useCallback(async (node: EnhancedNode, event: React.MouseEvent) => {
    // 检查是否是聚合节点
    if (node._isAggregated && node._aggregatedNodes) {
      // 切换展开状态 - 不直接修改节点对象，而是创建新对象
      const updatedNode = { ...node, isExpanded: !node.isExpanded };
      
      // 更新节点和链接
      setNodes(prevNodes => {
        if (updatedNode.isExpanded && node._aggregatedNodes) {
          // 展开聚合节点，添加子节点
          return [...prevNodes.filter(n => n.id !== node.id), ...node._aggregatedNodes];
        } else if (node._aggregatedNodes) {
          // 折叠聚合节点，移除子节点
          const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
          return prevNodes.filter(n => !aggregatedNodeIds.has(n.id));
        }
        return prevNodes;
      });
      
      setLinks(prevLinks => {
        if (updatedNode.isExpanded) {
          // 展开时保持原有链接
          return [...prevLinks];
        } else if (node._aggregatedNodes) {
          // 折叠时移除与子节点相关的链接
          const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
          return prevLinks.filter(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
            return !aggregatedNodeIds.has(sourceId) && !aggregatedNodeIds.has(targetId);
          });
        }
        return prevLinks;
      });
      
      // 选中当前节点
      setSelectedNode(updatedNode);
      setSelectedNodes([updatedNode]);
    } else if (event.ctrlKey || event.metaKey) {
      // 如果按住Ctrl/Cmd键，则添加到选中节点列表
      setSelectedNodes(prevSelectedNodes => {
        // 检查节点是否已经被选中
        const isSelected = prevSelectedNodes.some(n => n.id === node.id);
        if (isSelected) {
          // 已选中，从列表中移除
          return prevSelectedNodes.filter(n => n.id !== node.id);
        } else {
          // 未选中，添加到列表
          return [...prevSelectedNodes, node];
        }
      });
      
      // 更新当前选中节点
      setSelectedNodes(prevSelectedNodes => {
        const isSelected = prevSelectedNodes.some(n => n.id === node.id);
        const updatedSelectedNodes = isSelected
          ? prevSelectedNodes.filter(n => n.id !== node.id)
          : [...prevSelectedNodes, node];
        
        // 同时更新selectedNode为第一个选中节点
        setSelectedNode(updatedSelectedNodes.length > 0 ? updatedSelectedNodes[0] || null : null);
        
        return updatedSelectedNodes;
      });
    } else {
      // 正常点击，只选中当前节点
      setSelectedNode(node);
      setSelectedNodes([node]);
      
      // 不自动跳转，保留节点选择状态
      // Check if this node is linked to an article (optional feature)
      /*
      try {
        const articles = await graphService.getArticlesByNodeId(node.id);
        if (articles.length > 0) {
          // Navigate to the first linked article (commented out to preserve selection)
          // const firstArticle = articles[0];
          // if (firstArticle && firstArticle.slug) {
          //   navigate(`/article/${firstArticle.slug}`);
          // }
        }
      } catch (error) {
        console.error('Failed to fetch articles by node id:', error);
      }
      */
    }
  }, [navigate]);

  // 节点拖拽开始处理
  const handleNodeDragStart = useCallback(() => {
    // 拖拽开始时的处理逻辑
  }, []);

  // 节点拖拽结束处理
  const handleNodeDragEnd = useCallback(() => {
    // 拖拽结束时的处理逻辑
  }, []);

  // 链接点击处理
  const handleLinkClick = useCallback((link: EnhancedGraphLink) => {
    // 链接点击时的处理逻辑
    setSelectedLink(link);
    setSelectedNode(null);
    setSelectedNodes([]);
  }, []);

  // 画布点击处理
  const handleCanvasClick = useCallback(() => {
    // 画布点击时的处理逻辑
    setSelectedNode(null);
    setSelectedNodes([]);
    setSelectedLink(null);
  }, []);

  // 开始框选
  const handleBoxSelectStart = useCallback((x: number, y: number) => {
    setIsBoxSelecting(true);
    setBoxSelection({ x1: x, y1: y, x2: x, y2: y });
  }, []);

  // 更新框选区域
  const handleBoxSelectUpdate = useCallback((x: number, y: number) => {
    // 使用函数式更新，直接检查状态
    setBoxSelection(prev => {
      // 如果当前不是框选状态，prev.x1和prev.x2会相等
      if (prev.x1 === prev.x2 && prev.y1 === prev.y2) {
        return prev;
      }
      return {
        ...prev,
        x2: x,
        y2: y
      };
    });
  }, []);

  // 结束框选
  const handleBoxSelectEnd = useCallback(() => {
    // 获取当前的框选状态
    setBoxSelection(prevBoxSelection => {
      // 计算框选区域的边界
      const minX = Math.min(prevBoxSelection.x1, prevBoxSelection.x2);
      const maxX = Math.max(prevBoxSelection.x1, prevBoxSelection.x2);
      const minY = Math.min(prevBoxSelection.y1, prevBoxSelection.y2);
      const maxY = Math.max(prevBoxSelection.y1, prevBoxSelection.y2);

      // 找出所有在框选区域内的节点
      setNodes(prevNodes => {
        const selected = prevNodes.filter(node => {
          return node.x !== undefined && node.y !== undefined && 
                 node.x >= minX && node.x <= maxX && 
                 node.y >= minY && node.y <= maxY;
        });

        // 更新选中节点
        if (selected.length > 0) {
          setSelectedNodes(selected);
          setSelectedNode(selected[0] || null);
        } else {
          setSelectedNodes([]);
          setSelectedNode(null);
        }

        return prevNodes;
      });

      setIsBoxSelecting(false);
      return { x1: 0, y1: 0, x2: 0, y2: 0 };
    });
  }, []);

  // 更新节点处理
  const handleUpdateNode = useCallback((updatedNode: EnhancedNode) => {
    setNodes(prevNodes => {
      return prevNodes.map(node => {
        if (node.id === updatedNode.id) {
          return updatedNode;
        }
        return node;
      });
    });
    setSelectedNode(updatedNode);
    showNotification('节点属性已更新', 'success');
  }, [showNotification]);

  // 更新链接处理
  const handleUpdateLink = useCallback((updatedLink: EnhancedGraphLink) => {
    setLinks(prevLinks => {
      return prevLinks.map(link => {
        if (link.id === updatedLink.id) {
          return updatedLink;
        }
        return link;
      });
    });
    setSelectedLink(updatedLink);
    showNotification('链接属性已更新', 'success');
  }, [showNotification]);

  // 记录操作历史
  const addHistory = useCallback((action: RecentAction) => {
    // 使用历史管理器添加历史记录
    historyManager.addHistoryItem(action);
    setHistory(historyManager.history);
    setHistoryIndex(historyManager.historyIndex);
  }, [historyManager]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    // 使用历史管理器处理撤销
    historyManager.handleUndo();
    // 更新状态
    setNodes(nodes => historyManager.canUndo ? [...nodes] : nodes);
    setLinks(links => historyManager.canUndo ? [...links] : links);
    setHistory(historyManager.history);
    setHistoryIndex(historyManager.historyIndex);
    showNotification('已撤销操作', 'info');
  }, [historyManager, showNotification]);

  // 重做操作
  const handleRedo = useCallback(() => {
    // 使用历史管理器处理重做
    historyManager.handleRedo();
    // 更新状态
    setNodes(nodes => historyManager.canRedo ? [...nodes] : nodes);
    setLinks(links => historyManager.canRedo ? [...links] : links);
    setHistory(historyManager.history);
    setHistoryIndex(historyManager.historyIndex);
    showNotification('已重做操作', 'info');
  }, [historyManager, showNotification]);

  // 复制节点样式
  const handleCopyNodeStyle = useCallback(() => {
    if (!selectedNode) {
      showNotification('请先选择一个节点', 'error');
      return;
    }
    
    // 使用主题管理器复制节点样式
    themeManager.handleStyleCopy('node', currentTheme.node);
    setCopiedStyle({
      type: 'node',
      style: currentTheme.node
    });
    
    showNotification('已复制节点样式', 'success');
  }, [selectedNode, currentTheme, showNotification, themeManager]);

  // 复制链接样式
  const handleCopyLinkStyle = useCallback(() => {
    if (!selectedLink) {
      showNotification('请先选择一个链接', 'error');
      return;
    }
    
    // 使用主题管理器复制链接样式
    themeManager.handleStyleCopy('link', currentTheme.link);
    setCopiedStyle({
      type: 'link',
      style: currentTheme.link
    });
    
    showNotification('已复制链接样式', 'success');
  }, [selectedLink, currentTheme, showNotification, themeManager]);

  // 粘贴样式
  const handlePasteStyle = useCallback(() => {
    if (!copiedStyle) {
      showNotification('没有复制的样式', 'error');
      return;
    }
    
    // 使用主题管理器粘贴样式
    const updatedTheme: GraphTheme = {
      ...currentTheme,
      [copiedStyle.type]: copiedStyle.style
    };
    
    themeManager.handleThemeChange(updatedTheme);
    setCurrentTheme(updatedTheme);
    showNotification(`已粘贴${copiedStyle.type === 'node' ? '节点' : '链接'}样式`, 'success');
  }, [copiedStyle, currentTheme, showNotification, themeManager]);

  // 处理导入图谱
  const handleImportGraph = useCallback((graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => {
    // 转换导入的节点为EnhancedNode类型
    const newNodes: EnhancedNode[] = graph.nodes.map((node: EnhancedNode) => ({
      id: String(node.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
      title: node.title || '新节点',
      connections: node.connections || 0,
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
      type: node.type || 'concept',
      content: node.content ?? '',
      is_custom: true
    }));
    
    // 转换导入的链接为EnhancedGraphLink类型
    const newLinks: EnhancedGraphLink[] = graph.links.map((link: EnhancedGraphLink) => {
      const source = link.source && typeof link.source === 'object' ? String((link.source as EnhancedNode).id) : String(link.source);
      const target = link.target && typeof link.target === 'object' ? String((link.target as EnhancedNode).id) : String(link.target);
      
      return {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: link.type || 'related',
        source: source,
        target: target,
        label: link.label || '',
        weight: link.weight || 1.0
      };
    });
    
    setNodes(newNodes);
    setLinks(newLinks);
    showNotification('图谱已导入', 'success');
  }, [showNotification]);
  
  // 保存布局
  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    // 使用布局参数管理器保存布局
    layoutParamsManager.handleLayoutSave(layout.name, nodes, links, layoutType, layoutDirection);
    setSavedLayouts(layoutParamsManager.savedLayouts);
    showNotification('布局已保存', 'success');
  }, [nodes, links, layoutType, layoutDirection, layoutParamsManager, showNotification]);
  
  // 加载布局
  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    // 使用布局参数管理器加载布局
    layoutParamsManager.handleLayoutApply();
    // 更新布局参数
    setLayoutType(layout.layout.layoutType);
    setLayoutDirection(layout.layout.layoutDirection);
    showNotification('布局已加载', 'success');
  }, [layoutParamsManager, showNotification]);
  
  // 删除布局
  const handleDeleteLayout = useCallback((layoutId: string) => {
    // 使用布局参数管理器删除布局
    layoutParamsManager.handleLayoutDelete(layoutId);
    setSavedLayouts(layoutParamsManager.savedLayouts);
    showNotification('布局已删除', 'success');
  }, [layoutParamsManager, showNotification]);
  
  // 画布拖拽放置处理
  const handleCanvasDrop = useCallback((_event: React.DragEvent, x: number, y: number) => {
    // 创建新节点
    const newNode: EnhancedNode = {
      id: `node_${Date.now()}`,
      title: '新节点',
      x,
      y,
      connections: 0,
      is_custom: true,
    };

    // 添加新节点到节点列表
    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // 记录操作历史
    const action: RecentAction = {
      type: 'addNode',
      nodeId: newNode.id,
      timestamp: Date.now(),
      data: { node: newNode }
    };
    historyManager.addHistoryItem(action);
    addHistory(action);
    
    showNotification('节点创建成功', 'success');
  }, [showNotification, addHistory, historyManager]);

  // 切换面板显示状态
  const togglePanel = useCallback((panelId: string | null) => {
    setActivePanel(prevActivePanel => prevActivePanel === panelId ? null : panelId);
  }, []);

  // 返回所有状态和函数
  return {
    // 节点和链接数据
    nodes,
    links,
    selectedNode,
    selectedNodes,
    selectedLink,
    selectedLinks,
    
    // 交互状态
    isAddingLink,
    linkSourceNode,
    mousePosition,
    isSimulationRunning,
    
    // 布局状态
    layoutType,
    layoutDirection,
    viewMode,
    
    // UI状态
    isRightPanelVisible,
    isToolbarVisible,
    isLeftToolbarVisible,
    activePanel,
    currentTheme,
    copiedStyle,
    isBoxSelecting,
    boxSelection,
    isSettingsPanelOpen,
    isShortcutsOpen,
    toolbarAutoHide,
    leftToolbarAutoHide,
    
    // 布局参数
    nodeSpacing,
    levelSpacing,
    forceParameters,
    
    // 保存的布局
    savedLayouts,
    
    // 通知状态
    notification,
    
    // 历史记录
    history,
    historyIndex,
    
    // 状态更新函数
    setNodes,
    setLinks,
    setSelectedNode,
    setSelectedNodes,
    setSelectedLink,
    setSelectedLinks,
    setIsAddingLink,
    setLinkSourceNode,
    setMousePosition,
    setIsSimulationRunning,
    setLayoutType,
    setLayoutDirection,
    setViewMode,
    setIsRightPanelVisible,
    setIsToolbarVisible,
    setIsLeftToolbarVisible,
    setActivePanel,
    setCurrentTheme,
    setCopiedStyle,
    setIsBoxSelecting,
    setBoxSelection,
    setIsSettingsPanelOpen,
    setIsShortcutsOpen,
    setNodeSpacing,
    setLevelSpacing,
    setForceParameters,
    setSavedLayouts,
    setNotification,
    setToolbarAutoHide,
    setLeftToolbarAutoHide,
    
    // 回调函数
    showNotification,
    closeNotification,
    handleNodeClick,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleLinkClick,
    handleCanvasClick,
    handleBoxSelectStart,
    handleBoxSelectUpdate,
    handleBoxSelectEnd,
    handleUpdateNode,
    handleUpdateLink,
    handleUndo,
    handleRedo,
    handleCopyNodeStyle,
    handleCopyLinkStyle,
    handlePasteStyle,
    handleImportGraph,
    handleSaveLayout,
    handleLoadLayout,
    handleDeleteLayout,
    handleCanvasDrop,
    togglePanel,
    addHistory,
  };
}