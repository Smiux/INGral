import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Search, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Article } from '../types';
import { fetchArticleBySlug, getUserArticles } from '../utils/article';
import { renderMarkdown } from '../utils/markdown';
import { useAuth } from '../hooks/useAuth';

interface ArticleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articleSlug?: string;
  articleTitle?: string;
}

export function ArticleDrawer({ isOpen, onClose }: ArticleDrawerProps) {
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [userArticles, setUserArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | undefined>(undefined);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 加载用户的文章列表
  const loadUserArticles = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const articles = await getUserArticles(user.id);
      setUserArticles(articles);
    } catch (err) {
      setError('Failed to load your articles');
      console.error('Error loading user articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 当抽屉打开且处于列表视图时加载用户文章
  useEffect(() => {
    if (isOpen && viewMode === 'list') {
      loadUserArticles();
    }
  }, [isOpen, viewMode, loadUserArticles]);

  // 加载单篇文章
  const loadArticle = useCallback(async () => {
    if (!selectedArticleSlug) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchArticleBySlug(selectedArticleSlug);
      if (data) {
        setArticle(data);
      } else {
        setError(`Article not found`);
      }
    } catch (err) {
      setError('Failed to load article');
      console.error('Error loading article:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedArticleSlug]);

  // 当选中文章改变时加载文章详情
  useEffect(() => {
    if (selectedArticleSlug && viewMode === 'detail') {
      loadArticle();
    }
  }, [selectedArticleSlug, viewMode, loadArticle]);

  // 切换到文章详情视图
  const viewArticleDetails = (article: Article) => {
    setSelectedArticleSlug(article.slug);
    setViewMode('detail');
  };

  // 返回文章列表视图
  const backToListView = () => {
    setViewMode('list');
    setArticle(null);
    setSelectedArticleSlug(undefined);
    setError(null);
  };

  // 编辑选中的文章
  const editArticle = (article: Article) => {
    navigate(`/edit/${article.slug}`);
    onClose();
  };

  // 过滤文章列表
  const filteredArticles = userArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 在新页面打开文章
  const handleFullPageClick = () => {
    if (selectedArticleSlug) {
      navigate(`/article/${selectedArticleSlug}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50"></div>
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="relative flex-1 max-w-xl ml-auto bg-white h-full shadow-xl transform transition-transform duration-300 ease-in-out"
      >
        {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center flex-1">
          {viewMode === 'detail' && (
            <button
              onClick={backToListView}
              className="text-gray-500 hover:text-gray-700 mr-2 transition"
              title="Back to list"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900 flex-1 truncate">
            {viewMode === 'list' ? 'My Articles' : (article ? article.title : 'Loading...')}
          </h2>
        </div>
        
        {viewMode === 'detail' && selectedArticleSlug && (
          <>
            <button
              onClick={() => article && editArticle(article)}
              className="text-blue-600 hover:text-blue-700 mr-2 transition"
              title="Edit article"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleFullPageClick}
              className="text-blue-600 hover:text-blue-700 mr-2 transition"
              title="Open in full page"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
        
        {/* Drawer Content */}
      <div className="h-[calc(100%-60px)] overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="p-4">
            {/* 搜索框 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <BookOpen className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Articles</h3>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={loadUserArticles}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Retry
                </button>
              </div>
            ) : filteredArticles.length > 0 ? (
              <div className="space-y-2">
                {filteredArticles.map((userArticle) => (
                  <div
                    key={userArticle.id}
                    onClick={() => viewArticleDetails(userArticle)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition flex justify-between items-center group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-base font-medium text-gray-900 truncate group-hover:text-blue-600 transition">
                        {userArticle.title}
                      </h3>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>{userArticle.updated_at ? new Date(userArticle.updated_at).toLocaleDateString() : 'N/A'}</span>
                        <span className="mx-2">•</span>
                        <span>{userArticle.view_count || 0} views</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Articles Yet</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'No articles match your search.' : 'You haven\'t created any articles yet.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => {
                      navigate('/create');
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Create New Article
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // 文章详情视图
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <BookOpen className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Article Not Found</h3>
                <p className="text-gray-600">{error}</p>
                {selectedArticleSlug && (
                  <button 
                    onClick={handleFullPageClick}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Try opening in full page
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : article ? (
              <div 
                className="prose prose-sm max-w-none prose-a:text-blue-600 prose-a:hover:text-blue-700 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No article selected</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
