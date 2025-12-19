import React from 'react';
import type { Article } from '@/types';
import { SemanticSearchResult } from '@/services/semanticSearchService';
import { SearchResultItem } from './SearchResultItem';
import { SemanticSearchResultItem } from './SemanticSearchResultItem';
import { groupSearchResults, sortSearchResults, highlightText, truncateText } from '../utils/searchUtils';
import styles from '../../SearchResults.module.css';

interface SearchResultsListProps {
  articleResults: (Article & { search_rank: number })[];
  commentResults: Array<{
    id: string;
    article_id: string;
    content: string;
    search_rank: number;
    user_id?: string;
    created_at: string;
    updated_at: string;
  }>;
  semanticResults: SemanticSearchResult[];
  searchMode: 'traditional' | 'semantic' | 'enhanced';
  searchType: 'articles' | 'comments' | 'all';
  sortBy: 'relevance' | 'date' | 'views' | 'type';
  groupBy: 'type' | 'relevance_range' | 'date' | 'none';
  loading: boolean;
  hasMoreArticles: boolean;
  hasMoreComments: boolean;
  query: string;
  onArticleClick?: (() => void) | undefined;
  onLoadMoreArticles: () => void;
  onLoadMoreComments: () => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  articleResults,
  commentResults,
  semanticResults,
  searchMode,
  searchType,
  sortBy,
  groupBy,
  loading,
  hasMoreArticles,
  hasMoreComments,
  query,
  onArticleClick,
  onLoadMoreArticles,
  onLoadMoreComments
}) => {
  return (
    <>
      {/* 结果统计 */}
      <div className={styles.resultCount}>
        {searchMode === 'semantic' || searchMode === 'enhanced' ? (
          <>
            找到 {semanticResults.length} 条语义搜索结果
            <span className={styles.resultCountDetail}>包含文章和概念</span>
          </>
        ) : (
          <>
            找到 {articleResults.length + (searchType !== 'articles' ? commentResults.length : 0)} 条结果
            {(searchType === 'all' || searchType === 'articles') && (
              <span className={styles.resultCountDetail}>文章: {articleResults.length} 条</span>
            )}
            {(searchType === 'all' || searchType === 'comments') && (
              <span className={styles.resultCountDetail}>评论: {commentResults.length} 条</span>
            )}
          </>
        )}
      </div>

      {/* 语义搜索结果列表 */}
      {(searchMode === 'semantic' || searchMode === 'enhanced') && semanticResults.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>语义搜索结果</h3>

          {/* 处理分组和排序 */}
          {(() => {
            const sortedResults = sortSearchResults(semanticResults, sortBy);
            const resultGroups = groupBy === 'none'
              ? new Map([['全部结果', sortedResults]])
              : groupSearchResults(sortedResults, groupBy);

            return (
              <>
                {Array.from(resultGroups.entries()).map(([groupKey, groupResults]) => (
                  <div key={groupKey} className={styles.resultGroup}>
                    <h4 className={styles.resultGroupTitle}>
                      {groupKey} <span className={styles.resultGroupCount}>({groupResults.length})</span>
                    </h4>
                    <div className={styles.resultsList}>
                      {groupResults.map((result) => (
                        <SemanticSearchResultItem key={result.id} result={result} query={query} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* 加载更多语义搜索结果按钮 */}
                {hasMoreArticles && (
                  <div className={styles.loadMoreContainer}>
                    <button
                      className={styles.loadMoreButton}
                      onClick={onLoadMoreArticles}
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
              </>
            );
          })()}
        </>
      )}

      {/* 传统搜索 - 文章搜索结果列表 */}
      {searchMode === 'traditional' && (searchType === 'all' || searchType === 'articles') && articleResults.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>文章结果</h3>
          <div className={styles.resultsList}>
            {articleResults.map((article) => (
              <SearchResultItem key={article.id} article={article} query={query} onArticleClick={onArticleClick} />
            ))}
          </div>

          {/* 加载更多文章按钮 */}
          {hasMoreArticles && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={onLoadMoreArticles}
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

      {/* 传统搜索 - 评论搜索结果列表 */}
      {searchMode === 'traditional' && (searchType === 'all' || searchType === 'comments') && commentResults.length > 0 && (
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
                onClick={onLoadMoreComments}
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
    </>
  );
};
