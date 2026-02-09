import React, { useState, useCallback } from 'react';
import { Undo, Redo, Plus, Layout, Grid, Sparkles, Database, ZoomIn, ZoomOut, Maximize2, Download, ChevronDown, Edit3, Layers, View, Network, Home, AlignCenter, Box } from 'lucide-react';
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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(({
  icon,
  title,
  isActive,
  isDisabled,
  onClick,
  className = ''
}) => {
  let buttonClass = 'flex items-center justify-center w-12 h-12 rounded-md transition-all ';

  if (isActive) {
    buttonClass += 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md';
  } else if (isDisabled) {
    buttonClass += 'text-neutral-300 cursor-not-allowed';
  } else {
    buttonClass += 'hover:bg-neutral-100 text-neutral-600';
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${buttonClass} ${className}`}
      title={title}
    >
      {icon}
    </button>
  );
});

const ToggleGroup: React.FC<{
  label: string;
  isCollapsed: boolean;
  collapsedIcon: React.ReactNode;
  expandedIcon: React.ReactNode;
  onToggle: () => void;
  isReactFlowOnly?: boolean;
  viewMode?: string;
  children: React.ReactNode;
}> = React.memo(({
  label,
  isCollapsed,
  collapsedIcon,
  expandedIcon,
  onToggle,
  isReactFlowOnly,
  viewMode,
  children
}) => {
  if (isReactFlowOnly && viewMode !== 'reactflow') {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm shadow-sm">
      <ToolbarButton
        icon={isCollapsed ? collapsedIcon : expandedIcon}
        title={label}
        isActive={isCollapsed}
        onClick={onToggle}
      />
      {!isCollapsed && children}
    </div>
  );
});

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
  onSetViewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const reactFlowInstance = useReactFlow();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<'edit' | 'tools' | 'view', boolean>>({
    'edit': false,
    'tools': false,
    'view': false
  });

  const toggleGroup = useCallback((group: 'edit' | 'tools' | 'view') => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const handleFitView = useCallback(() => {
    const nodes = reactFlowInstance.getNodes();
    if (nodes.length > 0) {
      reactFlowInstance.fitView({ 'duration': 500 });
    } else {
      reactFlowInstance.setViewport({ 'x': 0, 'y': 0, 'zoom': 1 }, { 'duration': 500 });
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
      <ToggleGroup
        label="编辑操作"
        isCollapsed={collapsedGroups.edit}
        collapsedIcon={<Edit3 size={16} />}
        expandedIcon={<ChevronDown size={16} />}
        onToggle={() => toggleGroup('edit')}
      >
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={<Undo size={16} />}
            title="撤销 (Ctrl+Z)"
            isDisabled={!canUndo}
            onClick={onUndo}
          />
          <ToolbarButton
            icon={<Redo size={16} />}
            title="重做 (Ctrl+Y)"
            isDisabled={!canRedo}
            onClick={onRedo}
          />
          <ToolbarButton
            icon={<Plus size={16} />}
            title="创建节点"
            onClick={onAddNode}
          />
        </div>
      </ToggleGroup>

      {/* 工具组 - 仅在reactflow模式下显示 */}
      <ToggleGroup
        label="工具"
        isCollapsed={collapsedGroups.tools}
        collapsedIcon={<Layers size={16} />}
        expandedIcon={<ChevronDown size={16} />}
        onToggle={() => toggleGroup('tools')}
        isReactFlowOnly
        viewMode={viewMode}
      >
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={<Layout size={16} />}
            title="布局管理"
            isActive={isLayoutPanelOpen}
            onClick={onToggleLayoutPanel}
          />
          <ToolbarButton
            icon={<Sparkles size={16} />}
            title="图生成"
            isActive={isGenerationPanelOpen}
            onClick={onToggleGenerationPanel}
          />
          <ToolbarButton
            icon={<Database size={16} />}
            title="图管理"
            isActive={isManagementPanelOpen}
            onClick={onToggleManagementPanel}
          />
          <ToolbarButton
            icon={<Download size={16} />}
            title="导入导出"
            isActive={isImportExportPanelOpen}
            onClick={onToggleImportExportPanel}
          />
        </div>
      </ToggleGroup>

      {/* 视图控制组 - 仅在reactflow模式下显示 */}
      <ToggleGroup
        label="视图控制"
        isCollapsed={collapsedGroups.view}
        collapsedIcon={<View size={16} />}
        expandedIcon={<ChevronDown size={16} />}
        onToggle={() => toggleGroup('view')}
        isReactFlowOnly
        viewMode={viewMode}
      >
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={<Grid size={16} />}
            title={snapToGrid ? '关闭网格对齐' : '开启网格对齐'}
            isActive={snapToGrid}
            onClick={onToggleSnapToGrid}
          />
          <ToolbarButton
            icon={<ZoomIn size={16} />}
            title="放大"
            onClick={() => reactFlowInstance.zoomIn()}
          />
          <ToolbarButton
            icon={<ZoomOut size={16} />}
            title="缩小"
            onClick={() => reactFlowInstance.zoomOut()}
          />
          <ToolbarButton
            icon={<ZoomIn size={16} className="rotate-45" />}
            title="重置缩放"
            onClick={() => reactFlowInstance.zoomTo(1)}
          />
          <ToolbarButton
            icon={<AlignCenter size={16} />}
            title="中心对齐"
            onClick={handleFitView}
          />
          <ToolbarButton
            icon={<Maximize2 size={16} className="rotate-45" />}
            title="全屏"
            onClick={handleToggleFullscreen}
          />
        </div>
      </ToggleGroup>

      {/* 渲染模式分组 */}
      <div className="flex items-center gap-0.5 bg-white/90 rounded-lg p-0.5 backdrop-blur-sm shadow-sm">
        {[
          { 'mode': 'reactflow', 'icon': <Home size={16} />, 'title': 'React Flow渲染' },
          { 'mode': 'forcegraph2d', 'icon': <Network size={16} />, 'title': 'Force Graph 2D渲染' },
          { 'mode': 'forcegraph3d', 'icon': <Box size={16} />, 'title': 'Force Graph 3D渲染' }
        ].map(({ mode, icon, title }) => (
          <ToolbarButton
            key={mode}
            icon={icon}
            title={title}
            isActive={viewMode === mode}
            onClick={() => onSetViewMode(mode as 'reactflow' | 'forcegraph2d' | 'forcegraph3d')}
          />
        ))}
      </div>
    </div>
  );
});

export default GraphToolbar;
