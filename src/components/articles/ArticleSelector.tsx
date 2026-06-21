import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { getArticlesPaginated, getAllArticles, type ArticleListItem, type PaginatedArticles } from '../../services/articleService';

export interface ArticleSelectorSingleResult {
  article: ArticleListItem;
  label: string;
}

export interface ArticleSelectorProps {
  isOpen: boolean;
  excludedIds: Set<string>;
  title?: string;
  direction?: 'incoming' | 'outgoing';
  currentArticleTitle?: string;
  onConfirm: (result: ArticleSelectorSingleResult) => void;
  onClose: () => void;
}

const PAGE_SIZE = 20;

function ArticleSelectorInner ({
  excludedIds,
  title = '添加文章',
  direction,
  currentArticleTitle,
  onConfirm,
  onClose
}: Omit<ArticleSelectorProps, 'isOpen'>) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<ArticleListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [label, setLabel] = useState('');
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
    } catch {
      setSearchResults([]);
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
    } catch {
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
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const displayArticles = isSearchMode ? searchResults : articles;
  const filteredArticles = displayArticles.filter(a => !excludedIds.has(a.id));

  const selectedArticle = filteredArticles.find(a => a.id === selectedId) ?? null;

  const handleNextStep = useCallback(() => {
    if (selectedArticle) {
      setStep(2);
    }
  }, [selectedArticle]);

  const handlePrevStep = useCallback(() => {
    setStep(1);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedArticle) {
      onConfirm({ 'article': selectedArticle, label });
    }
    onClose();
  }, [selectedArticle, label, onConfirm, onClose]);

  let directionLabel = '';
  if (direction === 'incoming') {
    directionLabel = `${selectedArticle?.title ?? '...'} → ${currentArticleTitle ?? '当前'}`;
  } else if (direction === 'outgoing') {
    directionLabel = `${currentArticleTitle ?? '当前'} → ${selectedArticle?.title ?? '...'}`;
  }

  if (step === 2 && selectedArticle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50" onClick={onClose}>
        <div
          className="bg-slate-50/90 dark:bg-slate-900/90 rounded w-full max-w-lg mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">添加关联</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">方向</label>
              <div className="px-3 py-2 bg-slate-100/40 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded text-sm text-slate-500 dark:text-slate-400">
                {directionLabel}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">关系标签（可选）</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="如：前置知识、延伸、反驳..."
                className="w-full px-3 py-2 bg-slate-100/40 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 rounded hover:bg-slate-300/80 dark:hover:bg-slate-700/80 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded hover:bg-sky-600 transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50" onClick={onClose}>
      <div
        className="bg-slate-50/90 dark:bg-slate-900/90 rounded w-full max-w-lg max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章标题、简介或标签..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/40 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2"
          onScroll={handleScroll}
        >
          {isLoading && !isSearchMode && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              <span className="ml-2 text-slate-500 dark:text-slate-400">搜索中...</span>
            </div>
          )}

          {!isLoading && !isSearching && filteredArticles.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              {searchQuery ? '未找到匹配的文章' : '没有可添加的文章'}
            </div>
          )}

          {!isLoading && !isSearching && filteredArticles.length > 0 && (
            <div className="space-y-1">
              {filteredArticles.map(article => {
                const isSelected = selectedId === article.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => toggleSelect(article.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
                        : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-sky-500 border-sky-500'
                        : 'border-slate-300/80 dark:border-slate-600/80'
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
                      <div className="flex-shrink-0 w-10 h-10 bg-slate-200/50 dark:bg-slate-800/80 rounded flex items-center justify-center text-slate-400 text-xs">
                        文章
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {article.title}
                      </div>
                      {article.summary && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">加载更多...</span>
                    </div>
                  )}
                  {!isLoadingMore && hasMore && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      下拉加载更多
                    </div>
                  )}
                  {!isLoadingMore && !hasMore && filteredArticles.length > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      已全部加载
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedId ? '已选择 1 篇文章' : '未选择'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 rounded hover:bg-slate-300/80 dark:hover:bg-slate-700/80 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleNextStep}
              disabled={!selectedId}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArticleSelector ({
  isOpen,
  ...rest
}: ArticleSelectorProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ArticleSelectorInner {...rest} />
  );
}
