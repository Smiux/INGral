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
import { TemplateSelectionPanel } from './components/TemplateSelectionPanel';

// 导入自定义Hook
import { useGraph } from './useGraph';
// 导入类型定义
import type { LayoutType, LayoutDirection, ForceParameters } from './types';



interface PanelContainerProps {
  activePanel: string | null;
  togglePanel: (_panelId: string | null) => void;
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
            setNodes={setNodes}
            setSelectedNode={actions.selectNode}
            setSelectedNodes={actions.selectNodes}
            setConnections={setConnections}
            setSelectedConnections={actions.selectConnections}
            isAddingConnection={isAddingConnection}
            setIsAddingConnection={actions.setIsAddingConnection}
            connectionSourceNode={connectionSourceNode}
            setConnectionSourceNode={actions.setConnectionSourceNode}
            setMousePosition={actions.setMousePosition}
            showNotification={showNotification}
            onAddNode={(node) => {
              addHistory({
                'type': 'addNode',
                'nodeId': node.id,
                'timestamp': Date.now(),
                'data': { node }
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
              // 将Graph类型转换为handleImportGraph期望的EnhancedNode[]和EnhancedGraphConnection[]类型
              handleImportGraph({
                'nodes': graph.nodes.map(node => ({
                  'id': node.id,
                  'title': node.title,
                  'connections': node.connections || 0,
                  'type': node.type || 'concept',
                  'shape': 'rect',
                  'style': {
                    'fill': '#3b82f6',
                    'stroke': '#2563eb',
                    'strokeWidth': 2,
                    'fontSize': 14,
                    'textFill': '#fff'
                  },
                  'state': {
                    'isExpanded': false,
                    'isFixed': false,
                    'isSelected': false,
                    'isHovered': false,
                    'isDragging': false,
                    'isCollapsed': false
                  },
                  'metadata': {
                    'is_custom': true,
                    'createdAt': Date.now(),
                    'updatedAt': Date.now(),
                    'version': 1,
                    'content': node.content || ''
                  },
                  'layout': {
                    'x': node.x || 0,
                    'y': node.y || 0,
                    'isFixed': false,
                    'isExpanded': false
                  },
                  'group': {
                    'isGroup': false,
                    'memberIds': [],
                    'isGroupExpanded': false
                  },
                  'handles': {
                    'handleCount': 4,
                    'handlePositions': ['top', 'right', 'bottom', 'left'],
                    'lockedHandles': {},
                    'handleLabels': {}
                  },
                  'aggregation': {
                    '_isAggregated': false,
                    '_aggregatedNodes': [],
                    '_averageImportance': 0,
                    '_clusterCenter': { 'x': 0, 'y': 0 },
                    '_clusterSize': 0,
                    '_aggregationLevel': 0
                  }
                })),
                'connections': graph.links.map(link => ({
                  'id': `connection-${Date.now()}-${Math.random().toString(36)
                    .substr(2, 9)}`,
                  'source': link.source,
                  'target': link.target,
                  'type': link.type || 'default',
                  'weight': link.weight || 1,
                  'style': {
                    'stroke': '#94a3b8',
                    'strokeWidth': 2
                  },
                  'metadata': {
                    'createdAt': Date.now(),
                    'updatedAt': Date.now(),
                    'version': 1
                  },
                  'state': {
                    'isSelected': false,
                    'isHovered': false,
                    'isEditing': false
                  },
                  'curveControl': {
                    'controlPointsCount': 1,
                    'controlPoints': [],
                    'curveType': 'default',
                    'locked': false
                  },
                  'animation': {
                    'dynamicEffect': 'none',
                    'isAnimating': false
                  }
                }))
              });
            }}
            showNotification={showNotification}
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
      case 'templates':
        return (
          <TemplateSelectionPanel
            onSelectTemplate={(template) => {
              // 处理模板选择逻辑
              actions.handleImportGraph({
                'nodes': template.nodes,
                'connections': template.connections
              });
              // 应用模板的默认布局
              if (template.defaultLayout) {
                actions.setLayoutType(template.defaultLayout.type as LayoutType);
                if (template.defaultLayout.direction) {
                  actions.setLayoutDirection(template.defaultLayout.direction as LayoutDirection);
                }
                if (template.defaultLayout.parameters) {
                  const params = template.defaultLayout.parameters;
                  if (params.nodeSpacing) {
                    actions.setNodeSpacing(params.nodeSpacing);
                  }
                  if (params.levelSpacing) {
                    actions.setLevelSpacing(params.levelSpacing);
                  }
                  if (params.force) {
                    actions.setForceParameters(params.force as ForceParameters);
                  }
                }
              }
              actions.showNotification('模板已应用', 'success');
            }}
            onClose={closePanel}
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
            {activePanel === 'templates' && '选择模板'}
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
