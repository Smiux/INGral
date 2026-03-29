import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Layout, List, AlignJustify, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks';
import { getAllArticles, getCoverImageUrl, type Article } from '../services/articleService';

function formatDate (dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'N/A';
  }
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric',
    'hour': '2-digit',
    'minute': '2-digit',
    'second': '2-digit'
  };
  return date.toLocaleString('zh-CN', options);
}

type LayoutMode = 'comfortable' | 'compact' | 'dense';

const ComfortableArticleCard = ({ article }: { article: Article }) => {
  const coverUrl = getCoverImageUrl(article.cover_image_path);

  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0">
          <div className="aspect-video md:aspect-[4/3] md:h-full bg-neutral-100 dark:bg-neutral-700 relative overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-bold text-neutral-300 dark:text-neutral-600">
                  {article.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-3">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 flex-1 line-clamp-3">
              {article.summary}
            </p>
          )}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  title={tag}
                  className="inline-flex items-center px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs"
                >
                  <Tag className="w-2.5 h-2.5 mr-1" />
                  <span className="truncate max-w-[100px]">{tag}</span>
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
            更新于 {formatDate(article.updated_at)}
          </div>
        </div>
      </div>
    </Link>
  );
};

const CompactArticleCard = ({ article }: { article: Article }) => {
  const coverUrl = getCoverImageUrl(article.cover_image_path);

  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 lg:w-56 flex-shrink-0">
          <div className="aspect-video md:aspect-square md:h-full bg-neutral-100 dark:bg-neutral-700 relative overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl font-bold text-neutral-300 dark:text-neutral-600">
                  {article.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-2">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 flex-1 line-clamp-2">
              {article.summary}
            </p>
          )}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {article.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  title={tag}
                  className="inline-flex items-center px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs"
                >
                  <span className="truncate max-w-[60px]">{tag}</span>
                </span>
              ))}
              {article.tags.length > 2 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  +{article.tags.length - 2}
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-auto">
            {formatDate(article.updated_at)}
          </div>
        </div>
      </div>
    </Link>
  );
};

const DenseArticleCard = ({ article }: { article: Article }) => {
  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-1 truncate">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
              {article.summary}
            </p>
          )}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs"
                >
                  <span className="truncate max-w-[50px]">{tag}</span>
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0 whitespace-nowrap">
          {formatDate(article.updated_at)}
        </div>
      </div>
    </Link>
  );
};

const ARTICLES_PER_PAGE = 20;

export function ArticlesPage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('comfortable');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    getAllArticles()
      .then(setArticles)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const currentArticles = filteredArticles.slice(startIndex, endIndex);

  const handleJumpToPage = useCallback(() => {
    const page = parseInt(jumpPageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpPageInput('');
    }
  }, [jumpPageInput, totalPages]);

  const handleJumpInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  }, [handleJumpToPage]);

  const renderArticle = (article: Article) => {
    switch (layoutMode) {
      case 'comfortable':
        return <ComfortableArticleCard key={article.id} article={article} />;
      case 'compact':
        return <CompactArticleCard key={article.id} article={article} />;
      case 'dense':
        return <DenseArticleCard key={article.id} article={article} />;
      default:
        return <ComfortableArticleCard key={article.id} article={article} />;
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          显示 {startIndex + 1}-{Math.min(endIndex, filteredArticles.length)} 条，共 {filteredArticles.length} 条
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="text-neutral-400 dark:text-neutral-500">...</span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-sky-500 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="text-neutral-400 dark:text-neutral-500">...</span>
              )}
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">跳转到</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onKeyDown={handleJumpInputKeyDown}
            placeholder="页码"
            className="w-20 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
          <button
            onClick={handleJumpToPage}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            跳转
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      );
    }

    if (currentArticles.length > 0) {
      return (
        <>
          <div className={layoutMode === 'dense' ? 'space-y-3' : 'space-y-6'}>
            {currentArticles.map(renderArticle)}
          </div>
          {totalPages > 1 && renderPagination()}
        </>
      );
    }

    return (
      <div className="text-center py-12 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          {searchQuery ? '没有匹配的文章。' : '暂无文章。'}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">所有文章</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setLayoutMode('comfortable')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'comfortable'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="舒适模式"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('compact')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'compact'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="紧凑模式"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('dense')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'dense'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="最紧凑模式"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
          {!isMobile && (
            <Link
              to="/articles/create"
              className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-6 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-700 transition-all duration-200 transform hover:scale-105 font-medium"
            >
              <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
              创建文章
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="搜索文章..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 focus:border-sky-200 dark:focus:border-sky-600 outline-none transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
        />
      </div>

      {renderContent()}
    </div>
  );
}
