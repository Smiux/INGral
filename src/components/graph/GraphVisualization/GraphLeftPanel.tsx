import React from 'react';
import { Settings, ChevronDown, Plus, Link, Layout, Box, Palette, PieChart } from 'lucide-react';

// 导入子组件
import { NodeManagement } from './NodeManagement';
import { LinkManagement } from './LinkManagement';
import { LayoutManager } from './LayoutManager';
import { GraphImportExport } from './GraphImportExport';
import { ThemeManager } from './ThemeManager';
import { GraphAnalysis } from './GraphAnalysis';

// 导入类型定义
import { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, ForceParameters, SavedLayout, RecentAction } from './types';
import { GraphTheme } from './ThemeTypes';

// 导入节点和链接样式类型
import { NodeStyle, LinkStyle } from './ThemeTypes';

export interface GraphLeftPanelProps {
  // 状态
  isLeftPanelCollapsed: boolean;
  isLeftToolbarVisible: boolean;
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
  
  // 回调函数
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  setLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  setIsAddingLink: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkSourceNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  setMousePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setSelectedLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
  setLayoutType: React.Dispatch<React.SetStateAction<LayoutType>>;
  setLayoutDirection: React.Dispatch<React.SetStateAction<LayoutDirection>>;
  setNodeSpacing: React.Dispatch<React.SetStateAction<number>>;
  setLevelSpacing: React.Dispatch<React.SetStateAction<number>>;
  setForceParameters: React.Dispatch<React.SetStateAction<ForceParameters>>;
  setCurrentTheme: React.Dispatch<React.SetStateAction<GraphTheme>>;
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  handleImportGraph: (graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => void;
  handleSaveLayout: (layout: SavedLayout) => void;
  handleLoadLayout: (layout: SavedLayout) => void;
  handleDeleteLayout: (layoutId: string) => void;
  togglePanel: (panelId: string | null) => void;
  addHistory: (action: RecentAction) => void;
  handlePasteStyle: () => void;
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphLeftPanelProps, nextProps: GraphLeftPanelProps) => {
  // 比较面板状态
  if (prevProps.isLeftPanelCollapsed !== nextProps.isLeftPanelCollapsed ||
      prevProps.isLeftToolbarVisible !== nextProps.isLeftToolbarVisible ||
      prevProps.activePanel !== nextProps.activePanel) {
    return false;
  }
  
  // 比较选中节点和链接
  if (prevProps.selectedNode?.id !== nextProps.selectedNode?.id ||
      prevProps.selectedNodes.length !== nextProps.selectedNodes.length ||
      prevProps.selectedLinks.length !== nextProps.selectedLinks.length) {
    return false;
  }
  
  // 比较节点和链接数量
  if (prevProps.nodes.length !== nextProps.nodes.length ||
      prevProps.links.length !== nextProps.links.length) {
    return false;
  }
  
  // 比较布局状态
  if (prevProps.layoutType !== nextProps.layoutType ||
      prevProps.layoutDirection !== nextProps.layoutDirection) {
    return false;
  }
  
  return true;
};

export const GraphLeftPanel: React.FC<GraphLeftPanelProps> = React.memo(({
  isLeftPanelCollapsed,
  isLeftToolbarVisible,
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
  setIsAddingLink,
  setLinkSourceNode,
  setMousePosition,
  setSelectedLinks,
  setLayoutType,
  setLayoutDirection,
  setNodeSpacing,
  setLevelSpacing,
  setForceParameters,
  setCurrentTheme,
  showNotification,
  handleImportGraph,
  handleSaveLayout,
  handleLoadLayout,
  handleDeleteLayout,
  togglePanel,
  addHistory,
  handlePasteStyle
}) => {
  if (isLeftPanelCollapsed && !isLeftToolbarVisible) {
    return null;
  }

  return (
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
  );
}, areEqual);