import React from 'react';
import { useSearchResults } from './hooks/useSearchResults';
import { SearchResultsControls } from './components/SearchResultsControls';
import { SearchResultsList } from './components/SearchResultsList';
import { SearchResultsHierarchical } from './components/SearchResultsHierarchical';
import SearchResultsGraph from '../SearchResultsGraph';
import styles from '../SearchResults.module.css';

interface SearchResultsProps {
  query: string;
  limit?: number;
  onArticleClick?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, limit = 20, onArticleClick }) => {
  const {
    // 状态
    articleResults,
    commentResults,
    semanticResults,
    relatedResults,
    loading,
    error,
    searchType,
    sortBy,
    groupBy,
    searchMode,
    viewMode,
    hasMoreArticles,
    hasMoreComments,
    exportLoading,

    // 操作方法
    setSearchType,
    setSortBy,
    setGroupBy,
    setSearchMode,
    setViewMode,
    loadMoreArticles,
    loadMoreComments,
    exportResultsToJson,
    exportResultsToCsv,
    exportResultsToGraphml,
    exportResultsToPdf
  } = useSearchResults(query, limit);

  return (
    <div className={styles.container}>
      {/* 搜索控制组件 */}
      <SearchResultsControls
        searchType={searchType}
        searchMode={searchMode}
        sortBy={sortBy}
        groupBy={groupBy}
        viewMode={viewMode}
        exportLoading={exportLoading}
        query={query}
        onSearchTypeChange={setSearchType}
        onSearchModeChange={setSearchMode}
        onSortByChange={setSortBy}
        onGroupByChange={setGroupBy}
        onViewModeChange={setViewMode}
        onExportToJson={exportResultsToJson}
        onExportToCsv={exportResultsToCsv}
        onExportToGraphml={exportResultsToGraphml}
        onExportToPdf={exportResultsToPdf}
      />

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

      {/* 视图模式切换 */}
      {!loading && !error && query.trim() && (
        <>
          {/* 根据视图模式渲染不同组件 */}
          {(() => {
            // 渲染层级视图
            const renderHierarchicalView = () => {
              if (searchMode === 'semantic' || searchMode === 'enhanced') {
                return <SearchResultsHierarchical semanticResults={semanticResults} query={query} />;
              }
              return (
                <div className={styles.graphInfo}>
                  <p>层级视图仅支持语义搜索结果</p>
                  <p>请切换到语义搜索或语义增强搜索模式以查看层级视图</p>
                </div>
              );
            };

            // 渲染图谱视图
            const renderGraphView = () => {
              if (searchMode === 'semantic' || searchMode === 'enhanced') {
                return (
                  <div className={styles.graphContainer}>
                    <SearchResultsGraph results={semanticResults} query={query} />
                  </div>
                );
              }
              return (
                <div className={styles.graphInfo}>
                  <p>图谱视图仅支持语义搜索结果</p>
                  <p>请切换到语义搜索或语义增强搜索模式以查看图谱</p>
                </div>
              );
            };

            if (viewMode === 'list') {
              /* 列表视图 */
              return (
                <SearchResultsList
                  articleResults={articleResults}
                  commentResults={commentResults}
                  semanticResults={semanticResults}
                  searchMode={searchMode}
                  searchType={searchType}
                  sortBy={sortBy}
                  groupBy={groupBy}
                  loading={loading}
                  hasMoreArticles={hasMoreArticles}
                  hasMoreComments={hasMoreComments}
                  query={query}
                  onArticleClick={onArticleClick}
                  onLoadMoreArticles={loadMoreArticles}
                  onLoadMoreComments={loadMoreComments}
                />
              );
            } else if (viewMode === 'hierarchical') {
              /* 层级视图 */
              return (
                <>
                  <h3 className={styles.sectionTitle}>层级搜索结果</h3>
                  {renderHierarchicalView()}
                </>
              );
            }
            /* 图谱视图 */
            return (
              <>
                <h3 className={styles.sectionTitle}>搜索结果图谱</h3>
                {renderGraphView()}
              </>
            );
          })()}

          {/* 相关推荐结果 */}
          {(searchMode === 'semantic' || searchMode === 'enhanced') && relatedResults.length > 0 && (
            <div className={styles.relatedResultsContainer}>
              <h3 className={styles.sectionTitle}>你可能还想了解</h3>
              <div className={styles.resultsList}>
                {relatedResults.map((result) => (
                  <div
                    key={result.id}
                    className={`${styles.resultItem} ${styles.relatedResultItem}`}
                    onClick={() => {
                      if (result.type === 'article') {
                        window.location.href = `/articles/${result.id}`;
                      } else if (result.type === 'concept') {
                        console.log('Related concept clicked:', result);
                      }
                    }}
                  >
                    <div className={styles.resultHeader}>
                      <h3 className={styles.resultTitle}>
                        <span className={`${styles.resultTypeBadge} ${result.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
                          {result.type === 'concept' ? '概念' : '文章'}
                        </span>
                        {result.title}
                      </h3>
                      <span className={styles.resultSemanticScore}>
                        相关度: {Math.round(result.semantic_score * 100)}%
                      </span>
                    </div>
                    <p className={styles.resultSummary}>
                      {result.content?.substring(0, 150) || ''}...
                    </p>
                  </div>
                ))}
              </div>
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
