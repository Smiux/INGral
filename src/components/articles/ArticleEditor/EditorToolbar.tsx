import { Save, Globe, Lock, Settings, HelpCircle, FileText, Share2 } from 'lucide-react';

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
  showSettingsPanel: boolean;
  onToggleSettings: () => void;
  showHelp: boolean;
  onToggleHelp: () => void;
}

export function EditorToolbar({
  viewMode,
  onToggleViewMode,
  onSave,
  isSaving,
  visibility,
  onVisibilityChange,
  onSelectTemplate,
  showSettingsPanel,
  onToggleSettings,
  showHelp,
  onToggleHelp,
}: EditorToolbarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between p-2 gap-2">
        {/* 左侧操作按钮 */}
        <div className="flex items-center space-x-2">
          {/* 保存按钮 */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isSaving
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            <Save size={16} />
            <span>{isSaving ? '保存中...' : '保存'}</span>
          </button>

          {/* 视图切换按钮 */}
          <button
            onClick={onToggleViewMode}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <span>
              {viewMode === 'split' ? '拆分视图' : 
               viewMode === 'editor' ? '编辑视图' : '预览视图'}
            </span>
          </button>

          {/* 模板选择按钮 */}
          <button
            onClick={onSelectTemplate}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <FileText size={16} />
            <span>模板</span>
          </button>

          {/* 可见性切换按钮 */}
          <div className="relative group">
            <button
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {visibility === 'public' ? (
                <>
                  <Globe size={16} />
                  <span>公开</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>未列出</span>
                </>
              )}
            </button>
            {/* 可见性下拉菜单 */}
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => onVisibilityChange('public')}
                className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${visibility === 'public' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Globe size={16} />
                <span>公开</span>
              </button>
              <button
                onClick={() => onVisibilityChange('unlisted')}
                className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${visibility === 'unlisted' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Lock size={16} />
                <span>未列出</span>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-2">
          {/* 分享按钮 */}
          <button
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Share2 size={16} />
            <span>分享</span>
          </button>

          {/* 设置按钮 */}
          <button
            onClick={onToggleSettings}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showSettingsPanel
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
          >
            <Settings size={16} />
            <span>设置</span>
          </button>

          {/* 帮助按钮 */}
          <button
            onClick={onToggleHelp}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showHelp
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
          >
            <HelpCircle size={16} />
            <span>帮助</span>
          </button>
        </div>
      </div>
    </div>
  );
}
