import { Save, HelpCircle, FileText, FileText as DraftIcon, Eye, EyeOff, Code, LayoutGrid, Brain, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../../ui/ThemeToggle';

/**
 * 编辑器工具栏组件
 * 包含格式化按钮、视图切换、保存等功能
 */
interface EditorToolbarProps {
  viewMode: 'split' | 'editor' | 'preview';
  onToggleViewMode: (_mode: 'split' | 'editor' | 'preview') => void;
  onSave: (_e: React.FormEvent) => void;
  isSaving: boolean;
  onSelectTemplate: () => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  showToolbar: boolean;
  onToggleToolbar: () => void;
  livePreview: boolean;
  onToggleLivePreview: () => void;
  onOpenDraftManager?: () => void;
  onSaveDraft?: () => void;
}

export function EditorToolbar ({
  viewMode,
  onToggleViewMode,
  onSave,
  isSaving,
  onSelectTemplate,
  showHelp,
  onToggleHelp,
  showToolbar,
  onToggleToolbar,
  livePreview,
  onToggleLivePreview,
  onOpenDraftManager,
  onSaveDraft
}: EditorToolbarProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shadow-[var(--shadow-sm)] transition-all duration-300">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2 transition-all duration-300">
        {/* Logo和主页链接 */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-2">
          <Brain className="w-5 h-5 text-primary-600 dark:text-primary-500" />
          <span className="font-bold text-sm tracking-tight text-gray-800 dark:text-gray-200">MyMathWiki</span>
        </Link>

        {/* 左侧操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 保存按钮 - 主操作按钮 */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out shadow-sm ${isSaving
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70 scale-95'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md transform hover:-translate-y-0.5 hover:scale-105'}`}
          >
            <Save size={18} className={`transition-transform duration-250 ${isSaving ? 'animate-spin' : 'hover:scale-110'}`} />
            <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
          </button>

          {/* 视图切换按钮组 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm transition-all duration-250">
            <button
              onClick={() => onToggleViewMode('editor')}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-250 ease-in-out ${viewMode === 'editor'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner transform scale-105'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transform hover:scale-105'}`}
            >
              <Code size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">编辑</span>
            </button>
            <button
              onClick={() => onToggleViewMode('preview')}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-250 ease-in-out ${viewMode === 'preview'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner transform scale-105'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transform hover:scale-105'}`}
            >
              <Eye size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">预览</span>
            </button>
            <button
              onClick={() => onToggleViewMode('split')}
              className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-250 ease-in-out ${viewMode === 'split'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-inner transform scale-105'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transform hover:scale-105'}`}
            >
              <LayoutGrid size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">拆分</span>
            </button>
          </div>

          {/* 实时预览切换按钮 */}
          <button
            onClick={onToggleLivePreview}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out ${livePreview
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm transform scale-105'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105'}`}
            title={livePreview ? '关闭实时预览' : '开启实时预览'}
          >
            {livePreview ? <Eye size={16} className="transition-transform duration-250 hover:scale-125" /> : <EyeOff size={16} className="transition-transform duration-250 hover:scale-125" />}
            <span className="hidden sm:inline">{livePreview ? '实时预览' : '静态预览'}</span>
          </button>

          {/* 模板选择按钮 */}
          <button
            onClick={onSelectTemplate}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
            title="选择模板"
          >
            <FileText size={16} className="transition-transform duration-250 hover:scale-125" />
            <span className="hidden sm:inline">模板</span>
          </button>

          {/* 保存草稿按钮 */}
          {onSaveDraft && (
            <button
              onClick={onSaveDraft}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
              title="保存草稿"
            >
              <Save size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">保存草稿</span>
            </button>
          )}

          {/* 草稿管理器按钮 */}
          {onOpenDraftManager && (
            <button
              onClick={onOpenDraftManager}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
              title="草稿管理"
            >
              <DraftIcon size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">草稿</span>
            </button>
          )}

        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-1">


          {/* 工具栏折叠/展开按钮 */}
          <button
            onClick={onToggleToolbar}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
            title={showToolbar ? '折叠工具栏' : '展开工具栏'}
          >
            {showToolbar ? (
              <ChevronUp size={20} className="transition-transform duration-300 ease-in-out" />
            ) : (
              <ChevronDown size={20} className="transition-transform duration-300 ease-in-out" />
            )}
            <span className="hidden sm:inline">{showToolbar ? '折叠' : '展开'}</span>
          </button>

          {/* 帮助按钮 */}
          <button
            onClick={onToggleHelp}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out ${showHelp
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm transform scale-105'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105'}`}
            title="帮助"
          >
            <HelpCircle size={16} className="transition-transform duration-250 hover:pulse hover:scale-125" />
            <span className="hidden sm:inline">帮助</span>
          </button>

          {/* 夜间模式切换 */}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
