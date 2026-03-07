import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';
import { getArticleBySlug, type ArticleWithContent } from '../../services/articleService';

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

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

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">{article.title}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            {formattedDate}
          </div>
        </div>
      </div>

      <main className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div
          ref={contentRef}
          className="prose prose-lg max-w-none mx-auto p-6 md:p-8 [counter-reset:equation] dark:prose-invert"
          dangerouslySetInnerHTML={{ '__html': article.content }}
        />
      </main>
    </article>
  );
}
