import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, User2 } from 'lucide-react';
import katex from 'katex';
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
          try {
            katex.render(latex, element, {
              'throwOnError': false,
              'displayMode': true
            });
          } catch {
            element.textContent = latex;
          }
        }
      });
    };

    renderMath();
  }, [article?.content]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-neutral-900 mb-4">文章未找到</h1>
        <p className="text-neutral-600 mb-8">您访问的文章不存在。</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition"
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
        <ol className="flex items-center gap-1 text-sm text-neutral-500">
          <li>
            <Link to="/" className="hover:text-primary-600 transition-colors">首页</Link>
          </li>
          <li className="text-neutral-400">/</li>
          <li>
            <Link to="/articles" className="hover:text-primary-600 transition-colors">文章</Link>
          </li>
          <li className="text-neutral-400">/</li>
          <li>
            <span className="font-medium text-neutral-900 truncate max-w-[300px]">{article.title}</span>
          </li>
        </ol>
      </nav>

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-neutral-800 mb-4">{article.title}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-600">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4 text-neutral-500" />
            {formattedDate}
          </div>
          <div className="flex items-center gap-1">
            <User2 className="w-4 h-4 text-neutral-500" />
            {article.author_name}
          </div>
        </div>
      </div>

      <main className="bg-white rounded-lg border border-neutral-200">
        <div
          ref={contentRef}
          className="prose prose-lg max-w-none mx-auto p-6 md:p-8"
          dangerouslySetInnerHTML={{ '__html': article.content }}
        />
      </main>
    </article>
  );
}
