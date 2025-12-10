import { useState, useCallback, useEffect } from 'react';
import type { Article, Comment } from '../../../../types';
import { searchService, SearchFilters } from '../../../../services/searchService';
import { SemanticSearchResult } from '../../../../services/semanticSearchService';
import { exportService } from '../../../../services/exportService';

interface CommentSearchResult {
  id: string;
  article_id: string;
  content: string;
  search_rank: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

interface SearchResultItem extends Article {
  search_rank: number;
}

export const useSearchResults = (query: string, tagId?: string, limit = 20) => {
  const [articleResults, setArticleResults] = useState<SearchResultItem[]>([]);
  const [commentResults, setCommentResults] = useState<CommentSearchResult[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [relatedResults, setRelatedResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'articles' | 'comments' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views' | 'type'>('relevance');
  const [groupBy, setGroupBy] = useState<'type' | 'relevance_range' | 'date' | 'none'>('type');
  const [searchMode, setSearchMode] = useState<'traditional' | 'semantic' | 'enhanced'>('traditional');
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'hierarchical'>('list');
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [searchKey, setSearchKey] = useState<string>(query);
  const [exportLoading, setExportLoading] = useState(false);

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
    search(query, tagId, true);
  }, [search, query, tagId]);

  // 处理排序方式切换
  const handleSortByChange = useCallback((sort: 'relevance' | 'date' | 'views' | 'type') => {
    setSortBy(sort);
    // 重新搜索以应用新的排序方式
    search(query, tagId, true);
  }, [search, query, tagId]);

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

  return {
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
    setSearchType: handleSearchTypeChange,
    setSortBy: handleSortByChange,
    setGroupBy,
    setSearchMode,
    setViewMode,
    loadMoreArticles,
    loadMoreComments,
    exportResultsToJson,
    exportResultsToCsv,
    exportResultsToGraphml,
    exportResultsToPdf
  };
};