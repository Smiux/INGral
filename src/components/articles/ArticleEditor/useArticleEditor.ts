import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ContentTemplate } from '../../../types/template';
import type { Article } from '../../../types';
import { articleService } from '../../../services/articleService';
import { generateTableOfContents } from './EditorUtils';

/**
 * 目录项类型定义
 */
export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
  children: TableOfContentsItem[];
}

/**
 * 编辑器视图模式
 */
export type ViewMode = 'split' | 'editor' | 'preview';

/**
 * 编辑器状态类型
 */
export interface ArticleEditorState {
  // 文章核心状态
  article: Article | null;
  title: string;
  content: string;
  slug: string | null;
  isSaving: boolean;
  isLoading: boolean;
  error: string;

  // 自动保存状态
  autosaveStatus: { message: string; type: 'saving' | 'saved' | 'error' } | null;

  // 编辑器配置状态
  visibility: 'public' | 'unlisted';
  authorName: string;
  authorEmail: string;
  authorUrl: string;
  lastEdited: Date | null;

  // 编辑器视图状态
  viewMode: ViewMode;
  isMobile: boolean;
  livePreview: boolean;
  isFullscreen: boolean;

  // 编辑器面板状态
  showSettingsPanel: boolean;
  showHelp: boolean;
  showTemplateManager: boolean;
  showToc: boolean;

  // 未保存更改状态
  hasUnsavedChanges: boolean;

  // 目录状态
  tableOfContents: TableOfContentsItem[];
  expandedTocItems: Set<string>;
  activeTocItem: string;

  // 格式刷状态
  copiedFormat: string | null;
  isFormatBrushActive: boolean;

  // 工具栏折叠状态
  showToolbar: boolean;

  // 光标位置状态
  cursorPosition: { line: number; column: number };

  // 通知状态
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;

  // LaTeX编辑器状态
  latexEditorOpen: boolean;
  selectedText: string;

  // 图片上传对话框状态
  imageUploadDialogOpen: boolean;

  // 文件上传对话框状态
  fileUploadDialogOpen: boolean;

  // 快捷键相关状态
  showShortcuts: boolean;
}

/**
 * 文章编辑器Hook
 * 管理编辑器的核心状态和逻辑
 */
export function useArticleEditor () {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  // 初始化状态
  const [state, setState] = useState<ArticleEditorState>({
    // 文章核心状态
    'article': null,
    'title': '',
    'content': '',
    'slug': slug || null,
    'isSaving': false,
    'isLoading': Boolean(slug),
    'error': '',

    // 自动保存状态
    'autosaveStatus': null,

    // 编辑器配置状态
    'visibility': 'public',
    'authorName': '',
    'authorEmail': '',
    'authorUrl': '',
    'lastEdited': null,

    // 编辑器视图状态
    'viewMode': 'editor',
    'isMobile': window.innerWidth < 768,
    'livePreview': true,
    'isFullscreen': false,

    // 编辑器面板状态
    'showSettingsPanel': false,
    'showHelp': false,
    'showTemplateManager': false,
    'showToc': false,

    // 未保存更改状态
    'hasUnsavedChanges': false,

    // 目录状态
    'tableOfContents': [],
    'expandedTocItems': new Set(),
    'activeTocItem': '',

    // 格式刷状态
    'copiedFormat': null,
    'isFormatBrushActive': false,

    // 工具栏折叠状态
    'showToolbar': true,

    // 光标位置状态
    'cursorPosition': { 'line': 1, 'column': 1 },

    // 通知状态
    'notification': null,

    // LaTeX编辑器状态
    'latexEditorOpen': false,
    'selectedText': '',

    // 图片上传对话框状态
    'imageUploadDialogOpen': false,

    // 文件上传对话框状态
    'fileUploadDialogOpen': false,

    // 快捷键相关状态
    'showShortcuts': false
  });

  // 保存最新状态的ref，用于在回调函数中获取最新状态
  const stateRef = useRef<ArticleEditorState>(state);

  // 更新状态的辅助函数
  const updateState = useCallback(<K extends keyof ArticleEditorState>(key: K, value: ArticleEditorState[K] | ((_prev: ArticleEditorState[K]) => ArticleEditorState[K])) => {
    setState(prev => {
      const newState = {
        ...prev,
        [key]: typeof value === 'function'
          ? (value as (_prev: ArticleEditorState[K]) => ArticleEditorState[K])(prev[key])
          : value
      };
      // 更新stateRef，确保始终指向最新状态
      stateRef.current = newState;
      return newState;
    });
  }, []);

  // 同步stateRef和state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 批量更新状态的辅助函数
  const batchUpdateState = useCallback((updates: Partial<ArticleEditorState> | ((_prev: ArticleEditorState) => Partial<ArticleEditorState>)) => {
    setState(prev => {
      const finalUpdates = typeof updates === 'function' ? updates(prev) : updates;
      const newState = { ...prev, ...finalUpdates };
      // 更新stateRef，确保始终指向最新状态
      stateRef.current = newState;
      return newState;
    });
  }, []);

  /**
   * 检测屏幕尺寸以确定设备类型
   */
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      updateState('isMobile', width < 768);
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);

    return () => window.removeEventListener('resize', checkDeviceType);
  }, [updateState]);

  /**
   * 响应式视图切换逻辑
   */
  useEffect(() => {
    if (state.isMobile) {
      // 移动设备默认使用编辑器模式
      updateState('viewMode', 'editor');
      // 移动设备默认隐藏工具栏，节省空间
      updateState('showToolbar', false);
      // 移动设备默认关闭实时预览，提高性能
      updateState('livePreview', false);
    } else {
      // 桌面设备默认使用分屏模式
      updateState('viewMode', 'split');
      // 桌面设备默认显示工具栏
      updateState('showToolbar', true);
      // 桌面设备默认开启实时预览
      updateState('livePreview', true);
    }
  }, [state.isMobile, updateState]);

  /**
   * 处理文章加载
   */
  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {
        updateState('isLoading', false);
        return;
      }

      try {
        const data = await articleService.getArticleBySlug(slug);
        if (!data) {
          updateState('error', '文章未找到');
          updateState('isLoading', false);
          return;
        }

        batchUpdateState({
          'article': data,
          'title': data.title,
          'content': data.content,
          'visibility': data.visibility || 'public',
          'authorName': data.author_name || '',
          'authorEmail': data.author_email || '',
          'authorUrl': data.author_url || '',
          'lastEdited': data.updated_at ? new Date(data.updated_at) : null,
          'isLoading': false
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载文章失败';
        console.error('加载文章错误:', errorMessage);
        batchUpdateState({
          'error': errorMessage,
          'isLoading': false
        });
      }
    };

    if (slug) {
      loadArticle();
    } else {
      updateState('isLoading', false);
    }
  }, [slug, updateState, batchUpdateState]);

  /**
   * 跟踪未保存的更改
   */
  useEffect(() => {
    if (!state.isLoading) {
      const initialTitle = state.article?.title || '';
      const initialContent = state.article?.content || '';
      const initialVisibility = state.article?.visibility || 'public';

      const hasChanges =
        state.title !== initialTitle ||
        state.content !== initialContent ||
        state.visibility !== initialVisibility;

      updateState('hasUnsavedChanges', hasChanges);
    }
  }, [state.title, state.content, state.visibility, state.article, state.isLoading, updateState]);

  /**
   * 显示通知
   */
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    updateState('notification', { message, type });
    // 3秒后自动关闭通知
    setTimeout(() => {
      updateState('notification', null);
    }, 3000);
  }, [updateState]);

  /**
   * 保存草稿到本地存储
   */
  const saveDraft = useCallback(() => {
    // 只有未上传的文章才保存为草稿
    if (!state.article) {
      try {
        const draftKey = `draft_anonymous_${slug || 'new'}`;
        const currentDate = new Date();

        // 创建草稿对象
        const draft = {
          'title': state.title,
          'content': state.content,
          'visibility': state.visibility,
          'authorName': state.authorName,
          'authorEmail': state.authorEmail,
          'authorUrl': state.authorUrl,
          'lastSaved': currentDate.toISOString(),
          'createdAt': currentDate.toISOString(),
          'id': `${slug || 'new'}_${Date.now()}`
        };

        // 保存到本地存储
        localStorage.setItem(draftKey, JSON.stringify(draft));
        showNotification('草稿已保存', 'success');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '保存草稿失败';
        console.error('保存草稿失败:', errorMessage);
        showNotification(`保存草稿失败: ${errorMessage}`, 'error');
      }
    }
  }, [state.article, state.title, state.content, state.visibility, state.authorName, state.authorEmail, state.authorUrl, slug, showNotification]);

  /**
   * 手动保存草稿
   */
  const handleManualSaveDraft = useCallback(() => {
    saveDraft();
  }, [saveDraft]);

  /**
   * 添加离开确认功能
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges && !state.article) {
        // 对于未上传的文章，自定义确认提示} else {
        const message = '您有未保存的更改，是否保存为草稿？';
        (e as BeforeUnloadEvent).returnValue = message;
        return message;
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, state.article]);

  /**
   * 监听路由变化，自动保存草稿
   */
  useEffect(() => {
    const handleRouteChange = (_e: PopStateEvent) => {
      if (state.hasUnsavedChanges && !state.article) {
        // 自动保存草稿，不弹出确认
        saveDraft();
      }
    };

    // 添加路由变化监听
    window.addEventListener('popstate', handleRouteChange);

    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [state.hasUnsavedChanges, state.article, saveDraft]);

  /**
   * 关闭通知
   */
  const closeNotification = useCallback(() => {
    updateState('notification', null);
  }, [updateState]);

  /**
   * 处理文章标题输入，实时检查标题长度
   */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    updateState('title', newTitle);

    // 标题长度提示
    if (newTitle.length > 100) {
      showNotification('标题长度建议不超过100个字符', 'info');
    }
  }, [showNotification, updateState]);

  /**
   * 保存文章
   */
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // 先更新保存状态，不依赖外部state
    updateState('isSaving', true);
    updateState('error', '');

    try {
      // 使用stateRef获取最新状态，避免闭包问题和无限循环
      const currentState = stateRef.current;

      const title = currentState.title;
      const content = currentState.content;
      const visibility = currentState.visibility;
      const authorName = currentState.authorName;
      const authorEmail = currentState.authorEmail;
      const authorUrl = currentState.authorUrl;
      const article = currentState.article;

      if (!title.trim()) {
        const errorMsg = '文章标题不能为空';
        updateState('error', errorMsg);
        showNotification(errorMsg, 'error');
        updateState('isSaving', false);
        return;
      }

      if (!content.trim()) {
        const errorMsg = '文章内容不能为空';
        updateState('error', errorMsg);
        showNotification(errorMsg, 'error');
        updateState('isSaving', false);
        return;
      }

      let result: Article | null | undefined;
      if (article) {
        result = await articleService.updateArticle({
          'id': article.id,
          title,
          content,
          visibility,
          authorName,
          authorEmail,
          authorUrl
        });
      } else {
        result = await articleService.createArticle({
          title,
          content,
          visibility,
          authorName,
          authorEmail,
          authorUrl
        });
      }

      if (!result) {
        throw new Error('保存文章时返回空结果');
      }

      batchUpdateState({
        'article': result,
        'lastEdited': new Date(),
        'hasUnsavedChanges': false,
        'isSaving': false
      });

      // 清除草稿
      const draftKey = `draft_anonymous_${slug || 'new'}`;
      localStorage.removeItem(draftKey);

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
            navigate(`/articles/${newSlug}`, { 'replace': true });
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

      batchUpdateState({
        'error': userFriendlyError,
        'isSaving': false
      });
      showNotification(userFriendlyError, 'error');
    }
  }, [showNotification, updateState, batchUpdateState, navigate, slug]);

  /**
   * 处理模板选择
   */
  const handleSelectTemplate = useCallback((template: ContentTemplate) => {
    // 使用batchUpdateState来更新多个状态，并确保stateRef被正确更新
    batchUpdateState(prevState => {
      // 创建新状态对象
      const newState = { ...prevState };
      // 更新编辑器内容为模板内容
      newState.content = template.content;
      // 如果是新文章，可以设置一个默认标题
      if (!newState.article && !newState.title.trim()) {
        newState.title = template.name;
      }
      // 更新模板管理器状态
      newState.showTemplateManager = false;
      return newState;
    });
    showNotification(`已应用模板: ${template.name}`, 'success');
  }, [showNotification, batchUpdateState]);

  /**
   * 切换视图模式
   */
  const toggleViewMode = useCallback((mode: ViewMode) => {
    updateState('viewMode', mode);
  }, [updateState]);

  /**
   * 处理内容变化
   */
  const handleContentChange = useCallback((newContent: string) => {
    updateState('content', newContent);
  }, [updateState]);

  /**
   * 处理光标位置变化
   */
  const handleCursorPositionChange = useCallback((position: { line: number; column: number }) => {
    updateState('cursorPosition', position);
  }, [updateState]);

  /**
   * 内容变化时自动更新目录 - 优化版，添加防抖机制
   */
  useEffect(() => {
    // 使用防抖机制，避免频繁生成目录导致的性能问题
    // 500ms防抖，减少频繁换行时的目录生成次数
    const timer = setTimeout(() => {
      const toc = generateTableOfContents(state.content);
      updateState('tableOfContents', toc);
    }, 500);

    return () => clearTimeout(timer);
  }, [state.content, updateState]);

  // 为HistoryManager创建稳定的setTitle和setContent函数
  const setTitle = useCallback((title: string) => {
    updateState('title', title);
  }, [updateState]);

  const setContent = useCallback((content: string) => {
    updateState('content', content);
  }, [updateState]);

  // 处理自动保存状态变化
  const handleAutosaveStatusChange = useCallback((status: 'saving' | 'saved' | 'error', message?: string) => {
    // 确定自动保存状态消息
    const defaultMessage = (() => {
      if (status === 'saving') {
        return '正在自动保存...';
      }
      if (status === 'saved') {
        return '自动保存成功';
      }
      return '自动保存失败';
    })();

    updateState('autosaveStatus', {
      'type': status,
      'message': message || defaultMessage
    });

    // 3秒后自动清除保存状态
    if (status === 'saved' || status === 'error') {
      setTimeout(() => {
        updateState('autosaveStatus', null);
      }, 3000);
    }
  }, [updateState]);

  // 返回状态和方法
  return {
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
    setTitle,
    setContent,
    handleManualSaveDraft,
    handleAutosaveStatusChange
  };
}
