/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit2, ArrowLeft, Calendar, User, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article } from '../types';
import { fetchArticleBySlug } from '../utils/article';
import { renderMarkdown } from '../utils/markdown';
import { useAuth } from '../hooks/useAuth';
import { ArticleDrawer } from './ArticleDrawer';
import CommentList from './comments/CommentList';
import ExportButton from './ExportButton';

export function ArticleViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedArticlesLoading, setRelatedArticlesLoading] = useState(false);
  // 引用抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * 加载文章内容
   * @async
   */
  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;
      
      try {
        const data = await fetchArticleBySlug(slug);
        setArticle(data);
      } catch (error) {
        console.error('Failed to load article:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  /**
   * 加载相关文章
   * @async
   */
  useEffect(() => {
    if (!article) return;

    const loadRelated = async () => {
      setRelatedArticlesLoading(true);
      try {
        // 添加supabase空检查
        if (!supabase) {
          console.warn('Supabase client is not available');
          return;
        }
        
        // 使用更安全的参数绑定方式查询相关文章链接
        const { data: links, error: linksError } = await supabase
          .from('article_links')
          .select('target_id, source_id')
          .or(`source_id.eq.${article.id},target_id.eq.${article.id}`)
          .limit(5);

        if (linksError) {
          console.error('Error fetching related articles:', linksError);
          return;
        }

        if (links && links.length > 0) {
          const relatedIds = links.map(link => 
            link.source_id === article.id ? link.target_id : link.source_id
          );

          // 去重并移除当前文章ID
          const uniqueRelatedIds = [...new Set(relatedIds)].filter(id => id !== article.id);
          
          if (uniqueRelatedIds.length === 0) {
            setRelatedArticles([]);
            return;
          }

          // 查询相关文章详情
          const { data: articles, error: articlesError } = await supabase
            .from('articles')
            .select('*')
            .in('id', uniqueRelatedIds);

          if (articlesError) {
            console.error('Error fetching related article details:', articlesError);
            return;
          }

          setRelatedArticles(articles || []);
        }
      } catch (err) {
        console.error('Exception in loadRelated:', err);
      } finally {
        setRelatedArticlesLoading(false);
      }
    };

    loadRelated();
  }, [article]);

  /**
   * 处理Wiki链接点击事件，打开文章抽屉
   */
  useEffect(() => {
    const handleWikiLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wiki-link')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) {
          const match = href.match(/\/article\/(.*)$/);
          if (match) {
            setDrawerOpen(true);
          }
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleWikiLinkClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleWikiLinkClick);
      }
    };
  }, []);

  // 处理函数
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

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

  const isAuthor = user?.id === article.author_id;
  const formattedDate = article.updated_at ? new Date(article.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'N/A';

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
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
          </div>
        </div>
        <div className="flex gap-4">
          <ExportButton article={article} />
          {isAuthor && (
            <button
              onClick={() => navigate(`/edit/${article.slug}`)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="prose prose-sm max-w-none bg-white rounded-lg p-8 shadow-sm border border-gray-200 mb-8">
        <div
          ref={contentRef}
          className="prose-headings:scroll-mt-20 prose-a:text-blue-600 prose-a:hover:text-blue-700 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100 wiki-link-styling"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />
      </div>

      {/* 评论部分 */}
      <CommentList articleId={article.id} />

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
        {relatedArticlesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading related articles...</div>
        ) : relatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map((related) => (
              <div
                key={related.id}
                onClick={() => {
                  setDrawerOpen(true);
                }}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:shadow-md transition group cursor-pointer relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition flex-1 pr-6">
                    {related.title}
                  </h3>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/article/${related.slug}`);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 transition"
                    title="Open in new page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {related.content.substring(0, 100)}...
                </p>
                <div className="mt-3 text-xs text-gray-500">
                  Click to view in drawer, or click the external link to open in full page
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No related articles</p>
        )}
      </div>

      {/* 文章引用抽屉 */}
      <ArticleDrawer 
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </article>
  );
}
