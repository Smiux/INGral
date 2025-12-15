import { useRef } from 'react';
import { KeyboardShortcuts } from '../keyboard/KeyboardShortcuts';
import { Notification } from '../common/Notification';

// 导入核心状态管理组件
import { GraphProvider } from './GraphVisualization/GraphContext';
import { useGraph } from './GraphVisualization/useGraph';

// 导入子组件
import { GraphToolbar } from './GraphVisualization/GraphToolbar';
import { GraphSettingsPanel } from './GraphVisualization/GraphSettingsPanel';
import { GraphCanvas3D } from './GraphVisualization/GraphCanvas3D';
import { GraphCanvasReactFlow } from './GraphVisualization/GraphCanvasReactFlow';
import { GraphNavigationControls } from './GraphVisualization/GraphNavigationControls';
import { PanelContainer } from './GraphVisualization/PanelContainer';

// 内部组件，用于访问GraphContext
const GraphVisualizationContent: React.FC = () => {
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 使用useGraph获取状态和操作
  const { state, actions } = useGraph();
  const { 
    viewMode, notification, isShortcutsOpen, currentTheme, activePanel
  } = state;

  return (
    <div className={`w-full h-screen flex flex-col ${currentTheme.backgroundColor}`}>
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
        {/* 中央画布区域 */}
        <div className="flex-1 relative" ref={containerRef}>
          {/* 视图切换按钮 - 更紧凑的设计 */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              onClick={() => {}}
              className={`px-2 py-0.5 rounded-md text-xs transition-colors ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
              title="2D视图"
            >
              2D
            </button>
            <button
              onClick={() => {}}
              className={`px-2 py-0.5 rounded-md text-xs transition-colors ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
              title="3D视图"
            >
              3D
            </button>
          </div>

          {/* 导航控制按钮 */}
          <GraphNavigationControls
            containerRef={containerRef}
            nodes={state.nodes}
          />
          
          {/* 图谱画布组件 */}
          {viewMode === '3d' ? (
            <GraphCanvas3D
              nodes={state.nodes}
              links={state.links}
              onNodeClick={() => {}}
              onLinkClick={() => {}}
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

      {/* 键盘快捷键面板 */}
      {isShortcutsOpen && <KeyboardShortcuts />}
    </div>
  );
};

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
  return (
    <GraphProvider>
      <GraphVisualizationContent />
    </GraphProvider>
  );
}
