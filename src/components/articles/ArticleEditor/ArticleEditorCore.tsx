import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemplateManager } from '../TemplateManager';
import type { ContentTemplate } from '../../../types/template';
import type { Article } from '../../../types';
import { articleService } from '../../../services/articleService';
import { Notification } from '../../common/Notification';
import { EditorToolbar } from './EditorToolbar';
import { EditorContentArea } from './EditorContentArea';
import { EditorSidebar } from './EditorSidebar';
import { AutosaveManager } from './AutosaveManager';
import { HistoryManager } from './HistoryManager';

/**
 * 文章编辑器核心组件
 * 管理编辑器的主要状态和逻辑
 */
export function ArticleEditorCore() {
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
  const [tableOfContents] = useState<TableOfContentsItem[]>([]);
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());
  const [activeTocItem, setActiveTocItem] = useState<string>('');
  
  // 通知状态
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

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
   * 加载文章内容
   */
  const loadArticle = useCallback(async () => {
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
  }, [slug]);

  /**
   * 处理文章加载
   */
  useEffect(() => {
    if (slug) {
      loadArticle();
    } else {
      setIsLoading(false);
    }
  }, [slug, loadArticle]);

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
        e.returnValue = '';
        return '';
      }
      return;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * 保存文章
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (!title.trim()) {
        setError('文章标题不能为空');
        setIsSaving(false);
        return;
      }

      if (!content.trim()) {
        setError('文章内容不能为空');
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
  };

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
  const toggleViewMode = () => {
    if (viewMode === 'split') {
      setViewMode('editor');
    } else if (viewMode === 'editor') {
      setViewMode('preview');
    } else {
      setViewMode('split');
    }
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 通知组件 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
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
            visibility={visibility}
            onVisibilityChange={setVisibility}
            onSelectTemplate={() => setShowTemplateManager(true)}
            showSettingsPanel={showSettingsPanel}
            onToggleSettings={() => setShowSettingsPanel(!showSettingsPanel)}
            showHelp={showHelp}
            onToggleHelp={() => setShowHelp(!showHelp)}
          />

          {/* 编辑器内容区域 */}
          <EditorContentArea
            content={content}
            setContent={setContent}
            viewMode={viewMode}
            livePreview={livePreview}
            showLineNumbers={showLineNumbers}
            isLoading={isLoading}
            error={error}
          />

          {/* 编辑器底部状态栏 */}
          <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>上次编辑: {lastEdited ? lastEdited.toLocaleString() : '从未'}</span>
              <span>{content.split('\n').length} 行</span>
              <span>{content.length} 字符</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span>{showLineNumbers ? '隐藏' : '显示'}行号</span>
              </button>
              <button
                onClick={() => setLivePreview(!livePreview)}
                className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span>{livePreview ? '关闭' : '开启'}实时预览</span>
              </button>
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
        <TemplateManager
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

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
      />
    </div>
  );
}
