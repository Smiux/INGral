import React, { useState, useCallback } from 'react';
import { Undo, Redo, Plus, Layout, Box, Grid, Database, ZoomIn, ZoomOut, Maximize2, Download, ChevronDown, Edit3, Layers, View, Network, Home, AlignCenter, Sparkles } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface GraphToolbarProps {
  onAddNode: () => void;
  isManagementPanelOpen: boolean;
  onToggleManagementPanel: () => void;
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
      <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <button
          className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.edit ? 'text-white shadow-md' : 'text-gray-700'}`}
          style={{ backgroundColor: collapsedGroups.edit ? 'var(--primary-color)' : 'transparent', backgroundImage: collapsedGroups.edit ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
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
                className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                title="撤销 (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => {
                  console.log('Redo clicked - not implemented in React Flow v11+');
                }}
                className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                title="重做 (Ctrl+Y)"
              >
                <Redo size={16} />
              </button>
            </div>

            {/* 创建节点按钮 */}
            <button
              onClick={onAddNode}
              className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
              title="创建节点"
            >
              <Plus size={16} />
            </button>
          </>
        )}
      </div>

      {/* 工具组 - 仅在reactflow模式下显示 */}
      {viewMode === 'reactflow' && (
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.tools ? 'text-white shadow-md' : 'text-gray-700'}`}
            style={{ backgroundColor: collapsedGroups.tools ? 'var(--primary-color)' : 'transparent', backgroundImage: collapsedGroups.tools ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
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
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isLayoutPanelOpen ? 'text-white shadow-md' : 'text-gray-700'}`}
                style={{ backgroundColor: isLayoutPanelOpen ? 'var(--primary-color)' : 'transparent', backgroundImage: isLayoutPanelOpen ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
                title="布局管理"
              >
                <Layout size={16} />
              </button>


              {/* 图生成面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isGenerationPanelOpen ? 'text-white shadow-md' : 'text-gray-700'}`}
                style={{ backgroundColor: isGenerationPanelOpen ? 'var(--primary-color)' : 'transparent', backgroundImage: isGenerationPanelOpen ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
                onClick={onToggleGenerationPanel}
                title="图生成"
              >
                <Sparkles size={16} />
              </button>

              {/* 管理面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isManagementPanelOpen ? 'text-white shadow-md' : 'text-gray-700'}`}
                style={{ backgroundColor: isManagementPanelOpen ? 'var(--primary-color)' : 'transparent', backgroundImage: isManagementPanelOpen ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
                onClick={onToggleManagementPanel}
                title="图管理"
              >
                <Database size={16} />
              </button>

              {/* 导入导出按钮 - 移到工具组 */}
              <button
                onClick={onToggleImportExportPanel}
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isImportExportPanelOpen ? 'text-white shadow-md' : 'text-gray-700'}`}
                style={{ backgroundColor: isImportExportPanelOpen ? 'var(--primary-color)' : 'transparent', backgroundImage: isImportExportPanelOpen ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
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
        <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${collapsedGroups.view ? 'text-white shadow-md' : 'text-gray-700'}`}
            style={{ backgroundColor: collapsedGroups.view ? 'var(--primary-color)' : 'transparent', backgroundImage: collapsedGroups.view ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
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
                className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${snapToGrid ? 'text-white shadow-md' : 'text-gray-700'}`}
                style={{ backgroundColor: snapToGrid ? 'var(--primary-color)' : 'transparent', backgroundImage: snapToGrid ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
                title={snapToGrid ? '关闭网格对齐' : '开启网格对齐'}
              >
                <Grid size={16} />
              </button>

              {/* 缩放控制 */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleZoomIn}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                  title="放大"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                  title="缩小"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={handleZoomReset}
                  className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                  title="重置缩放"
                >
                  <ZoomIn size={16} className="rotate-45" />
                </button>
              </div>

              {/* 中心对齐 */}
              <button
                onClick={handleFitView}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                title="中心对齐"
              >
                <AlignCenter size={16} />
              </button>

              {/* 全屏控制 */}
              <button
                onClick={handleToggleFullscreen}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                title="全屏"
              >
                <Maximize2 size={16} className="rotate-45" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 渲染模式分组 - 切换按钮，同一时刻只有一个激活 */}
      <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <button
          onClick={() => onSetViewMode('reactflow')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'reactflow' ? 'text-white shadow-md' : 'text-gray-700'}`}
          style={{ backgroundColor: viewMode === 'reactflow' ? 'var(--primary-color)' : 'transparent', backgroundImage: viewMode === 'reactflow' ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
          title="React Flow渲染"
        >
          <Home size={16} />
        </button>
        <button
          onClick={() => onSetViewMode('forcegraph2d')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'forcegraph2d' ? 'text-white shadow-md' : 'text-gray-700'}`}
          style={{ backgroundColor: viewMode === 'forcegraph2d' ? 'var(--primary-color)' : 'transparent', backgroundImage: viewMode === 'forcegraph2d' ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
          title="Force Graph 2D渲染"
        >
          <Network size={16} />
        </button>
        <button
          onClick={() => onSetViewMode('forcegraph3d')}
          className={`flex items-center justify-center w-12 h-12 rounded-md transition-all duration-200 ease-in-out ${viewMode === 'forcegraph3d' ? 'text-white shadow-md' : 'text-gray-700'}`}
          style={{ backgroundColor: viewMode === 'forcegraph3d' ? 'var(--primary-color)' : 'transparent', backgroundImage: viewMode === 'forcegraph3d' ? 'linear-gradient(to right, var(--primary-color), var(--primary-color-dark))' : 'none' }}
          title="Force Graph 3D渲染"
        >
          <Box size={16} />
        </button>
      </div>
    </div>
  );
});

export default GraphToolbar;
