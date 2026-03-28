import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ListTree, Trash2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';
import { getArticleBySlug, getCoverImageUrl, deleteArticle, type ArticleWithContent } from '../../services/articleService';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TocItem {
  id: string;
  textContent: string;
  level: number;
  itemIndex: string;
  isScrolledOver: boolean;
}

interface TocItemProps {
  item: TocItem;
  onClick: () => void;
}

const TOC_LEVEL_STYLES: Record<number, { fontSize: string; fontWeight: string; numberColor: string }> = {
  '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold', 'numberColor': 'font-semibold text-sky-500' },
  '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium', 'numberColor': 'text-sm font-medium text-green-500' },
  '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium', 'numberColor': 'text-xs font-medium text-neutral-500 dark:text-neutral-400' }
};

const TocItemComponent: React.FC<TocItemProps> = ({ item, onClick }) => {
  const style = TOC_LEVEL_STYLES[item.level] ?? TOC_LEVEL_STYLES[3]!;

  return (
    <div
      className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${item.isScrolledOver ? 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-h-[26px]">
        <span className={`${style.numberColor} flex-shrink-0 mr-2`}>
          {item.itemIndex}
        </span>
        <span className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${style.fontSize} ${style.fontWeight} text-left flex-1`}>
          {item.textContent}
        </span>
      </div>
    </div>
  );
};

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);

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
  }, [slug]);

  useEffect(() => {
    if (!article?.content || !contentRef.current) {
      return;
    }

    const headings = contentRef.current.querySelectorAll('h1, h2, h3');
    const tocItems: TocItem[] = [];
    const levelCounters: Record<number, number> = { '1': 0, '2': 0, '3': 0 };

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const text = heading.textContent ?? '';

      const counters = { ...levelCounters };
      counters[level] = (counters[level] || 0) + 1;
      if (level < 3) {
        counters[level + 1] = 0;
        if (level < 2) {
          counters[3] = 0;
        }
      }
      Object.assign(levelCounters, counters);

      let itemIndex = `${counters[1]}`;
      if (level === 1) {
        itemIndex += '.';
      } else if (level === 2) {
        itemIndex += `.${counters[2]}`;
      } else if (level === 3) {
        itemIndex += `.${counters[2]}.${counters[3]}`;
      }

      const id = `heading-${index}`;
      heading.id = id;

      tocItems.push({
        id,
        'textContent': text,
        level,
        itemIndex,
        'isScrolledOver': false
      });
    });

    setTableOfContentsItems(tocItems);

    const renderMath = () => {
      if (!contentRef.current) {
        return;
      }

      const inlineMathElements = contentRef.current.querySelectorAll<HTMLElement>('[data-type="inline-math"]');
      inlineMathElements.forEach((element) => {
        const latex = element.getAttribute('data-latex');
        if (latex) {
          try {
            katex.render(latex, element, {
              'throwOnError': false,
              'displayMode': false
            });
          } catch {
            element.textContent = latex;
          }
        }
      });

      const blockMathElements = contentRef.current.querySelectorAll<HTMLElement>('[data-type="block-math"]');
      blockMathElements.forEach((element) => {
        const latex = element.getAttribute('data-latex');
        if (latex) {
          element.classList.add('tiptap-mathematics-render');
          const inner = document.createElement('span');
          inner.className = 'block-math-inner';
          element.appendChild(inner);
          try {
            katex.render(latex, inner, {
              'throwOnError': false,
              'displayMode': true
            });
          } catch {
            inner.textContent = latex;
          }
        }
      });
    };

    const highlightCode = () => {
      if (!contentRef.current) {
        return;
      }

      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    };

    renderMath();
    highlightCode();
  }, [article?.content]);

  const handleTocClick = (itemId: string) => {
    const element = contentRef.current?.querySelector(`[data-toc-id="${itemId}"], #${itemId}`);
    if (element) {
      element.scrollIntoView({ 'behavior': 'smooth' });
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

  const formattedDate = article.created_at
    ? new Date(article.created_at).toLocaleDateString('zh-CN', {
      'year': 'numeric',
      'month': 'long',
      'day': 'numeric'
    })
    : '未知';

  return (
    <article className="max-w-7xl mx-auto px-4 py-8">
      <nav className="mb-6">
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

      {article.cover_image_path && (
        <div className="mb-6 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700">
          <img
            src={getCoverImageUrl(article.cover_image_path) || ''}
            alt={article.title}
            className="w-full h-auto object-cover max-h-[400px]"
          />
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">{article.title}</h1>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? '删除中...' : '删除文章'}
          </button>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400 mt-4">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            {formattedDate}
          </div>
        </div>
      </div>

      {article.summary && (
        <blockquote className="mb-6 pl-4 border-l-4 border-sky-400 bg-sky-50 dark:bg-sky-900/20 py-3 pr-4 rounded-r-lg">
          <p className="text-neutral-700 dark:text-neutral-300 italic m-0">
            {article.summary}
          </p>
        </blockquote>
      )}

      {tableOfContentsItems.length > 0 && (
        <aside className="hidden xl:block fixed left-4 top-[11rem] w-48 z-10">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-sky-400" />
                目录
              </h3>
            </div>
            <nav className="p-2 pt-0 space-y-0.5 max-h-[50vh] overflow-y-auto">
              {tableOfContentsItems.map((item) => (
                <TocItemComponent
                  key={item.id}
                  item={item}
                  onClick={() => handleTocClick(item.id)}
                />
              ))}
            </nav>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0">
        <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div
            ref={contentRef}
            className="prose prose-lg max-w-none mx-auto p-6 md:p-8 [counter-reset:equation] dark:prose-invert"
            dangerouslySetInnerHTML={{ '__html': article.content }}
          />
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
      />

      <ConfirmDialog
        isOpen={showErrorDialog}
        title="删除失败"
        message="删除文章失败，请稍后重试。"
        confirmText="确定"
        onConfirm={() => setShowErrorDialog(false)}
        onCancel={() => setShowErrorDialog(false)}
      />
    </article>
  );
}
