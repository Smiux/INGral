import { Notification } from '../common/Notification';

// 导入核心状态管理组件
import { GraphProvider } from './GraphVisualization/GraphContext';
import { useGraph } from './GraphVisualization/useGraph';

// 导入子组件
import { GraphToolbar } from './GraphVisualization/GraphToolbar';
import { GraphSettingsPanel } from './GraphVisualization/GraphSettingsPanel';
import { GraphCanvas3D } from './GraphVisualization/GraphCanvas3D';
import { GraphCanvasReactFlow } from './GraphVisualization/GraphCanvasReactFlow';
import { PanelContainer } from './GraphVisualization/PanelContainer';
import { NodeEditPanel } from './GraphVisualization/NodeEditPanel';
import { ConnectionEditPanel } from './GraphVisualization/ConnectionEditPanel';
import { StyleManagement } from './GraphVisualization/StyleManagement';
import { ManagePanel } from './GraphVisualization/ManagePanel';

// 内部组件，用于访问GraphContext
const GraphVisualizationContent: React.FC = () => {
  // 使用useGraph获取状态和操作
  const { state, actions } = useGraph();
  const {
    viewMode, notification, currentTheme, activePanel,
    selectedNode, selectedConnection
  } = state;

  // 处理关闭编辑面板
  const handleCloseEditPanel = () => {
    actions.selectNode(null);
    actions.selectConnection(null);
  };

  return (
    <div className={`w-full h-full flex flex-col ${currentTheme.backgroundColor}`} style={{ 'width': '100%', 'height': '100vh' }}>
      {/* 顶部工具栏 - 现代化设计 */}
      <GraphToolbar />

      {/* 设置面板 - 现代化设计 */}
      <GraphSettingsPanel />

      {/* 通知组件 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => {}}
        />
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧编辑面板 - 仅在有选中节点或连接时显示 */}
        {selectedConnection && (
          <ConnectionEditPanel
            selectedConnection={selectedConnection}
            onUpdateConnection={actions.updateConnection}
            onDeleteConnection={actions.deleteConnection}
            onClose={handleCloseEditPanel}
          />
        )}
        {selectedNode && (
          <NodeEditPanel
            selectedNode={selectedNode}
            onUpdateNode={actions.updateNode}
            onDeleteNode={actions.deleteNode}
            onClose={handleCloseEditPanel}
          />
        )}
        {/* 管理面板 */}
        {state.selectedNodes.length > 0 && (
          <ManagePanel
            nodes={state.nodes}
            connections={state.connections}
            setNodes={actions.setNodes}
            setConnections={actions.setConnections}
            selectedNode={state.selectedNode}
            setSelectedNode={actions.selectNode}
            selectedNodes={state.selectedNodes}
            setSelectedNodes={actions.selectNodes}
            selectedConnections={state.selectedConnections}
            setSelectedConnections={actions.selectConnections}
            isAddingConnection={state.isAddingConnection}
            setIsAddingConnection={actions.setIsAddingConnection}
            connectionSourceNode={state.connectionSourceNode}
            setConnectionSourceNode={actions.setConnectionSourceNode}
            setMousePosition={actions.setMousePosition}
            showNotification={actions.showNotification}
          />
        )}
        {/* 样式管理面板 */}
        {(state.selectedNodes.length > 0 || state.selectedConnections.length > 0) && (
          <StyleManagement
            nodes={state.nodes}
            connections={state.connections}
            selectedNodes={state.selectedNodes}
            selectedConnections={state.selectedConnections}
            setNodes={actions.setNodes}
            setConnections={actions.setConnections}
            currentTheme={state.currentTheme}
            handleCopyNodeStyle={actions.handleCopyNodeStyle}
            handleCopyConnectionStyle={actions.handleCopyConnectionStyle}
            handlePasteStyle={actions.handlePasteStyle}
            setCurrentTheme={actions.setCurrentTheme}
            showNotification={actions.showNotification}
          />
        )}

        {/* 中央画布区域 */}
        <div className="flex-1 relative">
          {/* 图谱画布组件 */}
          {viewMode === '3d' ? (
            <GraphCanvas3D
              nodes={state.nodes}
              connections={state.connections}
              onNodeClick={() => {}}
              onConnectionClick={() => {}}
              selectedNode={state.selectedNode}
              selectedNodes={state.selectedNodes}
            />
          ) : (
            <GraphCanvasReactFlow />
          )}
        </div>
      </div>

      {/* 独立子面板容器 */}
      <PanelContainer
        activePanel={activePanel}
        togglePanel={actions.togglePanel}
      />



    </div>
  );
};

/**
 * 知识图谱可视化组件
 * 提供交互式知识图谱的创建、编辑、可视化和管理功能
 *
 * 主要功能：
 * - 图可视化与交互（拖拽、缩放、平移）
 * - 节点和连接的创建、编辑和删除
 * - 模板系统支持
 * - 节点搜索和筛选
 * - 样式自定义
 * - 导入导出功能
 * - 节点聚类
 * - 操作历史记录（撤销/前进）
 * - 键盘快捷键支持
 */
export function GraphVisualization () {
  return (
    <GraphProvider>
      <GraphVisualizationContent />
    </GraphProvider>
  );
}
