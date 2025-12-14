/**
 * 文章编辑器组件
 * 支持Markdown编辑、LaTeX公式、实时预览和自动保存功能
 */
import React, { lazy, Suspense } from 'react';
import { Globe, Lock } from 'lucide-react';
import { Notification } from '../common/Notification';
import { EditorToolbar } from './ArticleEditor/EditorToolbar';
import { EditorFormattingToolbar } from './ArticleEditor/EditorFormattingToolbar';
import { EditorContentArea } from './ArticleEditor/EditorContentArea';
import { EditorSidebar } from './ArticleEditor/EditorSidebar';
import { AutosaveManager } from './ArticleEditor/AutosaveManager';
import { HistoryManager } from './ArticleEditor/HistoryManager';
import { copyFormat, pasteFormat, handleFormat as formatText, insertLatexFormula, insertGraphMarkdown } from './ArticleEditor/EditorUtils';
import { useArticleEditor } from './ArticleEditor/useArticleEditor';

// 懒加载非核心组件，优化初始加载时间
const TemplateManager = lazy(() => import('./TemplateManager').then(m => ({ default: m.TemplateManager })));
const LatexEditor = lazy(() => import('../editors/LatexEditor').then(m => ({ default: m.LatexEditor })));
const GraphGenerator = lazy(() => import('./ArticleEditor/GraphGenerator').then(m => ({ default: m.GraphGenerator })));
const ImageUploadDialog = lazy(() => import('./ArticleEditor/ImageUploadDialog').then(m => ({ default: m.ImageUploadDialog })));
const FileUploadDialog = lazy(() => import('./ArticleEditor/FileUploadDialog').then(m => ({ default: m.FileUploadDialog })));
const DraftManager = lazy(() => import('./DraftManager').then(m => ({ default: m.DraftManager })));

/**
 * 文章编辑器组件
 * 管理编辑器的主要状态和逻辑
 */
export function ArticleEditor() {
  // 使用文章编辑器Hook
  const {
    state,
    updateState,
    batchUpdateState,
    showNotification,
    closeNotification,
    handleTitleChange,
    handleSave,
    handleSelectTemplate,
    toggleViewMode,
    handleContentChange,
    handleCursorPositionChange,
    handleGenerateGraph,
    setTitle,
    setContent,
    handleManualSaveDraft
  } = useArticleEditor();

  // 草稿管理器状态
  const [showDraftManager, setShowDraftManager] = React.useState<boolean>(false);

  /**
   * 处理加载草稿
   */
  const handleLoadDraft = React.useCallback((draft: import('../../types/draft').ArticleDraft) => {
    batchUpdateState({
      title: draft.title || '',
      content: draft.content || '',
      visibility: draft.visibility || 'public',
      authorName: draft.authorName || '',
      authorEmail: draft.authorEmail || '',
      authorUrl: draft.authorUrl || ''
    });
    showNotification('草稿已加载', 'success');
  }, [batchUpdateState, showNotification]);

  /**
   * 处理创建新草稿
   */
  const handleCreateNewDraft = React.useCallback(() => {
    // 重置编辑器状态，创建新草稿
    batchUpdateState({
      title: '',
      content: '',
      visibility: 'public',
      authorName: '',
      authorEmail: '',
      authorUrl: ''
    });
    showNotification('已创建新草稿', 'success');
  }, [batchUpdateState, showNotification]);

  /**
   * 切换草稿管理器显示
   */
  const toggleDraftManager = React.useCallback(() => {
    setShowDraftManager(prev => !prev);
  }, []);

  // 快捷键定义数组
  const SHORTCUTS = [
    { id: 'bold', name: '加粗', description: '将选中的文本加粗', defaultKey: 'Ctrl+B', category: '文本格式' },
    { id: 'italic', name: '斜体', description: '将选中的文本变为斜体', defaultKey: 'Ctrl+I', category: '文本格式' },
    { id: 'heading1', name: '一级标题', description: '将选中的文本设为一级标题', defaultKey: 'Ctrl+1', category: '标题' },
    { id: 'heading2', name: '二级标题', description: '将选中的文本设为二级标题', defaultKey: 'Ctrl+2', category: '标题' },
    { id: 'heading3', name: '三级标题', description: '将选中的文本设为三级标题', defaultKey: 'Ctrl+3', category: '标题' },
    { id: 'ul', name: '无序列表', description: '将选中的文本设为无序列表', defaultKey: 'Ctrl+Shift+U', category: '列表' },
    { id: 'ol', name: '有序列表', description: '将选中的文本设为有序列表', defaultKey: 'Ctrl+Shift+O', category: '列表' },
    { id: 'quote', name: '引用', description: '将选中的文本设为引用', defaultKey: 'Ctrl+Shift+Q', category: '文本格式' },
    { id: 'code', name: '代码块', description: '将选中的文本设为代码块', defaultKey: 'Ctrl+Shift+K', category: '代码' },
    { id: 'save', name: '保存', description: '保存当前文章', defaultKey: 'Ctrl+S', category: '编辑操作' },
    { id: 'undo', name: '撤销', description: '撤销上一步操作', defaultKey: 'Ctrl+Z', category: '编辑操作' },
    { id: 'redo', name: '重做', description: '重做上一步操作', defaultKey: 'Ctrl+Y', category: '编辑操作' },
    { id: 'preview', name: '切换预览', description: '切换编辑/预览模式', defaultKey: 'Ctrl+P', category: '视图' },
    { id: 'shortcuts', name: '显示快捷键', description: '显示所有快捷键', defaultKey: 'Ctrl+/', category: '视图' }
  ];

  /**
   * 优化全屏模式下的UI显示
   */
  React.useEffect(() => {
    const body = document.body;
    if (state.isFullscreen) {
      body.classList.add('fullscreen-mode');
      // 隐藏浏览器滚动条
      body.style.overflow = 'hidden';
    } else {
      body.classList.remove('fullscreen-mode');
      body.style.overflow = '';
    }

    return () => {
      body.classList.remove('fullscreen-mode');
      body.style.overflow = '';
    };
  }, [state.isFullscreen]);

  /**
   * 处理全屏变化
   */
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      updateState('isFullscreen', !!document.fullscreenElement);
    };

    // 添加浏览器前缀支持
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'];
    events.forEach(event => {
      document.addEventListener(event, handleFullscreenChange);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFullscreenChange);
      });
    };
  }, [updateState]);

  /**
   * 处理全屏模式切换
   */
  React.useEffect(() => {
    if (state.isFullscreen) {
      // 使用整个编辑器容器进入全屏，而不是仅编辑区域
      const editorElement = document.querySelector('.flex-1.flex.flex-col.overflow-hidden');
      if (editorElement) {
        // 尝试使用标准的requestFullscreen方法
        if (typeof editorElement.requestFullscreen === 'function') {
          editorElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
            updateState('isFullscreen', false); // 恢复状态
          });
        } else {
          // 标准方法不支持，直接恢复状态
          console.error('Fullscreen API not supported');
          updateState('isFullscreen', false);
        }
      }
    } else {
      // 只有当文档处于全屏状态时，才调用exitFullscreen
      if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  }, [state.isFullscreen, updateState]);

  /**
   * 复制格式
   */
  const handleCopyFormat = () => {
    const format = copyFormat(state.content);
    if (format) {
      updateState('copiedFormat', format);
      updateState('isFormatBrushActive', true);
      showNotification(`已复制${format === 'bold' ? '粗体' : format === 'italic' ? '斜体' : format === 'strikethrough' ? '删除线' : '行内代码'}格式`, 'success');
    } else {
      showNotification('请先选择要复制格式的文本', 'info');
    }
  };

  /**
   * 粘贴格式
   */
  const handlePasteFormat = () => {
    if (state.copiedFormat) {
      pasteFormat(state.copiedFormat, state.content, (newContent: string) => updateState('content', newContent));
      showNotification('格式已应用', 'success');
    } else {
      showNotification('请先复制格式', 'info');
    }
  };

  /**
   * 切换格式刷状态
   */
  const handleToggleFormatBrush = () => {
    if (state.isFormatBrushActive) {
      updateState('isFormatBrushActive', false);
      updateState('copiedFormat', null);
      showNotification('格式刷已关闭', 'info');
    } else {
      handleCopyFormat();
    }
  };

  /**
   * 处理文本格式化
   */
  const handleFormat = React.useCallback((formatType: string, data: Record<string, unknown> = {}) => {
    // 处理特殊格式类型
    if (formatType === 'latex') {
      // 打开LaTeX编辑器
      updateState('latexEditorOpen', true);
      // 获取当前选中的文本作为初始公式
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const selectedText = textarea.value.substring(
          textarea.selectionStart,
          textarea.selectionEnd
        );
        updateState('selectedText', selectedText);
      }
      return;
    } else if (formatType === 'image') {
      // 打开图片上传对话框
      updateState('imageUploadDialogOpen', true);
      return;
    } else if (formatType === 'file') {
      // 打开文件上传对话框
      updateState('fileUploadDialogOpen', true);
      return;
    }
    // 调用编辑器核心的格式化函数
    formatText(formatType, data, state.content, (newContent: string) => updateState('content', newContent));
  }, [state.content, updateState]);

  /**
   * 处理图片上传成功
   */
  const handleImageUploaded = React.useCallback((imageUrl: string) => {
    // 插入到当前光标位置
    formatText('image', { url: imageUrl }, state.content, (newContent: string) => updateState('content', newContent));
  }, [state.content, updateState]);

  /**
   * 处理文件上传成功
   */
  const handleFileUploaded = React.useCallback((fileUrl: string, fileName: string) => {
    // 插入到当前光标位置
    formatText('file', { url: fileUrl, name: fileName }, state.content, (newContent: string) => updateState('content', newContent));
  }, [state.content, updateState]);

  /**
   * 处理键盘快捷键
   */
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    // 移除智能建议相关的所有逻辑
    // 确保自动补全功能不会被任何键盘事件触发

    // 检查是否按下了Ctrl键
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case '1':
          e.preventDefault();
          handleFormat('h1');
          break;
        case '2':
          e.preventDefault();
          handleFormat('h2');
          break;
        case '3':
          e.preventDefault();
          handleFormat('h3');
          break;
        case 's':
          e.preventDefault();
          handleSave(e as unknown as React.FormEvent);
          break;
        case 'p':
          e.preventDefault();
          // 简化视图切换逻辑，减少依赖
          updateState('viewMode', prevMode => {
            if (prevMode === 'editor') return 'preview';
            if (prevMode === 'preview') return 'split';
            return 'editor';
          });
          break;
        case '/':
          e.preventDefault();
          updateState('showShortcuts', prev => !prev);
          break;
        case 'f': // Ctrl+F 触发搜索
          e.preventDefault();
          // 这里可以实现搜索功能
          break;
        case 'shift':
          break; // 忽略单独的Shift键
        default:
          // 移除智能建议相关的逻辑
          break;
      }
    }
    
    // 处理Ctrl+Shift快捷键
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          handleFormat('ul');
          break;
        case 'o':
          e.preventDefault();
          handleFormat('ol');
          break;
        case 'q':
          e.preventDefault();
          handleFormat('quote');
          break;
        case 'k':
          e.preventDefault();
          handleFormat('codeblock');
          break;
        case 'f': // Ctrl+Shift+F 切换全屏
          e.preventDefault();
          updateState('isFullscreen', prev => !prev);
          break;
      }
    }

    // 处理F11全屏快捷键
    if (e.key === 'F11') {
      e.preventDefault();
      updateState('isFullscreen', prev => !prev);
    }
  }, [handleFormat, handleSave, updateState]);

  /**
   * 添加键盘事件监听器
   */
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /**
   * 插入LaTeX公式
   */
  const handleInsertLatexFormula = (formula: string) => {
    // 调用工具函数插入LaTeX公式
    insertLatexFormula(formula, state.content, (newContent: string) => updateState('content', newContent));
    updateState('latexEditorOpen', false);
  };

  /**
   * 插入知识图表到文章
   */
  const handleInsertGraph = () => {
    if (state.generatedGraph) {
      // 构建知识图表的JSON字符串
      const graphJson = JSON.stringify(state.generatedGraph, null, 2);
      // 使用 [graph] 语法插入到文章中
      const graphMarkdown = `\n[graph]${graphJson}[/graph]\n`;
      // 插入到当前光标位置
      insertGraphMarkdown(graphMarkdown, state.content, (newContent: string) => updateState('content', newContent));
      showNotification('知识图表已插入到文章中', 'success');
      updateState('showGraphGenerator', false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 通知组件 */}
      {state.notification && (
        <Notification
          message={state.notification.message}
          type={state.notification.type}
          onClose={closeNotification}
        />
      )}

      {/* 快捷键面板 */}
      {state.showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">键盘快捷键</h2>
              <button
                onClick={() => updateState('showShortcuts', false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {/* 按类别分组显示快捷键 */}
              {Array.from(new Set(SHORTCUTS.map(shortcut => shortcut.category))).map(category => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SHORTCUTS.filter(shortcut => shortcut.category === category).map(shortcut => (
                      <div key={shortcut.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{shortcut.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{shortcut.description}</div>
                        </div>
                        <kbd className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-300 dark:border-gray-500">
                          {shortcut.defaultKey}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                提示：按 <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-xs font-mono">Ctrl+/</kbd> 可快速显示/隐藏此面板
              </div>
            </div>
          </div>
        </div>
      )}


      
      {/* 帮助面板 */}
      {state.showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">编辑器帮助</h2>
              <button
                onClick={() => updateState('showHelp', false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-6">
                {/* 基本操作 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">基本操作</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• 直接在编辑区域输入Markdown格式的文本</p>
                    <p>• 使用工具栏进行格式化操作</p>
                    <p>• 切换不同的视图模式（编辑/预览/分屏）</p>
                    <p>• 自动保存功能会定期保存您的工作</p>
                  </div>
                </div>
                
                {/* 支持的功能 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">支持的功能</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Markdown语法支持</p>
                    <p>• LaTeX公式编辑（$inline$ 和 $$block$$）</p>
                    <p>• Mermaid图表支持</p>
                    <p>• 代码高亮</p>
                    <p>• 表格支持</p>
                    <p>• 列表支持</p>
                    <p>• 链接和图片支持</p>
                    <p>• 知识图谱生成</p>
                  </div>
                </div>
                
                {/* 快捷键 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">常用快捷键</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+S</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">保存文章</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+Z</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">撤销</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+Y</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">重做</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+P</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">切换预览</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+/</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">显示快捷键</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+B</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">加粗</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+I</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">斜体</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Ctrl+K</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">插入链接</span>
                    </div>
                  </div>
                </div>
                
                {/* 支持和反馈 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">支持和反馈</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>如果您遇到任何问题或有改进建议，请通过以下方式联系我们：</p>
                    <p>• 查看文档：[文档链接]</p>
                    <p>• 提交反馈：[反馈链接]</p>
                    <p>• 联系支持：[支持邮箱]</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 主编辑区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 编辑器主体 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 编辑器工具栏 */}
          <EditorToolbar
            viewMode={state.viewMode}
            onToggleViewMode={toggleViewMode}
            onSave={handleSave}
            isSaving={state.isSaving}
            onSelectTemplate={() => updateState('showTemplateManager', true)}
            onGenerateGraph={() => updateState('showGraphGenerator', true)}
            showHelp={state.showHelp}
            onToggleHelp={() => updateState('showHelp', !state.showHelp)}
            showToolbar={state.showToolbar}
            onToggleToolbar={() => updateState('showToolbar', !state.showToolbar)}
            livePreview={state.livePreview}
            onToggleLivePreview={() => updateState('livePreview', !state.livePreview)}
            collaborators={state.collaborators}
            onOpenDraftManager={toggleDraftManager}
            onSaveDraft={handleManualSaveDraft}
          />

          {/* 文章标题输入区域 */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 transition-all">
            <input
              type="text"
              value={state.title}
              onChange={handleTitleChange}
              className="w-full text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              placeholder="请输入文章标题..."
              autoFocus
            />
            <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center justify-between">
              <span>{state.title.length} / 100 字符</span>
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  {state.visibility === 'public' ? (
                    <Globe size={14} className="mr-1 text-blue-500" />
                  ) : (
                    <Lock size={14} className="mr-1 text-purple-500" />
                  )}
                  {state.visibility === 'public' ? '公开' : '仅分享'}
                </span>
                <span>
                  {state.content.length} 字符
                </span>
              </div>
            </div>
          </div>

          {/* 格式化工具栏 */}
          {state.showToolbar && (
            <EditorFormattingToolbar
              onFormat={handleFormat}
              onCopyFormat={handleCopyFormat}
              onPasteFormat={handlePasteFormat}
              onToggleFormatBrush={handleToggleFormatBrush}
              isFormatBrushActive={state.isFormatBrushActive}
            />
          )}

          {/* 编辑器内容区域 */}
          <div className={`editor-content-area ${state.isFullscreen ? 'fullscreen' : ''}`}>
            <EditorContentArea
              content={state.content}
              setContent={handleContentChange}
              viewMode={state.viewMode}
              livePreview={state.livePreview}
              isLoading={state.isLoading}
              error={state.error}
              onCursorPositionChange={handleCursorPositionChange}
              collaborators={state.collaborators}
            />
            
            {/* 智能建议UI已移除 - 自动补全功能已禁用 */}
          </div>

          {/* 文章发布设置 */}
          <div className="border-t border-gray-200 dark:border-gray-700 transition-all duration-300">
            {/* 设置面板切换按钮 */}
            <button
              onClick={() => updateState('showSettingsPanel', !state.showSettingsPanel)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-300"
            >
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-700 dark:text-gray-300">文章发布设置</span>
              </div>
              <svg
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${state.showSettingsPanel ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 设置面板内容 */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 ${state.showSettingsPanel ? 'max-h-96' : 'max-h-0'}`}
            >
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-6">
                  {/* 可见性设置 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">可见性设置</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => updateState('visibility', 'public')}
                          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-150 ${state.visibility === 'public' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650'}`}
                        >
                          <Globe size={16} className="text-blue-500 dark:text-blue-400" />
                          <span>公开</span>
                        </button>
                        <button
                          onClick={() => updateState('visibility', 'unlisted')}
                          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-150 ${state.visibility === 'unlisted' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650'}`}
                        >
                          <Lock size={16} className="text-purple-500 dark:text-purple-400" />
                          <span>仅分享</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 作者信息设置 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">作者信息</h3>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="authorName" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者名称</label>
                        <input
                          type="text"
                          id="authorName"
                          value={state.authorName}
                          onChange={(e) => updateState('authorName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入作者名称"
                        />
                      </div>
                      <div>
                        <label htmlFor="authorEmail" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者邮箱</label>
                        <input
                          type="email"
                          id="authorEmail"
                          value={state.authorEmail}
                          onChange={(e) => updateState('authorEmail', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入作者邮箱"
                        />
                      </div>
                      <div>
                        <label htmlFor="authorUrl" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者网站</label>
                        <input
                          type="url"
                          id="authorUrl"
                          value={state.authorUrl}
                          onChange={(e) => updateState('authorUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入作者网站"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 编辑器底部状态栏 */}
          <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>上次编辑: {state.lastEdited ? state.lastEdited.toLocaleString() : '从未'}</span>
              <span>{state.content.split('\n').length} 行</span>
              <span>{state.content.length} 字符</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">Ln {state.cursorPosition.line}, Col {state.cursorPosition.column}</span>
            </div>
          </div>
        </div>

        {/* 编辑器侧边栏 */}
        <EditorSidebar
          showToc={state.showToc}
          onToggleToc={() => updateState('showToc', !state.showToc)}
          tableOfContents={state.tableOfContents}
          expandedTocItems={state.expandedTocItems}
          setExpandedTocItems={(items) => updateState('expandedTocItems', items)}
          activeTocItem={state.activeTocItem}
          setActiveTocItem={(item) => updateState('activeTocItem', item)}
        />
      </div>

      {/* 模板选择对话框 */}
      {state.showTemplateManager && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
          <TemplateManager
            onSelectTemplate={handleSelectTemplate}
            onClose={() => updateState('showTemplateManager', false)}
          />
        </Suspense>
      )}

      {/* LaTeX编辑器 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <LatexEditor
          isOpen={state.latexEditorOpen}
          onClose={() => updateState('latexEditorOpen', false)}
          onInsert={handleInsertLatexFormula}
          initialFormula={state.selectedText}
        />
      </Suspense>

      {/* 自动保存管理器 */}
      <AutosaveManager
        title={state.title}
        content={state.content}
        visibility={state.visibility}
        slug={state.slug || undefined}
      />

      {/* 历史记录管理器 */}
      <HistoryManager
        title={state.title}
        content={state.content}
        setTitle={setTitle}
        setContent={setContent}
      />

      {/* 知识图表生成器 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <GraphGenerator
          isOpen={state.showGraphGenerator}
          onClose={() => updateState('showGraphGenerator', false)}
          onGenerate={handleGenerateGraph}
          onInsert={handleInsertGraph}
          generatedGraph={state.generatedGraph}
          config={state.graphGenerationConfig}
          onConfigChange={(config) => updateState('graphGenerationConfig', config)}
        />
      </Suspense>

      {/* 图片上传对话框 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <ImageUploadDialog
          isOpen={state.imageUploadDialogOpen}
          onClose={() => updateState('imageUploadDialogOpen', false)}
          onImageUploaded={handleImageUploaded}
          showNotification={showNotification}
        />
      </Suspense>

      {/* 文件上传对话框 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <FileUploadDialog
          isOpen={state.fileUploadDialogOpen}
          onClose={() => updateState('fileUploadDialogOpen', false)}
          onFileUploaded={handleFileUploaded}
          showNotification={showNotification}
        />
      </Suspense>

      {/* 草稿管理器 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <DraftManager
          isOpen={showDraftManager}
          onClose={() => setShowDraftManager(false)}
          onLoadDraft={handleLoadDraft}
          onCreateNewDraft={handleCreateNewDraft}
        />
      </Suspense>
    </div>
  );
}