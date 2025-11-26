/**
 * 搜索页面
 * 提供文章搜索功能，支持关键词搜索和标签筛选
 */
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SearchBox from '../components/search/SearchBox';
import { SearchResults } from '../components/search/SearchResults';
import { TagSelector } from '../components/tags/TagSelector';
import styles from './SearchPage.module.css';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tag') ? [searchParams.get('tag') as string] : []
  );
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理搜索提交
   * @param newQuery - 新的搜索关键词
   */
  const handleSearch = (newQuery: string) => {
    setIsLoading(true);
    
    // 更新URL参数
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }
    
    window.location.search = params.toString();
    setIsLoading(false);
  };

  /**
   * 处理标签选择
   * @param tags - 选中的标签数组
   */
  const handleTagSelect = (tags: string[]) => {
    setIsLoading(true);
    // 过滤掉undefined的标签，确保类型安全
    const validTags = tags.filter(tag => tag !== undefined);
    setSelectedTags(validTags);
    
    // 更新URL参数
    const params = new URLSearchParams(searchParams);
    if (validTags.length > 0 && validTags[0]) {
      params.set('tag', validTags[0]);
    } else {
      params.delete('tag');
    }
    
    window.location.search = params.toString();
    setIsLoading(false);
  };

  /**
   * 清除标签过滤
   */
  const clearTagFilter = () => {
    handleTagSelect([]);
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
        />
        
        <div className={styles.filterSection}>
          <h3 className={styles.filterTitle}>按标签筛选</h3>
          <div className={styles.tagSelectorWrapper}>
            <TagSelector
              selectedTags={selectedTags}
              onChange={handleTagSelect}
              maxTags={1} // 只允许选择一个标签进行筛选
            />
          </div>
          
          {selectedTags.length > 0 && (
            <button
              className={styles.clearFilterButton}
              onClick={clearTagFilter}
            >
              清除标签筛选
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.resultsSection}>
        <SearchResults
          query={query}
          tagId={selectedTags[0] || ''}
          limit={10}
        />
      </div>
    </div>
  );
}
