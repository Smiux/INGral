import React, { useState, useCallback } from 'react';
import { Undo, Redo, Plus, Layout, Grid3x3, Sparkles, ZoomIn, ZoomOut, Maximize2, Download, ChevronDown, Edit3, Layers, View, Network, Home, Crosshair, Box, GitBranch, Trash2, Eye, BarChart3 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface ToolbarProps {
  onAddNode: () => void;
  isManagementPanelOpen: boolean;
  onToggleManagementPanel: () => void;
  isImportExportPanelOpen: boolean;
  onToggleImportExportPanel: () => void;
  isGenerationPanelOpen: boolean;
  onToggleGenerationPanel: () => void;
  isLayoutPanelOpen: boolean;
  onToggleLayoutPanel: () => void;
  isAnalysisPanelOpen: boolean;
  onToggleAnalysisPanel: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  showOnlySelected: boolean;
  onToggleShowOnlySelected: () => void;
  hasSelection: boolean;
  viewMode: 'reactflow' | 'forcegraph2d' | 'forcegraph3d';
  onSetViewMode: (mode: 'reactflow' | 'forcegraph2d' | 'forcegraph3d') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
}

interface ToggleGroupProps {
  label: string;
  isCollapsed: boolean;
  collapsedIcon: React.ReactNode;
  expandedIcon: React.ReactNode;
  onToggle: () => void;
  isReactFlowOnly?: boolean;
  viewMode?: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(({
  icon,
  label,
  isActive,
  isDisabled,
  onClick,
  className = ''
}) => {
  let buttonClass = 'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded transition-all duration-200 min-w-[60px] ';

  if (isActive) {
    buttonClass += 'bg-sky-100/80 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400';
  } else if (isDisabled) {
    buttonClass += 'text-slate-300 dark:text-slate-600 cursor-not-allowed';
  } else {
    buttonClass += 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400';
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${buttonClass} ${className}`}
    >
      {icon}
      <span className="text-[11px] whitespace-nowrap">{label}</span>
    </button>
  );
});

const ToggleGroup: React.FC<ToggleGroupProps> = React.memo(({
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
    <div className="flex items-center gap-0.5 bg-slate-100/50 dark:bg-slate-800/50 rounded p-0.5">
      <ToolbarButton
        icon={isCollapsed ? collapsedIcon : expandedIcon}
        label={label}
        isActive={isCollapsed}
        onClick={onToggle}
      />
      {!isCollapsed && children}
    </div>
  );
});

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onAddNode,
  isManagementPanelOpen,
  onToggleManagementPanel,
  isImportExportPanelOpen,
  onToggleImportExportPanel,
  isGenerationPanelOpen,
  onToggleGenerationPanel,
  isLayoutPanelOpen,
  onToggleLayoutPanel,
  isAnalysisPanelOpen,
  onToggleAnalysisPanel,
  snapToGrid,
  onToggleSnapToGrid,
  showOnlySelected,
  onToggleShowOnlySelected,
  hasSelection,
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

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = reactFlowInstance.getNodes().filter(node => node.selected);
    const selectedEdges = reactFlowInstance.getEdges().filter(edge => edge.selected);

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      reactFlowInstance.deleteElements({
        'nodes': selectedNodes,
        'edges': selectedEdges
      });
    }
  }, [reactFlowInstance]);

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
    <>
      <div className="flex items-center gap-1 flex-grow justify-center flex-wrap p-1">
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
              label="撤销"
              isDisabled={!canUndo}
              onClick={onUndo}
            />
            <ToolbarButton
              icon={<Redo size={16} />}
              label="重做"
              isDisabled={!canRedo}
              onClick={onRedo}
            />
            <ToolbarButton
              icon={<Plus size={16} />}
              label="创建节点"
              onClick={onAddNode}
            />
            <ToolbarButton
              icon={<Trash2 size={16} />}
              label="删除"
              onClick={handleDeleteSelected}
            />
          </div>
        </ToggleGroup>

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
              label="布局"
              isActive={isLayoutPanelOpen}
              onClick={onToggleLayoutPanel}
            />
            <ToolbarButton
              icon={<Sparkles size={16} />}
              label="生成"
              isActive={isGenerationPanelOpen}
              onClick={onToggleGenerationPanel}
            />
            <ToolbarButton
              icon={<GitBranch size={16} />}
              label="管理"
              isActive={isManagementPanelOpen}
              onClick={onToggleManagementPanel}
            />
            <ToolbarButton
              icon={<Download size={16} />}
              label="导入导出"
              isActive={isImportExportPanelOpen}
              onClick={onToggleImportExportPanel}
            />
            <ToolbarButton
              icon={<BarChart3 size={16} />}
              label="分析"
              isActive={isAnalysisPanelOpen}
              onClick={onToggleAnalysisPanel}
            />
          </div>
        </ToggleGroup>

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
              icon={<Grid3x3 size={16} />}
              label={snapToGrid ? '关闭网格' : '网格对齐'}
              isActive={snapToGrid}
              onClick={onToggleSnapToGrid}
            />
            <ToolbarButton
              icon={<Eye size={16} />}
              label={showOnlySelected ? '显示全部' : '只看所选'}
              isActive={showOnlySelected}
              isDisabled={!hasSelection}
              onClick={onToggleShowOnlySelected}
            />
            <ToolbarButton
              icon={<ZoomIn size={16} />}
              label="放大"
              onClick={() => reactFlowInstance.zoomIn()}
            />
            <ToolbarButton
              icon={<ZoomOut size={16} />}
              label="缩小"
              onClick={() => reactFlowInstance.zoomOut()}
            />
            <ToolbarButton
              icon={<ZoomIn size={16} className="rotate-45" />}
              label="重置"
              onClick={() => reactFlowInstance.zoomTo(1)}
            />
            <ToolbarButton
              icon={<Crosshair size={16} />}
              label="居中"
              onClick={handleFitView}
            />
            <ToolbarButton
              icon={<Maximize2 size={16} className="rotate-45" />}
              label="全屏"
              onClick={handleToggleFullscreen}
            />
          </div>
        </ToggleGroup>

        <div className="flex items-center gap-0.5 bg-slate-100/50 dark:bg-slate-800/50 rounded p-0.5">
          {[
            { 'mode': 'reactflow', 'icon': <Home size={16} />, 'label': '标准' },
            { 'mode': 'forcegraph2d', 'icon': <Network size={16} />, 'label': '2D力导' },
            { 'mode': 'forcegraph3d', 'icon': <Box size={16} />, 'label': '3D力导' }
          ].map(({ mode, icon, label }) => (
            <ToolbarButton
              key={mode}
              icon={icon}
              label={label}
              isActive={viewMode === mode}
              onClick={() => onSetViewMode(mode as 'reactflow' | 'forcegraph2d' | 'forcegraph3d')}
            />
          ))}
        </div>
      </div>
    </>
  );
});

export default Toolbar;
