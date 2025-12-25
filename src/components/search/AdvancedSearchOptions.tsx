
import styles from './SearchBox.module.css';
import FilterBuilder from './FilterBuilder';
import { CompositeFilter, createDefaultFilter } from '../../types/filter';

// 扩展SearchFilters接口，添加UI相关字段
export interface ExtendedSearchFilters {
  searchType: string;
  sortBy: string;
  author: string;
  dateRange: { start?: string; end?: string };
  // 组合筛选条件
  compositeFilter?: CompositeFilter;
  // 是否使用组合筛选
  useCompositeFilter?: boolean;
}

interface AdvancedSearchOptionsProps {
  filters: ExtendedSearchFilters;
  onFilterChange: <K extends keyof ExtendedSearchFilters>(_key: K, _value: ExtendedSearchFilters[K]) => void;
  onDateRangeChange: (_dateRange: { start?: string; end?: string }) => void;
  onResetFilters: () => void;
  useCompositeFilter: boolean;
  compositeFilter: CompositeFilter;
  onUseCompositeFilterChange: (_use: boolean) => void;
  onCompositeFilterChange: (_filter: CompositeFilter) => void;
}

export function AdvancedSearchOptions ({
  filters,
  onFilterChange,
  onDateRangeChange,
  onResetFilters,
  useCompositeFilter,
  compositeFilter,
  onUseCompositeFilterChange,
  onCompositeFilterChange
}: AdvancedSearchOptionsProps) {
  return (
    <div className={styles.advancedContainer}>
      <div
        className={styles.advancedOptions}
      >
        <div className={styles.advancedSection}>
          <label className={styles.advancedLabel}>搜索类型</label>
          <select
            className={styles.advancedSelect}
            value={filters.searchType}
            onChange={(e) => onFilterChange('searchType', e.target.value)}
          >
            <option value="articles">文章</option>
            <option value="comments">评论</option>
            <option value="all">全部</option>
          </select>
        </div>

        <div className={styles.advancedSection}>
          <label className={styles.advancedLabel}>排序方式</label>
          <select
            className={styles.advancedSelect}
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
          >
            <option value="relevance">相关性</option>
            <option value="date">日期</option>
            <option value="views">浏览量</option>
          </select>
        </div>

        <div className={styles.advancedSection}>
          <label className={styles.advancedLabel}>作者</label>
          <input
            type="text"
            className={styles.advancedInput}
            placeholder="输入作者名"
            value={filters.author || ''}
            onChange={(e) => onFilterChange('author', e.target.value)}
          />
        </div>



        <div className={styles.advancedSection}>
          <label className={styles.advancedLabel}>日期范围</label>
          <div className={styles.dateRangeContainer}>
            <input
              type="date"
              className={styles.advancedInput}
              value={filters.dateRange?.start || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                const newDateRange = { ...filters.dateRange };
                if (newValue) {
                  newDateRange.start = newValue;
                } else {
                  delete newDateRange.start;
                }
                onDateRangeChange(newDateRange);
              }}
            />
            <span className={styles.dateSeparator}>至</span>
            <input
              type="date"
              className={styles.advancedInput}
              value={filters.dateRange?.end || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                const newDateRange = { ...filters.dateRange };
                if (newValue) {
                  newDateRange.end = newValue;
                } else {
                  delete newDateRange.end;
                }
                onDateRangeChange(newDateRange);
              }}
            />
          </div>
        </div>

        <div className={styles.advancedActions}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={onResetFilters}
          >
            重置筛选
          </button>
        </div>
      </div>

      {/* 组合筛选构建器 */}
      <div className={styles.filterBuilderSection}>
        <FilterBuilder
          filter={compositeFilter || createDefaultFilter()}
          onFilterChange={onCompositeFilterChange}
          onUseCompositeFilterChange={onUseCompositeFilterChange}
          useCompositeFilter={useCompositeFilter}
        />
      </div>
    </div>
  );
}
