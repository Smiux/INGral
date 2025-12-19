import React from 'react';
import styles from '../../SearchResults.module.css';

interface SearchResultsControlsProps {
  searchType: 'articles' | 'comments' | 'all';
  searchMode: 'traditional' | 'semantic' | 'enhanced';
  sortBy: 'relevance' | 'date' | 'views' | 'type';
  groupBy: 'type' | 'relevance_range' | 'date' | 'none';
  viewMode: 'list' | 'graph' | 'hierarchical';
  exportLoading: boolean;
  query: string;

  onSearchTypeChange: (_type: 'articles' | 'comments' | 'all') => void;
  onSearchModeChange: (_mode: 'traditional' | 'semantic' | 'enhanced') => void;
  onSortByChange: (_sort: 'relevance' | 'date' | 'views' | 'type') => void;
  onGroupByChange: (_group: 'type' | 'relevance_range' | 'date' | 'none') => void;
  onViewModeChange: (_view: 'list' | 'graph' | 'hierarchical') => void;
  onExportToJson: () => void;
  onExportToCsv: () => void;
  onExportToGraphml: () => void;
  onExportToPdf: () => void;
}

export const SearchResultsControls: React.FC<SearchResultsControlsProps> = ({
  searchType,
  searchMode,
  sortBy,
  groupBy,
  viewMode,
  exportLoading,
  query,

  onSearchTypeChange,
  onSearchModeChange,
  onSortByChange,
  onGroupByChange,
  onViewModeChange,
  onExportToJson,
  onExportToCsv,
  onExportToGraphml,
  onExportToPdf
}) => {
  return (
    <>
      {/* 搜索信息和筛选选项 */}
      {query.trim() && (
        <>
          <div className={styles.searchInfo}>
            <h2 className={styles.title}>
              搜索结果: <span className={styles.query}>{query}</span>
            </h2>
            <div className={styles.filterOptions}>
              {/* 搜索类型切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>搜索类型:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${searchType === 'all' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchTypeChange('all')}
                  >
                    全部
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchType === 'articles' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchTypeChange('articles')}
                  >
                    文章
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchType === 'comments' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchTypeChange('comments')}
                  >
                    评论
                  </button>
                </div>
              </div>

              {/* 搜索模式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>搜索模式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'traditional' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchModeChange('traditional')}
                  >
                    传统搜索
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'semantic' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchModeChange('semantic')}
                  >
                    语义搜索
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'enhanced' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSearchModeChange('enhanced')}
                  >
                    语义增强
                  </button>
                </div>
              </div>

              {/* 排序方式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>排序方式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'relevance' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSortByChange('relevance')}
                  >
                    相关度
                  </button>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'date' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSortByChange('date')}
                  >
                    日期
                  </button>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'views' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSortByChange('views')}
                  >
                    浏览量
                  </button>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'type' ? styles.filterButtonActive : ''}`}
                    onClick={() => onSortByChange('type')}
                  >
                    类型
                  </button>
                </div>
              </div>

              {/* 分组方式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>分组方式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'none' ? styles.filterButtonActive : ''}`}
                    onClick={() => onGroupByChange('none')}
                  >
                    不分组
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'type' ? styles.filterButtonActive : ''}`}
                    onClick={() => onGroupByChange('type')}
                  >
                    按类型
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'relevance_range' ? styles.filterButtonActive : ''}`}
                    onClick={() => onGroupByChange('relevance_range')}
                  >
                    按相关度
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'date' ? styles.filterButtonActive : ''}`}
                    onClick={() => onGroupByChange('date')}
                  >
                    按日期
                  </button>
                </div>
              </div>

              {/* 视图模式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>视图模式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${viewMode === 'list' ? styles.filterButtonActive : ''}`}
                    onClick={() => onViewModeChange('list')}
                  >
                    列表视图
                  </button>
                  <button
                    className={`${styles.filterButton} ${viewMode === 'hierarchical' ? styles.filterButtonActive : ''}`}
                    onClick={() => onViewModeChange('hierarchical')}
                  >
                    层级视图
                  </button>
                  <button
                    className={`${styles.filterButton} ${viewMode === 'graph' ? styles.filterButtonActive : ''}`}
                    onClick={() => onViewModeChange('graph')}
                  >
                    图谱视图
                  </button>
                </div>
              </div>

              {/* 结果导出 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>导出结果:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={onExportToJson}
                    disabled={exportLoading}
                    title="导出为JSON格式"
                  >
                    JSON
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={onExportToCsv}
                    disabled={exportLoading}
                    title="导出为CSV格式"
                  >
                    CSV
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={onExportToGraphml}
                    disabled={exportLoading}
                    title="导出为GraphML格式（可用于Gephi等图谱软件）"
                  >
                    GraphML
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={onExportToPdf}
                    disabled={exportLoading}
                    title="导出为PDF格式"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
