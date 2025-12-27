import { Notification } from '../common/Notification';

// 导入核心状态管理组件
import { GraphProvider } from './GraphVisualization/GraphProvider';
import { useGraphContext } from './GraphVisualization/GraphContext';

// 导入子组件
import { GraphToolbar } from './GraphVisualization/GraphToolbar';
import { GraphSettingsPanel } from './GraphVisualization/GraphSettingsPanel';
import { GraphCanvas3D } from './GraphVisualization/GraphCanvas3D';
import { GraphCanvasReactFlow } from './GraphVisualization/GraphCanvasReactFlow';
import { PanelContainer } from './GraphVisualization/PanelContainer';
import { UnifiedControlPanel } from './GraphVisualization/UnifiedControlPanel';

// 内部组件，用于访问GraphContext
const GraphVisualizationContent: React.FC = () => {
  // 使用useGraphContext获取状态和操作
  const { state, actions } = useGraphContext();
  const {
    viewMode, notification, activePanel,
    selectedNode, selectedConnection, selectedNodes
  } = state;

  // 处理关闭编辑面板
  const handleCloseEditPanel = () => {
    actions.selectNode(null);
    actions.selectConnection(null);
    actions.selectNodes([]);
    actions.selectConnections([]);
  };

  // 计算控制面板位置
  const calculatePanelPosition = (): 'left' | 'right' => {
    // 如果没有选中节点，返回默认位置
    if (!selectedNode && selectedNodes.length === 0) {
      return 'left';
    }

    // 获取选中的节点
    const targetNode = selectedNode || selectedNodes[0];
    if (!targetNode) {
      return 'left';
    }

    // 获取节点位置
    const nodeX = targetNode.layout?.x || 0;

    // 获取画布宽度（假设画布宽度为窗口宽度减去控制面板宽度）
    // 288 = 72 * 4 (w-72)
    const canvasWidth = window.innerWidth - 288;

    // 如果节点在画布左半部分，面板显示在右侧；否则显示在左侧
    // 这样可以避免面板遮挡节点
    return nodeX < canvasWidth / 2 ? 'right' : 'left';
  };

  // 计算面板位置
  const panelPosition = calculatePanelPosition();

  return (
    <div className="w-full h-full flex flex-col" style={{ 'width': '100%', 'height': '100vh' }}>
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* 统一控制面板 - 仅在有选中节点、连接或多选时显示 */}
        <UnifiedControlPanel
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
          selectedNodes={state.selectedNodes}
          selectedConnections={state.selectedConnections}
          onUpdateNode={actions.updateNode}
          onDeleteNode={actions.deleteNode}
          onUpdateConnection={actions.updateConnection}
          onDeleteConnection={actions.deleteConnection}
          onClose={handleCloseEditPanel}
          // 样式管理相关属性已移除
          nodes={state.nodes}
          connections={state.connections}
          setNodes={actions.setNodes}
          setConnections={actions.setConnections}
          showNotification={actions.showNotification}
          panelPosition={panelPosition}
        />

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
        togglePanel={(panelId) => {
          if (activePanel === panelId) {
            actions.setActivePanel('');
          } else {
            actions.setActivePanel(panelId);
          }
        }}
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
