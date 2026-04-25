import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { searchArticlesByTitle } from '@/services/galleryService';
import { getArticlesPaginated } from '@/services/articleService';

interface Article {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  summary: string | null;
  tags: string[] | null;
}

interface ArticleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (article: Article) => void;
  excludeSlugs?: string[];
}

export const ArticleSelector: React.FC<ArticleSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeSlugs = []
}) => {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  const loadInitialArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getArticlesPaginated(1, pageSize);
      const filtered = result.articles.filter(article => !excludeSlugs.includes(article.slug));
      setArticles(filtered);
      setCurrentPage(1);
      setHasMore(result.totalPages > 1);
      setSelectedIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, [excludeSlugs]);

  const loadMoreArticles = useCallback(async () => {
    if (isLoadingMore || !hasMore || query.trim()) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getArticlesPaginated(nextPage, pageSize);
      const filtered = result.articles.filter(article => !excludeSlugs.includes(article.slug));
      setArticles(prev => [...prev, ...filtered]);
      setCurrentPage(nextPage);
      setHasMore(nextPage < result.totalPages);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore, query, excludeSlugs]);

  const handleSelect = useCallback((article: Article) => {
    onSelect(article);
    setQuery('');
    setArticles([]);
    onClose();
  }, [onSelect, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      loadInitialArticles();
    }
  }, [isOpen, loadInitialArticles]);

  useEffect(() => {
    const searchArticles = async () => {
      if (!query.trim()) {
        loadInitialArticles();
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchArticlesByTitle(query);
        const filtered = results.filter(article => !excludeSlugs.includes(article.slug));
        setArticles(filtered);
        setSelectedIndex(0);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchArticles, 300);
    return () => clearTimeout(timeoutId);
  }, [query, excludeSlugs, loadInitialArticles]);

  useEffect(() => {
    const listElement = listRef.current;

    const handleScroll = () => {
      if (isLoadingMore || !hasMore || query.trim()) {
        return;
      }

      if (!listElement) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = listElement;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreArticles();
      }
    };

    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (listElement) {
        listElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loadMoreArticles, isLoadingMore, hasMore, query]);

  useEffect(() => {
    if (listRef.current && articles.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ 'block': 'nearest' });
      }
    }
  }, [selectedIndex, articles.length]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, articles.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (articles[selectedIndex]) {
          handleSelect(articles[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }, [articles, selectedIndex, onClose, handleSelect]);

  if (!isOpen) {
    return null;
  }

  const renderContent = () => {
    if (isLoading && articles.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      );
    }

    if (articles.length > 0) {
      return (
        <>
          {articles.map((article, index) => (
            <div
              key={article.id}
              onClick={() => handleSelect(article)}
              className={`
            flex items-start gap-3 p-4 cursor-pointer
            transition-colors duration-150
            ${index === selectedIndex
              ? 'bg-sky-50 dark:bg-sky-950/30'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }
          `}
            >
              {article.cover_image ? (
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-16 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-12 bg-neutral-100 dark:bg-neutral-700 rounded flex items-center justify-center">
                  <span className="text-lg font-bold text-neutral-300 dark:text-neutral-600">
                    {article.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-neutral-800 dark:text-neutral-200 truncate" title={article.title}>
                  {article.title}
                </h3>
                {article.summary && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1">
                    {article.summary}
                  </p>
                )}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          'backgroundColor': `hsl(${tagIndex * 60 % 360}, 70%, 90%)`,
                          'color': `hsl(${tagIndex * 60 % 360}, 70%, 30%)`
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {index === selectedIndex && (
                <Check className="w-5 h-5 text-sky-500 flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
              <span className="ml-2 text-sm text-neutral-500">加载更多...</span>
            </div>
          )}
          {!hasMore && articles.length > 0 && !query.trim() && (
            <div className="text-center py-4 text-sm text-neutral-400">
              已加载全部文章
            </div>
          )}
        </>
      );
    }

    if (query.trim()) {
      return (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          未找到匹配的文章
        </div>
      );
    }

    return (
      <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
        暂无文章
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索文章标题..."
              className="flex-1 bg-transparent border-none outline-none text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ArticleSelector;
