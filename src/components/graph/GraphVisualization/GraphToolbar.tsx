import React from 'react';
import { Undo, Redo, Plus, Layout, Palette, PieChart, Box, Grid, Settings, BarChart, SlidersHorizontal, Database } from 'lucide-react';

// 导入自定义Hook
import { useGraph } from './useGraph';

/**
 * 图谱工具栏组件
 */
export const GraphToolbar: React.FC = React.memo(() => {
  // 使用useGraph Hook获取状态和操作
  const { state, actions } = useGraph();

  // 从state中解构需要的状态
  const {
    isToolbarVisible,
    viewMode,
    isSettingsPanelOpen,
    activePanel,
    historyIndex,
    history,
    currentTheme
  } = state;

  // 处理创建新节点
  const handleCreateNode = () => {
    // 创建一个新的DragEvent对象
    const mockEvent = new DragEvent('drop', {
      'bubbles': true,
      'cancelable': true
    }) as unknown as React.DragEvent<Element>;
    // 调用handleCanvasDrop来创建新节点
    actions.handleCanvasDrop(mockEvent, 0, 0);
  };

  return (
    <div className={`${currentTheme.backgroundColor} border-b border-gray-200 shadow-md p-1 flex items-center justify-between gap-1 transition-all duration-300 ease-in-out ${isToolbarVisible ? 'translate-y-0' : '-translate-y-full'} z-50 backdrop-blur-sm`}>
      {/* 左侧基本操作 */}
      <div className="flex items-center gap-2">
        {/* 撤销/重做按钮组 */}
        <div className="flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            onClick={actions.undo}
            disabled={historyIndex < 0}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${historyIndex >= 0 ? 'hover:bg-blue-50' : ''} ${activePanel === 'undo' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="撤销 (Ctrl+Z)"
          >
            <Undo className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] whitespace-nowrap">撤销</span>
          </button>
          <button
            onClick={actions.redo}
            disabled={historyIndex >= history.length - 1}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${historyIndex < history.length - 1 ? 'hover:bg-blue-50' : ''} ${activePanel === 'redo' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="重做 (Ctrl+Y)"
          >
            <Redo className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] whitespace-nowrap">重做</span>
          </button>
        </div>
      </div>

      {/* 中央功能工具栏 - 现代化分组 */}
      <div className="flex items-center gap-2">
        {/* 直接创建节点按钮 */}
        <button
          onClick={handleCreateNode}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'create-node' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="创建节点"
        >
          <Plus className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">创建节点</span>
        </button>

        {/* 布局管理按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'layout' ? null : 'layout')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'layout' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="布局管理"
        >
          <Layout className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">布局</span>
        </button>

        {/* 主题样式按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'theme' ? null : 'theme')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="主题样式"
        >
          <Palette className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">主题</span>
        </button>

        {/* 导入导出按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'importExport' ? null : 'importExport')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'importExport' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="导入导出"
        >
          <Box className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">导入</span>
        </button>

        {/* 图谱分析按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'analysis' ? null : 'analysis')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="图谱分析"
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">分析</span>
        </button>
      </div>

      {/* 右侧工具 - 现代化设计 */}
      <div className="flex items-center gap-2">
        {/* 统计信息按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'statistics' ? null : 'statistics')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'statistics' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="查看统计信息"
        >
          <BarChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">统计</span>
        </button>

        {/* 管理按钮 - 合并节点和连接管理 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'manage' ? null : 'manage')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'manage' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="节点与连接管理"
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">管理</span>
        </button>

        {/* 样式调整按钮 */}
        <button
          onClick={() => actions.togglePanel(activePanel === 'style' ? null : 'style')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'style' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="调整当前选中节点/连接样式"
        >
          <SlidersHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">样式</span>
        </button>

        {/* 视图切换按钮组 */}
        <div className="flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-0.5">
          <button
            onClick={() => actions.setViewMode('2d')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${viewMode === '2d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
            title="2D视图"
          >
            <Grid className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] whitespace-nowrap">2D</span>
          </button>
          <button
            onClick={() => actions.setViewMode('3d')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
            title="3D视图"
          >
            <Box className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] whitespace-nowrap">3D</span>
          </button>
        </div>

        {/* 设置按钮 */}
        <button
          onClick={() => actions.setIsSettingsPanelOpen(!isSettingsPanelOpen)}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/90 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${isSettingsPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="设置"
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap">设置</span>
        </button>
      </div>

    </div>
  );
});
