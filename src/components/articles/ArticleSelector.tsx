import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { getArticlesPaginated, getAllArticles, type ArticleListItem, type PaginatedArticles } from '../../services/articleService';

interface ArticleSelectorProps {
  isOpen: boolean;
  excludedIds: Set<string>;
  onAdd: (articles: ArticleListItem[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 20;

function ArticleSelectorInner ({
  excludedIds,
  onAdd,
  onClose
}: Omit<ArticleSelectorProps, 'isOpen'>) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<ArticleListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadArticles = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result: PaginatedArticles = await getArticlesPaginated(pageNum, PAGE_SIZE);

      if (append) {
        setArticles(prev => [...prev, ...result.articles]);
      } else {
        setArticles(result.articles);
      }

      setTotalPages(result.totalPages);
      setHasMore(pageNum < result.totalPages);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadArticles(1);
  }, [loadArticles]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearchMode(true);
    setIsSearching(true);

    try {
      const allArticles = await getAllArticles();
      const q = query.toLowerCase();
      const filtered = allArticles.filter(a => {
        return a.title.toLowerCase().includes(q) ||
          (a.summary?.toLowerCase().includes(q) ?? false) ||
          (a.tags?.some(tag => tag.toLowerCase().includes(q)) ?? false);
      });
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSearchMode || isLoadingMore || !hasMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      const nextPage = page + 1;
      if (nextPage <= totalPages) {
        setPage(nextPage);
        loadArticles(nextPage, true);
      }
    }
  }, [isSearchMode, isLoadingMore, hasMore, page, totalPages, loadArticles]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    const sourceArticles = isSearchMode ? searchResults : articles;
    const selected = sourceArticles.filter(a => selectedIds.has(a.id));
    if (selected.length > 0) {
      onAdd(selected);
    }
    onClose();
  }, [articles, searchResults, isSearchMode, selectedIds, onAdd, onClose]);

  const displayArticles = isSearchMode ? searchResults : articles;
  const filteredArticles = displayArticles.filter(a => !excludedIds.has(a.id));

  const renderContent = () => {
    if (isLoading && !isSearchMode) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
        </div>
      );
    }

    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <span className="ml-2 text-neutral-500 dark:text-neutral-400">搜索中...</span>
        </div>
      );
    }

    if (filteredArticles.length === 0) {
      return (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          {searchQuery ? '未找到匹配的文章' : '没有可添加的文章'}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {filteredArticles.map(article => {
          const isSelected = selectedIds.has(article.id);
          return (
            <button
              key={article.id}
              onClick={() => toggleSelect(article.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                isSelected
                  ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-transparent'
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-sky-500 border-sky-500'
                  : 'border-neutral-300 dark:border-neutral-600'
              }`}>
                {isSelected && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              {article.cover_image ? (
                <img
                  src={article.cover_image}
                  alt=""
                  className="flex-shrink-0 w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-neutral-200 dark:bg-neutral-600 rounded flex items-center justify-center text-neutral-400 text-xs">
                  文章
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {article.title}
                </div>
                {article.summary && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {article.summary}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {!isSearchMode && (
          <div className="flex items-center justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载更多...</span>
              </div>
            )}
            {!isLoadingMore && hasMore && (
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                下拉加载更多
              </div>
            )}
            {!isLoadingMore && !hasMore && filteredArticles.length > 0 && (
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                已全部加载
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">添加文章</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章标题、简介或标签..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2"
          onScroll={handleScroll}
        >
          {renderContent()}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            已选择 {selectedIds.size} 篇文章
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加 ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArticleSelector ({
  isOpen,
  excludedIds,
  onAdd,
  onClose
}: ArticleSelectorProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ArticleSelectorInner
      excludedIds={excludedIds}
      onAdd={onAdd}
      onClose={onClose}
    />
  );
}
