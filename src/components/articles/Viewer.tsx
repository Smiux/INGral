import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ListTree, Trash2, Edit3, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { getArticleBySlug, deleteArticle, type ArticleWithContent } from '../../services/articleService';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TiptapEditor } from './core/TipTap';
import { FootnotePanel } from './panels/FootnotePanel';
import type { Editor } from '@tiptap/react';

interface TocItem {
  id: string;
  textContent: string;
  level: number;
  isScrolledOver: boolean;
}

interface TocItemProps {
  item: TocItem;
  onClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasChildren: boolean;
  isHidden: boolean;
}

const TOC_LEVEL_STYLES: Record<number, { fontSize: string; fontWeight: string }> = {
  '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold' },
  '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium' },
  '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium' }
};

const TocItemComponent: React.FC<TocItemProps> = ({ item, onClick, isCollapsed, onToggleCollapse, hasChildren, isHidden }) => {
  const style = TOC_LEVEL_STYLES[item.level] ?? TOC_LEVEL_STYLES[3]!;

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-in-out ${isHidden ? 'max-h-0 opacity-0 py-0' : 'max-h-20 opacity-100'}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
    >
      <div
        className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${item.isScrolledOver ? 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          {item.level < 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="flex-shrink-0 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              {hasChildren && isCollapsed && <ChevronRight className="w-3 h-3 transition-transform duration-200" />}
              {hasChildren && !isCollapsed && <ChevronDown className="w-3 h-3 transition-transform duration-200" />}
              {!hasChildren && <span className="w-3 h-3" />}
            </button>
          )}
          <span className={`truncate transition-all duration-300 max-w-full ${style.fontSize} ${style.fontWeight} text-left`}>
            {item.textContent}
          </span>
        </div>
      </div>
    </div>
  );
};

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const toggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const getChildIds = useCallback((parentId: string, items: TocItem[]): string[] => {
    const parentIndex = items.findIndex((item) => item.id === parentId);
    if (parentIndex === -1) {
      return [];
    }

    const parentLevel = items[parentIndex]!.level;
    const childIds: string[] = [];

    for (let i = parentIndex + 1; i < items.length; i += 1) {
      const item = items[i]!;
      if (item.level <= parentLevel) {
        break;
      }
      childIds.push(item.id);
    }
    return childIds;
  }, []);

  const isItemCollapsed = useCallback((itemId: string): boolean => {
    return collapsedItems.has(itemId);
  }, [collapsedItems]);

  const shouldShowItem = useCallback((itemId: string, items: TocItem[]): boolean => {
    for (const collapsedId of collapsedItems) {
      const childIds = getChildIds(collapsedId, items);
      if (childIds.includes(itemId)) {
        return false;
      }
    }
    return true;
  }, [collapsedItems, getChildIds]);

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

  const handleEditorReady = (editorInstance: Editor) => {
    setEditor(editorInstance);
    setEditorReady(true);
  };

  useEffect(() => {
    if (!article?.content || !contentRef.current || !editorReady) {
      return;
    }

    const editorContainer = contentRef.current.querySelector('.ProseMirror');
    const targetContainer = editorContainer || contentRef.current;

    const headings = targetContainer.querySelectorAll('h1, h2, h3');
    const tocItems: TocItem[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const text = heading.textContent ?? '';
      const id = `heading-${index}`;
      heading.id = id;

      tocItems.push({
        id,
        'textContent': text,
        level,
        'isScrolledOver': false
      });
    });

    setTableOfContentsItems(tocItems);

    const highlightSearchMatches = (): void => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      const matchIndex = parseInt(urlParams.get('match') || '0', 10);

      if (!query) {
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
      }, 500);
    };

    highlightSearchMatches();
  }, [article?.content, editorReady]);

  useEffect(() => {
    const handleHashChange = (): void => {
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
      }, 500);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleTocClick = (itemId: string) => {
    const editorContainer = contentRef.current?.querySelector('.ProseMirror');
    const targetContainer = editorContainer || contentRef.current;
    if (!targetContainer) {
      return;
    }
    const element = targetContainer.querySelector(`[data-toc-id="${itemId}"], #${itemId}`);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        'top': offsetTop,
        'behavior': 'smooth'
      });
    }
  };

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

      {tableOfContentsItems.length > 0 && (
        <aside className="hidden xl:block fixed left-4 top-[11rem] w-48 z-10 print:hidden">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-sky-400" />
                目录
              </h3>
            </div>
            <nav className="p-2 pt-0 max-h-[50vh] overflow-y-auto">
              {tableOfContentsItems.map((item) => (
                <TocItemComponent
                  key={item.id}
                  item={item}
                  onClick={() => handleTocClick(item.id)}
                  isCollapsed={isItemCollapsed(item.id)}
                  onToggleCollapse={() => toggleCollapsed(item.id)}
                  hasChildren={getChildIds(item.id, tableOfContentsItems).length > 0}
                  isHidden={!shouldShowItem(item.id, tableOfContentsItems)}
                />
              ))}
            </nav>
          </div>
        </aside>
      )}

      <FootnotePanel editor={editor} editable={false} />

      <div className="flex-1 min-w-0" ref={contentRef}>
        <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          {article.content && (
            <TiptapEditor
              editable={false}
              content={article.content}
              onEditorReady={handleEditorReady}
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
