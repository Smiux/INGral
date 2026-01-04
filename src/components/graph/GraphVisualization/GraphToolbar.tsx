import React, { useState } from 'react';
import {
  Undo, Redo, Plus, Layout, Box, Grid, Settings,
  Database, Brain, BarChart2,
  ZoomIn, ZoomOut, Maximize2,
  Download, ChevronDown, Edit3,
  Layers, View, Target
} from 'lucide-react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';

interface GraphToolbarProps {
  nodes: Node[];
  edges: Edge[];
  onAddNode: () => void;
  isManagementPanelOpen: boolean;
  onToggleManagementPanel: () => void;
  isAnalysisPanelOpen: boolean;
  onToggleAnalysisPanel: () => void;
  isImportExportPanelOpen: boolean;
  onToggleImportExportPanel: () => void;
  isGenerationPanelOpen: boolean;
  onToggleGenerationPanel: () => void;
  onGenerateTestGraph?: () => void;
}

/**
 * 图谱工具栏组件
 * 基于旧版工具栏样式，适配新版React Flow系统
 */
export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  nodes,
  edges,
  onAddNode,
  isManagementPanelOpen,
  onToggleManagementPanel,
  isAnalysisPanelOpen,
  onToggleAnalysisPanel,
  isImportExportPanelOpen,
  onToggleImportExportPanel,
  isGenerationPanelOpen,
  onToggleGenerationPanel,
  onGenerateTestGraph
}) => {
  // 使用useReactFlow hook获取React Flow实例
  const reactFlowInstance = useReactFlow();

  // 工具栏分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'edit': false,
    'tools': false,
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

  // 处理缩放操作
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };

  const handleZoomReset = () => {
    reactFlowInstance.zoomTo(1);
  };

  const handleFitView = () => {
    if (nodes.length > 0) {
      reactFlowInstance.fitView({
        'padding': 100,
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
  };

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-md p-1 flex flex-wrap items-center justify-between gap-1 transition-all duration-300 ease-in-out z-50 backdrop-blur-sm">
      {/* Logo和标题 */}
      <div className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-3 px-2 flex-shrink-0">
        <Brain className="w-5 h-5 text-blue-600" />
        <span className="font-bold text-sm tracking-tight text-gray-800">MyMathWiki</span>
      </div>

      {/* 图谱统计信息 */}
      <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full text-xs font-medium text-gray-700 backdrop-blur-sm flex-shrink-0">
        <span className="flex items-center gap-1">
          <Database size={12} />
        节点: {nodes.length}
        </span>
        <span className="h-3 w-px bg-gray-400"></span>
        <span className="flex items-center gap-1">
          <Box size={12} />
        连接: {edges.length}
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
              {/* 撤销/重做按钮组 - 简化实现，React Flow不直接支持 */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    // React Flow v11+ 不直接支持撤销/重做，需要自定义实现
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

              {/* 导入导出按钮 */}
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

        {/* 工具组 */}
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
                onClick={() => {
                  console.log('Layout management clicked');
                }}
                className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out hover:bg-blue-50"
                title="布局管理"
              >
                <Layout size={16} />
              </button>

              {/* 分析面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isAnalysisPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleAnalysisPanel}
                title="图谱分析"
              >
                <BarChart2 size={16} />
              </button>

              {/* 图生成面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isGenerationPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleGenerationPanel}
                title="图生成"
              >
                <Target size={16} />
              </button>

              {/* 管理面板按钮 */}
              <button
                className={`flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out ${isManagementPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
                onClick={onToggleManagementPanel}
                title="图谱管理"
              >
                <Database size={16} />
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
              {/* 视图切换按钮组 - React Flow只支持2D */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    console.log('2D view - React Flow only supports 2D');
                  }}
                  className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-600 text-white shadow-md transition-all duration-200 ease-in-out"
                  title="2D视图"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => {
                    console.log('3D view not supported in React Flow');
                  }}
                  className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out text-gray-700"
                  title="3D视图 (不支持)"
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
                onClick={handleFitView}
                className={'flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out'}
                title="中心对齐"
              >
                <Target size={16} />
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
      </div>

      {/* 右侧设置组 */}
      <div className="flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-0.5 backdrop-blur-sm flex-shrink-0">
        {/* 生成测试图按钮 */}
        {onGenerateTestGraph && (
          <button
            onClick={onGenerateTestGraph}
            className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out text-gray-700"
            title="生成测试图"
          >
            <Target size={16} />
          </button>
        )}

        {/* 设置按钮 */}
        <button
          onClick={() => {
            console.log('Settings clicked');
          }}
          className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-gray-100 transition-all duration-200 ease-in-out text-gray-700"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default GraphToolbar;
