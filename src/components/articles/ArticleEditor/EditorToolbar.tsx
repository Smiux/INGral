import { Save, HelpCircle, FileText, Network, Eye, EyeOff, Code, LayoutGrid, FileText as DraftIcon } from 'lucide-react';

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
  onGenerateGraph?: () => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  showToolbar: boolean;
  onToggleToolbar: () => void;
  livePreview: boolean;
  onToggleLivePreview: () => void;
  collaborators?: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[];
  onOpenDraftManager?: () => void;
  onSaveDraft?: () => void;
}

export function EditorToolbar ({
  viewMode,
  onToggleViewMode,
  onSave,
  isSaving,
  onSelectTemplate,
  onGenerateGraph,
  showHelp,
  onToggleHelp,
  showToolbar,
  onToggleToolbar,
  livePreview,
  onToggleLivePreview,
  collaborators,
  onOpenDraftManager,
  onSaveDraft
}: EditorToolbarProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shadow-[var(--shadow-sm)] transition-all duration-300">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 gap-2 transition-all duration-300">
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

          {/* 生成知识图表按钮 */}
          {onGenerateGraph && (
            <button
              onClick={onGenerateGraph}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
              title="生成知识图表"
            >
              <Network size={16} className="transition-transform duration-250 hover:scale-125" />
              <span className="hidden sm:inline">知识图表</span>
            </button>
          )}

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
          {/* 协作者列表 */}
          {collaborators && collaborators.length > 0 && (
            <div className="relative group">
              <button
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
                title="当前协作者"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-250 hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden sm:inline">
                  协作者 ({collaborators.length})
                </span>
              </button>
              {/* 协作者下拉列表 */}
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform group-hover:translate-y-0 translate-y-[-5px]">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">当前协作者</h3>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {collaborators.map((collaborator) => {
                    // 为每个协作者分配不同的颜色，与光标颜色保持一致（使用设计系统变量）
                    const colors = ['var(--error-500)', 'var(--primary-400)', 'var(--success-400)', 'var(--warning-500)', 'var(--secondary-500)', 'var(--primary-600)'];
                    const colorIndex = collaborators.findIndex(c => c.id === collaborator.id) % colors.length;
                    const cursorColor = colors[colorIndex];

                    return (
                      <div key={collaborator.id} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                        <div className="flex items-center space-x-2">
                          {/* 协作者颜色指示器 */}
                          <div
                            className="w-3 h-3 rounded-full transition-all duration-200"
                            style={{ 'backgroundColor': cursorColor }}
                          />
                          {/* 协作者名称 */}
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {collaborator.name}
                          </span>
                          {/* 协作者光标位置 */}
                          {collaborator.cursorPosition && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-auto">
                              Ln {collaborator.cursorPosition.line}, Col {collaborator.cursorPosition.column}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 工具栏折叠/展开按钮 */}
          <button
            onClick={onToggleToolbar}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250 ease-in-out bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm transform hover:scale-105"
            title={showToolbar ? '折叠工具栏' : '展开工具栏'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showToolbar ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              )}
            </svg>
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
        </div>
      </div>
    </div>
  );
}
