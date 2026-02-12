/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { articleService, type Article } from '../../services/articleService';

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * 加载文章内容
   * @async
   */
  const loadArticle = useCallback(async () => {
    if (!slug) {
      return;
    }

    try {
      const data = await articleService.getArticleBySlug(slug);
      setArticle(data);
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // 初始加载文章
  useEffect(() => {
    loadArticle();
  }, [loadArticle]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Article Not Found</h1>
          <p className="text-neutral-600 mb-8">The article you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = article.updated_at ? new Date(article.updated_at).toLocaleDateString('en-US', {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric'
  }) : 'N/A';

  return (
    <article className="max-w-7xl mx-auto px-4 py-8">
      {/* 面包屑导航 */}
      <nav className="mb-6">
        <ol className="flex items-center gap-1 text-sm text-neutral-500">
          <li>
            <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
          </li>
          <li className="text-neutral-400">
            /
          </li>
          <li>
            <Link to="/articles" className="hover:text-primary-600 transition-colors">Articles</Link>
          </li>
          <li className="text-neutral-400">
            /
          </li>
          <li>
            <span className="font-medium text-neutral-900 truncate max-w-[300px]">{article.title}</span>
          </li>
        </ol>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-neutral-800 mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-neutral-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-neutral-500" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-neutral-500" />
              {article.author_name}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          {/* 主题切换按钮 */}
        </div>
      </div>

      {/* 文章内容 */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 右侧文章内容 */}
        <main className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 transition-all hover:shadow-md">
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none mx-auto p-6 md:p-8 prose-headings:scroll-mt-20 prose-headings:text-neutral-800 prose-headings:font-bold prose-a:text-primary-600 prose-a:hover:text-primary-700 prose-a:underline-offset-4 prose-code:bg-neutral-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-neutral-800 prose-pre:bg-neutral-800 prose-pre:text-neutral-100 prose-p:text-neutral-700 prose-ul:text-neutral-700 prose-ol:text-neutral-700 prose-strong:text-neutral-900 prose-em:text-neutral-800 wiki-link-styling"
              dangerouslySetInnerHTML={{ '__html': article.content }}
            />
          </div>
        </main>
      </div>

    </article>
  );
}
