import { useRef } from 'react';
import { KeyboardShortcuts } from '../keyboard/KeyboardShortcuts';
import { Notification } from '../common/Notification';

// 导入核心状态管理组件
import { GraphVisualizationCore } from './GraphVisualization/GraphVisualizationCore';

// 导入子组件
import { GraphToolbar } from './GraphVisualization/GraphToolbar';
import { GraphSettingsPanel } from './GraphVisualization/GraphSettingsPanel';
import { GraphCanvas } from './GraphVisualization/GraphCanvas';
import { GraphCanvas3D } from './GraphVisualization/GraphCanvas3D';
import { GraphNavigationControls } from './GraphVisualization/GraphNavigationControls';
import { PanelContainer } from './GraphVisualization/PanelContainer';

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
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <GraphVisualizationCore>
      {({ 
        // 状态
        nodes, links, selectedNode, selectedNodes, selectedLinks,
        layoutType, layoutDirection, viewMode, isToolbarVisible,
        activePanel, currentTheme,
        isBoxSelecting, boxSelection, isSettingsPanelOpen, isShortcutsOpen,
        notification, historyIndex, history,
        toolbarAutoHide,
        isSimulationRunning, isAddingLink, linkSourceNode, mousePosition, nodeSpacing,
        levelSpacing, forceParameters, savedLayouts, copiedStyle,
        
        // 状态更新函数
        setViewMode,
        setIsSettingsPanelOpen, setIsShortcutsOpen,
        setToolbarAutoHide, setNodes, setLinks, setSelectedNode,
        setSelectedNodes, setSelectedLinks, setIsAddingLink, setLinkSourceNode,
        setMousePosition, setLayoutType, setLayoutDirection, setNodeSpacing,
        setLevelSpacing, setForceParameters,
        setCurrentTheme,
        
        // 回调函数
        closeNotification, handleNodeClick, handleNodeDragStart,
        handleNodeDragEnd, handleLinkClick, handleCanvasClick, handleBoxSelectStart,
        handleBoxSelectUpdate, handleBoxSelectEnd, handleUndo, handleRedo,
        handleCopyNodeStyle, handleCopyLinkStyle, handlePasteStyle, handleCanvasDrop, togglePanel,
        handleSaveLayout, handleLoadLayout, handleDeleteLayout, handleImportGraph,
        showNotification, addHistory
      }) => (
        <div className={`w-full h-screen flex flex-col ${currentTheme.backgroundColor}`}>
          {/* 顶部工具栏 - 现代化设计 */}
          <GraphToolbar
            isToolbarVisible={isToolbarVisible}
            viewMode={viewMode}
            isSettingsPanelOpen={isSettingsPanelOpen}
            activePanel={activePanel}
            historyIndex={historyIndex}
            history={history}
            currentTheme={currentTheme}
            setViewMode={setViewMode}
            setIsSettingsPanelOpen={setIsSettingsPanelOpen}
            setIsShortcutsOpen={setIsShortcutsOpen}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            togglePanel={togglePanel}
          />

          {/* 设置面板 - 现代化设计 */}
          <GraphSettingsPanel
            isSettingsPanelOpen={isSettingsPanelOpen}
            toolbarAutoHide={toolbarAutoHide}
            setIsSettingsPanelOpen={setIsSettingsPanelOpen}
            setToolbarAutoHide={setToolbarAutoHide}
          />

          {/* 通知组件 */}
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={closeNotification}
            />
          )}

          {/* 主内容区域 */}
          <div className="flex-1 flex overflow-hidden">
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
              <GraphNavigationControls
                containerRef={containerRef}
                nodes={nodes}
              />
              
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
                  isAddingLink={isAddingLink}
                  linkSourceNode={linkSourceNode}
                  mousePosition={mousePosition}
                />
              )}
            </div>
          </div>
          
          {/* 独立子面板容器 */}
          <PanelContainer
            activePanel={activePanel}
            nodes={nodes}
            links={links}
            selectedNode={selectedNode}
            selectedNodes={selectedNodes}
            selectedLinks={selectedLinks}
            isAddingLink={isAddingLink}
            linkSourceNode={linkSourceNode}
            mousePosition={mousePosition}
            layoutType={layoutType}
            layoutDirection={layoutDirection}
            nodeSpacing={nodeSpacing}
            levelSpacing={levelSpacing}
            forceParameters={forceParameters}
            savedLayouts={savedLayouts}
            currentTheme={currentTheme}
            copiedStyle={copiedStyle}
            setNodes={setNodes}
            setLinks={setLinks}
            setSelectedNode={setSelectedNode}
            setSelectedNodes={setSelectedNodes}
            setSelectedLinks={setSelectedLinks}
            setIsAddingLink={setIsAddingLink}
            setLinkSourceNode={setLinkSourceNode}
            setMousePosition={setMousePosition}
            setLayoutType={setLayoutType}
            setLayoutDirection={setLayoutDirection}
            setNodeSpacing={setNodeSpacing}
            setLevelSpacing={setLevelSpacing}
            setForceParameters={setForceParameters}
            setCurrentTheme={setCurrentTheme}
            togglePanel={togglePanel}
            showNotification={showNotification}
            handleCopyNodeStyle={handleCopyNodeStyle}
            handleCopyLinkStyle={handleCopyLinkStyle}
            handlePasteStyle={handlePasteStyle}
            handleImportGraph={handleImportGraph}
            handleSaveLayout={handleSaveLayout}
            handleLoadLayout={handleLoadLayout}
            handleDeleteLayout={handleDeleteLayout}
            addHistory={addHistory}
          />

          {/* 键盘快捷键面板 */}
          {isShortcutsOpen && <KeyboardShortcuts />}
        </div>
      )}
    </GraphVisualizationCore>
  );
}