import React from 'react';
import { X } from 'lucide-react';

// 导入子面板组件
import { NodeManagement } from './NodeManagement';
import { LinkManagement } from './LinkManagement';
import { LayoutManager } from './LayoutManager';
import { GraphImportExport } from './GraphImportExport';
import { ThemeManager } from './ThemeManager';
import { GraphAnalysis } from './GraphAnalysis';
import { StatisticsPanel } from './StatisticsPanel';
import { StyleAdjustmentPanel } from './StyleAdjustmentPanel';

// 导入类型定义
import { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, ForceParameters, SavedLayout, RecentAction } from './types';
import { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

interface PanelContainerProps {
  // 状态
  activePanel: string | null;
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  selectedLinks: EnhancedGraphLink[];
  isAddingLink: boolean;
  linkSourceNode: EnhancedNode | null;
  mousePosition: { x: number; y: number } | null;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  nodeSpacing: number;
  levelSpacing: number;
  forceParameters: ForceParameters;
  savedLayouts: SavedLayout[];
  currentTheme: GraphTheme;
  copiedStyle: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null;
  
  // 状态更新函数
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  setLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  setSelectedLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
  setIsAddingLink: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkSourceNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  setMousePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setLayoutType: React.Dispatch<React.SetStateAction<LayoutType>>;
  setLayoutDirection: React.Dispatch<React.SetStateAction<LayoutDirection>>;
  setNodeSpacing: React.Dispatch<React.SetStateAction<number>>;
  setLevelSpacing: React.Dispatch<React.SetStateAction<number>>;
  setForceParameters: React.Dispatch<React.SetStateAction<ForceParameters>>;
  setCurrentTheme: React.Dispatch<React.SetStateAction<GraphTheme>>;
  togglePanel: (panelId: string | null) => void;
  
  // 回调函数
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  handleCopyNodeStyle: () => void;
  handleCopyLinkStyle: () => void;
  handlePasteStyle: () => void;
  handleImportGraph: (graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => void;
  handleSaveLayout: (layout: SavedLayout) => void;
  handleLoadLayout: (layout: SavedLayout) => void;
  handleDeleteLayout: (layoutId: string) => void;
  addHistory: (action: RecentAction) => void;
}

/**
 * 面板容器组件
 * 管理所有独立子面板的显示和隐藏，以及布局样式
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  activePanel,
  nodes,
  links,
  selectedNode,
  selectedNodes,
  selectedLinks,
  isAddingLink,
  linkSourceNode,
  mousePosition,
  layoutType,
  layoutDirection,
  nodeSpacing,
  levelSpacing,
  forceParameters,
  savedLayouts,
  currentTheme,
  copiedStyle,
  setNodes,
  setLinks,
  setSelectedNode,
  setSelectedNodes,
  setSelectedLinks,
  setIsAddingLink,
  setLinkSourceNode,
  setMousePosition,
  setLayoutType,
  setLayoutDirection,
  setNodeSpacing,
  setLevelSpacing,
  setForceParameters,
  setCurrentTheme,
  togglePanel,
  showNotification,
  handleCopyNodeStyle,
  handleCopyLinkStyle,
  handlePasteStyle,
  handleImportGraph,
  handleSaveLayout,
  handleLoadLayout,
  handleDeleteLayout,
  addHistory
}) => {
  // 关闭面板
  const closePanel = () => togglePanel(null);

  // 渲染当前激活的面板
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'nodes':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              节点管理
            </h3>
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
                deletedNodes.forEach((node: EnhancedNode) => {
                  addHistory({
                    type: 'deleteNode',
                    nodeId: node.id,
                    timestamp: Date.now(),
                    data: { node, links: deletedLinks.filter((link: EnhancedGraphLink) => {
                      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                      return String(sourceId) === node.id || String(targetId) === node.id;
                    }) }
                  });
                });
              }}
            />
          </div>
        );
      
      case 'links':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600"></span>
              链接管理
            </h3>
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
        );
      
      case 'layout':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              布局管理
            </h3>
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
        );
      
      case 'importExport':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-600"></span>
              导入导出
            </h3>
            <GraphImportExport
              nodes={nodes}
              links={links}
              onImportGraph={(graph) => {
                // 将Graph类型转换为{ nodes: EnhancedNode[]; links: EnhancedGraphLink[] }类型
                const enhancedNodes = graph.nodes.map(node => ({
                  id: node.id,
                  title: node.title,
                  connections: node.connections,
                  x: Math.random() * 400 + 100,
                  y: Math.random() * 400 + 100,
                  type: node.type || 'concept',
                  description: node.description,
                  content: node.content || '',
                  is_custom: true
                }));
                
                const enhancedLinks = graph.links.map(link => ({
                  id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: link.type || 'related',
                  source: link.source,
                  target: link.target,
                  label: link.label || '',
                  weight: link.weight || 1.0
                }));
                
                handleImportGraph({ nodes: enhancedNodes, links: enhancedLinks });
              }}
              graphTitle="My Knowledge Graph"
              svgSelector="#knowledge-graph-svg"
            />
          </div>
        );
      
      case 'theme':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-600"></span>
              主题样式
            </h3>
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
        );
      
      case 'analysis':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600"></span>
              图谱分析
            </h3>
            <GraphAnalysis
              nodes={nodes}
              links={links}
            />
          </div>
        );
      
      case 'statistics':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              统计信息
            </h3>
            <StatisticsPanel
              nodes={nodes}
              links={links}
            />
          </div>
        );
      
      case 'style':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600"></span>
              样式调整
            </h3>
            <StyleAdjustmentPanel
              selectedNode={selectedNode}
              selectedNodes={selectedNodes}
              selectedLinks={selectedLinks}
              currentTheme={currentTheme}
              handleCopyNodeStyle={handleCopyNodeStyle}
              handleCopyLinkStyle={handleCopyLinkStyle}
              handlePasteStyle={handlePasteStyle}
              setCurrentTheme={setCurrentTheme}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  // 如果没有激活的面板，不渲染任何内容
  if (!activePanel) {
    return null;
  }

  return (
    <>
      {/* 背景遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out"
        onClick={closePanel}
      />
      
      {/* 面板容器 */}
      <div 
        className="fixed top-0 right-0 h-full w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 bg-white shadow-xl z-50 transition-all duration-300 ease-in-out transform translate-x-0"
      >
        {/* 面板头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${activePanel === 'nodes' ? 'bg-blue-600' : 
                        activePanel === 'links' ? 'bg-green-600' : 
                        activePanel === 'layout' ? 'bg-purple-600' : 
                        activePanel === 'importExport' ? 'bg-orange-600' : 
                        activePanel === 'theme' ? 'bg-pink-600' : 
                        activePanel === 'analysis' ? 'bg-teal-600' : 
                        activePanel === 'statistics' ? 'bg-indigo-600' : 
                        'bg-rose-600'}`}
            ></div>
            <h2 className="text-lg font-semibold text-gray-800">
              {activePanel === 'nodes' ? '节点管理' : 
               activePanel === 'links' ? '链接管理' : 
               activePanel === 'layout' ? '布局管理' : 
               activePanel === 'importExport' ? '导入导出' : 
               activePanel === 'theme' ? '主题样式' : 
               activePanel === 'analysis' ? '图谱分析' : 
               activePanel === 'statistics' ? '统计信息' : 
               '样式调整'}
            </h2>
          </div>
          
          {/* 关闭按钮 */}
          <button 
            onClick={closePanel}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 ease-in-out"
            title="关闭面板"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* 面板内容区域 */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          {renderActivePanel()}
        </div>
      </div>
    </>
  );
};
