/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { articleService, type Article } from '../../services/articleService';

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  }, [loadArticle, slug]);

  // 定时刷新文章内容（每30秒）
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadArticle();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadArticle, slug]);

  // 监听URL变化，重新加载文章
  useEffect(() => {
    const handleLocationChange = () => {
      loadArticle();
    };

    // 监听history变化
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [loadArticle, slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
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
        <ol className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          </li>
          <li className="text-gray-400 dark:text-gray-600">
            /
          </li>
          <li>
            <Link to="/articles" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Articles</Link>
          </li>
          <li className="text-gray-400 dark:text-gray-600">
            /
          </li>
          <li>
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">{article.title}</span>
          </li>
        </ol>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {article.author_name || 'Anonymous'}
            </div>
            <div>
              阅读次数: 0
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
