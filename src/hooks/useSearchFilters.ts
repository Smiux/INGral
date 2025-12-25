import { useState, useCallback } from 'react';
import { CompositeFilter, createDefaultFilter } from '../types/filter';

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

/**
 * 搜索筛选条件管理Hook
 * 负责管理搜索筛选条件的状态和更新逻辑
 */
export function useSearchFilters () {
  // 初始化筛选条件状态
  const [filters, setFilters] = useState<ExtendedSearchFilters>({
    'searchType': 'articles',
    'sortBy': 'relevance',
    'author': '',
    'dateRange': {},
    'useCompositeFilter': false,
    'compositeFilter': createDefaultFilter()
  });

  // 更新筛选条件
  const onFilterChange = useCallback(<K extends keyof ExtendedSearchFilters>(key: K, value: ExtendedSearchFilters[K]) => {
    setFilters(prev => {
      const newFilters = { ...prev };

      // Handle optional properties with exactOptionalPropertyTypes
      if (key === 'dateRange') {
        const dateRangeValue = value as ExtendedSearchFilters['dateRange'];
        // Create a new object without undefined values
        const cleanedDateRange: { start?: string; end?: string } = {};
        if (dateRangeValue?.start) {
          cleanedDateRange.start = dateRangeValue.start;
        }
        if (dateRangeValue?.end) {
          cleanedDateRange.end = dateRangeValue.end;
        }
        newFilters[key] = cleanedDateRange as ExtendedSearchFilters[K];
      } else {
        newFilters[key] = value;
      }

      return newFilters;
    });
  }, []);

  // 更新日期范围
  const onDateRangeChange = useCallback((dateRange: { start?: string; end?: string }) => {
    onFilterChange('dateRange', dateRange);
  }, [onFilterChange]);

  // 重置筛选条件
  const onResetFilters = useCallback(() => {
    setFilters({
      'searchType': 'articles',
      'sortBy': 'relevance',
      'author': '',
      'dateRange': {},
      'useCompositeFilter': false,
      'compositeFilter': createDefaultFilter()
    });
  }, []);

  return {
    filters,
    onFilterChange,
    onDateRangeChange,
    onResetFilters
  };
}
