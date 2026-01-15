/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import type { Article } from '../../types';
import { articleService } from '../../services/articleService';

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 点赞和收藏状态
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
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

      if (data) {
        // 初始化点赞数
        setUpvotes(data.upvotes || 0);

        // 检查是否已收藏
        const bookmarked = await articleService.isArticleBookmarked(data.id);
        setIsBookmarked(bookmarked);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  /**
   * 处理点赞
   */
  const handleUpvote = async () => {
    if (!article) {
      return;
    }

    const success = await articleService.upvoteArticle(article.id);
    if (success) {
      setUpvotes(prev => prev + 1);
    }
  };

  /**
   * 处理收藏
   */
  const handleBookmark = async () => {
    if (!article) {
      return;
    }

    if (isBookmarked) {
      await articleService.unbookmarkArticle(article.id);
    } else {
      await articleService.bookmarkArticle(article.id);
    }
    setIsBookmarked(prev => !prev);
  };

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
              Author
            </div>
            <div>
              {article.view_count} {article.view_count === 1 ? 'view' : 'views'}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUpvote}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Upvote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
                {upvotes}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1 transition-colors ${isBookmarked ? 'text-red-500 dark:text-red-400' : 'hover:text-red-500 dark:hover:text-red-400'}`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
