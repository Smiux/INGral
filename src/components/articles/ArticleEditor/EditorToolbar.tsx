import { Save, Globe, Lock, Settings, HelpCircle, FileText, Share2, Network, Eye, EyeOff, Code, LayoutGrid } from 'lucide-react';

/**
 * 编辑器工具栏组件
 * 包含格式化按钮、视图切换、保存等功能
 */
interface EditorToolbarProps {
  viewMode: 'split' | 'editor' | 'preview';
  onToggleViewMode: () => void;
  onSave: (e: React.FormEvent) => void;
  isSaving: boolean;
  visibility: 'public' | 'unlisted';
  onVisibilityChange: (visibility: 'public' | 'unlisted') => void;
  onSelectTemplate: () => void;
  onGenerateGraph?: () => void;
  showSettingsPanel: boolean;
  onToggleSettings: () => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  showToolbar: boolean;
  onToggleToolbar: () => void;
  livePreview: boolean;
  onToggleLivePreview: () => void;
}

export function EditorToolbar({
  viewMode,
  onToggleViewMode,
  onSave,
  isSaving,
  visibility,
  onVisibilityChange,
  onSelectTemplate,
  onGenerateGraph,
  showSettingsPanel,
  onToggleSettings,
  showHelp,
  onToggleHelp,
  showToolbar,
  onToggleToolbar,
  livePreview,
  onToggleLivePreview,
}: EditorToolbarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2">
        {/* 左侧操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 保存按钮 - 主操作按钮 */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${isSaving
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md transform hover:-translate-y-0.5'}`}
          >
            <Save size={18} className="transition-transform duration-200 hover:scale-110" />
            <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
          </button>

          {/* 视图切换按钮组 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={onToggleViewMode}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'editor' 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <Code size={16} />
              <span className="hidden sm:inline">编辑</span>
            </button>
            <button
              onClick={onToggleViewMode}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'preview' 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <Eye size={16} />
              <span className="hidden sm:inline">预览</span>
            </button>
            <button
              onClick={onToggleViewMode}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'split' 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">拆分</span>
            </button>
          </div>

          {/* 实时预览切换按钮 */}
          <button
            onClick={onToggleLivePreview}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${livePreview 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            title={livePreview ? '关闭实时预览' : '开启实时预览'}
          >
            {livePreview ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="hidden sm:inline">{livePreview ? '实时预览' : '静态预览'}</span>
          </button>

          {/* 模板选择按钮 */}
          <button
            onClick={onSelectTemplate}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm"
            title="选择模板"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">模板</span>
          </button>

          {/* 生成知识图表按钮 */}
          {onGenerateGraph && (
            <button
              onClick={onGenerateGraph}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm"
              title="生成知识图表"
            >
              <Network size={16} className="transition-transform duration-200 hover:scale-110" />
              <span className="hidden sm:inline">知识图表</span>
            </button>
          )}

          {/* 可见性切换按钮 */}
          <div className="relative group">
            <button
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm"
            >
              {visibility === 'public' ? (
                <>
                  <Globe size={16} />
                  <span className="hidden sm:inline">公开</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span className="hidden sm:inline">未列出</span>
                </>
              )}
            </button>
            {/* 可见性下拉菜单 - 改进的动画效果 */}
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out">
              <button
                onClick={() => onVisibilityChange('public')}
                className={`flex items-center space-x-2 w-full px-4 py-2.5 text-sm transition-all duration-150 ${visibility === 'public' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Globe size={16} className="text-blue-500 dark:text-blue-400" />
                <span>公开</span>
              </button>
              <button
                onClick={() => onVisibilityChange('unlisted')}
                className={`flex items-center space-x-2 w-full px-4 py-2.5 text-sm transition-all duration-150 ${visibility === 'unlisted' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Lock size={16} className="text-purple-500 dark:text-purple-400" />
                <span>未列出</span>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 分享按钮 */}
          <button
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm"
            title="分享文章"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">分享</span>
          </button>

          {/* 工具栏折叠/展开按钮 */}
          <button
            onClick={onToggleToolbar}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm"
            title={showToolbar ? '折叠工具栏' : '展开工具栏'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showToolbar ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              )}
            </svg>
            <span className="hidden sm:inline">{showToolbar ? '折叠' : '展开'}</span>
          </button>

          {/* 设置按钮 */}
          <button
            onClick={onToggleSettings}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showSettingsPanel
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm'}`}
            title="设置"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">设置</span>
          </button>

          {/* 帮助按钮 */}
          <button
            onClick={onToggleHelp}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showHelp
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm'}`}
            title="帮助"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">帮助</span>
          </button>
        </div>
      </div>
    </div>
  );
}
