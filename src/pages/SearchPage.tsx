/**
 * 搜索页面
 * 提供文章搜索功能，支持高级搜索筛选
 */
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SearchBox from '../components/search/SearchBox';
import { SearchResults } from '../components/search/SearchResults';
import { SearchFilters } from '../services/searchService';
import styles from './SearchPage.module.css';

export function SearchPage () {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理搜索提交
   * @param newQuery - 新的搜索关键词
   * @param filters - 搜索筛选条件
   */
  const handleSearch = (newQuery: string, filters?: SearchFilters) => {
    setIsLoading(true);

    // 更新URL参数
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }

    // 处理筛选条件，将其添加到URL参数中
    if (filters) {
      if (filters.searchType && filters.searchType !== 'articles') {
        params.set('type', filters.searchType);
      } else {
        params.delete('type');
      }

      if (filters.sortBy && filters.sortBy !== 'relevance') {
        params.set('sort', filters.sortBy);
      } else {
        params.delete('sort');
      }

      if (filters.author) {
        params.set('author', filters.author);
      } else {
        params.delete('author');
      }

      if (filters.tags && filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','));
      } else {
        params.delete('tags');
      }

      if (filters.dateRange?.start) {
        params.set('startDate', filters.dateRange.start);
      } else {
        params.delete('startDate');
      }

      if (filters.dateRange?.end) {
        params.set('endDate', filters.dateRange.end);
      } else {
        params.delete('endDate');
      }
    }

    window.location.search = params.toString();
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <Link
        to="/"
        className={styles.backLink}
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className={styles.header}>
        <h1 className={styles.pageTitle}>搜索{isLoading && ' (加载中...)'}</h1>
        <p className={styles.pageDescription}>查找您感兴趣的文章内容</p>
      </div>

      <div className={styles.searchSection}>
        <SearchBox
          placeholder="输入关键词搜索文章..."
          onSearch={handleSearch}
          defaultValue={query}
          showAdvancedOptions={true}
        />
      </div>

      <div className={styles.resultsSection}>
        <SearchResults
          query={query}
          limit={10}
        />
      </div>
    </div>
  );
}
