import { useState, useEffect, useCallback } from 'react';
import type { Article } from '../../types';
import { searchService } from '../../services/searchService';
import styles from './SearchResults.module.css';

// 转义正则表达式特殊字符
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

interface SearchResultsProps {
  query: string;
  tagId?: string;
  limit?: number;
  onArticleClick?: (article: Article) => void;
}

interface SearchResultItem extends Article {
  search_rank: number;
}

interface CommentSearchResult {
  id: string;
  article_id: string;
  content: string;
  search_rank: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  tagId,
  limit = 20,
  onArticleClick,
}) => {
  const [articleResults, setArticleResults] = useState<SearchResultItem[]>([]);
  const [commentResults, setCommentResults] = useState<CommentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'articles' | 'comments' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');

  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [searchKey, setSearchKey] = useState<string>(query); // 用于追踪搜索关键词变化

  // 搜索结果
  const search = useCallback(async (newQuery: string, newTagId?: string, resetResults = true) => {
    if (!newQuery.trim()) {
      setArticleResults([]);
      setCommentResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 搜索文章
      const articleSearchResults = newTagId && newTagId !== ''
        ? await searchService.searchArticlesByTag(newQuery, newTagId, limit)
        : await searchService.searchArticles(newQuery, limit);

      // 搜索评论
      const commentSearchResults = await searchService.searchComments(newQuery, limit);

      // 处理排序
      const sortResults = <T extends { search_rank: number; created_at?: string }>(results: T[]): T[] => {
        if (sortBy === 'relevance') {
          return [...results].sort((a, b) => b.search_rank - a.search_rank);
        } else {
          return [...results].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
        }
      };

      const sortedArticles = sortResults(articleSearchResults);
      const sortedComments = sortResults(commentSearchResults);

      if (resetResults) {
        setArticleResults(sortedArticles as SearchResultItem[]);
        setCommentResults(sortedComments as CommentSearchResult[]);
      } else {
        // 对于分页加载，追加结果
        setArticleResults(prev => [...prev, ...(sortedArticles as SearchResultItem[])]);
        setCommentResults(prev => [...prev, ...(sortedComments as CommentSearchResult[])]);
      }

      // 检查是否还有更多结果
      setHasMoreArticles(sortedArticles.length === limit);
      setHasMoreComments(sortedComments.length === limit);
    } catch (err) {
      console.error('Search failed:', err);
      setError('搜索失败，请稍后重试');
      setArticleResults([]);
      setCommentResults([]);
    } finally {
      setLoading(false);
    }
  }, [limit, sortBy]);

  // 监听搜索关键词和标签变化
  useEffect(() => {
    if (query !== searchKey) {
      setSearchKey(query);
      search(query, tagId, true);
    }
  }, [query, tagId, search, searchKey]);

  // 加载更多文章结果
  const loadMoreArticles = useCallback(() => {
    if (!loading && hasMoreArticles && query.trim()) {
      search(query, tagId, false);
    }
  }, [loading, hasMoreArticles, query, tagId, search]);

  // 加载更多评论结果
  const loadMoreComments = useCallback(() => {
    if (!loading && hasMoreComments && query.trim()) {
      search(query, tagId, false);
    }
  }, [loading, hasMoreComments, query, tagId, search]);

  // 处理搜索类型切换
  const handleSearchTypeChange = useCallback((type: 'articles' | 'comments' | 'all') => {
    setSearchType(type);
  }, []);

  // 处理排序方式切换
  const handleSortByChange = useCallback((sort: 'relevance' | 'date') => {
    setSortBy(sort);
    // 重新搜索以应用新的排序方式
    search(query, tagId, true);
  }, [search, query, tagId]);

  // 处理文章点击
  const handleArticleClick = useCallback((article: Article) => {
    if (onArticleClick) {
      onArticleClick(article);
    } else {
      // 默认行为：导航到文章详情页
      window.location.href = `/article/${article.slug}`;
    }
  }, [onArticleClick]);

  // 高亮匹配的文本
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) {return text;}

    try {
      const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      const parts = text.split(regex);

      return (
        <>
          {parts.map((part, index) =>
            regex.test(part) ?
              <mark key={index} className={styles.highlight}>{part}</mark> :
              part,
          )}
        </>
      );
    } catch {
      return text;
    }
  }, []);

  // 截断文本
  const truncateText = useCallback((text: string, maxLength = 150) => {
    if (text.length <= maxLength) {return text;}
    return text.substring(0, maxLength) + '...';
  }, []);

  return (
    <div className={styles.container}>
      {/* 搜索信息和筛选选项 */}
      {query.trim() && (
        <>
          <div className={styles.searchInfo}>
            <h2 className={styles.title}>
              搜索结果: <span className={styles.query}>{query}</span>
              {tagId && <span className={styles.tagFilter}>(已筛选标签)</span>}
            </h2>
            <div className={styles.filterOptions}>
              {/* 搜索类型切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>搜索类型:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${searchType === 'all' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSearchTypeChange('all')}
                  >
                    全部
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchType === 'articles' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSearchTypeChange('articles')}
                  >
                    文章
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchType === 'comments' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSearchTypeChange('comments')}
                  >
                    评论
                  </button>
                </div>
              </div>

              {/* 排序方式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>排序方式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'relevance' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSortByChange('relevance')}
                  >
                    相关度
                  </button>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'date' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSortByChange('date')}
                  >
                    日期
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 结果统计 */}
          <div className={styles.resultCount}>
            找到 {articleResults.length + (searchType !== 'articles' ? commentResults.length : 0)} 条结果
            {(searchType === 'all' || searchType === 'articles') && (
              <span className={styles.resultCountDetail}>文章: {articleResults.length} 条</span>
            )}
            {(searchType === 'all' || searchType === 'comments') && (
              <span className={styles.resultCountDetail}>评论: {commentResults.length} 条</span>
            )}
          </div>
        </>
      )}

      {/* 加载状态 */}
      {loading && articleResults.length === 0 && commentResults.length === 0 && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingIndicator}></div>
          <p>搜索中，请稍候...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className={styles.errorContainer}>
          <svg
            className={styles.errorIcon}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{error}</p>
        </div>
      )}

      {/* 空结果状态 */}
      {!loading && !error && query.trim() && articleResults.length === 0 && commentResults.length === 0 && (
        <div className={styles.emptyContainer}>
          <svg
            className={styles.emptyIcon}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="8" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>没有找到匹配的结果</h3>
          <p>请尝试使用不同的关键词或检查拼写</p>
        </div>
      )}

      {/* 文章搜索结果列表 */}
      {(searchType === 'all' || searchType === 'articles') && articleResults.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>文章结果</h3>
          <div className={styles.resultsList}>
            {articleResults.map((article) => (
              <div
                key={article.id}
                className={styles.resultItem}
                onClick={() => handleArticleClick(article)}
              >
                <div className={styles.resultHeader}>
                  <h3 className={styles.resultTitle}>
                    {highlightText(article.title, query)}
                  </h3>
                  <span className={styles.resultDate}>
                    {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <p className={styles.resultSummary}>
                  {highlightText(truncateText(article.content || ''), query)}
                </p>

                <div className={styles.resultFooter}>
                  <span className={styles.resultAuthor}>作者: {article.author_id}</span>
                  <span className={styles.resultRank}>相关度: {Math.round(article.search_rank * 100)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* 加载更多文章按钮 */}
          {hasMoreArticles && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={loadMoreArticles}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.smallLoadingIndicator}></div>
                    加载中...
                  </>
                ) : (
                  '加载更多文章'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* 评论搜索结果列表 */}
      {(searchType === 'all' || searchType === 'comments') && commentResults.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>评论结果</h3>
          <div className={styles.resultsList}>
            {commentResults.map((comment) => (
              <div
                key={comment.id}
                className={`${styles.resultItem} ${styles.commentResultItem}`}
                onClick={() => {
                  // 点击评论跳转到对应文章
                  window.location.href = `/article/${comment.article_id}#comment-${comment.id}`;
                }}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.commentUser}>用户: {comment.user_id}</span>
                  <span className={styles.resultDate}>
                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <p className={styles.resultSummary}>
                  {highlightText(truncateText(comment.content || ''), query)}
                </p>

                <div className={styles.resultFooter}>
                  <span className={styles.commentArticleLink}>查看原文</span>
                  <span className={styles.resultRank}>相关度: {Math.round(comment.search_rank * 100)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* 加载更多评论按钮 */}
          {hasMoreComments && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={loadMoreComments}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.smallLoadingIndicator}></div>
                    加载中...
                  </>
                ) : (
                  '加载更多评论'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* 无搜索内容状态 */}
      {!query.trim() && !loading && !error && (
        <div className={styles.placeholderContainer}>
          <svg
            className={styles.placeholderIcon}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>请输入搜索关键词以查找文章</p>
        </div>
      )}
    </div>
  );
};

// 使用命名导出而不是默认导出，以符合ESLint的react-refresh/only-export-components规则
export { SearchResults };
