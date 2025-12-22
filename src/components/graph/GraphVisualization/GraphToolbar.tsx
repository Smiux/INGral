import React, { useState } from 'react';
import { Undo, Redo, Plus, Layout, Palette, PieChart, Box, Grid, Settings, HelpCircle,
  BarChart, SlidersHorizontal, Database, Brain, FileText,
  ZoomIn, ZoomOut, Maximize2, RefreshCw,
  Download, Filter, Eye, EyeOff, ChevronDown, Edit3,
  Layers, View, Activity, Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

// 导入自定义Hook
import { useGraph } from './useGraph';
// 导入主题切换组件
import { ThemeToggle } from '../../ui/ThemeToggle';

/**
 * 图谱工具栏组件
 * 优化后的控制面板，提供更直观、易用的图谱操作功能
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
    currentTheme,
    isSimulationRunning,
    nodes,
    connections
  } = state;

  // 工具栏分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'edit': false,
    'layout': false,
    'analysis': false,
    'view': false,
    'settings': false
  });

  // 处理工具栏分组折叠/展开
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

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

  // 处理缩放操作
  const handleZoomIn = () => {
    if (state.reactFlowInstance) {
      state.reactFlowInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (state.reactFlowInstance) {
      state.reactFlowInstance.zoomOut();
    }
  };

  const handleZoomReset = () => {
    if (state.reactFlowInstance) {
      state.reactFlowInstance.zoomTo(1);
    }
  };

  // 处理模拟运行/暂停
  const handleToggleSimulation = () => {
    actions.setIsSimulationRunning(!isSimulationRunning);
    actions.showNotification(
      isSimulationRunning ? '模拟已暂停' : '模拟已开始',
      'success'
    );
  };

  // 处理刷新布局
  const handleRefreshLayout = () => {
    actions.applyLayout(state.layoutType, state.layoutDirection);
    actions.showNotification('布局已刷新', 'success');
  };

  return (
    <div className={`${currentTheme.backgroundColor} border-b border-gray-200 shadow-md p-1 flex flex-wrap items-center justify-between gap-1 transition-all duration-300 ease-in-out ${isToolbarVisible ? 'translate-y-0' : '-translate-y-full'} z-50 backdrop-blur-sm`}>
      {/* Logo和主页链接 */}
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-3 px-2 flex-shrink-0">
        <Brain className="w-5 h-5 text-primary-600 dark:text-primary-500" />
        <span className="font-bold text-sm tracking-tight text-gray-800 dark:text-gray-200">MyMathWiki</span>
      </Link>

      {/* 图谱统计信息 */}
      <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm flex-shrink-0">
        <span className="flex items-center gap-1">
          <Database size={12} />
          节点: {nodes.length}
        </span>
        <span className="h-3 w-px bg-gray-400 dark:bg-gray-600"></span>
        <span className="flex items-center gap-1">
          <Box size={12} />
          连接: {connections.length}
        </span>
      </div>

      {/* 中央功能工具栏 - 分组折叠式设计 */}
      <div className="flex items-center gap-1 flex-grow justify-center flex-wrap">
        {/* 编辑操作组 */}
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.edit ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            onClick={() => toggleGroup('edit')}
            title="编辑操作"
          >
            {collapsedGroups.edit ? <Edit3 size={16} /> : <ChevronDown size={16} />}
          </button>

          {!collapsedGroups.edit && (
            <>
              {/* 撤销/重做按钮组 */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={actions.undo}
                  disabled={historyIndex < 0}
                  className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out ${historyIndex >= 0 ? 'hover:bg-blue-50' : ''}`}
                  title="撤销 (Ctrl+Z)"
                >
                  <Undo size={16} />
                </button>
                <button
                  onClick={actions.redo}
                  disabled={historyIndex >= history.length - 1}
                  className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out ${historyIndex < history.length - 1 ? 'hover:bg-blue-50' : ''}`}
                  title="重做 (Ctrl+Y)"
                >
                  <Redo size={16} />
                </button>
              </div>

              {/* 创建节点按钮 */}
              <button
                onClick={handleCreateNode}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'create-node' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="创建节点"
              >
                <Plus size={16} />
              </button>

              {/* 模板选择按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'templates' ? null : 'templates')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'templates' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="选择模板"
              >
                <FileText size={16} />
              </button>

              {/* 导入导出按钮 - 只保留一个 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'importExport' ? null : 'importExport')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'importExport' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="导入导出"
              >
                <Download size={16} />
              </button>
            </>
          )}
        </div>

        {/* 布局与样式组 */}
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.layout ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            onClick={() => toggleGroup('layout')}
            title="布局与样式"
          >
            {collapsedGroups.layout ? <Layers size={16} /> : <ChevronDown size={16} />}
          </button>

          {!collapsedGroups.layout && (
            <>
              {/* 布局管理按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'layout' ? null : 'layout')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'layout' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="布局管理"
              >
                <Layout size={16} />
              </button>

              {/* 主题样式按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'theme' ? null : 'theme')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="主题样式"
              >
                <Palette size={16} />
              </button>

              {/* 样式调整按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'style' ? null : 'style')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'style' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="调整样式"
              >
                <SlidersHorizontal size={16} />
              </button>

              {/* 刷新布局按钮 */}
              <button
                onClick={handleRefreshLayout}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="刷新布局"
              >
                <RefreshCw size={16} />
              </button>

              {/* 模拟控制按钮 */}
              <button
                onClick={handleToggleSimulation}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isSimulationRunning ? 'bg-green-600 text-white shadow-md' : 'bg-yellow-600 text-white shadow-md'}`}
                title={isSimulationRunning ? '暂停模拟' : '开始模拟'}
              >
                {isSimulationRunning ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </>
          )}
        </div>

        {/* 分析与统计组 */}
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.analysis ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            onClick={() => toggleGroup('analysis')}
            title="分析与统计"
          >
            {collapsedGroups.analysis ? <Activity size={16} /> : <ChevronDown size={16} />}
          </button>

          {!collapsedGroups.analysis && (
            <>
              {/* 图谱分析按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'analysis' ? null : 'analysis')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="图谱分析"
              >
                <PieChart size={16} />
              </button>

              {/* 统计信息按钮 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'statistics' ? null : 'statistics')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'statistics' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="查看统计信息"
              >
                <BarChart className="w-5 h-5" />
              </button>

              {/* 管理按钮 - 合并节点和连接管理 */}
              <button
                onClick={() => actions.togglePanel(activePanel === 'manage' ? null : 'manage')}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${activePanel === 'manage' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                title="节点与连接管理"
              >
                <Database size={16} />
              </button>

              {/* 筛选按钮 */}
              <button
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="筛选"
              >
                <Filter size={16} />
              </button>
            </>
          )}
        </div>

        {/* 视图控制组 */}
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.view ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            onClick={() => toggleGroup('view')}
            title="视图控制"
          >
            {collapsedGroups.view ? <View size={16} /> : <ChevronDown size={16} />}
          </button>

          {!collapsedGroups.view && (
            <>
              {/* 视图切换按钮组 */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => actions.setViewMode('2d')}
                  className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === '2d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
                  title="2D视图"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => actions.setViewMode('3d')}
                  className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
                  title="3D视图"
                >
                  <Box size={16} />
                </button>
              </div>

              {/* 缩放控制 */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleZoomIn}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  title="放大"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  title="缩小"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={handleZoomReset}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  title="重置缩放"
                >
                  <ZoomIn size={16} className="rotate-45" />
                </button>
              </div>

              {/* 中心对齐 */}
              <button
                onClick={() => {
                  if (state.reactFlowInstance) {
                    if (nodes.length > 0) {
                      // 如果有节点，使用fitView将节点居中
                      state.reactFlowInstance.fitView({
                        'padding': 100,
                        'duration': 500
                      });
                    } else {
                      // 如果没有节点，重置视图位置和缩放
                      state.reactFlowInstance.setViewport({
                        'x': 0,
                        'y': 0,
                        'zoom': 1
                      }, {
                        'duration': 500
                      });
                    }
                  }
                }}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="中心对齐"
              >
                <Target size={16} />
              </button>

              {/* 全屏控制 */}
              <button
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    document.documentElement.requestFullscreen();
                  }
                }}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="全屏"
              >
                <Maximize2 size={16} className="rotate-45" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 右侧设置组 */}
      <div className="flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm flex-shrink-0">
        {/* 主题切换 */}
        <div className="flex items-center justify-center p-2">
          <ThemeToggle />
        </div>

        {/* 帮助按钮 */}
        <button
          onClick={() => console.log('帮助中心功能开发中...')}
          className='flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out text-gray-700'
          title="帮助"
        >
          <HelpCircle size={16} />
        </button>

        {/* 设置按钮 */}
        <button
          onClick={() => actions.setIsSettingsPanelOpen(!isSettingsPanelOpen)}
          className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isSettingsPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
});
