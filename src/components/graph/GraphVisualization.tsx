import { useEffect, useRef, useState, useCallback } from 'react';
import { Undo, Redo, Plus, Link, Layout, Palette, PieChart, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Box, Grid } from 'lucide-react';
import { KeyboardShortcuts } from '../keyboard/KeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { graphService } from '../../services/graphService';

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
import { PRESET_THEMES, type GraphTheme } from './GraphVisualization/ThemeTypes';

// 导入类型
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, RecentAction } from './GraphVisualization/types';
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
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<EnhancedNode | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkSourceNode, setLinkSourceNode] = useState<EnhancedNode | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  // 鼠标位置状态，用于绘制临时连接线
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null);
  // 布局算法类型
  const [layoutType] = useState<LayoutType>('force');
  // 布局方向（仅用于层次化布局）
  const [layoutDirection] = useState<LayoutDirection>('top-bottom');

  const [, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  // 添加showNotification函数，用于显示通知
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const [selectedNodes, setSelectedNodes] = useState<EnhancedNode[]>([]);
  const [selectedLink, setSelectedLink] = useState<EnhancedGraphLink | null>(null);

  // 操作历史记录
  const [history, setHistory] = useState<RecentAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 样式主题
  const [currentTheme, setCurrentTheme] = useState<GraphTheme>(PRESET_THEMES[0] || {
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
  });

  // 复制样式状态
  const [copiedStyle, setCopiedStyle] = useState<{ type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null>(null);

  // 视图模式（2D或3D）
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  
  // 控制面板状态 - 用于控制各子面板的显示/隐藏
  const [activePanel, setActivePanel] = useState<string | null>(null);
  
  // 左侧面板折叠状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

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

  // 节点点击处理
  const handleNodeClick = useCallback(async (node: EnhancedNode) => {
    setSelectedNode(node);
    setSelectedNodes([node]);
    
    // Check if this node is linked to an article
    const articles = await graphService.getArticlesByNodeId(node.id);
    if (articles.length > 0) {
      // Navigate to the first linked article
      const firstArticle = articles[0] as any;
      if (firstArticle && firstArticle.slug) {
        navigate(`/article/${firstArticle.slug}`);
      }
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



  // 处理导入图谱
  const handleImportGraph = useCallback((graph: any) => {
    // 转换导入的节点为EnhancedNode类型
    const newNodes: EnhancedNode[] = graph.nodes.map((node: any) => ({
      id: node.id,
      title: node.title,
      connections: node.connections,
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
      type: node.type || 'concept',
      description: node.description,
      content: node.content,
      is_custom: true
    }));
    
    // 转换导入的链接为EnhancedGraphLink类型
    const newLinks: EnhancedGraphLink[] = graph.links.map((link: any) => ({
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: link.type || 'related',
      source: link.source,
      target: link.target,
      label: link.label,
      weight: link.weight || 1.0
    }));
    
    setNodes(newNodes);
    setLinks(newLinks);
    showNotification('图谱已导入', 'success');
  }, [showNotification]);


  
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
  const togglePanel = (panelId: string) => {
    setActivePanel(activePanel === panelId ? null : panelId);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 - 统合为图标形式 */}
      <div className="bg-white shadow-sm p-2 flex items-center justify-between gap-2 border-b">
        {/* 左侧标题和基本操作 */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">知识图谱可视化</h1>
          
          {/* 撤销/重做按钮 */}
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="撤销"
          >
            <Undo className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="重做"
          >
            <Redo className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {/* 中央功能工具栏 - 图标化 */}
        <div className="flex items-center gap-1">
          {/* 节点管理 */}
          <button
            onClick={() => togglePanel('nodes')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'nodes' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="节点管理"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          {/* 链接管理 */}
          <button
            onClick={() => togglePanel('links')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'links' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="链接管理"
          >
            <Link className="w-4 h-4" />
          </button>
          
          {/* 布局管理 */}
          <button
            onClick={() => togglePanel('layout')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'layout' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="布局管理"
          >
            <Layout className="w-4 h-4" />
          </button>
          
          {/* 导入导出 */}
          <button
            onClick={() => togglePanel('importExport')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'importExport' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="导入导出"
          >
            <Box className="w-4 h-4" />
          </button>
          
          {/* 主题样式 */}
          <button
            onClick={() => togglePanel('theme')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'theme' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="主题样式"
          >
            <Palette className="w-4 h-4" />
          </button>
          
          {/* 图谱分析 */}
          <button
            onClick={() => togglePanel('analysis')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'analysis' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="图谱分析"
          >
            <PieChart className="w-4 h-4" />
          </button>
          
          {/* 模板 */}
          <button
            onClick={() => togglePanel('templates')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${activePanel === 'templates' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="模板"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
        
        {/* 右侧工具 */}
        <div className="flex items-center gap-1">
          {/* 左侧面板折叠切换 */}
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title={isLeftPanelCollapsed ? "展开左侧面板" : "折叠左侧面板"}
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          
          {/* 视图切换按钮 - 更紧凑的图标形式 */}
          <button
            onClick={() => setViewMode('2d')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${viewMode === '2d' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="2D视图"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${viewMode === '3d' ? 'bg-blue-100 text-blue-600' : ''}`}
            title="3D视图"
          >
            <Box className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧控制面板 - 可折叠 */}
        <div className={`bg-white shadow-md p-4 overflow-y-auto transition-all duration-300 ease-in-out ${isLeftPanelCollapsed ? 'w-0 p-0 overflow-hidden' : 'w-80'}`}>
          {!isLeftPanelCollapsed && (
            <>
              {/* 可折叠的工具面板 */}
              <div className="space-y-4">
                {/* 节点管理面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('nodes')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">节点管理</h3>
                    </div>
                    {activePanel === 'nodes' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'nodes' && (
                    <div className="p-3">
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

                {/* 链接管理面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('links')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">链接管理</h3>
                    </div>
                    {activePanel === 'links' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'links' && (
                    <div className="p-3">
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
                      />
                    </div>
                  )}
                </div>

                {/* 布局管理面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('layout')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">布局管理</h3>
                    </div>
                    {activePanel === 'layout' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'layout' && (
                    <div className="p-3">
                      <LayoutManager
                        nodes={nodes}
                        links={links}
                        layoutType={layoutType}
                        layoutDirection={layoutDirection}
                        width={800}
                        height={600}
                      />
                    </div>
                  )}
                </div>

                {/* 导入导出面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('importExport')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">导入导出</h3>
                    </div>
                    {activePanel === 'importExport' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'importExport' && (
                    <div className="p-3">
                      <GraphImportExport
                        nodes={nodes}
                        links={links}
                        onImportGraph={handleImportGraph}
                        graphTitle="My Knowledge Graph"
                      />
                    </div>
                  )}
                </div>

                {/* 样式主题面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('theme')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">主题样式</h3>
                    </div>
                    {activePanel === 'theme' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'theme' && (
                    <div className="p-3">
                      <ThemeManager
                        currentTheme={currentTheme}
                        onThemeChange={setCurrentTheme}
                      />
                      
                      {/* 样式复制粘贴功能 */}
                      <div className="mt-4 p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="font-medium mb-2">样式复制粘贴</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={handlePasteStyle}
                            disabled={!copiedStyle}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                            title="粘贴样式"
                          >
                            粘贴样式
                          </button>
                          {copiedStyle && (
                            <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs flex items-center">
                              已复制: {copiedStyle.type === 'node' ? '节点' : '链接'}样式
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 图谱分析面板 */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => togglePanel('analysis')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium">图谱分析</h3>
                    </div>
                    {activePanel === 'analysis' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activePanel === 'analysis' && (
                    <div className="p-3">
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
          {/* 视图切换按钮 */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              title="2D视图"
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              title="3D视图"
            >
              3D
            </button>
          </div>
          
          {/* 图谱画布组件 */}
          {viewMode === '3d' ? (
            <GraphCanvas3D
              nodes={nodes}
              links={links}
              onNodeClick={handleNodeClick}
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
              theme={currentTheme}
            />
          )}

          {/* 键盘快捷键提示 */}
          <KeyboardShortcuts />
        </div>

        {/* 右侧属性面板 */}
        <div className="w-80 bg-white shadow-md p-4 overflow-y-auto">
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
    </div>
  );
}