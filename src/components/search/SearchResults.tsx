import { useState, useEffect, useCallback } from 'react';
import type { Article, Comment } from '../../types';
import { searchService, SearchFilters } from '../../services/searchService';
import { SemanticSearchResult } from '../../services/semanticSearchService';
import { exportService } from '../../services/exportService';
import SearchResultsGraph from './SearchResultsGraph';
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
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'articles' | 'comments' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views' | 'type'>('relevance');
  const [groupBy, setGroupBy] = useState<'type' | 'relevance_range' | 'date' | 'none'>('type');
  const [searchMode, setSearchMode] = useState<'traditional' | 'semantic' | 'enhanced'>('traditional');
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'hierarchical'>('list');
  // 相关推荐结果
  const [relatedResults, setRelatedResults] = useState<SemanticSearchResult[]>([]);
  // 层级展开状态
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [searchKey, setSearchKey] = useState<string>(query); // 用于追踪搜索关键词变化
  const [exportLoading, setExportLoading] = useState(false); // 用于追踪导出状态

  // 搜索结果
  const search = useCallback(async (newQuery: string, newTagId?: string, resetResults = true) => {
    if (!newQuery.trim()) {
      setArticleResults([]);
      setCommentResults([]);
      setSemanticResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 构建筛选条件
      const filters: SearchFilters = {
        searchType: searchType,
        sortBy: sortBy,
      };

      // 如果有标签ID，添加到标签筛选中
      if (newTagId && newTagId !== '') {
        filters.tags = [newTagId];
      }

      let results: SemanticSearchResult[] | ((Article | Comment) & { search_rank: number })[] = [];

      // 根据搜索模式执行不同的搜索
      switch (searchMode) {
        case 'semantic':
          // 执行纯语义搜索
          results = await searchService.advancedSearch(newQuery, filters, limit, true);
          break;
        case 'enhanced':
          // 执行语义增强搜索
          results = await searchService.semanticEnhancedSearch(newQuery, filters, limit);
          break;
        case 'traditional':
        default:
          // 执行传统搜索
          results = await searchService.advancedSearch(newQuery, filters, limit, false);
          break;
      }

      // 重置所有结果
      if (resetResults) {
        setArticleResults([]);
        setCommentResults([]);
        setSemanticResults([]);
      }

      // 处理结果
      if (searchMode === 'semantic' || searchMode === 'enhanced') {
        // 语义搜索结果
        const semanticSearchResults = results as SemanticSearchResult[];
        setSemanticResults(prev => [...prev, ...semanticSearchResults]);
        // 检查是否还有更多结果
        setHasMoreArticles(semanticSearchResults.length === limit);
        setHasMoreComments(false); // 语义搜索暂时不支持评论
        
        // 搜索完成后，获取相关推荐结果
        if (resetResults && semanticSearchResults.length > 0) {
          // 基于搜索结果获取相关推荐
          const topResultIds = semanticSearchResults.slice(0, 3).map(result => result.id);
          // 这里可以调用相关推荐API，暂时使用模拟数据
          setTimeout(() => {
            // 实现多样性推荐，确保推荐结果包含不同类型和不同主题的内容
            // 1. 按类型分组
            const conceptResults = semanticSearchResults.filter(result => result.type === 'concept' && !topResultIds.includes(result.id));
            const articleResults = semanticSearchResults.filter(result => result.type === 'article' && !topResultIds.includes(result.id));
            
            // 2. 确保不同类型都有推荐，按相关度排序
            const diversifiedResults: SemanticSearchResult[] = [];
            
            // 添加前2个概念推荐
            diversifiedResults.push(...conceptResults.slice(0, 2));
            
            // 添加前3个文章推荐
            diversifiedResults.push(...articleResults.slice(0, 3));
            
            // 3. 如果某一类型不足，从另一类型补充
            if (diversifiedResults.length < 5) {
              const remainingCount = 5 - diversifiedResults.length;
              const remainingResults = [...conceptResults, ...articleResults]
                .filter(result => !diversifiedResults.some(r => r.id === result.id))
                .slice(0, remainingCount);
              diversifiedResults.push(...remainingResults);
            }
            
            // 4. 最终按相关度重新排序
            const mockRelatedResults: SemanticSearchResult[] = diversifiedResults
              .sort((a, b) => b.semantic_score - a.semantic_score)
              .map(result => ({
                ...result,
                type: result.type === 'concept' ? 'concept' : 'article'
              }));
            
            setRelatedResults(mockRelatedResults);
          }, 500);
        }
      } else {
        // 传统搜索结果
        // 分离文章和评论结果
        const traditionalResults = results as ((Article | Comment) & { search_rank: number })[];
        const articleSearchResults = traditionalResults
          .filter(result => 'title' in result) as SearchResultItem[];
        const commentSearchResults = traditionalResults
          .filter(result => 'article_id' in result) as CommentSearchResult[];

        if (resetResults) {
          setArticleResults(articleSearchResults);
          setCommentResults(commentSearchResults);
          // 搜索完成后，重置相关推荐
          setRelatedResults([]);
        } else {
          // 对于分页加载，追加结果
          setArticleResults(prev => [...prev, ...articleSearchResults]);
          setCommentResults(prev => [...prev, ...commentSearchResults]);
        }

        // 检查是否还有更多结果
        setHasMoreArticles(articleSearchResults.length === limit);
        setHasMoreComments(commentSearchResults.length === limit);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('搜索失败，请稍后重试');
      setArticleResults([]);
      setCommentResults([]);
      setSemanticResults([]);
    } finally {
      setLoading(false);
    }
  }, [limit, sortBy, searchType, searchMode]);

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
  const handleSortByChange = useCallback((sort: 'relevance' | 'date' | 'views' | 'type') => {
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

  // 解析搜索查询，提取关键词
  const parseSearchQuery = useCallback((query: string) => {
    if (!query.trim()) { return []; }
    
    // 处理引号包裹的精确短语
    const phraseRegex = /"([^"]+)"/g;
    const phrases: string[] = [];
    let match;
    let remainingQuery = query;
    
    // 提取引号包裹的短语
    while ((match = phraseRegex.exec(query)) !== null) {
      if (match[1]) {
        phrases.push(match[1]);
      }
      remainingQuery = remainingQuery.replace(match[0], '');
    }
    
    // 处理剩余的关键词，支持AND/OR/NOT逻辑
    const keywordRegex = /\b(?!AND|OR|NOT\b)(\w+)\b/gi;
    const keywords: string[] = [];
    
    while ((match = keywordRegex.exec(remainingQuery)) !== null) {
      if (match[1]) {
        keywords.push(match[1]);
      }
    }
    
    // 合并短语和关键词
    return [...phrases, ...keywords];
  }, []);

  // 高亮匹配的文本，支持多关键词
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) { return text; }

    try {
      const keywords = parseSearchQuery(query);
      if (keywords.length === 0) { return text; }

      // 构建正则表达式，匹配所有关键词
      const keywordPatterns = keywords.map(escapeRegExp).join('|');
      const regex = new RegExp(`(${keywordPatterns})`, 'gi');
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
  }, [parseSearchQuery]);

  // 切换层级展开状态
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // 检查项目是否展开
  const isExpanded = useCallback((itemId: string) => {
    return expandedItems.has(itemId);
  }, [expandedItems]);

  // 构建层级结构
  const buildHierarchicalStructure = useCallback((results: SemanticSearchResult[]) => {
    // 构建概念-文章映射
    const conceptToArticles = new Map<string, SemanticSearchResult[]>();
    const concepts: SemanticSearchResult[] = [];
    
    // 分离概念和文章
    results.forEach(result => {
      if (result.type === 'concept') {
        concepts.push(result);
        conceptToArticles.set(result.id, []);
      } else if (result.type === 'article') {
        // 简单地将文章分配给第一个概念，实际应用中应根据语义关系分配
        if (concepts.length > 0) {
          const firstConceptItem = concepts[0];
          if (firstConceptItem) {
            const firstConcept = firstConceptItem.id;
            const articles = conceptToArticles.get(firstConcept) || [];
            articles.push(result);
            conceptToArticles.set(firstConcept, articles);
          }
        }
      }
    });
    
    return { concepts, conceptToArticles };
  }, []);

  // 按指定字段分组搜索结果
  const groupSearchResults = useCallback((results: SemanticSearchResult[], groupBy: string) => {
    const groups = new Map<string, SemanticSearchResult[]>();
    
    results.forEach(result => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'type':
          groupKey = result.type || 'unknown';
          break;
        case 'relevance_range':
          // 按语义分数范围分组
          const score = result.semantic_score || 0;
          if (score >= 0.8) groupKey = '高相关度 (80-100%)';
          else if (score >= 0.6) groupKey = '中高相关度 (60-79%)';
          else if (score >= 0.4) groupKey = '中相关度 (40-59%)';
          else groupKey = '低相关度 (0-39%)';
          break;
        case 'date':
          // 语义搜索结果没有日期属性，使用当前日期作为默认值
          groupKey = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
          break;
        default:
          groupKey = '其他';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(result);
    });
    
    return groups;
  }, []);

  // 排序搜索结果
  const sortSearchResults = useCallback((results: SemanticSearchResult[], sortBy: string) => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.semantic_score || 0) - (a.semantic_score || 0);
        case 'date':
          // 语义搜索结果没有日期属性，按语义分数排序
          return (b.semantic_score || 0) - (a.semantic_score || 0);
        case 'views':
          // 语义搜索结果没有浏览量属性，按语义分数排序
          return (b.semantic_score || 0) - (a.semantic_score || 0);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });
  }, []);

  // 结果导出功能
  const exportResultsToJson = useCallback(async () => {
    setExportLoading(true);
    try {
      const resultsToExport = searchMode === 'semantic' || searchMode === 'enhanced' ? semanticResults : articleResults as unknown as SemanticSearchResult[];
      await exportService.exportSearchResultsAsJsonFile(resultsToExport, query);
    } catch (error) {
      console.error('导出JSON失败:', error);
      setError('导出JSON失败');
    } finally {
      setExportLoading(false);
    }
  }, [searchMode, semanticResults, articleResults, query]);

  const exportResultsToCsv = useCallback(async () => {
    setExportLoading(true);
    try {
      const resultsToExport = searchMode === 'semantic' || searchMode === 'enhanced' ? semanticResults : articleResults as unknown as SemanticSearchResult[];
      await exportService.exportSearchResultsAsCsvFile(resultsToExport, query);
    } catch (error) {
      console.error('导出CSV失败:', error);
      setError('导出CSV失败');
    } finally {
      setExportLoading(false);
    }
  }, [searchMode, semanticResults, articleResults, query]);

  const exportResultsToGraphml = useCallback(async () => {
    setExportLoading(true);
    try {
      const resultsToExport = searchMode === 'semantic' || searchMode === 'enhanced' ? semanticResults : articleResults as unknown as SemanticSearchResult[];
      await exportService.exportSearchResultsAsGraphmlFile(resultsToExport, query);
    } catch (error) {
      console.error('导出GraphML失败:', error);
      setError('导出GraphML失败');
    } finally {
      setExportLoading(false);
    }
  }, [searchMode, semanticResults, articleResults, query]);

  const exportResultsToPdf = useCallback(async () => {
    setExportLoading(true);
    try {
      const resultsToExport = searchMode === 'semantic' || searchMode === 'enhanced' ? semanticResults : articleResults as unknown as SemanticSearchResult[];
      await exportService.exportSearchResultsToPdf(resultsToExport, query);
    } catch (error) {
      console.error('导出PDF失败:', error);
      setError('导出PDF失败');
    } finally {
      setExportLoading(false);
    }
  }, [searchMode, semanticResults, articleResults, query]);

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

              {/* 搜索模式切换 */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>搜索模式:</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'traditional' ? styles.filterButtonActive : ''}`}
                    onClick={() => setSearchMode('traditional')}
                  >
                    传统搜索
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'semantic' ? styles.filterButtonActive : ''}`}
                    onClick={() => setSearchMode('semantic')}
                  >
                    语义搜索
                  </button>
                  <button
                    className={`${styles.filterButton} ${searchMode === 'enhanced' ? styles.filterButtonActive : ''}`}
                    onClick={() => setSearchMode('enhanced')}
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
                  <button
                    className={`${styles.filterButton} ${sortBy === 'views' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSortByChange('views')}
                  >
                    浏览量
                  </button>
                  <button
                    className={`${styles.filterButton} ${sortBy === 'type' ? styles.filterButtonActive : ''}`}
                    onClick={() => handleSortByChange('type')}
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
                    onClick={() => setGroupBy('none')}
                  >
                    不分组
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'type' ? styles.filterButtonActive : ''}`}
                    onClick={() => setGroupBy('type')}
                  >
                    按类型
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'relevance_range' ? styles.filterButtonActive : ''}`}
                    onClick={() => setGroupBy('relevance_range')}
                  >
                    按相关度
                  </button>
                  <button
                    className={`${styles.filterButton} ${groupBy === 'date' ? styles.filterButtonActive : ''}`}
                    onClick={() => setGroupBy('date')}
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
                    onClick={() => setViewMode('list')}
                  >
                    列表视图
                  </button>
                  <button
                    className={`${styles.filterButton} ${viewMode === 'hierarchical' ? styles.filterButtonActive : ''}`}
                    onClick={() => setViewMode('hierarchical')}
                  >
                    层级视图
                  </button>
                  <button
                    className={`${styles.filterButton} ${viewMode === 'graph' ? styles.filterButtonActive : ''}`}
                    onClick={() => setViewMode('graph')}
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
                    onClick={exportResultsToJson}
                    disabled={exportLoading}
                    title="导出为JSON格式"
                  >
                    JSON
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={exportResultsToCsv}
                    disabled={exportLoading}
                    title="导出为CSV格式"
                  >
                    CSV
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={exportResultsToGraphml}
                    disabled={exportLoading}
                    title="导出为GraphML格式（可用于Gephi等图谱软件）"
                  >
                    GraphML
                  </button>
                  <button
                    className={`${styles.filterButton}`}
                    onClick={exportResultsToPdf}
                    disabled={exportLoading}
                    title="导出为PDF格式"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

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

      {/* 视图模式切换 */}
      {!loading && !error && query.trim() && (
        <>
          {viewMode === 'list' ? (
            /* 列表视图 */
            <>
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
                                <div
                                  key={result.id}
                                  className={`${styles.resultItem} ${result.type === 'concept' ? styles.conceptResultItem : ''}`}
                                  onClick={() => {
                                    if (result.type === 'article') {
                                      // 点击文章跳转到文章详情页
                                      window.location.href = `/article/${result.id}`;
                                    } else if (result.type === 'concept') {
                                      // 点击概念可以跳转到概念详情页或显示概念信息
                                      console.log('Concept clicked:', result);
                                    }
                                  }}
                                >
                                  <div className={styles.resultHeader}>
                                    <h3 className={styles.resultTitle}>
                                      <span className={`${styles.resultTypeBadge} ${result.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
                                        {result.type === 'concept' ? '概念' : '文章'}
                                      </span>
                                      {highlightText(result.title, query)}
                                    </h3>
                                    <span className={styles.resultSemanticScore}>
                                      语义分数: {Math.round(result.semantic_score * 100)}%
                                    </span>
                                  </div>

                                  <p className={styles.resultSummary}>
                                    {highlightText(truncateText(result.content || ''), query)}
                                  </p>

                                  {/* 显示匹配的实体和概念 */}
                                  {(result.entity_matches && result.entity_matches.length > 0) && (
                                    <div className={styles.matchedEntities}>
                                      <span className={styles.matchedLabel}>匹配实体:</span>
                                      {result.entity_matches.slice(0, 3).map((entity, index) => (
                                        <span key={index} className={styles.entityTag}>
                                          {entity.text} ({entity.type})
                                        </span>
                                      ))}
                                      {result.entity_matches.length > 3 && (
                                        <span className={styles.moreEntities}>+{result.entity_matches.length - 3}</span>
                                      )}
                                    </div>
                                  )}

                                  {(result.matched_concepts && result.matched_concepts.length > 0) && (
                                    <div className={styles.matchedConcepts}>
                                      <span className={styles.matchedLabel}>匹配概念:</span>
                                      {result.matched_concepts.slice(0, 3).map((concept, index) => (
                                        <span key={index} className={styles.conceptTag}>
                                          {concept}
                                        </span>
                                      ))}
                                      {result.matched_concepts.length > 3 && (
                                        <span className={styles.moreConcepts}>+{result.matched_concepts.length - 3}</span>
                                      )}
                                    </div>
                                  )}

                                  <div className={styles.resultFooter}>
                                    {result.type === 'article' && result.search_rank && (
                                      <span className={styles.resultRank}>相关度: {Math.round(result.search_rank * 100)}%</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* 加载更多语义搜索结果按钮 */}
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
            </>
          ) : viewMode === 'hierarchical' ? (
            /* 层级视图 */
            <>
              <h3 className={styles.sectionTitle}>层级搜索结果</h3>
              {searchMode === 'semantic' || searchMode === 'enhanced' ? (
                <div className={styles.hierarchicalContainer}>
                  {(() => {
                    const { concepts, conceptToArticles } = buildHierarchicalStructure(semanticResults);
                    
                    if (concepts.length === 0) {
                      // 没有概念，直接显示所有结果
                      return (
                        <div className={styles.resultsList}>
                          {semanticResults.map((result) => (
                            <div
                              key={result.id}
                              className={`${styles.resultItem} ${result.type === 'concept' ? styles.conceptResultItem : ''}`}
                              onClick={() => {
                                if (result.type === 'article') {
                                  window.location.href = `/article/${result.id}`;
                                } else if (result.type === 'concept') {
                                  console.log('Concept clicked:', result);
                                }
                              }}
                            >
                              <div className={styles.resultHeader}>
                                <h3 className={styles.resultTitle}>
                                  <span className={`${styles.resultTypeBadge} ${result.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
                                    {result.type === 'concept' ? '概念' : '文章'}
                                  </span>
                                  {highlightText(result.title, query)}
                                </h3>
                                <span className={styles.resultSemanticScore}>
                                  语义分数: {Math.round(result.semantic_score * 100)}%
                                </span>
                              </div>
                              <p className={styles.resultSummary}>
                                {highlightText(truncateText(result.content || ''), query)}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    
                    return (
                      <div className={styles.hierarchicalTree}>
                        {concepts.map((concept) => (
                          <div key={concept.id} className={styles.hierarchicalItem}>
                            <div
                              className={styles.hierarchicalItemHeader}
                              onClick={() => toggleExpanded(concept.id)}
                            >
                              <span className={`${styles.expandIcon} ${isExpanded(concept.id) ? styles.expanded : ''}`}>
                                {isExpanded(concept.id) ? '▼' : '▶'}
                              </span>
                              <h3 className={`${styles.hierarchicalItemTitle} ${concept.type === 'concept' ? styles.conceptResultItem : ''}`}>
                                <span className={`${styles.resultTypeBadge} ${concept.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
                                  {concept.type === 'concept' ? '概念' : '文章'}
                                </span>
                                {highlightText(concept.title, query)}
                              </h3>
                              <span className={styles.resultSemanticScore}>
                                语义分数: {Math.round(concept.semantic_score * 100)}%
                              </span>
                            </div>
                            
                            {isExpanded(concept.id) && (
                              <div className={styles.hierarchicalItemContent}>
                                <div className={styles.hierarchicalItemSummary}>
                                  {highlightText(truncateText(concept.content || ''), query)}
                                </div>
                                
                                {conceptToArticles.get(concept.id) && conceptToArticles.get(concept.id)!.length > 0 && (
                                  <div className={styles.hierarchicalChildren}>
                                    <h4 className={styles.hierarchicalChildrenTitle}>相关文章</h4>
                                    {conceptToArticles.get(concept.id)!.map((article) => (
                                      <div
                                        key={article.id}
                                        className={styles.hierarchicalChildItem}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.location.href = `/article/${article.id}`;
                                        }}
                                      >
                                        <span className={styles.resultTypeBadge}>
                                          文章
                                        </span>
                                        <span className={styles.hierarchicalChildTitle}>
                                          {highlightText(article.title, query)}
                                        </span>
                                        <span className={styles.resultSemanticScore}>
                                          语义分数: {Math.round(article.semantic_score * 100)}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className={styles.graphInfo}>
                  <p>层级视图仅支持语义搜索结果</p>
                  <p>请切换到语义搜索或语义增强搜索模式以查看层级视图</p>
                </div>
              )}
            </>
          ) : (
            /* 图谱视图 */
            <>
              <h3 className={styles.sectionTitle}>搜索结果图谱</h3>
              <div className={styles.graphContainer}>
                {searchMode === 'semantic' || searchMode === 'enhanced' ? (
                  <SearchResultsGraph results={semanticResults} query={query} />
                ) : (
                  <div className={styles.graphInfo}>
                    <p>图谱视图仅支持语义搜索结果</p>
                    <p>请切换到语义搜索或语义增强搜索模式以查看图谱</p>
                  </div>
                )}
              </div>
            </>
          )}
          
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
                        window.location.href = `/article/${result.id}`;
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
                        {highlightText(result.title, query)}
                      </h3>
                      <span className={styles.resultSemanticScore}>
                        相关度: {Math.round(result.semantic_score * 100)}%
                      </span>
                    </div>
                    <p className={styles.resultSummary}>
                      {highlightText(truncateText(result.content || ''), query)}
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

// 使用命名导出而不是默认导出，以符合ESLint的react-refresh/only-export-components规则
export { SearchResults };