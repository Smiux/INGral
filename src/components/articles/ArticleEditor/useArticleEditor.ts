import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ContentTemplate } from '../../../types/template';
import type { Article } from '../../../types';
import { articleService } from '../../../services/articleService';
import { generateGraphFromArticle } from '../../../utils/GraphGenerationUtils';
import type { GraphNode, GraphLink } from '../../../types';
import { generateTableOfContents } from './EditorUtils';
import { supabase } from '../../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  
  // 知识图表相关状态
  showGraphGenerator: boolean;
  generatedGraph: { nodes: GraphNode[]; links: GraphLink[] } | null;
  graphGenerationConfig: {
    maxNodes: number;
    maxLinks: number;
    minConceptOccurrences: number;
    extractionDepth: number;
  };
  
  // 协作编辑状态
  isCollaborative: boolean;
  collaborators: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[];
  remoteChange: { field: 'title' | 'content'; value: string; timestamp: Date } | null;
  isResolvingConflict: boolean;
}

/**
 * 文章编辑器Hook
 * 管理编辑器的核心状态和逻辑
 */
export function useArticleEditor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  // 初始化状态
  const [state, setState] = useState<ArticleEditorState>({
    // 文章核心状态
    article: null,
    title: '',
    content: '',
    slug: slug || null,
    isSaving: false,
    isLoading: !!slug,
    error: '',
    
    // 编辑器配置状态
    visibility: 'public',
    authorName: '',
    authorEmail: '',
    authorUrl: '',
    lastEdited: null,
    
    // 编辑器视图状态
    viewMode: 'editor',
    isMobile: window.innerWidth < 768,
    livePreview: true,
    isFullscreen: false,
    
    // 编辑器面板状态
    showSettingsPanel: false,
    showHelp: false,
    showTemplateManager: false,
    showToc: false,
    
    // 未保存更改状态
    hasUnsavedChanges: false,
    
    // 目录状态
    tableOfContents: [],
    expandedTocItems: new Set(),
    activeTocItem: '',
    
    // 格式刷状态
    copiedFormat: null,
    isFormatBrushActive: false,
    
    // 工具栏折叠状态
    showToolbar: true,
    
    // 光标位置状态
    cursorPosition: { line: 1, column: 1 },
    
    // 通知状态
    notification: null,
    
    // LaTeX编辑器状态
    latexEditorOpen: false,
    selectedText: '',
    
    // 图片上传对话框状态
    imageUploadDialogOpen: false,
    
    // 文件上传对话框状态
    fileUploadDialogOpen: false,
    
    // 快捷键相关状态
    showShortcuts: false,
    
    // 知识图表相关状态
    showGraphGenerator: false,
    generatedGraph: null,
    graphGenerationConfig: {
      maxNodes: 30,
      maxLinks: 50,
      minConceptOccurrences: 2,
      extractionDepth: 2
    },
    
    // 协作编辑状态
    isCollaborative: !!slug, // 已存在的文章默认开启协作
    collaborators: [],
    remoteChange: null,
    isResolvingConflict: false
  });

  // 实时订阅通道引用
  const channelRef = useRef<RealtimeChannel | null>(null);
  // 本地编辑的时间戳，用于冲突检测
  const localEditTimestampRef = useRef<Date>(new Date());
  // 保存最新状态的ref，用于在回调函数中获取最新状态
  const stateRef = useRef<ArticleEditorState>(state);

  // 更新状态的辅助函数
  const updateState = useCallback(<K extends keyof ArticleEditorState>(key: K, value: ArticleEditorState[K] | ((prev: ArticleEditorState[K]) => ArticleEditorState[K])) => {
    setState(prev => {
      const newState = {
        ...prev,
        [key]: typeof value === 'function' 
          ? (value as (prev: ArticleEditorState[K]) => ArticleEditorState[K])(prev[key])
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
  const batchUpdateState = useCallback((updates: Partial<ArticleEditorState> | ((prev: ArticleEditorState) => Partial<ArticleEditorState>)) => {
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
          article: data,
          title: data.title,
          content: data.content,
          visibility: data.visibility || 'public',
          authorName: data.author_name || '',
          authorEmail: data.author_email || '',
          authorUrl: data.author_url || '',
          lastEdited: data.updated_at ? new Date(data.updated_at) : null,
          isLoading: false
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载文章失败';
        console.error('加载文章错误:', errorMessage);
        batchUpdateState({
          error: errorMessage,
          isLoading: false
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
    if (!state.article) { // 只有未上传的文章才保存为草稿
      try {
        const draftKey = `draft_anonymous_${slug || 'new'}`;
        const currentDate = new Date();
        
        // 创建草稿对象
        const draft = {
          title: state.title,
          content: state.content,
          visibility: state.visibility,
          authorName: state.authorName,
          authorEmail: state.authorEmail,
          authorUrl: state.authorUrl,
          lastSaved: currentDate.toISOString(),
          createdAt: currentDate.toISOString(),
          id: `${slug || 'new'}_${Date.now()}`
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
        // 对于未上传的文章，自定义确认提示
        const message = '您有未保存的更改，是否保存为草稿？';
        (e as BeforeUnloadEvent).returnValue = message;
        return message;
      }
      return;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, state.article]);

  /**
   * 监听路由变化，实现自定义离开确认
   */
  useEffect(() => {
    const handleRouteChange = (e: PopStateEvent) => {
      if (state.hasUnsavedChanges && !state.article) {
        const shouldSave = window.confirm('您有未保存的更改，是否保存为草稿？');
        if (shouldSave) {
          saveDraft();
        } else if (shouldSave === false) {
          // 用户取消离开，阻止路由跳转
          e.preventDefault();
        }
      }
    };

    // 添加路由变化监听
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
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

      // 更新本地编辑时间戳
      const now = new Date();
      localEditTimestampRef.current = now;

      let result: Article | null | undefined;
      if (article) {
        result = await articleService.updateArticle(
          article.id, 
          title, 
          content, 
          visibility, 
          authorName, 
          authorEmail, 
          authorUrl
        );
      } else {
        result = await articleService.createArticle(
          title, 
          content, 
          visibility, 
          authorName, 
          authorEmail, 
          authorUrl
        );
      }

      if (!result) {
        throw new Error('保存文章时返回空结果');
      }

      batchUpdateState({
        article: result,
        lastEdited: now,
        hasUnsavedChanges: false,
        isSaving: false
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

      batchUpdateState({
        error: userFriendlyError,
        isSaving: false
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
   * 处理远程文章更新
   */
  const handleRemoteUpdate = useCallback((payload: {
    eventType: string;
    new?: Article;
  }) => {
    // 检查更新是否来自当前用户的操作
    if (payload.eventType === 'UPDATE' && payload.new) {
      const { new: updatedArticle } = payload;
      
      // 检查是否是自己的更新（通过比较最后编辑时间）
      const serverUpdatedAt = new Date(updatedArticle.updated_at);
      if (serverUpdatedAt > localEditTimestampRef.current) {
        // 直接从state获取hasUnsavedChanges，避免在依赖项中使用
        // 这样可以打破循环依赖
        setState(prevState => {
          if (prevState.hasUnsavedChanges) {
            // 有未保存的本地更改，触发冲突解决流程
            return {
              ...prevState,
              isResolvingConflict: true,
              remoteChange: {
                field: 'content',
                value: updatedArticle.content,
                timestamp: serverUpdatedAt
              }
            };
          } else {
            // 无未保存更改，直接应用远程更新
            return {
              ...prevState,
              article: updatedArticle,
              content: updatedArticle.content,
              title: updatedArticle.title,
              lastEdited: serverUpdatedAt
            };
          }
        });
        // 显示通知
        showNotification('检测到远程更改，需要解决冲突', 'info');
      }
    }
  }, [showNotification]);

  /**
   * 设置实时订阅
   */
  useEffect(() => {
    if (state.article && state.isCollaborative) {
      // 创建实时订阅通道
      const channel = supabase.channel(`article_${state.article.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'articles',
            filter: `id=eq.${state.article.id}`
          },
          handleRemoteUpdate
        )
        .subscribe();

      channelRef.current = channel;

      // 获取当前协作者列表（模拟实现，实际可以从数据库获取）
      const mockCollaborators = [
        {
          id: 'user1',
          name: '协作编辑者1',
          cursorPosition: { line: 5, column: 10 }
        }
      ];
      updateState('collaborators', mockCollaborators);
    }

    return () => {
      // 清理订阅
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [state.article, state.isCollaborative, handleRemoteUpdate, updateState]);

  /**
   * 解决冲突
   */
  const resolveConflict = useCallback((keepLocal: boolean) => {
    if (state.remoteChange) {
      if (keepLocal) {
        // 保留本地更改，忽略远程更改
        showNotification('已保留本地更改', 'info');
      } else {
        // 应用远程更改，覆盖本地更改
        if (state.remoteChange.field === 'content') {
          updateState('content', state.remoteChange.value);
        } else if (state.remoteChange.field === 'title') {
          updateState('title', state.remoteChange.value);
        }
        showNotification('已应用远程更改', 'info');
      }
      
      // 重置冲突状态
      updateState('isResolvingConflict', false);
      updateState('remoteChange', null);
    }
  }, [state.remoteChange, updateState, showNotification]);

  /**
   * 处理内容变化
   */
  const handleContentChange = useCallback((newContent: string) => {
    // 更新本地编辑时间戳
    localEditTimestampRef.current = new Date();
    
    updateState('content', newContent);
  }, [updateState]);



  /**
   * 处理光标位置变化
   */
  const handleCursorPositionChange = useCallback((position: { line: number; column: number }) => {
    updateState('cursorPosition', position);
  }, [updateState]);

  /**
   * 生成知识图表
   */
  const handleGenerateGraph = useCallback(() => {
    try {
      if (!state.content.trim()) {
        showNotification('请先输入文章内容', 'info');
        return;
      }

      const graph = generateGraphFromArticle({
        title: state.title || '未命名文章',
        content: state.content,
        visibility: state.visibility,
        author_name: state.authorName,
        author_email: state.authorEmail,
        author_url: state.authorUrl
      } as Article, state.graphGenerationConfig);

      updateState('generatedGraph', { nodes: graph.nodes, links: graph.links });
      showNotification(`成功生成知识图表，包含 ${graph.nodes.length} 个节点和 ${graph.links.length} 条关系`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成知识图表失败';
      console.error('生成知识图表错误:', errorMessage);
      showNotification(errorMessage, 'error');
    }
  }, [state.content, state.title, state.visibility, state.authorName, state.authorEmail, state.authorUrl, state.graphGenerationConfig, showNotification, updateState]);

  /**
   * 内容变化时自动更新目录
   */
  useEffect(() => {
    const toc = generateTableOfContents(state.content);
    updateState('tableOfContents', toc);
  }, [state.content, updateState]);

  // 为HistoryManager创建稳定的setTitle和setContent函数
  const setTitle = useCallback((title: string) => {
    updateState('title', title);
  }, [updateState]);

  const setContent = useCallback((content: string) => {
    updateState('content', content);
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
    handleGenerateGraph,
    resolveConflict,
    setTitle,
    setContent,
    handleManualSaveDraft
  };
}
