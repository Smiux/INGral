import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Undo, Redo, Plus, Link, Layout, Palette, PieChart, ChevronLeft, ChevronRight, ChevronDown, Box, Grid, Settings } from 'lucide-react';
import { KeyboardShortcuts } from '../keyboard/KeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { graphService } from '../../services/graphService';
import { Notification } from '../common/Notification';

// 导入子组件
import { NodeManagement } from './GraphVisualization/NodeManagement';
import { LinkManagement } from './GraphVisualization/LinkManagement';
import { GraphCanvas } from './GraphVisualization/GraphCanvas';
import { GraphCanvas3D } from './GraphVisualization/GraphCanvas3D';
import { LayoutManager } from './GraphVisualization/LayoutManager';
import { NodeProperties } from './GraphVisualization/NodeProperties';
import { LinkProperties } from './GraphVisualization/LinkProperties';
import { ThemeManager } from './GraphVisualization/ThemeManager';
import { GraphImportExport } from './GraphVisualization/GraphImportExport';
import { GraphAnalysis } from './GraphVisualization/GraphAnalysis';
import { GraphLegend } from './GraphVisualization/GraphLegend';
import { PRESET_THEMES, type GraphTheme } from './GraphVisualization/ThemeTypes';

// 导入类型
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './GraphVisualization/types';
import type { NodeStyle, LinkStyle } from './GraphVisualization/ThemeTypes';



/**
 * 知识图谱可视化组件
 * 提供交互式知识图谱的创建、编辑、可视化和管理功能
 *
 * 主要功能：
 * - 图可视化与交互（拖拽、缩放、平移）
 * - 节点和链接的创建、编辑和删除
 * - 模板系统支持
 * - 节点搜索和筛选
 * - 样式自定义
 * - 导入导出功能
 * - 节点聚类
 * - 操作历史记录（撤销/前进）
 * - 键盘快捷键支持
 */
export function GraphVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // 原始状态管理，保留与子组件兼容的setter
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
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('graphLeftPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
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
  const [autoHideTimeout, setAutoHideTimeout] = useState<number | undefined>();
  const [leftAutoHideTimeout, setLeftAutoHideTimeout] = useState<number | undefined>();
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

  // 操作历史记录
  const [history, setHistory] = useState<RecentAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 加载用户图表
  useEffect(() => {
    const loadData = async () => {
      try {
        // 安全地更新状态
        setNodes([]);
        setLinks([]);
        setIsSimulationRunning(true);

        // 显示加载成功通知
        showNotification('知识图谱加载成功', 'success');
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
      }
    };

    loadData();
  }, [showNotification]);

  // 顶部工具栏自动隐藏功能
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!toolbarAutoHide) return;

      // 清除之前的定时器
      if (autoHideTimeout) {
        window.clearTimeout(autoHideTimeout);
      }

      // 如果鼠标在顶部区域，显示工具栏
      if (e.clientY < 100) {
        setIsToolbarVisible(true);
      }

      // 设置定时器，3秒后隐藏工具栏
      const timeoutId = window.setTimeout(() => {
        setIsToolbarVisible(false);
      }, 3000);

      setAutoHideTimeout(timeoutId);
    };

    // 添加鼠标移动事件监听
    window.addEventListener('mousemove', handleMouseMove);

    // 组件卸载时清除定时器和事件监听
    return () => {
      if (autoHideTimeout) {
        window.clearTimeout(autoHideTimeout);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [toolbarAutoHide, autoHideTimeout]);

  // 左侧工具栏自动隐藏功能
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!leftToolbarAutoHide || isLeftPanelCollapsed) return;

      // 清除之前的定时器
      if (leftAutoHideTimeout) {
        window.clearTimeout(leftAutoHideTimeout);
      }

      // 如果鼠标在左侧区域，显示左侧工具栏
      if (e.clientX < 200) {
        setIsLeftToolbarVisible(true);
      }

      // 设置定时器，3秒后隐藏左侧工具栏
      const timeoutId = window.setTimeout(() => {
        setIsLeftToolbarVisible(false);
      }, 3000);

      setLeftAutoHideTimeout(timeoutId);
    };

    // 添加鼠标移动事件监听
    window.addEventListener('mousemove', handleMouseMove);

    // 组件卸载时清除定时器和事件监听
    return () => {
      if (leftAutoHideTimeout) {
        window.clearTimeout(leftAutoHideTimeout);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [leftToolbarAutoHide, leftAutoHideTimeout, isLeftPanelCollapsed]);

  // 保存左侧面板折叠状态到localStorage
  useEffect(() => {
    localStorage.setItem('graphLeftPanelCollapsed', JSON.stringify(isLeftPanelCollapsed));
  }, [isLeftPanelCollapsed]);

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
      // 切换展开状态
      node.isExpanded = !node.isExpanded;
      
      // 更新节点和链接
      if (node.isExpanded) {
        // 展开聚合节点，添加子节点
        const updatedNodes = [...nodes.filter(n => n.id !== node.id), ...node._aggregatedNodes];
        // 生成新的链接，连接子节点
        const updatedLinks = [...links];
        setNodes(updatedNodes);
        setLinks(updatedLinks);
      } else {
        // 折叠聚合节点，移除子节点
        const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
        const updatedNodes = nodes.filter(n => !aggregatedNodeIds.has(n.id));
        // 移除与子节点相关的链接
        const updatedLinks = links.filter(link => {
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
          const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
          return !aggregatedNodeIds.has(sourceId) && !aggregatedNodeIds.has(targetId);
        });
        setNodes(updatedNodes);
        setLinks(updatedLinks);
      }
      
      // 选中当前节点
      setSelectedNode(node);
      setSelectedNodes([node]);
    } else if (event.ctrlKey || event.metaKey) {
      // 如果按住Ctrl/Cmd键，则添加到选中节点列表
      // 检查节点是否已经被选中
      if (selectedNodes.some(n => n.id === node.id)) {
        // 已选中，从列表中移除
        const updatedSelectedNodes = selectedNodes.filter(n => n.id !== node.id);
        setSelectedNodes(updatedSelectedNodes);
        // 如果移除的是当前选中的单个节点，则清除选中节点
        if (selectedNode && selectedNode.id === node.id) {
          setSelectedNode(updatedSelectedNodes.length > 0 ? updatedSelectedNodes[0] || null : null);
        }
      } else {
        // 未选中，添加到列表
        const newSelectedNodes = [...selectedNodes, node];
        setSelectedNodes(newSelectedNodes);
        setSelectedNode(node);
      }
    } else {
      // 正常点击，只选中当前节点
      setSelectedNode(node);
      setSelectedNodes([node]);
      
      // Check if this node is linked to an article
      const articles = await graphService.getArticlesByNodeId(node.id);
      if (articles.length > 0) {
        // Navigate to the first linked article
        const firstArticle = articles[0];
        if (firstArticle && firstArticle.slug) {
          navigate(`/article/${firstArticle.slug}`);
        }
      }
    }
  }, [navigate, selectedNode, selectedNodes, nodes, links]);

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
    if (isBoxSelecting) {
      setBoxSelection(prev => ({
        ...prev,
        x2: x,
        y2: y
      }));
    }
  }, [isBoxSelecting]);

  // 结束框选
  const handleBoxSelectEnd = useCallback(() => {
    if (isBoxSelecting) {
      // 计算框选区域的边界
      const minX = Math.min(boxSelection.x1, boxSelection.x2);
      const maxX = Math.max(boxSelection.x1, boxSelection.x2);
      const minY = Math.min(boxSelection.y1, boxSelection.y2);
      const maxY = Math.max(boxSelection.y1, boxSelection.y2);

      // 找出所有在框选区域内的节点
      const selected = nodes.filter(node => {
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

      setIsBoxSelecting(false);
      setBoxSelection({ x1: 0, y1: 0, x2: 0, y2: 0 });
    }
  }, [isBoxSelecting, boxSelection, nodes]);

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
    // 如果当前不是在历史记录的最后，删除后面的历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);
    
    // 限制历史记录的最大长度为50
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    if (historyIndex < 0) return;
    
    const action = history[historyIndex];
    if (!action) return;
    
    let newNodes = [...nodes];
    let newLinks = [...links];
    
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
    setNodes(newNodes);
    setLinks(newLinks);
    setHistoryIndex(historyIndex - 1);
    showNotification('已撤销操作', 'info');
  }, [history, historyIndex, nodes, links, showNotification]);

  // 重做操作
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const nextIndex = historyIndex + 1;
    const action = history[nextIndex];
    if (!action) return;
    
    let newNodes = [...nodes];
    let newLinks = [...links];
    
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
          return !action.data.links.some((l) => l.id === link.id);
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
    setNodes(newNodes);
    setLinks(newLinks);
    setHistoryIndex(nextIndex);
    showNotification('已重做操作', 'info');
  }, [history, historyIndex, nodes, links, showNotification]);

  // 复制节点样式
  const handleCopyNodeStyle = useCallback(() => {
    if (!selectedNode) {
      showNotification('请先选择一个节点', 'error');
      return;
    }
    
    // 复制当前主题的节点样式
    setCopiedStyle({
      type: 'node',
      style: currentTheme.node
    });
    
    showNotification('已复制节点样式', 'success');
  }, [selectedNode, currentTheme, showNotification]);

  // 复制链接样式
  const handleCopyLinkStyle = useCallback(() => {
    if (!selectedLink) {
      showNotification('请先选择一个链接', 'error');
      return;
    }
    
    // 复制当前主题的链接样式
    setCopiedStyle({
      type: 'link',
      style: currentTheme.link
    });
    
    showNotification('已复制链接样式', 'success');
  }, [selectedLink, currentTheme, showNotification]);

  // 粘贴样式
  const handlePasteStyle = useCallback(() => {
    if (!copiedStyle) {
      showNotification('没有复制的样式', 'error');
      return;
    }
    
    // 根据复制的样式类型更新主题
    const updatedTheme: GraphTheme = {
      ...currentTheme,
      [copiedStyle.type]: copiedStyle.style
    };
    
    setCurrentTheme(updatedTheme);
    showNotification(`已粘贴${copiedStyle.type === 'node' ? '节点' : '链接'}样式`, 'success');
  }, [copiedStyle, currentTheme, showNotification]);

  // 更新节点样式
  const handleNodeStyleChange = useCallback((style: Partial<NodeStyle>) => {
    const updatedTheme: GraphTheme = {
      ...currentTheme,
      node: {
        ...currentTheme.node,
        ...style
      }
    };
    setCurrentTheme(updatedTheme);
  }, [currentTheme]);

  // 更新链接样式
  const handleLinkStyleChange = useCallback((style: Partial<LinkStyle>) => {
    const updatedTheme: GraphTheme = {
      ...currentTheme,
      link: {
        ...currentTheme.link,
        ...style
      }
    };
    setCurrentTheme(updatedTheme);
  }, [currentTheme]);



  // 导入图谱数据接口
  interface ImportedGraphNode {
    id: string;
    title: string;
    connections: number;
    type?: string;
    description?: string;
    content?: string;
  }
  
  interface ImportedGraphLink {
    type?: string;
    source: string;
    target: string;
    label?: string;
    weight?: number;
  }
  
  interface ImportedGraph {
    nodes: ImportedGraphNode[];
    links: ImportedGraphLink[];
  }

  // 处理导入图谱
  const handleImportGraph = useCallback((graph: ImportedGraph) => {
    // 转换导入的节点为EnhancedNode类型
    const newNodes: EnhancedNode[] = graph.nodes.map((node: ImportedGraphNode) => ({
      id: node.id,
      title: node.title,
      connections: node.connections,
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
      type: node.type || 'concept',
      description: node.description,
      content: node.content ?? '',
      is_custom: true
    }));
    
    // 转换导入的链接为EnhancedGraphLink类型
    const newLinks: EnhancedGraphLink[] = graph.links.map((link: ImportedGraphLink) => ({
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: link.type || 'related',
      source: link.source,
      target: link.target,
      label: link.label || '',
      weight: link.weight || 1.0
    }));
    
    setNodes(newNodes);
    setLinks(newLinks);
    showNotification('图谱已导入', 'success');
  }, [showNotification]);
  
  // 保存布局
  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    setSavedLayouts(prev => [...prev, layout]);
    showNotification('布局已保存', 'success');
    
    // 将布局保存到localStorage
    try {
      const existingLayouts = localStorage.getItem('savedLayouts');
      const layouts = existingLayouts ? JSON.parse(existingLayouts) : [];
      layouts.push(layout);
      localStorage.setItem('savedLayouts', JSON.stringify(layouts));
    } catch (error) {
      console.error('保存布局到localStorage失败:', error);
    }
  }, [showNotification]);
  
  // 加载布局
  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    // 更新布局参数
    setLayoutType(layout.layout.layoutType);
    setLayoutDirection(layout.layout.layoutDirection);
    setNodeSpacing(layout.layout.nodeSpacing || 50);
    setLevelSpacing(layout.layout.levelSpacing || 100);
    setForceParameters(layout.layout.forceParameters || {
      charge: -300,
      linkStrength: 0.1,
      linkDistance: 150,
      gravity: 0.1
    });
    
    // 更新节点位置
    setNodes(prevNodes => {
      return prevNodes.map(node => {
        const position = layout.nodePositions[node.id];
        return {
          ...node,
          x: position?.x || node.x || 0,
          y: position?.y || node.y || 0
        };
      });
    });
    
    showNotification('布局已加载', 'success');
  }, [showNotification]);
  
  // 删除布局
  const handleDeleteLayout = useCallback((layoutId: string) => {
    setSavedLayouts(prev => prev.filter(layout => layout.id !== layoutId));
    showNotification('布局已删除', 'success');
    
    // 从localStorage删除布局
    try {
      const existingLayouts = localStorage.getItem('savedLayouts');
      if (existingLayouts) {
        const layouts = JSON.parse(existingLayouts);
        const updatedLayouts = layouts.filter((layout: SavedLayout) => layout.id !== layoutId);
        localStorage.setItem('savedLayouts', JSON.stringify(updatedLayouts));
      }
    } catch (error) {
      console.error('从localStorage删除布局失败:', error);
    }
  }, [showNotification]);
  
  // 从localStorage加载保存的布局
  useEffect(() => {
    try {
      const savedLayoutsStr = localStorage.getItem('savedLayouts');
      if (savedLayoutsStr) {
        const layouts = JSON.parse(savedLayoutsStr);
        setSavedLayouts(layouts);
      }
    } catch (error) {
      console.error('从localStorage加载布局失败:', error);
    }
  }, []);


  
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
    addHistory({
      type: 'addNode',
      nodeId: newNode.id,
      timestamp: Date.now(),
      data: { node: newNode }
    });
    
    showNotification('节点创建成功', 'success');
  }, [showNotification, addHistory]);

  // 切换面板显示状态
  const togglePanel = (panelId: string | null) => {
    setActivePanel(activePanel === panelId ? null : panelId);
  };

  return (
    <div className={`w-full h-screen flex flex-col ${currentTheme.backgroundColor}`}>
      {/* 顶部工具栏 - 现代化设计 */}
      <div className={`${currentTheme.backgroundColor} border-b border-gray-200 shadow-sm p-2 flex items-center justify-between gap-2 transition-all duration-300 ease-in-out ${isToolbarVisible ? 'translate-y-0' : '-translate-y-full'} z-50`}>
        {/* 左侧标题和基本操作 */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">知识图谱可视化</h1>
          
          {/* 撤销/重做按钮组 */}
          <div className="flex items-center gap-1 bg-white/80 rounded-lg shadow-sm p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex < 0}
              className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              title="撤销"
            >
              <Undo className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              title="重做"
            >
              <Redo className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* 中央功能工具栏 - 现代化分组 */}
        <div className="flex items-center gap-2">
          {/* 节点和链接管理 - 现代化下拉菜单 */}
          <div className="relative group">
            <button
              onClick={() => togglePanel(activePanel === 'nodes' || activePanel === 'links' ? null : 'nodes')}
              className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${(activePanel === 'nodes' || activePanel === 'links') ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
              title="节点与链接管理"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">节点与链接</span>
              </div>
            </button>
            
            {/* 下拉菜单 - 现代化设计 */}
            <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform translate-y-[-8px] group-hover:translate-y-0 min-w-[160px] border border-gray-100">
              <button
                onClick={() => togglePanel('nodes')}
                className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'nodes' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>节点管理</span>
                </div>
              </button>
              <button
                onClick={() => togglePanel('links')}
                className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'links' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span>链接管理</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* 布局管理 */}
          <button
            onClick={() => togglePanel('layout')}
            className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'layout' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="布局管理"
          >
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span className="hidden md:inline">布局</span>
            </div>
          </button>
          
          {/* 主题样式 */}
          <button
            onClick={() => togglePanel('theme')}
            className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="主题样式"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden md:inline">主题</span>
            </div>
          </button>
          
          {/* 高级功能 - 现代化分组 */}
          <div className="relative group">
            <button
              className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700`}
              title="更多功能"
            >
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                <span className="hidden md:inline">更多</span>
              </div>
            </button>
            
            {/* 下拉菜单 - 现代化设计 */}
            <div className="absolute top-full right-0 mt-1 bg-white shadow-xl rounded-lg p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform translate-y-[-8px] group-hover:translate-y-0 min-w-[160px] border border-gray-100">
              <button
                onClick={() => togglePanel('importExport')}
                className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'importExport' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Box className="w-4 h-4 text-blue-600" />
                  <span>导入导出</span>
                </div>
              </button>
              <button
                onClick={() => togglePanel('analysis')}
                className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'analysis' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span>图谱分析</span>
                </div>
              </button>
              <button
                onClick={() => togglePanel('templates')}
                className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'templates' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Grid className="w-4 h-4 text-blue-600" />
                  <span>模板</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* 右侧工具 - 现代化设计 */}
        <div className="flex items-center gap-2">
          {/* 视图切换按钮组 */}
          <div className="flex items-center gap-1 bg-white/80 rounded-lg shadow-sm p-0.5">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-md transition-all duration-200 ease-in-out ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              title="2D视图"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-md transition-all duration-200 ease-in-out ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              title="3D视图"
            >
              <Box className="w-4 h-4" />
            </button>
          </div>
          
          {/* 左侧面板折叠切换 */}
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700"
            title={isLeftPanelCollapsed ? "展开左侧面板" : "折叠左侧面板"}
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          
          {/* 键盘快捷键按钮 */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700"
            title="键盘快捷键"
          >
            <span className="text-lg font-bold">?</span>
          </button>
          
          {/* 设置按钮 */}
          <button
            onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
            className={`px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${isSettingsPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
      </div>

      {/* 设置面板 - 移到顶部工具栏外部，确保不被其他元素遮挡 */}
      {isSettingsPanelOpen && (
        <div className="fixed top-16 right-4 bg-white shadow-xl rounded-md p-4 w-80 z-50">
          <h3 className="font-medium mb-3 text-gray-800">设置</h3>
          
          {/* 顶部工具栏显示模式 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">顶部工具栏显示模式</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setToolbarAutoHide(false)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${!toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  固定显示
                </button>
                <button
                  onClick={() => setToolbarAutoHide(true)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  自动收起
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">自动收起：鼠标离开工具栏3秒后自动隐藏，鼠标移到顶部区域时显示</p>
            </div>
            
            {/* 左侧工具栏显示模式 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">左侧工具栏显示模式</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setLeftToolbarAutoHide(false)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${!leftToolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  固定显示
                </button>
                <button
                  onClick={() => setLeftToolbarAutoHide(true)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${leftToolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  自动收起
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">自动收起：鼠标离开工具栏3秒后自动隐藏，鼠标移到左侧区域时显示</p>
            </div>
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setIsSettingsPanelOpen(false)}
            className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm mt-2 transition-colors"
          >
            关闭
          </button>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧控制面板 - 现代化可折叠设计 */}
        <div className={`bg-white/90 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out relative z-40 ${isLeftPanelCollapsed ? 'w-0 p-0 overflow-hidden' : (isLeftToolbarVisible ? 'w-64 md:w-64 lg:w-72' : 'w-0 p-0 overflow-hidden')} border-r border-gray-100 backdrop-blur-sm`}>
          {(!isLeftPanelCollapsed || isLeftToolbarVisible) && (
            <>
              {/* 面板标题 - 现代化设计 */}
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>控制面板</span>
                </h2>
              </div>
              
              {/* 可折叠的工具面板 - 现代化设计 */}
              <div className="space-y-2 p-2">
                {/* 节点管理面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('nodes')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">节点管理</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'nodes' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'nodes' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <NodeManagement
                        nodes={nodes}
                        links={links}
                        setNodes={setNodes}
                        selectedNode={selectedNode}
                        setSelectedNode={setSelectedNode}
                        selectedNodes={selectedNodes}
                        setSelectedNodes={setSelectedNodes}
                        showNotification={showNotification}
                        onAddNode={(node) => {
                          addHistory({
                            type: 'addNode',
                            nodeId: node.id,
                            timestamp: Date.now(),
                            data: { node }
                          });
                        }}
                        onDeleteNodes={(deletedNodes, deletedLinks) => {
                          deletedNodes.forEach(node => {
                            addHistory({
                              type: 'deleteNode',
                              nodeId: node.id,
                              timestamp: Date.now(),
                              data: { node, links: deletedLinks.filter(link => {
                                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                                return String(sourceId) === node.id || String(targetId) === node.id;
                              }) }
                            });
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 链接管理面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('links')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Link className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">链接管理</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'links' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'links' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <LinkManagement
                        links={links}
                        setLinks={setLinks}
                        nodes={nodes}
                        setNodes={setNodes}
                        isAddingLink={isAddingLink}
                        setIsAddingLink={setIsAddingLink}
                        linkSourceNode={linkSourceNode}
                        setLinkSourceNode={setLinkSourceNode}
                        mousePosition={mousePosition}
                        setMousePosition={setMousePosition}
                        showNotification={showNotification}
                        selectedLinks={selectedLinks}
                        setSelectedLinks={setSelectedLinks}
                      />
                    </div>
                  )}
                </div>

                {/* 布局管理面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('layout')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Layout className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">布局管理</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'layout' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'layout' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <LayoutManager
                        nodes={nodes}
                        links={links}
                        layoutType={layoutType}
                        layoutDirection={layoutDirection}
                        width={800}
                        height={600}
                        nodeSpacing={nodeSpacing}
                        levelSpacing={levelSpacing}
                        forceParameters={forceParameters}
                        onLayoutTypeChange={setLayoutType}
                        onLayoutDirectionChange={setLayoutDirection}
                        onNodeSpacingChange={setNodeSpacing}
                        onLevelSpacingChange={setLevelSpacing}
                        onForceParametersChange={setForceParameters}
                        savedLayouts={savedLayouts}
                        onSaveLayout={handleSaveLayout}
                        onLoadLayout={handleLoadLayout}
                        onDeleteLayout={handleDeleteLayout}
                      />
                    </div>
                  )}
                </div>

                {/* 导入导出面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('importExport')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Box className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">导入导出</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'importExport' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'importExport' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <GraphImportExport
                        nodes={nodes}
                        links={links}
                        onImportGraph={handleImportGraph}
                        graphTitle="My Knowledge Graph"
                        svgSelector="#knowledge-graph-svg"
                      />
                    </div>
                  )}
                </div>

                {/* 样式主题面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('theme')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                        <Palette className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">主题样式</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'theme' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'theme' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <ThemeManager
                        currentTheme={currentTheme}
                        onThemeChange={setCurrentTheme}
                      />
                      
                      {/* 样式复制粘贴功能 - 现代化设计 */}
                      <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-medium text-gray-800 mb-3">样式复制粘贴</h4>
                        <div className="flex gap-3 flex-wrap items-center">
                          <button
                            onClick={handlePasteStyle}
                            disabled={!copiedStyle}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="粘贴样式"
                          >
                            粘贴样式
                          </button>
                          {copiedStyle && (
                            <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                              <div className={`w-3 h-3 rounded-full ${copiedStyle.type === 'node' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                              <span>已复制: {copiedStyle.type === 'node' ? '节点' : '链接'}样式</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 图谱分析面板 - 现代化设计 */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-all duration-200 ease-in-out">
                  <button 
                    onClick={() => togglePanel('analysis')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                        <PieChart className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-800">图谱分析</h3>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${activePanel === 'analysis' ? 'transform rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </button>
                  {activePanel === 'analysis' && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <GraphAnalysis
                        nodes={nodes}
                        links={links}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 中央画布区域 */}
        <div className="flex-1 relative" ref={containerRef}>
          {/* 视图切换按钮 - 更紧凑的设计 */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2 py-0.5 rounded-md text-xs transition-colors ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
              title="2D视图"
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2 py-0.5 rounded-md text-xs transition-colors ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
              title="3D视图"
            >
              3D
            </button>
          </div>

          {/* 导航控制按钮 */}
          <div className="absolute bottom-2 left-2 z-10 bg-white/80 rounded-md shadow-sm p-1 flex flex-col gap-1">
            {/* 缩放控制 */}
            <div className="flex gap-1">
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaY: -100, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="放大"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaY: 100, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="缩小"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>
            {/* 平移控制 */}
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaY: -100, deltaMode: 1, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="向上平移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <div></div>
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaX: -100, deltaMode: 1, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="向左平移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                onClick={() => {
                  // 中心对齐功能
                  const svg = containerRef.current?.querySelector('svg');
                  if (svg) {
                    d3.select(svg).transition().duration(500).call(
                      d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity
                    );
                  }
                }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="居中对齐"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </button>
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaX: 100, deltaMode: 1, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="向右平移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <div></div>
              <button
                onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
                  new WheelEvent('wheel', { deltaY: 100, deltaMode: 1, bubbles: true })
                )}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                title="向下平移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div></div>
            </div>
            {/* 自适应缩放 */}
            <button
              onClick={() => {
                // 自适应缩放功能
                const svg = containerRef.current?.querySelector('svg');
                if (svg && nodes.length > 0) {
                  // 计算节点的边界框
                  const xValues = nodes.map(n => n.x || 0);
                  const yValues = nodes.map(n => n.y || 0);
                  const xMin = Math.min(...xValues);
                  const xMax = Math.max(...xValues);
                  const yMin = Math.min(...yValues);
                  const yMax = Math.max(...yValues);
                  
                  // 检查containerRef.current是否为null
                  if (!containerRef.current) return;
                  
                  const width = containerRef.current.clientWidth;
                  const height = containerRef.current.clientHeight;
                  
                  // 计算缩放比例
                  const scaleX = width / (xMax - xMin + 200);
                  const scaleY = height / (yMax - yMin + 200);
                  const scale = Math.min(scaleX, scaleY, 1);
                  
                  // 计算中心位置
                  const centerX = (xMin + xMax) / 2;
                  const centerY = (yMin + yMax) / 2;
                  
                  // 应用缩放和居中
                  d3.select(svg).transition().duration(500).call(
                    d3.zoom<SVGSVGElement, unknown>().transform, 
                    d3.zoomIdentity
                      .translate(width / 2, height / 2)
                      .scale(scale)
                      .translate(-centerX, -centerY)
                  );
                }
              }}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
              title="自适应缩放"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
              </svg>
            </button>
          </div>
          
          {/* 图谱画布组件 */}
          {viewMode === '3d' ? (
            <GraphCanvas3D
              nodes={nodes}
              links={links}
              onNodeClick={(node) => handleNodeClick(node, {} as React.MouseEvent)}
              onLinkClick={handleLinkClick}
              selectedNode={selectedNode}
              selectedNodes={selectedNodes}
            />
          ) : (
            <GraphCanvas
              nodes={nodes}
              links={links}
              isSimulationRunning={isSimulationRunning}
              layoutType={layoutType}
              layoutDirection={layoutDirection}
              selectedNode={selectedNode}
              selectedNodes={selectedNodes}
              onNodeClick={handleNodeClick}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragEnd={handleNodeDragEnd}
              onLinkClick={handleLinkClick}
              onCanvasClick={handleCanvasClick}
              onCanvasDrop={handleCanvasDrop}
              onBoxSelectStart={handleBoxSelectStart}
              onBoxSelectUpdate={handleBoxSelectUpdate}
              onBoxSelectEnd={handleBoxSelectEnd}
              isBoxSelecting={isBoxSelecting}
              boxSelection={boxSelection}
              theme={currentTheme}
            />
          )}


        </div>

        {/* 右侧属性面板 - 始终显示，包含图例和控制 */}
        <div className="w-64 md:w-64 lg:w-64 bg-white shadow-md p-4 overflow-y-auto transition-all duration-300 ease-in-out">
          {/* 选择统计面板 */}
          <div className="mb-6 border rounded-lg p-3 bg-gray-50">
            <h3 className="font-medium mb-2 text-gray-800">选择统计</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">节点总数:</span>
                <span className="font-medium text-gray-900">{nodes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">链接总数:</span>
                <span className="font-medium text-gray-900">{links.length}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600">选中节点:</span>
                  <span className="font-medium text-blue-600">{selectedNodes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">选中链接:</span>
                  <span className="font-medium text-blue-600">{selectedLink ? 1 : 0}</span>
                </div>
              </div>
              {selectedNodes.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>按住Ctrl/Cmd键可以多选节点</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 图谱图例和控制 */}
          <div className="mb-6">
            <GraphLegend
              theme={currentTheme}
              onNodeStyleChange={handleNodeStyleChange}
              onLinkStyleChange={handleLinkStyleChange}
            />
          </div>
          
          {/* 节点属性面板 */}
          {selectedNode && (
            <div className="mb-6">
              <NodeProperties
                node={selectedNode}
                onUpdateNode={handleUpdateNode}
                onCopyStyle={handleCopyNodeStyle}
              />
            </div>
          )}

          {/* 链接属性面板 */}
          {selectedLink && (
            <div className="mb-6">
              <LinkProperties
                link={selectedLink}
                nodes={nodes}
                onUpdateLink={handleUpdateLink}
                onCopyStyle={handleCopyLinkStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* 通知组件 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}
      
      {/* 键盘快捷键帮助组件 */}
      <KeyboardShortcuts 
        isOpen={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </div>
  );
}