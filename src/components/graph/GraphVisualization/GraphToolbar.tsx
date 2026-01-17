import React, { useState, useCallback } from 'react';
import { Undo, Redo, Plus, Layout, Box, Grid, Database, BarChart2, ZoomIn, ZoomOut, Maximize2, Download, ChevronDown, Edit3, Layers, View, Network, Home, AlignCenter, Sparkles } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface GraphToolbarProps {
  onAddNode: () => void;
  isManagementPanelOpen: boolean;
  onToggleManagementPanel: () => void;
  isAnalysisPanelOpen: boolean;
  onToggleAnalysisPanel: () => void;
  isImportExportPanelOpen: boolean;
  onToggleImportExportPanel: () => void;
  isGenerationPanelOpen: boolean;
  onToggleGenerationPanel: () => void;
  isLayoutPanelOpen: boolean;
  onToggleLayoutPanel: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  viewMode: 'reactflow' | 'forcegraph2d' | 'forcegraph3d';
  onSetViewMode: (mode: 'reactflow' | 'forcegraph2d' | 'forcegraph3d') => void;
}

/**
 * 图工具栏组件
 */
export const GraphToolbar: React.FC<GraphToolbarProps> = React.memo(({
  onAddNode,
  isManagementPanelOpen,
  onToggleManagementPanel,
  isAnalysisPanelOpen,
  onToggleAnalysisPanel,
  isImportExportPanelOpen,
  onToggleImportExportPanel,
  isGenerationPanelOpen,
  onToggleGenerationPanel,
  isLayoutPanelOpen,
  onToggleLayoutPanel,
  snapToGrid,
  onToggleSnapToGrid,
  viewMode,
  onSetViewMode
}) => {
  const reactFlowInstance = useReactFlow();

  // 工具栏分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'edit': false,
    'tools': false,
    'view': false
  });

  // 处理工具栏分组折叠/展开
  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  }, []);

  // 处理缩放操作
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  const handleZoomReset = useCallback(() => {
    reactFlowInstance.zoomTo(1);
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    const currentNodes = reactFlowInstance.getNodes();
    if (currentNodes.length > 0) {
      reactFlowInstance.fitView({
        'duration': 500
      });
    } else {
      reactFlowInstance.setViewport({
        'x': 0,
        'y': 0,
        'zoom': 1
      }, {
        'duration': 500
      });
    }
  }, [reactFlowInstance]);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <div className="flex items-center gap-1 flex-grow justify-center flex-wrap p-1">
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
                onClick={() => {
                  console.log('Undo clicked - not implemented in React Flow v11+');
                }}
                className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out hover:bg-blue-50"
                title="撤销 (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => {
                  console.log('Redo clicked - not implemented in React Flow v11+');
                }}
                className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out hover:bg-blue-50"
                title="重做 (Ctrl+Y)"
              >
                <Redo size={16} />
              </button>
            </div>

            {/* 创建节点按钮 */}
            <button
              onClick={onAddNode}
              className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out hover:bg-blue-50"
              title="创建节点"
            >
              <Plus size={16} />
            </button>
          </>
        )}
      </div>

      {/* 工具组 - 仅在reactflow模式下显示 */}
      {viewMode === 'reactflow' && (
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.tools ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            onClick={() => toggleGroup('tools')}
            title="工具"
          >
            {collapsedGroups.tools ? <Layers size={16} /> : <ChevronDown size={16} />}
          </button>

          {!collapsedGroups.tools && (
            <>
              {/* 布局管理按钮 */}
              <button
                onClick={onToggleLayoutPanel}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isLayoutPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-50'}`}
                title="布局管理"
              >
                <Layout size={16} />
              </button>

              {/* 分析面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isAnalysisPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleAnalysisPanel}
                title="图分析"
              >
                <BarChart2 size={16} />
              </button>

              {/* 图生成面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isGenerationPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleGenerationPanel}
                title="图生成"
              >
                <Sparkles size={16} />
              </button>

              {/* 管理面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isManagementPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleManagementPanel}
                title="图管理"
              >
                <Database size={16} />
              </button>

              {/* 导入导出按钮 - 移到工具组 */}
              <button
                onClick={onToggleImportExportPanel}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isImportExportPanelOpen ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                title="导入导出"
              >
                <Download size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {/* 视图控制组 - 仅在reactflow模式下显示 */}
      {viewMode === 'reactflow' && (
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
              {/* 网格对齐开关 - 移到视图控制组 */}
              <button
                onClick={onToggleSnapToGrid}
                className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${snapToGrid ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
                title={snapToGrid ? '关闭网格对齐' : '开启网格对齐'}
              >
                <Grid size={16} />
              </button>

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
                onClick={handleFitView}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="中心对齐"
              >
                <AlignCenter size={16} />
              </button>

              {/* 全屏控制 */}
              <button
                onClick={handleToggleFullscreen}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="全屏"
              >
                <Maximize2 size={16} className="rotate-45" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 渲染模式分组 - 切换按钮，同一时刻只有一个激活 */}
      <div className="flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm">
        <button
          onClick={() => onSetViewMode('reactflow')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'reactflow' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
          title="React Flow渲染"
        >
          <Home size={16} />
        </button>
        <button
          onClick={() => onSetViewMode('forcegraph2d')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'forcegraph2d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
          title="Force Graph 2D渲染"
        >
          <Network size={16} />
        </button>
        <button
          onClick={() => onSetViewMode('forcegraph3d')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'forcegraph3d' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
          title="Force Graph 3D渲染"
        >
          <Box size={16} />
        </button>
      </div>
    </div>
  );
});

export default GraphToolbar;
