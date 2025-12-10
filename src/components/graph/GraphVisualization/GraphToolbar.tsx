import React from 'react';
import { Undo, Redo, Plus, Link, Layout, Palette, PieChart, ChevronLeft, ChevronRight, Box, Grid, Settings } from 'lucide-react';

// 导入类型定义
import { RecentAction } from './types';
import { GraphTheme } from './ThemeTypes';

export interface GraphToolbarProps {
  // 状态
  isToolbarVisible: boolean;
  viewMode: '2d' | '3d';
  isLeftPanelCollapsed: boolean;
  isSettingsPanelOpen: boolean;
  activePanel: string | null;
  historyIndex: number;
  history: RecentAction[];
  currentTheme: GraphTheme;
  
  // 回调函数
  setViewMode: (mode: '2d' | '3d') => void;
  setIsLeftPanelCollapsed: (collapsed: boolean) => void;
  setIsSettingsPanelOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  togglePanel: (panelId: string | null) => void;
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphToolbarProps, nextProps: GraphToolbarProps) => {
  // 比较工具栏可见性
  if (prevProps.isToolbarVisible !== nextProps.isToolbarVisible) {
    return false;
  }
  
  // 比较视图模式
  if (prevProps.viewMode !== nextProps.viewMode) {
    return false;
  }
  
  // 比较面板状态
  if (prevProps.isLeftPanelCollapsed !== nextProps.isLeftPanelCollapsed ||
      prevProps.isSettingsPanelOpen !== nextProps.isSettingsPanelOpen ||
      prevProps.activePanel !== nextProps.activePanel) {
    return false;
  }
  
  // 比较历史记录索引（用于撤销/重做按钮）
  if (prevProps.historyIndex !== nextProps.historyIndex) {
    return false;
  }
  
  return true;
};

export const GraphToolbar: React.FC<GraphToolbarProps> = React.memo(({
  isToolbarVisible,
  viewMode,
  isLeftPanelCollapsed,
  isSettingsPanelOpen,
  activePanel,
  historyIndex,
  history,
  currentTheme,
  setViewMode,
  setIsLeftPanelCollapsed,
  setIsSettingsPanelOpen,
  setIsShortcutsOpen,
  handleUndo,
  handleRedo,
  togglePanel
}) => {
  return (
    <div className={`${currentTheme.backgroundColor} border-b border-gray-200 shadow-sm p-2 flex items-center justify-between gap-2 transition-all duration-300 ease-in-out ${isToolbarVisible ? 'translate-y-0' : '-translate-y-full'} z-50`}>
      {/* 左侧标题和基本操作 */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-800">知识图谱可视化</h1>
        
        {/* 撤销/重做按钮组 */}
        <div className="flex items-center gap-1 bg-white/80 rounded-lg shadow-sm p-0.5">
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
            title="撤销"
          >
            <Undo className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
            title="重做"
          >
            <Redo className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* 中央功能工具栏 - 现代化分组 */}
      <div className="flex items-center gap-2">
        {/* 节点和链接管理 - 现代化下拉菜单 */}
        <div className="relative group">
          <button
            onClick={() => togglePanel(activePanel === 'nodes' || activePanel === 'links' ? null : 'nodes')}
            className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${(activePanel === 'nodes' || activePanel === 'links') ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
            title="节点与链接管理"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">节点与链接</span>
            </div>
          </button>
          
          {/* 下拉菜单 - 现代化设计 */}
          <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform translate-y-[-8px] group-hover:translate-y-0 min-w-[160px] border border-gray-100">
            <button
              onClick={() => togglePanel('nodes')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'nodes' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>节点管理</span>
              </div>
            </button>
            <button
              onClick={() => togglePanel('links')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'links' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Link className="w-4 h-4 text-blue-600" />
                <span>链接管理</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* 布局管理 */}
        <button
          onClick={() => togglePanel('layout')}
          className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'layout' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="布局管理"
        >
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            <span className="hidden md:inline">布局</span>
          </div>
        </button>
        
        {/* 主题样式 */}
        <button
          onClick={() => togglePanel('theme')}
          className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${activePanel === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="主题样式"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden md:inline">主题</span>
          </div>
        </button>
        
        {/* 高级功能 - 现代化分组 */}
        <div className="relative group">
          <button
            className={`px-4 py-2 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700`}
            title="更多功能"
          >
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4" />
              <span className="hidden md:inline">更多</span>
            </div>
          </button>
          
          {/* 下拉菜单 - 现代化设计 */}
          <div className="absolute top-full right-0 mt-1 bg-white shadow-xl rounded-lg p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform translate-y-[-8px] group-hover:translate-y-0 min-w-[160px] border border-gray-100">
            <button
              onClick={() => togglePanel('importExport')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'importExport' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Box className="w-4 h-4 text-blue-600" />
                <span>导入导出</span>
              </div>
            </button>
            <button
              onClick={() => togglePanel('analysis')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'analysis' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <PieChart className="w-4 h-4 text-blue-600" />
                <span>图谱分析</span>
              </div>
            </button>
            <button
              onClick={() => togglePanel('templates')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-all duration-150 ease-in-out ${activePanel === 'templates' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Grid className="w-4 h-4 text-blue-600" />
                <span>模板</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* 右侧工具 - 现代化设计 */}
      <div className="flex items-center gap-2">
        {/* 视图切换按钮组 */}
        <div className="flex items-center gap-1 bg-white/80 rounded-lg shadow-sm p-0.5">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-md transition-all duration-200 ease-in-out ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            title="2D视图"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-md transition-all duration-200 ease-in-out ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            title="3D视图"
          >
            <Box className="w-4 h-4" />
          </button>
        </div>
        
        {/* 左侧面板折叠切换 */}
        <button
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          className="px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700"
          title={isLeftPanelCollapsed ? "展开左侧面板" : "折叠左侧面板"}
        >
          {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        
        {/* 键盘快捷键按钮 */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-gray-700"
          title="键盘快捷键"
        >
          <span className="text-lg font-bold">?</span>
        </button>
        
        {/* 设置按钮 */}
        <button
          onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
          className={`px-3 py-1.5 rounded-lg bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${isSettingsPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
      
    </div>
  );
}, areEqual);