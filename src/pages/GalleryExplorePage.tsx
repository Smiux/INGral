import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Tag, Download } from 'lucide-react';
import { getGalleryById } from '@/services/galleryService';
import { getArticleBySlug } from '@/services/articleService';
import { TiptapEditor } from '@/components/articles/core/TipTap';
import { FootnotePanel } from '@/components/articles/panels/Footnote';
import { TocItem, TableOfContentsPanel } from '@/components/articles/panels/TableOfContents';
import { useTocUtils } from '@/components/articles/utils/ToC';
import { ExplorationGraphPanel, ExplorationNavigator } from '@/components/gallerys';
import type { Editor } from '@tiptap/react';
import type { Gallery, EmbeddedArticle, ArticleNode } from '@/components/gallerys/gallery';

type ExplorePresentation = 'beacon' | 'graph';

const DOCK_LEAVE_COLLAPSE_MS = 100;

interface ArticleData {
  title: string;
  content: string;
  summary?: string | null;
  tags?: string[] | null;
  coverImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isEmbedded: boolean;
}

export function GalleryExplorePage () {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const articleSlug = searchParams.get('article');
  const embeddedArticleId = searchParams.get('embedded');

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [explorePresentation, setExplorePresentation] = useState<ExplorePresentation>('beacon');
  const [exploreDockCollapsed, setExploreDockCollapsed] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [currentNode, setCurrentNode] = useState<ArticleNode | null>(null);
  const dockLeaveTimerRef = useRef<number | null>(null);

  const { toggleCollapsed, getChildIds, isItemCollapsed, shouldShowItem } = useTocUtils();

  const handleToggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => toggleCollapsed(prev, itemId));
  }, [toggleCollapsed]);

  useEffect(() => {
    const loadArticle = async () => {
      if (!galleryId || (!articleSlug && !embeddedArticleId)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const fetchedGallery = await getGalleryById(galleryId);
        if (!fetchedGallery) {
          setIsLoading(false);
          return;
        }

        setGallery(fetchedGallery);

        const foundNode = fetchedGallery.nodes.find((n: ArticleNode) => {
          if (embeddedArticleId) {
            return n.data.embeddedArticleId === embeddedArticleId;
          }
          return n.data.articleSlug === articleSlug && !n.data.isEmbedded;
        }) ?? null;
        setCurrentNode(foundNode);

        if (embeddedArticleId) {
          const embeddedArticle = fetchedGallery.embeddedArticles.find(
            (a: EmbeddedArticle) => a.id === embeddedArticleId
          );
          if (embeddedArticle) {
            setArticle({
              'title': embeddedArticle.title,
              'content': embeddedArticle.content,
              'summary': embeddedArticle.summary || null,
              'tags': embeddedArticle.tags || null,
              'coverImage': embeddedArticle.coverImage || null,
              'createdAt': embeddedArticle.createdAt,
              'updatedAt': embeddedArticle.updatedAt,
              'isEmbedded': true
            });
          }
        } else if (articleSlug) {
          if (foundNode && !foundNode.data.isEmbedded) {
            const existingArticle = await getArticleBySlug(articleSlug);
            if (existingArticle) {
              setArticle({
                'title': existingArticle.title,
                'content': existingArticle.content || '',
                'summary': existingArticle.summary,
                'tags': existingArticle.tags,
                'coverImage': existingArticle.cover_image,
                'createdAt': existingArticle.created_at,
                'updatedAt': existingArticle.updated_at,
                'isEmbedded': false
              });
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [galleryId, articleSlug, embeddedArticleId]);

  const clearDockLeaveTimer = useCallback(() => {
    if (dockLeaveTimerRef.current !== null) {
      window.clearTimeout(dockLeaveTimerRef.current);
      dockLeaveTimerRef.current = null;
    }
  }, []);

  const handleDockTitlePointerEnter = useCallback(() => {
    clearDockLeaveTimer();
    setExploreDockCollapsed(false);
  }, [clearDockLeaveTimer]);

  const handleDockRegionPointerLeave = useCallback(() => {
    clearDockLeaveTimer();
    dockLeaveTimerRef.current = window.setTimeout(() => {
      setExploreDockCollapsed(true);
      dockLeaveTimerRef.current = null;
    }, DOCK_LEAVE_COLLAPSE_MS);
  }, [clearDockLeaveTimer]);

  useEffect(() => {
    return () => {
      clearDockLeaveTimer();
    };
  }, [clearDockLeaveTimer]);

  useEffect(() => {
    clearDockLeaveTimer();
    setExplorePresentation('beacon');
    setExploreDockCollapsed(false);
  }, [articleSlug, embeddedArticleId, clearDockLeaveTimer]);

  const handleSwitchToGraph = useCallback(() => {
    clearDockLeaveTimer();
    setExplorePresentation('graph');
    setExploreDockCollapsed(false);
  }, [clearDockLeaveTimer]);

  const handleSwitchToBeacon = useCallback(() => {
    clearDockLeaveTimer();
    setExplorePresentation('beacon');
    setExploreDockCollapsed(false);
  }, [clearDockLeaveTimer]);

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  const handleTableOfContentsChange = useCallback((items: TocItem[]) => {
    setTableOfContentsItems(items);
  }, []);

  const handleTocClick = useCallback((itemId: string) => {
    const scroller = scrollAreaRef.current;
    const element = document.querySelector(`[data-toc-id="${itemId}"]`);
    if (!element || !scroller) {
      return;
    }
    const offsetTop = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 88;
    scroller.scrollTo({
      'top': offsetTop,
      'behavior': 'smooth'
    });
  }, []);

  const handleExportHtml = () => {
    if (!article) {
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

    const exportCreatedDate = formatDateForExport(article.createdAt);
    const exportUpdatedDate = formatDateForExport(article.updatedAt);

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
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
  <img class="cover-image" src="${article.coverImage || ''}" alt="${article.title}">
  <h1>${article.title}</h1>
  <div class="meta">
    <div>创建时间: ${exportCreatedDate}</div>
    <div>更新时间: ${exportUpdatedDate}</div>
  </div>
  ${article.summary ? `<blockquote>${article.summary}</blockquote>` : ''}
  ${article.tags && article.tags.length > 0 ? `
  <div class="tags">
    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
  </div>
  ` : ''}
  <article>
    ${article.content || ''}
  </article>
</body>
</html>`;

    const blob = new Blob([htmlContent], { 'type': 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${article.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">文章未找到</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">您访问的文章不存在。</p>
        <Link
          to="/gallerys"
          className="inline-flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 px-6 py-2 rounded hover:bg-sky-100/80 hover:border-sky-300 hover:text-sky-600 dark:hover:bg-sky-900/30 dark:hover:border-sky-700 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回地图列表
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
      'minute': '2-digit'
    });
  };

  const createdDate = formatDate(article.createdAt);
  const updatedDate = formatDate(article.updatedAt);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col">
      <button
        onClick={() => navigate(`/gallerys/${galleryId}`)}
        className="fixed top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-800/60 rounded hover:bg-sky-200/80 dark:hover:bg-sky-600/20 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回地图
      </button>

      <div className="flex flex-1 min-h-0 flex-col max-w-7xl mx-auto w-full min-w-0">
        <div
          ref={scrollAreaRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        >
          <article className="px-4 py-8">
            {article.coverImage && (
              <div className="mb-6 rounded overflow-hidden bg-slate-100 dark:bg-slate-700">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-auto object-cover max-h-[70vh]"
                />
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-100 min-w-0">{article.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleExportHtml}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/40 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded hover:bg-emerald-200/80 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    导出HTML
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400 mt-4">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  创建于 {createdDate}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  更新于 {updatedDate}
                </div>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      title={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100/80 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 rounded-full text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {article.summary && (
              <blockquote className="mb-6 pl-4 border-l-4 border-sky-400 bg-sky-50/80 dark:bg-sky-900/20 py-3 pr-4 rounded-r">
                <p className="text-slate-600 dark:text-slate-300 italic m-0">
                  {article.summary}
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
              containerClassName="hidden xl:block fixed left-4 top-[11rem] w-48 z-10"
              collapsedButtonClassName="hidden xl:block fixed left-4 top-[11rem] z-10"
            />

            <FootnotePanel
              editor={editor}
              editable={false}
              containerClassName="hidden xl:block fixed right-4 top-[11rem] w-48 z-10"
              collapsedButtonClassName="hidden xl:block fixed right-4 top-[11rem] z-10"
            />

            <div className="min-w-0">
              <main>
                {article.content && (
                  <TiptapEditor
                    editable={false}
                    content={article.content}
                    onEditorReady={handleEditorReady}
                    onTableOfContentsChange={handleTableOfContentsChange}
                  />
                )}
              </main>
            </div>
          </article>
        </div>

        <div className="shrink-0 flex flex-col border-t border-slate-200/60 dark:border-slate-700/60">
          {explorePresentation === 'graph' && gallery && currentNode && (
            <ExplorationGraphPanel
              collapsed={exploreDockCollapsed}
              onSwitchToBeacon={handleSwitchToBeacon}
              onDockTitlePointerEnter={handleDockTitlePointerEnter}
              onDockRegionPointerLeave={handleDockRegionPointerLeave}
              nodes={gallery.nodes}
              edges={gallery.edges}
              currentNode={currentNode}
              galleryId={gallery.id}
            />
          )}
          {explorePresentation === 'beacon' && gallery && currentNode && (
            <ExplorationNavigator
              collapsed={exploreDockCollapsed}
              onSwitchToGraph={handleSwitchToGraph}
              onDockTitlePointerEnter={handleDockTitlePointerEnter}
              onDockRegionPointerLeave={handleDockRegionPointerLeave}
              nodes={gallery.nodes}
              edges={gallery.edges}
              currentNode={currentNode}
              galleryId={gallery.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
