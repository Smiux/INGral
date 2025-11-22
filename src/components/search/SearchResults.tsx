import React, { useEffect, useState } from 'react';
import { Article } from '../../types';
import { SearchService } from '../../services/searchService';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  query: string;
  tagId?: string;
  limit?: number;
  onArticleClick?: (article: Article) => void;
}

interface SearchResultItem extends Article {
  search_rank: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  tagId,
  limit = 20,
  onArticleClick
}) => {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [searchKey, setSearchKey] = useState<string>(query); // 用于追踪搜索关键词变化

  // 搜索结果
  const search = async (newQuery: string, newTagId?: string, resetResults: boolean = true) => {
    if (!newQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let searchResults;
      // 只有当tagId有值时才调用带标签的搜索方法，避免undefined类型错误
      if (newTagId && newTagId !== '') {
        searchResults = await SearchService.searchArticlesByTag(newQuery, newTagId, limit);
      } else {
        searchResults = await SearchService.searchArticles(newQuery, limit);
      }
      
      if (resetResults) {
        setResults(searchResults);

      } else {
        // 对于分页加载，追加结果
        setResults(prev => [...prev, ...searchResults]);
      }
      
      // 检查是否还有更多结果
      setHasMore(searchResults.length === limit);
    } catch (err) {
      console.error('Search failed:', err);
      setError('搜索失败，请稍后重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 监听搜索关键词和标签变化
  useEffect(() => {
    if (query !== searchKey) {
      setSearchKey(query);
      search(query, tagId, true);
    }
  }, [query, tagId]);

  // 加载更多结果
  const loadMore = () => {
    if (!loading && hasMore && query.trim()) {

      search(query, tagId, false);
    }
  };

  // 处理文章点击
  const handleArticleClick = (article: Article) => {
    if (onArticleClick) {
      onArticleClick(article);
    } else {
      // 默认行为：导航到文章详情页
      window.location.href = `/article/${article.slug}`;
    }
  };

  // 高亮匹配的文本
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    try {
      const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, index) => 
            regex.test(part) ? 
              <mark key={index} className={styles.highlight}>{part}</mark> : 
              part
          )}
        </>
      );
    } catch (e) {
      return text;
    }
  };

  // 转义正则表达式特殊字符
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 截断文本
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={styles.container}>
      {/* 搜索信息 */}
      {query.trim() && (
        <div className={styles.searchInfo}>
          <h2 className={styles.title}>
            搜索结果: <span className={styles.query}>{query}</span>
            {tagId && <span className={styles.tagFilter}>(已筛选标签)</span>}
          </h2>
          <p className={styles.resultCount}>
            找到 {results.length} 条结果
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && results.length === 0 && (
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
      {!loading && !error && query.trim() && results.length === 0 && (
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

      {/* 搜索结果列表 */}
      {results.length > 0 && (
        <div className={styles.resultsList}>
          {results.map((article) => (
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
                  {new Date(article.created_at).toLocaleDateString()}
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
      )}

      {/* 加载更多按钮 */}
      {hasMore && results.length > 0 && (
        <div className={styles.loadMoreContainer}>
          <button 
            className={styles.loadMoreButton}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.smallLoadingIndicator}></div>
                加载中...
              </>
            ) : (
              '加载更多结果'
            )}
          </button>
        </div>
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

export default SearchResults;
