import React from 'react';
import { X } from 'lucide-react';

// 导入子面板组件
import { LayoutManager } from './LayoutManager';
import { GraphImportExport } from './GraphImportExport';
import { ThemeManager } from './ThemeManager';
import { GraphAnalysis } from './GraphAnalysis';
import { StatisticsPanel } from './StatisticsPanel';
import { StyleAdjustmentPanel } from './StyleAdjustmentPanel';
import { ManagePanel } from './ManagePanel';

// 导入自定义Hook
import { useGraph } from './useGraph';



interface PanelContainerProps {
  activePanel: string | null;
  togglePanel: (panelId: string | null) => void;
}

/**
 * 面板容器组件
 * 管理所有独立子面板的显示和隐藏，以及布局样式
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({ activePanel, togglePanel }) => {
  // 使用useGraph Hook获取状态和操作
  const { state, actions } = useGraph();
  
  // 从state中解构需要的状态
  const {
    nodes,
    connections,
    selectedNode,
    selectedNodes,
    selectedConnections,
    isAddingConnection,
    connectionSourceNode,
    layoutType,
    layoutDirection,
    nodeSpacing,
    levelSpacing,
    forceParameters,
    savedLayouts,
    currentTheme
  } = state;
  
  // 从actions中解构需要的操作
  const {
    setNodes,
    setConnections,
    setLayoutType,
    setLayoutDirection,
    setNodeSpacing,
    setLevelSpacing,
    setForceParameters,
    setCurrentTheme,
    showNotification,
    handleCopyNodeStyle,
    handleCopyConnectionStyle,
    handlePasteStyle,
    handleImportGraph,
    handleSaveLayout,
    handleLoadLayout,
    handleDeleteLayout,
    addHistory
  } = actions;
  // 关闭面板
  const closePanel = () => togglePanel(null);

  // 渲染当前激活的面板
  const renderActivePanel = () => {
    switch (activePanel) {
      // 使用新的ManagePanel替代原来的nodes和links面板
      case 'manage':
        return (
          <ManagePanel
            nodes={nodes}
            connections={connections}
            selectedNode={selectedNode}
            selectedNodes={selectedNodes}
            selectedConnections={selectedConnections}
            setNodes={(value) => setNodes(typeof value === 'function' ? value(nodes) : value)}
            setSelectedNode={(value) => actions.selectNode(typeof value === 'function' ? value(selectedNode) : value)}
            setSelectedNodes={(value) => actions.selectNodes(typeof value === 'function' ? value(selectedNodes) : value)}
            setConnections={(value) => setConnections(typeof value === 'function' ? value(connections) : value)}
            setSelectedConnections={(value) => actions.selectConnections(typeof value === 'function' ? value(selectedConnections) : value)}
            isAddingConnection={isAddingConnection}
            setIsAddingConnection={(value) => actions.setIsAddingConnection(typeof value === 'function' ? value(isAddingConnection) : value)}
            connectionSourceNode={connectionSourceNode}
            setConnectionSourceNode={(value) => actions.setConnectionSourceNode(typeof value === 'function' ? value(connectionSourceNode) : value)}
            setMousePosition={(value) => actions.setMousePosition(typeof value === 'function' ? value(state.mousePosition) : value)}
            showNotification={showNotification}
            onAddNode={(node) => {
              addHistory({
                type: 'addNode',
                nodeId: node.id,
                timestamp: Date.now(),
                data: { node }
              });
            }}
            onDeleteNodes={() => {}}
          />
        );
      case 'layout':
        return (
          <LayoutManager
            nodes={nodes}
            connections={connections}
            layoutType={layoutType}
            layoutDirection={layoutDirection}
            width={window.innerWidth}
            height={window.innerHeight}
            nodeSpacing={nodeSpacing}
            levelSpacing={levelSpacing}
            forceParameters={forceParameters}
            savedLayouts={savedLayouts}
            onLayoutTypeChange={setLayoutType}
            onLayoutDirectionChange={setLayoutDirection}
            onNodeSpacingChange={setNodeSpacing}
            onLevelSpacingChange={setLevelSpacing}
            onForceParametersChange={setForceParameters}
            onSaveLayout={handleSaveLayout}
            onLoadLayout={handleLoadLayout}
            onDeleteLayout={handleDeleteLayout}
          />
        );
      case 'importExport':
        return (
          <GraphImportExport
            nodes={nodes}
            links={connections}
            onImportGraph={(graph) => {
              // 将Graph类型转换为handleImportGraph期望的类型
              handleImportGraph({
                nodes: graph.nodes,
                connections: graph.links.map(link => ({
                  ...link,
                  id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  source: link.source,
                  target: link.target
                }))
              });
            }}
          />
        );
      case 'theme':
        return (
          <ThemeManager
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
          />
        );
      case 'analysis':
        return (
          <GraphAnalysis
            nodes={nodes}
            links={connections}
          />
        );
      case 'statistics':
        return (
          <StatisticsPanel
            nodes={nodes}
            links={connections}
          />
        );
      case 'style':
        return (
          <StyleAdjustmentPanel
            selectedNode={selectedNode}
            selectedNodes={selectedNodes}
            selectedLinks={selectedConnections}
            currentTheme={currentTheme}
            handleCopyNodeStyle={handleCopyNodeStyle}
            handleCopyLinkStyle={handleCopyConnectionStyle}
            handlePasteStyle={handlePasteStyle}
            setCurrentTheme={setCurrentTheme}
          />
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 背景遮罩层，点击可关闭面板 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={closePanel}
      ></div>

      {/* 右侧面板容器 */}
      <div className="relative w-full max-w-3xl h-full bg-white border-l border-gray-200 shadow-lg flex flex-col overflow-hidden">
        {/* 面板头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold">
            {activePanel === 'manage' && '管理'}
            {activePanel === 'layout' && '布局管理'}
            {activePanel === 'importExport' && '导入导出'}
            {activePanel === 'theme' && '主题样式'}
            {activePanel === 'analysis' && '图谱分析'}
            {activePanel === 'statistics' && '统计信息'}
            {activePanel === 'style' && '样式调整'}
          </h2>
          <button
            onClick={closePanel}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="关闭面板"
          >
            <X size={20} />
          </button>
        </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
};
