import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Trash2, Edit3, Tag, Download } from 'lucide-react';
import { getArticleBySlug, deleteArticle, type ArticleWithContent } from '../../services/articleService';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TiptapEditor } from './core/TipTap';
import { FootnotePanel } from './panels/Footnote';
import { TocItem, TableOfContentsPanel } from './panels/TableOfContents';
import { useTocUtils } from './utils/ToC';
import type { Editor } from '@tiptap/react';

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const { toggleCollapsed, getChildIds, isItemCollapsed, shouldShowItem } = useTocUtils();

  const handleToggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => toggleCollapsed(prev, itemId));
  }, [toggleCollapsed]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const loadArticle = async () => {
      try {
        const data = await getArticleBySlug(slug);
        setArticle(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [slug, location.key]);

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
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
    if (!article || isDeleting) {
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!article || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteArticle(article.id);
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

    const exportCreatedDate = formatDateForExport(article.created_at);
    const exportUpdatedDate = formatDateForExport(article.updated_at);

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

  const createdDate = formatDate(article.created_at);
  const updatedDate = formatDate(article.updated_at);

  return (
    <article className="max-w-7xl mx-auto px-4 py-8">
      <nav className="mb-6 print:hidden">
        <ol className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <li>
            <Link to="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">首页</Link>
          </li>
          <li className="text-neutral-400 dark:text-neutral-500">/</li>
          <li>
            <Link to="/articles" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">文章</Link>
          </li>
          <li className="text-neutral-400 dark:text-neutral-500">/</li>
          <li>
            <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[300px]">{article.title}</span>
          </li>
        </ol>
      </nav>

      {article.cover_image && (
        <div className="mb-6 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-auto object-cover max-h-[70vh]"
          />
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-800 dark:text-neutral-100 min-w-0">{article.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            <button
              onClick={handleExportHtml}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出HTML
            </button>
            <button
              onClick={() => navigate(`/articles/${article.slug}/edit`)}
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

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {article.tags.map((tag, index) => (
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

      {article.summary && (
        <blockquote className="mb-6 pl-4 border-l-4 border-sky-400 bg-sky-50 dark:bg-sky-900/20 py-3 pr-4 rounded-r-lg">
          <p className="text-neutral-700 dark:text-neutral-300 italic m-0">
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
        <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
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
    </article>
  );
}
