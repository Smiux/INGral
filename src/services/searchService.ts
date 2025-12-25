import type { Article, Comment } from '../types';
import { BaseService } from './baseService';
import { semanticSearchService, SemanticSearchResult } from './semanticSearchService';

// 导入筛选类型
import type { CompositeFilter } from '../types/filter';

// 搜索筛选条件接口
export interface SearchFilters {
  searchType?: 'articles' | 'comments' | 'all';
  sortBy?: 'relevance' | 'date' | 'views' | 'type';
  author?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  compositeFilter?: CompositeFilter;
  useCompositeFilter?: boolean;
}

// 搜索结果类型接口
interface SearchResult {
  created_at: string;
  views?: number;
  search_rank?: number;
}

/**
 * 搜索服务类，提供基于关键词的文章和评论全文搜索功能
 * 包含搜索缓存管理、搜索建议获取和搜索历史清理
 */
export class SearchService extends BaseService {
  private static instance: SearchService;

  private constructor () {
    super();
  }

  /**
   * 获取单例实例
   */
  static getInstance (): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * 搜索文章，根据关键词匹配文章内容
   * @param query 搜索关键词
   * @param limit 结果数量限制，默认20
   * @returns 匹配的文章数组，包含搜索排名
   */
  async searchArticles (query: string, limit = 20): Promise<(Article & { search_rank: number })[]> {
    try {
      this.checkSupabaseClient();
      // 调用数据库搜索函数
      const { data, error } = await this.supabase.rpc('search_articles', {
        query,
        'limit_count': limit
      });

      if (error) {
        this.handleError(error, '搜索文章', 'SearchService');
      }

      // 过滤只返回公开文章
      const filteredData = (data || []).filter((article: Article) => article.visibility === 'public');
      return filteredData;
    } catch (error) {
      console.error('Failed to search articles:', error);
      return [];
    }
  }

  /**
   * 获取搜索建议，基于部分关键词生成相关推荐
   * @param query 部分搜索关键词
   * @param limit 建议数量限制，默认5
   * @returns 搜索建议数组，包含文章标题、ID和摘要
   */
  async getSearchSuggestions (query: string, limit = 5): Promise<{ title: string; id: string; excerpt?: string }[]> {
    try {
      this.checkSupabaseClient();
      // 使用新的搜索建议函数
      const { data, error } = await this.supabase.rpc('search_suggestions', {
        query,
        'limit_count': limit
      });

      if (error) {
        this.handleError(error, '获取搜索建议', 'SearchService');
      }

      // 增强建议数据，添加摘要信息
      if (data && Array.isArray(data)) {
        return data.map(item => {
          // 生成简短摘要（如果没有则截取内容）
          let excerpt = '';
          if (item.excerpt && item.excerpt.length > 0) {
            excerpt = item.excerpt;
          } else if (item.content && item.content.length > 0) {
            // 截取内容前100个字符作为摘要
            excerpt = item.content.slice(0, 100) + '...';
          }

          return {
            'title': item.title,
            'id': item.id,
            excerpt
          };
        });
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * 搜索评论，根据关键词匹配评论内容
   * @param query 搜索关键词
   * @param limit 结果数量限制，默认20
   * @returns 匹配的评论数组，包含搜索排名
   */
  async searchComments (query: string, limit = 20): Promise<(Comment & { search_rank: number })[]> {
    try {
      this.checkSupabaseClient();
      // 调用数据库搜索函数
      const { data, error } = await this.supabase.rpc('search_comments', {
        query,
        'limit_count': limit
      });

      if (error) {
        this.handleError(error, '搜索评论', 'SearchService');
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search comments:', error);
      return [];
    }
  }

  /**
   * 解析高级搜索语法
   * @param query 搜索查询字符串
   * @returns 解析后的搜索参数
   */
  private parseSearchQuery (query: string) {
    // 解析引号搜索
    const quotedPhrases: string[] = [];
    const quoteRegex = /"([^"]+)"/g;
    let match;

    while ((match = quoteRegex.exec(query)) !== null) {
      if (match[1]) {
        quotedPhrases.push(match[1]);
      }
    }

    // 解析布尔运算符
    let parsedQuery = query;

    // 替换AND运算符
    if (parsedQuery.includes(' AND ')) {
      parsedQuery = parsedQuery.replace(/\s+AND\s+/gi, ' ');
    }

    // 解析NOT运算符
    const excludedTerms: string[] = [];
    const notRegex = /\s+NOT\s+/gi;
    if (notRegex.test(parsedQuery)) {
      const parts = parsedQuery.split(notRegex);
      if (parts.length > 1 && parts[0] !== undefined) {
        parsedQuery = parts[0];
        const excluded = parts.slice(1).join(' ');
        excludedTerms.push(...excluded.split(/\s+/).filter(term => term.trim()));
      }
    }

    // 解析OR运算符
    const orTerms: string[] = [];
    const orRegex = /\s+OR\s+/gi;
    if (orRegex.test(parsedQuery)) {
      orTerms.push(...parsedQuery.split(orRegex).map(term => term.trim())
        .filter(term => term.trim()));
    }

    // 解析字段搜索
    const fieldSearches: Record<string, string> = {};
    const fieldRegex = /(\w+):([^\s]+)/g;

    while ((match = fieldRegex.exec(query)) !== null) {
      if (match[1] && match[2]) {
        fieldSearches[match[1]] = match[2];
        // 从主查询中移除字段搜索部分
        parsedQuery = parsedQuery.replace(match[0], '');
      }
    }

    // 解析范围搜索
    const rangeSearches: Record<string, { min: string; max: string }> = {};
    const rangeRegex = /(\w+):\[([^\s]+)\s+TO\s+([^\]]+)\]/g;

    while ((match = rangeRegex.exec(query)) !== null) {
      if (match[1] && match[2] && match[3]) {
        rangeSearches[match[1]] = {
          'min': match[2],
          'max': match[3]
        };
        // 从主查询中移除范围搜索部分
        parsedQuery = parsedQuery.replace(match[0], '');
      }
    }

    // 清理并拆分剩余查询词
    // 移除引号
    const terms = parsedQuery
      .replace(quoteRegex, '')
      .split(/\s+/)
      .filter(term => term.trim() && !excludedTerms.includes(term));

    return {
      terms,
      quotedPhrases,
      excludedTerms,
      orTerms,
      fieldSearches,
      rangeSearches
    };
  }

  /**
   * 高级搜索，支持多种筛选条件和语义搜索
   * @param query 搜索关键词
   * @param filters 搜索筛选条件
   * @param limit 结果数量限制，默认20
   * @param useSemanticSearch 是否使用语义搜索，默认false
   * @returns 匹配的文章或评论数组，包含搜索排名和语义分数
   */
  async advancedSearch (
    query: string,
    filters: SearchFilters = {},
    limit = 20,
    useSemanticSearch = false
  ): Promise<((Article | Comment) & { search_rank: number })[] | SemanticSearchResult[]> {
    // 解析高级搜索语法
    const parsedQuery = this.parseSearchQuery(query);

    const {
      searchType = 'articles',
      sortBy = 'relevance',
      author,
      dateRange
    } = filters;

    try {
      this.checkSupabaseClient();

      // 如果使用语义搜索
      if (useSemanticSearch) {
        // 直接调用语义搜索服务
        const semanticResults = await semanticSearchService.semanticSearch(query, limit);
        return semanticResults;
      }

      // 传统搜索逻辑
      let results: ((Article | Comment) & { search_rank: number })[] = [];

      // 构建最终查询，包含原始查询和引号短语
      const finalQuery = [...parsedQuery.terms, ...parsedQuery.quotedPhrases].join(' ');

      // 根据搜索类型执行不同的搜索逻辑
      if (searchType === 'articles' || searchType === 'all') {
        // 搜索文章
        const articles = await this.searchArticles(finalQuery, limit * 2);
        let filteredArticles = articles;

        // 应用额外筛选条件
        if (author) {
          filteredArticles = filteredArticles.filter(article =>
            article.author_name?.toLowerCase().includes(author.toLowerCase())
          );
        }

        if (dateRange?.start) {
          filteredArticles = filteredArticles.filter(article =>
            article.created_at >= dateRange.start!
          );
        }

        if (dateRange?.end) {
          filteredArticles = filteredArticles.filter(article =>
            article.created_at <= dateRange.end!
          );
        }

        // 应用排除术语
        if (parsedQuery.excludedTerms.length > 0) {
          filteredArticles = filteredArticles.filter(article => {
            const content = `${article.title} ${article.content}`.toLowerCase();
            return !parsedQuery.excludedTerms.some(term =>
              content.includes(term.toLowerCase())
            );
          });
        }

        // 应用字段搜索
        if (Object.keys(parsedQuery.fieldSearches).length > 0) {
          filteredArticles = filteredArticles.filter(article => {
            for (const [field, value] of Object.entries(parsedQuery.fieldSearches)) {
              switch (field.toLowerCase()) {
                case 'title':
                  if (!article.title?.toLowerCase().includes(value.toLowerCase())) {
                    return false;
                  }
                  break;
                case 'author':
                  if (!article.author_name?.toLowerCase().includes(value.toLowerCase())) {
                    return false;
                  }
                  break;
                case 'content':
                  if (!article.content?.toLowerCase().includes(value.toLowerCase())) {
                    return false;
                  }
                  break;
              }
            }
            return true;
          });
        }

        // 应用范围搜索
        if (Object.keys(parsedQuery.rangeSearches).length > 0) {
          filteredArticles = filteredArticles.filter(article => {
            for (const [field, range] of Object.entries(parsedQuery.rangeSearches)) {
              switch (field.toLowerCase()) {
                case 'views':
                  const views = article.view_count || 0;
                  if (views < parseInt(range.min, 10) || views > parseInt(range.max, 10)) {
                    return false;
                  }
                  break;
              }
            }
            return true;
          });
        }

        // 排序
        filteredArticles.sort((a, b) => this.sortResults(a, b, sortBy));
        results = [...results, ...filteredArticles];
      }

      if (searchType === 'comments' || searchType === 'all') {
        // 搜索评论
        const comments = await this.searchComments(finalQuery, limit * 2);
        let filteredComments = comments;

        // 应用额外筛选条件
        if (author) {
          filteredComments = filteredComments.filter(comment =>
            comment.author_name?.toLowerCase().includes(author.toLowerCase())
          );
        }

        if (dateRange?.start) {
          filteredComments = filteredComments.filter(comment =>
            comment.created_at >= dateRange.start!
          );
        }

        if (dateRange?.end) {
          filteredComments = filteredComments.filter(comment =>
            comment.created_at <= dateRange.end!
          );
        }

        // 应用排除术语
        if (parsedQuery.excludedTerms.length > 0) {
          filteredComments = filteredComments.filter(comment => {
            const content = comment.content?.toLowerCase() || '';
            return !parsedQuery.excludedTerms.some(term =>
              content.includes(term.toLowerCase())
            );
          });
        }

        // 排序
        filteredComments.sort((a, b) => this.sortResults(a, b, sortBy));
        results = [...results, ...filteredComments];
      }

      // 如果是全搜索，按排序重新合并结果
      if (searchType === 'all') {
        results.sort((a, b) => this.sortResults(a, b, sortBy));
      }

      // 限制结果数量
      return results.slice(0, limit);
    } catch (error) {
      console.error('Failed to perform advanced search:', error);
      return [];
    }
  }

  /**
   * 语义增强搜索，结合传统搜索和语义相似度
   * @param query 搜索关键词
   * @param filters 搜索筛选条件
   * @param limit 结果数量限制，默认20
   * @returns 语义增强的搜索结果数组
   */
  async semanticEnhancedSearch (
    query: string,
    filters: SearchFilters = {},
    limit = 20
  ): Promise<SemanticSearchResult[]> {
    try {
      // 1. 执行传统搜索
      const traditionalResults = await this.advancedSearch(query, filters, limit * 2);

      // 2. 确保结果是传统搜索类型
      if (!Array.isArray(traditionalResults) || traditionalResults.length === 0) {
        return [];
      }

      // 3. 语义增强传统搜索结果
      const enhancedResults = await semanticSearchService.enhanceSearchResults(
        traditionalResults as ((Article | Comment) & { search_rank: number })[],
        query
      );

      // 4. 限制结果数量
      return enhancedResults.slice(0, limit);
    } catch (error) {
      console.error('Failed to perform semantic enhanced search:', error);
      return [];
    }
  }

  /**
   * 结果排序辅助函数
   */
  private sortResults (a: SearchResult, b: SearchResult, sortBy: string): number {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'views':
        return (b.views || 0) - (a.views || 0);
      case 'relevance':
      default:
        return (b.search_rank || 0) - (a.search_rank || 0);
    }
  }

  /**
   * 清理搜索相关缓存，包括文章搜索结果和搜索建议
   */
  clearSearchCache (): void {
    // 移除缓存清理功能，因为已经不再使用缓存
  }

  /**
   * 获取智能文章推荐，基于内容相似性
   * @param articleId 当前文章ID
   * @param limit 推荐数量限制，默认5
   * @returns 推荐的文章数组
   */
  async getIntelligentRecommendations (articleId: string, limit = 5): Promise<Article[]> {
    try {
      this.checkSupabaseClient();

      // 返回最新公开文章作为推荐
      const { 'data': latestArticles } = await this.supabase
        .from('articles')
        .select('*')
        .neq('id', articleId)
        .eq('visibility', 'public')
        .order('created_at', { 'ascending': false })
        .limit(limit);

      return latestArticles || [];
    } catch (error) {
      console.error('Failed to get intelligent recommendations:', error);
      return [];
    }
  }
}

// 导出单例实例
export const searchService = SearchService.getInstance();
