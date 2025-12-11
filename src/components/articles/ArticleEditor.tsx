/**
 * 文章编辑器组件
 * 支持Markdown编辑、LaTeX公式、实时预览和自动保存功能
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';
import { Globe, Lock } from 'lucide-react';
import type { ContentTemplate } from '../../types/template';
import type { Article } from '../../types';
import { articleService } from '../../services/articleService';
import { Notification } from '../common/Notification';
import { EditorToolbar } from './ArticleEditor/EditorToolbar';
import { EditorFormattingToolbar } from './ArticleEditor/EditorFormattingToolbar';
import { EditorContentArea } from './ArticleEditor/EditorContentArea';
import { EditorSidebar } from './ArticleEditor/EditorSidebar';
import { AutosaveManager } from './ArticleEditor/AutosaveManager';
import { HistoryManager } from './ArticleEditor/HistoryManager';
import { copyFormat, pasteFormat, handleFormat as formatText, generateTableOfContents, insertLatexFormula, insertGraphMarkdown } from './ArticleEditor/EditorUtils';
import { generateGraphFromArticle } from '../../utils/GraphGenerationUtils';
import type { GraphNode, GraphLink } from '../../types';

// 懒加载非核心组件，优化初始加载时间
const TemplateManager = lazy(() => import('./TemplateManager').then(m => ({ default: m.TemplateManager })));
const LatexEditor = lazy(() => import('../editors/LatexEditor').then(m => ({ default: m.LatexEditor })));
const GraphGenerator = lazy(() => import('./ArticleEditor/GraphGenerator').then(m => ({ default: m.GraphGenerator })));
const ImageUploadDialog = lazy(() => import('./ArticleEditor/ImageUploadDialog').then(m => ({ default: m.ImageUploadDialog })));
const FileUploadDialog = lazy(() => import('./ArticleEditor/FileUploadDialog').then(m => ({ default: m.FileUploadDialog })));

/**
 * 文章编辑器组件
 * 管理编辑器的主要状态和逻辑
 */
export function ArticleEditor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  // 文章核心状态
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [error, setError] = useState('');
  
  // 编辑器配置状态
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  
  // 编辑器视图状态
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isMobile, setIsMobile] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [livePreview, setLivePreview] = useState(true);
  
  // 编辑器面板状态
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showToc, setShowToc] = useState(false);
  
  // 未保存更改状态
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 目录状态
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());
  const [activeTocItem, setActiveTocItem] = useState<string>('');
  
  // 格式刷状态
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isFormatBrushActive, setIsFormatBrushActive] = useState(false);
  
  // 工具栏折叠状态
  const [showToolbar, setShowToolbar] = useState(true);
  
  // 光标位置状态
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  
  // 通知状态
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  
  // LaTeX编辑器状态
  const [latexEditorOpen, setLatexEditorOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  // 图片上传对话框状态
  const [imageUploadDialogOpen, setImageUploadDialogOpen] = useState(false);
  
  // 文件上传对话框状态
  const [fileUploadDialogOpen, setFileUploadDialogOpen] = useState(false);
  
  // 快捷键相关状态
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // 知识图表相关状态
  const [showGraphGenerator, setShowGraphGenerator] = useState(false);
  const [generatedGraph, setGeneratedGraph] = useState<{nodes: GraphNode[], links: GraphLink[]} | null>(null);
  const [graphGenerationConfig, setGraphGenerationConfig] = useState({
    maxNodes: 30,
    maxLinks: 50,
    minConceptOccurrences: 2,
    extractionDepth: 2
  });
  
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
   * 目录项类型定义
   */
  interface TableOfContentsItem {
    id: string;
    text: string;
    level: number;
    children: TableOfContentsItem[];
  }

  /**
   * 检测屏幕尺寸以确定是否为移动设备
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * 在移动设备上默认显示编辑视图
   */
  useEffect(() => {
    if (isMobile) {
      setViewMode('editor');
    } else {
      setViewMode('split');
    }
  }, [isMobile]);

  /**
   * 处理文章加载
   */
  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await articleService.getArticleBySlug(slug);
        if (!data) {
          setError('文章未找到');
          setIsLoading(false);
          return;
        }

        setArticle(data);
        setTitle(data.title);
        setContent(data.content);
        setVisibility(data.visibility || 'public');
        setAuthorName(data.author_name || '');
        setAuthorEmail(data.author_email || '');
        setAuthorUrl(data.author_url || '');
        setLastEdited(data.updated_at ? new Date(data.updated_at) : null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载文章失败';
        console.error('加载文章错误:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadArticle();
    } else {
      setIsLoading(false);
    }
  }, [slug]);

  /**
   * 跟踪未保存的更改
   */
  useEffect(() => {
    if (!isLoading) {
      const initialTitle = article?.title || '';
      const initialContent = article?.content || '';
      const initialVisibility = article?.visibility || 'public';
      
      setHasUnsavedChanges(
        title !== initialTitle || 
        content !== initialContent || 
        visibility !== initialVisibility
      );
    }
  }, [title, content, visibility, article, isLoading]);

  /**
   * 添加离开确认功能
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // 现代浏览器只需要调用preventDefault()，不需要设置returnValue
        return '';
      }
      return;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /**
   * 显示通知
   */
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  /**
   * 关闭通知
   */
  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  /**
   * 处理文章标题输入，实时检查标题长度
   */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // 标题长度提示
    if (newTitle.length > 100) {
      showNotification('标题长度建议不超过100个字符', 'info');
    }
  }, [showNotification]);

  /**
   * 保存文章
   */
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (!title.trim()) {
        const errorMsg = '文章标题不能为空';
        setError(errorMsg);
        showNotification(errorMsg, 'error');
        setIsSaving(false);
        return;
      }

      if (!content.trim()) {
        const errorMsg = '文章内容不能为空';
        setError(errorMsg);
        showNotification(errorMsg, 'error');
        setIsSaving(false);
        return;
      }

      let result: Article | null | undefined;
      if (article) {
        result = await articleService.updateArticle(article.id, title, content, visibility, authorName, authorEmail, authorUrl);
      } else {
        result = await articleService.createArticle(title, content, visibility, authorName, authorEmail, authorUrl);
      }

      if (!result) {
        throw new Error('保存文章时返回空结果');
        
      }

      setArticle(result);
      setLastEdited(new Date());

      // 清除草稿
      const draftKey = `draft_anonymous_${slug || 'new'}`;
      localStorage.removeItem(draftKey);

      // 重置未保存更改状态
      setHasUnsavedChanges(false);

      // 检查文章是否为临时ID文章
      const isOfflineArticle = result.id?.toString().startsWith('temp_') ?? false;

      if (isOfflineArticle) {
        showNotification('文章已保存（离线模式），将在网络恢复时自动同步', 'info');
      } else {
        if (result && result.slug) {
          showNotification('文章保存成功', 'success');
          const newSlug = result.slug;
          // 稍微延迟一下，让用户看到通知
          setTimeout(() => {
            navigate(`/article/${newSlug}`, { replace: true });
          }, 500);
        } else {
          console.error('保存成功，但无法获取文章链接');
          showNotification('保存成功，但无法获取文章链接，请手动返回首页', 'info');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存文章失败';
      console.error('保存文章错误:', errorMessage);

      // 根据不同错误类型显示更友好的错误信息
      let userFriendlyError = '保存文章失败，请稍后重试';
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        userFriendlyError = '网络连接问题，文章已保存到本地，将在网络恢复时同步';
      } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        userFriendlyError = '权限不足，您没有权限修改此文章';
      } else if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
        userFriendlyError = '文章内容验证失败，请检查输入内容';
      }

      setError(userFriendlyError);
      showNotification(userFriendlyError, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [article, title, content, visibility, authorName, authorEmail, authorUrl, slug, showNotification, navigate]);

  /**
   * 处理模板选择
   */
  const handleSelectTemplate = useCallback((template: ContentTemplate) => {
    // 更新编辑器内容为模板内容
    setContent(template.content);
    // 如果是新文章，可以设置一个默认标题
    if (!article && !title.trim()) {
      setTitle(template.name);
    }
    showNotification(`已应用模板: ${template.name}`, 'success');
    setShowTemplateManager(false);
  }, [article, title, showNotification]);

  /**
   * 切换视图模式
   */
  const toggleViewMode = useCallback((mode: 'split' | 'editor' | 'preview') => {
    setViewMode(mode);
  }, []);

  /**
   * 加载自动保存的草稿
   */
  useEffect(() => {
    if (article) {return;} // 已有文章时不加载草稿

    try {
      const draftKey = `draft_anonymous_${slug || 'new'}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // 如果用户确认，可以加载草稿
        if (window.confirm('检测到未完成的草稿，是否恢复？')) {
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setVisibility(draft.visibility || 'public');
        }
        // 无论用户选择与否，都清除草稿，避免下次编辑时再次提示
        localStorage.removeItem(draftKey);
      }
    } catch (err) {
      console.warn('加载草稿失败:', err);
    }
  }, [article, slug]);

  /**
   * 复制格式
   */
  const handleCopyFormat = () => {
    const format = copyFormat(content);
    if (format) {
      setCopiedFormat(format);
      setIsFormatBrushActive(true);
      showNotification(`已复制${format === 'bold' ? '粗体' : format === 'italic' ? '斜体' : format === 'strikethrough' ? '删除线' : '行内代码'}格式`, 'success');
    } else {
      showNotification('请先选择要复制格式的文本', 'info');
    }
  };

  /**
   * 粘贴格式
   */
  const handlePasteFormat = () => {
    if (copiedFormat) {
      pasteFormat(copiedFormat, content, setContent);
      showNotification('格式已应用', 'success');
    } else {
      showNotification('请先复制格式', 'info');
    }
  };

  /**
   * 切换格式刷状态
   */
  const handleToggleFormatBrush = () => {
    if (isFormatBrushActive) {
      setIsFormatBrushActive(false);
      setCopiedFormat(null);
      showNotification('格式刷已关闭', 'info');
    } else {
      handleCopyFormat();
    }
  };

  /**
   * 处理光标位置变化
   */
  const handleCursorPositionChange = useCallback((position: { line: number; column: number }) => {
    setCursorPosition(position);
  }, []);

  /**
   * 处理文本格式化
   */
  const handleFormat = useCallback((formatType: string, data: Record<string, unknown> = {}) => {
    // 处理特殊格式类型
    if (formatType === 'latex') {
      // 打开LaTeX编辑器
      setLatexEditorOpen(true);
      // 获取当前选中的文本作为初始公式
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const selectedText = textarea.value.substring(
          textarea.selectionStart,
          textarea.selectionEnd
        );
        setSelectedText(selectedText);
      }
      return;
    } else if (formatType === 'image') {
      // 打开图片上传对话框
      setImageUploadDialogOpen(true);
      return;
    } else if (formatType === 'file') {
      // 打开文件上传对话框
      setFileUploadDialogOpen(true);
      return;
    }
    // 调用编辑器核心的格式化函数
    formatText(formatType, data, content, setContent);
  }, [content, setContent, setLatexEditorOpen, setSelectedText]);

  /**
   * 处理图片上传成功
   */
  const handleImageUploaded = useCallback((imageUrl: string) => {
    // 插入到当前光标位置
    formatText('image', { url: imageUrl }, content, setContent);
  }, [content, setContent]);

  /**
   * 处理文件上传成功
   */
  const handleFileUploaded = useCallback((fileUrl: string, fileName: string) => {
    // 插入到当前光标位置
    formatText('file', { url: fileUrl, name: fileName }, content, setContent);
  }, [content, setContent]);

  /**
   * 处理键盘快捷键
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
          // 根据当前视图模式切换到下一个模式
          const nextMode = viewMode === 'editor' ? 'preview' : viewMode === 'preview' ? 'split' : 'editor';
          toggleViewMode(nextMode);
          break;
        case '/':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
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
      }
    }
  }, [handleFormat, handleSave, toggleViewMode, showShortcuts]);

  /**
   * 添加键盘事件监听器
   */
  useEffect(() => {
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
    insertLatexFormula(formula, content, setContent);
    setLatexEditorOpen(false);
  };

  /**
   * 生成知识图表
   */
  const handleGenerateGraph = () => {
    try {
      if (!content.trim()) {
        showNotification('请先输入文章内容', 'info');
        return;
      }

      const graph = generateGraphFromArticle({
        title: title || '未命名文章',
        content: content,
        visibility: visibility,
        author_name: authorName,
        author_email: authorEmail,
        author_url: authorUrl
      } as Article, graphGenerationConfig);

      setGeneratedGraph({ nodes: graph.nodes, links: graph.links });
      showNotification(`成功生成知识图表，包含 ${graph.nodes.length} 个节点和 ${graph.links.length} 条关系`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成知识图表失败';
      console.error('生成知识图表错误:', errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  /**
   * 插入知识图表到文章
   */
  const handleInsertGraph = () => {
    if (generatedGraph) {
      // 构建知识图表的JSON字符串
      const graphJson = JSON.stringify(generatedGraph, null, 2);
      // 使用 [graph] 语法插入到文章中
      const graphMarkdown = `\n[graph]${graphJson}[/graph]\n`;
      // 插入到当前光标位置
      insertGraphMarkdown(graphMarkdown, content, setContent);
      showNotification('知识图表已插入到文章中', 'success');
      setShowGraphGenerator(false);
    }
  };

  /**
   * 内容变化时自动更新目录
   */
  useEffect(() => {
    const toc = generateTableOfContents(content);
    setTableOfContents(toc);
  }, [content]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 通知组件 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}

      {/* 快捷键面板 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">键盘快捷键</h2>
              <button
                onClick={() => setShowShortcuts(false)}
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

      {/* 设置面板 */}
      {showSettingsPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">编辑器设置</h2>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-6">
                {/* 可见性设置 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">可见性设置</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setVisibility('public')}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-150 ${visibility === 'public' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650'}`}
                      >
                        <Globe size={16} className="text-blue-500 dark:text-blue-400" />
                        <span>公开</span>
                      </button>
                      <button
                        onClick={() => setVisibility('unlisted')}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-150 ${visibility === 'unlisted' 
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
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入作者名称"
                      />
                    </div>
                    <div>
                      <label htmlFor="authorEmail" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者邮箱</label>
                      <input
                        type="email"
                        id="authorEmail"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入作者邮箱"
                      />
                    </div>
                    <div>
                      <label htmlFor="authorUrl" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者网站</label>
                      <input
                        type="url"
                        id="authorUrl"
                        value={authorUrl}
                        onChange={(e) => setAuthorUrl(e.target.value)}
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
      )}
      
      {/* 帮助面板 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">编辑器帮助</h2>
              <button
                onClick={() => setShowHelp(false)}
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
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            onSave={handleSave}
            isSaving={isSaving}
            onSelectTemplate={() => setShowTemplateManager(true)}
            onGenerateGraph={() => setShowGraphGenerator(true)}
            showSettingsPanel={showSettingsPanel}
            onToggleSettings={() => setShowSettingsPanel(!showSettingsPanel)}
            showHelp={showHelp}
            onToggleHelp={() => setShowHelp(!showHelp)}
            showToolbar={showToolbar}
            onToggleToolbar={() => setShowToolbar(!showToolbar)}
            livePreview={livePreview}
            onToggleLivePreview={() => setLivePreview(!livePreview)}
            showLineNumbers={showLineNumbers}
            onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
          />

          {/* 文章标题输入区域 */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 transition-all">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="w-full text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              placeholder="请输入文章标题..."
              autoFocus
            />
            <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center justify-between">
              <span>{title.length} / 100 字符</span>
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  {visibility === 'public' ? (
                    <Globe size={14} className="mr-1 text-blue-500" />
                  ) : (
                    <Lock size={14} className="mr-1 text-purple-500" />
                  )}
                  {visibility === 'public' ? '公开' : '未列出'}
                </span>
                <span>
                  {content.length} 字符
                </span>
              </div>
            </div>
          </div>

          {/* 格式化工具栏 */}
          {showToolbar && (
            <EditorFormattingToolbar
              onFormat={handleFormat}
              onCopyFormat={handleCopyFormat}
              onPasteFormat={handlePasteFormat}
              onToggleFormatBrush={handleToggleFormatBrush}
              isFormatBrushActive={isFormatBrushActive}
            />
          )}

          {/* 编辑器内容区域 */}
          <EditorContentArea
            content={content}
            setContent={setContent}
            viewMode={viewMode}
            livePreview={livePreview}
            showLineNumbers={showLineNumbers}
            isLoading={isLoading}
            error={error}
            onCursorPositionChange={handleCursorPositionChange}
          />

          {/* 编辑器底部状态栏 */}
          <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>上次编辑: {lastEdited ? lastEdited.toLocaleString() : '从未'}</span>
              <span>{content.split('\n').length} 行</span>
              <span>{content.length} 字符</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            </div>
          </div>
        </div>

        {/* 编辑器侧边栏 */}
        <EditorSidebar
          showToc={showToc}
          onToggleToc={() => setShowToc(!showToc)}
          tableOfContents={tableOfContents}
          expandedTocItems={expandedTocItems}
          setExpandedTocItems={setExpandedTocItems}
          activeTocItem={activeTocItem}
          setActiveTocItem={setActiveTocItem}
        />
      </div>

      {/* 模板选择对话框 */}
      {showTemplateManager && (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
          <TemplateManager
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplateManager(false)}
          />
        </Suspense>
      )}

      {/* LaTeX编辑器 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <LatexEditor
          isOpen={latexEditorOpen}
          onClose={() => setLatexEditorOpen(false)}
          onInsert={handleInsertLatexFormula}
          initialFormula={selectedText}
        />
      </Suspense>

      {/* 自动保存管理器 */}
      <AutosaveManager
        title={title}
        content={content}
        visibility={visibility}
        slug={slug || undefined}
      />

      {/* 历史记录管理器 */}
      <HistoryManager
        title={title}
        content={content}
        setTitle={setTitle}
        setContent={setContent}
      />

      {/* 知识图表生成器 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <GraphGenerator
          isOpen={showGraphGenerator}
          onClose={() => setShowGraphGenerator(false)}
          onGenerate={handleGenerateGraph}
          onInsert={handleInsertGraph}
          generatedGraph={generatedGraph}
          config={graphGenerationConfig}
          onConfigChange={setGraphGenerationConfig}
        />
      </Suspense>

      {/* 图片上传对话框 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <ImageUploadDialog
          isOpen={imageUploadDialogOpen}
          onClose={() => setImageUploadDialogOpen(false)}
          onImageUploaded={handleImageUploaded}
          showNotification={showNotification}
        />
      </Suspense>

      {/* 文件上传对话框 */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">加载中...</div>}>
        <FileUploadDialog
          isOpen={fileUploadDialogOpen}
          onClose={() => setFileUploadDialogOpen(false)}
          onFileUploaded={handleFileUploaded}
          showNotification={showNotification}
        />
      </Suspense>
    </div>
  );
}