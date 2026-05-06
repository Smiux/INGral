import { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Trash2, Edit3, Tag, Download,
  Plus, ChevronLeft, ChevronRight, LayoutGrid, FileText, Save, X
} from 'lucide-react';
import {
  getArticleBySlug,
  getArticleById,
  deleteArticle,
  getArticleBySlug as getArticle,
  type ArticleWithContent,
  type ArticleListItem
} from '../../services/articleService';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TiptapEditor } from './core/TipTap';
import { FootnotePanel } from './panels/Footnote';
import { TocItem, TableOfContentsPanel } from './panels/TableOfContents';
import { useTocUtils } from './utils/ToC';
import { MultiViewer } from './MultiViewer';
import { ArticleSelector } from './ArticleSelector';
import { ConnectionProvider, ArticleConnectionLines, ConnectionPointManager, ConnectionInteraction, JumpPathBar } from './connection';
import { ConnectionContext, type ExtendedConnectionContextValue, buildPathStep, type PathStep } from './connection/types';
import type { Editor } from '@tiptap/react';

type ViewMode = 'single' | 'grid';
type SidePosition = 'left' | 'right' | null;

interface SideArticle {
  article: ArticleWithContent;
  position: SidePosition;
  pointId: string;
}

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<{ getEditor:() => Editor | null } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const [multiArticles, setMultiArticles] = useState<ArticleWithContent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [sideArticle, setSideArticle] = useState<SideArticle | null>(null);
  const sideEditorRef = useRef<{ getEditor:() => Editor | null } | null>(null);
  const sideContentRef = useRef<HTMLDivElement>(null);
  const [jumpPath, setJumpPath] = useState<PathStep[]>([]);

  const isMultiMode = multiArticles.length > 1;

  const { toggleCollapsed, getChildIds, isItemCollapsed, shouldShowItem } = useTocUtils();

  const handleToggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => toggleCollapsed(prev, itemId));
  }, [toggleCollapsed]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const loadArticle = async () => {
      setIsLoading(true);
      try {
        const data = await getArticleBySlug(slug);
        setArticle(data);
        if (data) {
          setMultiArticles([data]);
          setCurrentIndex(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  const currentArticle = isMultiMode ? multiArticles[currentIndex] : article;

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
    editorRef.current = {
      'getEditor': () => editorInstance
    };
  }, []);

  const handleTableOfContentsChange = useCallback((items: TocItem[]) => {
    setTableOfContentsItems(items);
  }, []);

  useEffect(() => {
    if (!editor || !contentRef.current) {
      return;
    }

    const highlightSearchMatches = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      const matchIndex = parseInt(urlParams.get('match') || '0', 10);

      if (!query) {
        return;
      }

      const editorContainer = contentRef.current?.querySelector('.ProseMirror');
      const targetContainer = editorContainer || contentRef.current;
      if (!targetContainer) {
        return;
      }

      const highlightRegex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const walker = document.createTreeWalker(
        targetContainer,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
      }

      let currentMatchIndex = 0;

      textNodes.forEach((textNode) => {
        if (!textNode.textContent?.match(highlightRegex)) {
          return;
        }
        const parent2 = textNode.parentNode as HTMLElement | null;
        if (!parent2 || parent2.tagName === 'MARK') {
          return;
        }
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const text = textNode.textContent || '';
        let match: RegExpExecArray | null;
        const regex = new RegExp(highlightRegex.source, 'gi');

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          const mark = document.createElement('mark');
          mark.className = 'bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5';
          mark.textContent = match[0];
          mark.setAttribute('data-match-index', currentMatchIndex.toString());
          fragment.appendChild(mark);
          currentMatchIndex += 1;
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent2.replaceChild(fragment, textNode);
      });

      setTimeout(() => {
        const marks = targetContainer.querySelectorAll('mark[data-match-index]');
        const targetMark = marks?.[matchIndex];
        if (targetMark) {
          targetMark.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
        }
      }, 100);
    };

    highlightSearchMatches();
  }, [editor]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash !== '#content-match') {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const matchIndex = parseInt(urlParams.get('match') || '0', 10);

      setTimeout(() => {
        const editorContainer = contentRef.current?.querySelector('.ProseMirror');
        const targetContainer = editorContainer || contentRef.current;
        if (!targetContainer) {
          return;
        }
        const marks = targetContainer.querySelectorAll('mark[data-match-index]');
        const targetMark = marks?.[matchIndex];
        if (targetMark) {
          targetMark.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
        }
      }, 100);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleTocClick = useCallback((itemId: string) => {
    const element = document.querySelector(`[data-toc-id="${itemId}"]`);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        'top': offsetTop,
        'behavior': 'smooth'
      });
    }
  }, []);

  const handleDelete = async () => {
    if (!currentArticle || isDeleting) {
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!currentArticle || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteArticle(currentArticle.id);
      if (success) {
        navigate('/articles');
      } else {
        setShowDeleteDialog(false);
        setShowErrorDialog(true);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportHtml = () => {
    if (!currentArticle) {
      return;
    }

    const formatDateForExport = (dateStr: string | null | undefined): string => {
      if (!dateStr) {
        return '未知';
      }
      return new Date(dateStr).toLocaleString('zh-CN', {
        'year': 'numeric',
        'month': 'long',
        'day': 'numeric',
        'hour': '2-digit',
        'minute': '2-digit',
        'second': '2-digit'
      });
    };

    const exportArticle = currentArticle;
    const exportCreatedDate = formatDateForExport(exportArticle.created_at);
    const exportUpdatedDate = formatDateForExport(exportArticle.updated_at);

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exportArticle.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .cover-image {
      width: 100%;
      max-height: 70vh;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 1.5em;
    }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    blockquote {
      border-left: 4px solid #0ea5e9;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
      background: #f0f9ff;
      padding: 0.5em 1em;
      border-radius: 0 4px 4px 0;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 1em;
    }
    .tags {
      margin: 1em 0;
    }
    .tag {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.85em;
      margin-right: 4px;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      background: #f1f5f9;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  ${exportArticle.cover_image ? `<img src="${exportArticle.cover_image}" alt="${exportArticle.title}" class="cover-image">` : ''}
  <h1>${exportArticle.title}</h1>
  <div class="meta">
    <div>创建时间: ${exportCreatedDate}</div>
    <div>更新时间: ${exportUpdatedDate}</div>
  </div>
  ${exportArticle.summary ? `<blockquote>${exportArticle.summary}</blockquote>` : ''}
  ${exportArticle.tags && exportArticle.tags.length > 0 ? `
  <div class="tags">
    ${exportArticle.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
  </div>
  ` : ''}
  <article>
    ${exportArticle.content || ''}
  </article>
</body>
</html>`;

    const blob = new Blob([htmlContent], { 'type': 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportArticle.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddArticles = useCallback(async (selectedArticles: ArticleListItem[]) => {
    const loadedArticles: ArticleWithContent[] = [];

    for (const item of selectedArticles) {
      const existing = multiArticles.find(a => a.id === item.id);
      if (existing) {
        loadedArticles.push(existing);
      } else {
        const fullArticle = await getArticle(item.slug);
        if (fullArticle) {
          loadedArticles.push(fullArticle);
        }
      }
    }

    setMultiArticles(prev => [...prev, ...loadedArticles]);
    if (multiArticles.length <= 1 && loadedArticles.length > 0) {
      setViewMode('grid');
    }
  }, [multiArticles]);

  const handleRemoveArticle = useCallback((articleId: string) => {
    setMultiArticles(prev => {
      const next = prev.filter(a => a.id !== articleId);
      if (next.length <= 1) {
        setViewMode('single');
      }
      return next;
    });
    setCurrentIndex(prev => {
      if (prev >= multiArticles.length - 1) {
        return Math.max(0, multiArticles.length - 2);
      }
      return prev;
    });
  }, [multiArticles.length]);

  const handleSelectArticle = useCallback((articleId: string) => {
    const index = multiArticles.findIndex(a => a.id === articleId);
    if (index >= 0) {
      setCurrentIndex(index);
      setViewMode('single');
    }
  }, [multiArticles]);

  const handlePrevArticle = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : multiArticles.length - 1));
  }, [multiArticles.length]);

  const handleNextArticle = useCallback(() => {
    setCurrentIndex(prev => (prev < multiArticles.length - 1 ? prev + 1 : 0));
  }, [multiArticles.length]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'single' ? 'grid' : 'single');
  }, []);

  const handleJumpToArticle = useCallback(async (targetArticleId: string, pointId: string, direction: 'source' | 'target') => {
    const displayArticle2 = currentArticle || article;
    if (!displayArticle2) {
      return;
    }

    if (targetArticleId === displayArticle2.id) {
      const marker = document.querySelector(`[data-connection-point-id="${pointId}"]`) as HTMLElement;
      if (marker) {
        marker.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
      }
      return;
    }

    if (sideArticle && targetArticleId === sideArticle.article.id) {
      const marker = document.querySelector(`[data-connection-point-id="${pointId}"]`) as HTMLElement;
      if (marker) {
        marker.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
      }
      return;
    }

    const targetArticle = await getArticleById(targetArticleId);
    if (!targetArticle) {
      return;
    }

    if (sideArticle && targetArticleId !== displayArticle2.id) {
      setArticle(sideArticle.article);
      setMultiArticles([sideArticle.article]);
      setCurrentIndex(0);
    }

    setSideArticle({
      'article': targetArticle,
      'position': direction === 'target' ? 'right' : 'left',
      pointId
    });
  }, [currentArticle, article, sideArticle]);

  const handleJumpToArticleWithPath = useCallback(async (targetArticleId: string, pointId: string, direction: 'source' | 'target', connectionId?: string) => {
    const displayArticle2 = currentArticle || article;
    if (!displayArticle2) {
      return;
    }

    if (targetArticleId === displayArticle2.id) {
      const marker = document.querySelector(`[data-connection-point-id="${pointId}"]`) as HTMLElement;
      if (marker) {
        marker.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
      }
      return;
    }

    const existingIndex = jumpPath.findIndex(s => s.articleId === targetArticleId && s.pointId === pointId);
    if (existingIndex >= 0) {
      setJumpPath(prev => prev.slice(0, existingIndex + 1));
    } else {
      let sourcePointId = '';
      let connLabel = '';

      if (connectionId) {
        const connectionCtx = (window as unknown as Record<string, unknown>).__connCtx as ExtendedConnectionContextValue | undefined;
        if (connectionCtx) {
          const conn = connectionCtx.state.connections.get(connectionId);
          if (conn) {
            sourcePointId = direction === 'target' ? conn.sourcePointId : conn.targetPointId;
            connLabel = conn.label;
          }
        }
      }

      const sourceStep = jumpPath.length > 0
        ? null
        : buildPathStep({
          'articleId': displayArticle2.id,
          'articleTitle': displayArticle2.title,
          'pointId': sourcePointId,
          connectionId
        });

      const targetStep = buildPathStep({
        'articleId': targetArticleId,
        'articleTitle': '',
        pointId,
        connectionId,
        'connectionLabel': connLabel || undefined
      });

      setJumpPath(prev => {
        const base = sourceStep ? [sourceStep, ...prev] : [...prev];
        return [...base, targetStep];
      });
    }

    if (sideArticle && targetArticleId !== displayArticle2.id) {
      setArticle(sideArticle.article);
      setMultiArticles([sideArticle.article]);
      setCurrentIndex(0);
    }

    const targetArticle = await getArticleById(targetArticleId);
    if (!targetArticle) {
      return;
    }

    setSideArticle({
      'article': targetArticle,
      'position': direction === 'target' ? 'right' : 'left',
      pointId
    });

    setJumpPath(prev => prev.map((step, i) => {
      if (i === prev.length - 1 && step.articleTitle === '') {
        return { ...step, 'articleTitle': targetArticle.title };
      }
      return step;
    }));
  }, [currentArticle, article, sideArticle, jumpPath]);

  const handleJumpToPoint = useCallback((pointId: string) => {
    const marker = document.querySelector(`[data-connection-point-id="${pointId}"]`) as HTMLElement;
    if (marker) {
      marker.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
    }
  }, []);

  const handlePathJump = useCallback(async (targetArticleId: string, pointId: string, direction: 'source' | 'target') => {
    await handleJumpToArticle(targetArticleId, pointId, direction);
  }, [handleJumpToArticle]);

  const handleClearPath = useCallback(() => {
    setJumpPath([]);
  }, []);

  const handleCloseSideArticle = useCallback(() => {
    setSideArticle(null);
  }, []);

  function SaveButton () {
    const { save, state } = useContext(ConnectionContext) as ExtendedConnectionContextValue;
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = useCallback(async () => {
      setIsSaving(true);
      const success = await save();
      setIsSaving(false);
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    }, [save]);

    const hasData = state.points.size > 0 || state.connections.size > 0;

    const getButtonStyle = () => {
      if (showSuccess) {
        return 'bg-green-500 text-white';
      }
      if (hasData) {
        return 'bg-indigo-500 hover:bg-indigo-600 text-white';
      }
      return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed';
    };

    const getButtonText = () => {
      if (showSuccess) {
        return '已保存';
      }
      if (isSaving) {
        return '保存中...';
      }
      return '保存连接';
    };

    return (
      <button
        onClick={handleSave}
        disabled={isSaving || !hasData}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${getButtonStyle()}`}
      >
        <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
        {getButtonText()}
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">文章未找到</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">您访问的文章不存在。</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-2 rounded-lg hover:bg-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) {
      return '未知';
    }
    return new Date(dateStr).toLocaleString('zh-CN', {
      'year': 'numeric',
      'month': 'long',
      'day': 'numeric',
      'hour': '2-digit',
      'minute': '2-digit',
      'second': '2-digit'
    });
  };

  const excludedIds = new Set(multiArticles.map(a => a.id));
  const articleIds = multiArticles.map(a => a.id);

  if (viewMode === 'grid' && isMultiMode) {
    return (
      <ConnectionProvider articleIds={articleIds}>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
          <div className="sticky top-0 z-20 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-2 print:hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleViewMode}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  单篇查看
                </button>
                <button
                  onClick={() => setShowArticleSelector(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加文章
                </button>
                <SaveButton />
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {multiArticles.length} 篇文章
              </span>
            </div>
          </div>

          <MultiViewer
            articles={multiArticles}
            onRemoveArticle={handleRemoveArticle}
            onSelectArticle={handleSelectArticle}
            onJumpToArticle={handleJumpToArticleWithPath}
          />

          <JumpPathBar
            path={jumpPath}
            currentArticleId={currentArticle?.id ?? article?.id ?? ''}
            onJumpToArticle={handlePathJump}
            onJumpToPoint={handleJumpToPoint}
            onClear={handleClearPath}
          />

          <ArticleSelector
            isOpen={showArticleSelector}
            excludedIds={excludedIds}
            onAdd={handleAddArticles}
            onClose={() => setShowArticleSelector(false)}
          />
        </div>
      </ConnectionProvider>
    );
  }

  const displayArticle = currentArticle || article;
  if (!displayArticle) {
    return null;
  }

  const createdDate = formatDate(displayArticle.created_at);
  const updatedDate = formatDate(displayArticle.updated_at);
  const singleArticleIds = isMultiMode
    ? multiArticles.map(a => a.id)
    : [displayArticle.id, ...(sideArticle ? [sideArticle.article.id] : [])];

  return (
    <ConnectionProvider articleIds={singleArticleIds}>
      <ConnectionInteraction
        interactive={isMultiMode}
        currentArticleId={displayArticle.id}
        onJumpToArticle={handleJumpToArticleWithPath}
        onJumpToPoint={handleJumpToPoint}
      />
      <div className={`flex gap-4 max-w-7xl mx-auto px-4 py-8 ${sideArticle ? 'max-w-none' : ''}`}>
        {sideArticle && sideArticle.position === 'left' && (
          <div className="w-1/2 min-w-0 flex-shrink-0">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 truncate">{sideArticle.article.title}</h2>
                <button
                  onClick={handleCloseSideArticle}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="min-w-0" ref={sideContentRef}>
                <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 relative">
                  <ArticleConnectionLines
                    articleId={sideArticle.article.id}
                    scrollContainerRef={sideContentRef}
                    editorRef={sideEditorRef}
                    renderedArticleIds={[displayArticle.id, sideArticle.article.id]}
                    renderCrossArticle={false}
                  />
                  <ConnectionPointManager
                    articleId={sideArticle.article.id}
                    editorRef={sideEditorRef}
                    interactive={false}
                  />
                  {sideArticle.article.content && (
                    <TiptapEditor
                      key={sideArticle.article.id}
                      editable={false}
                      content={sideArticle.article.content}
                      onEditorReady={(e) => {
                        sideEditorRef.current = { 'getEditor': () => e };
                      }}
                    />
                  )}
                </main>
              </div>
            </div>
          </div>
        )}

        <div className={sideArticle ? 'w-1/2 min-w-0 flex-shrink-0' : ''}>
          <article>
            {displayArticle.cover_image && (
              <div className="mb-6 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                <img
                  src={displayArticle.cover_image}
                  alt={displayArticle.title}
                  className="w-full h-auto object-cover max-h-[70vh]"
                />
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-neutral-800 dark:text-neutral-100 min-w-0">{displayArticle.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
                  {isMultiMode && (
                    <>
                      <button
                        onClick={handleToggleViewMode}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4" />
                    总览
                      </button>
                      <button
                        onClick={() => setShowArticleSelector(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                    添加
                      </button>
                    </>
                  )}
                  {!isMultiMode && (
                    <button
                      onClick={() => setShowArticleSelector(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4" />
                  多篇查看
                    </button>
                  )}
                  <button
                    onClick={handleExportHtml}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                导出HTML
                  </button>
                  <button
                    onClick={() => navigate(`/articles/${displayArticle.slug}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                编辑文章
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? '删除中...' : '删除文章'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400 mt-4">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              创建于 {createdDate}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              更新于 {updatedDate}
                </div>
              </div>

              {displayArticle.tags && displayArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {displayArticle.tags.map((tag, index) => (
                    <span
                      key={index}
                      title={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {displayArticle.summary && (
              <blockquote className="mb-6 pl-4 border-l-4 border-sky-400 bg-sky-50 dark:bg-sky-900/20 py-3 pr-4 rounded-r-lg">
                <p className="text-neutral-700 dark:text-neutral-300 italic m-0">
                  {displayArticle.summary}
                </p>
              </blockquote>
            )}

            <TableOfContentsPanel
              items={tableOfContentsItems}
              collapsedItems={collapsedItems}
              onTocItemClick={handleTocClick}
              onToggleCollapsed={handleToggleCollapsed}
              getChildIds={getChildIds}
              isItemCollapsed={isItemCollapsed}
              shouldShowItem={shouldShowItem}
              containerClassName="hidden xl:block fixed left-4 top-[11rem] w-48 z-10 print:hidden"
              collapsedButtonClassName="hidden xl:block fixed left-4 top-[11rem] z-10 print:hidden"
            />

            <FootnotePanel
              editor={editor}
              editable={false}
              containerClassName="hidden xl:block fixed right-4 top-[11rem] w-48 z-10 print:hidden"
              collapsedButtonClassName="hidden xl:block fixed right-4 top-[11rem] z-10 print:hidden"
            />

            <div className="flex-1 min-w-0" ref={contentRef}>
              <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 relative">
                <ArticleConnectionLines
                  articleId={displayArticle.id}
                  scrollContainerRef={contentRef}
                  editorRef={editorRef}
                  renderedArticleIds={sideArticle ? [displayArticle.id, sideArticle.article.id] : undefined}
                />
                <ConnectionPointManager
                  articleId={displayArticle.id}
                  editorRef={editorRef}
                  interactive={isMultiMode}
                />
                {displayArticle.content && (
                  <TiptapEditor
                    key={displayArticle.id}
                    editable={false}
                    content={displayArticle.content}
                    onEditorReady={handleEditorReady}
                    onTableOfContentsChange={handleTableOfContentsChange}
                  />
                )}
              </main>
            </div>
          </article>
        </div>

        {sideArticle && sideArticle.position === 'right' && (
          <div className="w-1/2 min-w-0 flex-shrink-0">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 truncate">{sideArticle.article.title}</h2>
                <button
                  onClick={handleCloseSideArticle}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="min-w-0" ref={sideContentRef}>
                <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 relative">
                  <ArticleConnectionLines
                    articleId={sideArticle.article.id}
                    scrollContainerRef={sideContentRef}
                    editorRef={sideEditorRef}
                    renderCrossArticle={false}
                  />
                  <ConnectionPointManager
                    articleId={sideArticle.article.id}
                    editorRef={sideEditorRef}
                    interactive={false}
                  />
                  {sideArticle.article.content && (
                    <TiptapEditor
                      key={sideArticle.article.id}
                      editable={false}
                      content={sideArticle.article.content}
                      onEditorReady={(e) => {
                        sideEditorRef.current = { 'getEditor': () => e };
                      }}
                    />
                  )}
                </main>
              </div>
            </div>
          </div>
        )}
      </div>

      {isMultiMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full shadow-lg px-3 py-1.5 print:hidden">
          <button
            onClick={handlePrevArticle}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 min-w-[4rem] text-center">
            {currentIndex + 1} / {multiArticles.length}
          </span>
          <button
            onClick={handleNextArticle}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-600 mx-1" />
          <button
            onClick={handleToggleViewMode}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-violet-500 dark:hover:text-violet-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="查看所有文章"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      )}

      <JumpPathBar
        path={jumpPath}
        currentArticleId={displayArticle.id}
        onJumpToArticle={handlePathJump}
        onJumpToPoint={handleJumpToPoint}
        onClear={handleClearPath}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除文章"
        message="确定要删除这篇文章吗？此操作不可撤销，文章将被永久删除。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
        className="print:hidden"
      />

      <ConfirmDialog
        isOpen={showErrorDialog}
        title="删除失败"
        message="删除文章失败，请稍后重试。"
        confirmText="确定"
        onConfirm={() => setShowErrorDialog(false)}
        onCancel={() => setShowErrorDialog(false)}
        className="print:hidden"
      />

      <ArticleSelector
        isOpen={showArticleSelector}
        excludedIds={excludedIds}
        onAdd={handleAddArticles}
        onClose={() => setShowArticleSelector(false)}
      />
    </ConnectionProvider>
  );
}
