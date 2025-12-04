import type { Article, Comment } from '../types';
import { BaseService } from './baseService';
import { CACHE_TTL } from '../utils/db-optimization';

/**
 * 搜索服务类，提供基于关键词的文章和评论全文搜索功能
 * 包含搜索缓存管理、搜索建议获取和搜索历史清理
 */
export class SearchService extends BaseService {
  private static instance: SearchService;
  private readonly CACHE_PREFIX = 'search';

  private constructor() {
    super();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SearchService {
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
  async searchArticles(query: string, limit = 20): Promise<(Article & { search_rank: number })[]> {
    const cacheKey = `${this.CACHE_PREFIX}:${query}:${limit}`;

    return this.queryWithCache<(Article & { search_rank: number })[]>(cacheKey, CACHE_TTL.searchResults, async () => {
      try {
        this.checkSupabaseClient();
        // 调用数据库搜索函数
        const { data, error } = await this.supabase.rpc('search_articles', {
          query: query,
          limit_count: limit,
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
    });
  }

  /**
   * 根据标签搜索文章，结合关键词和标签过滤
   * @param query 搜索关键词
   * @param tagId 标签ID，用于过滤特定标签的文章
   * @param limit 结果数量限制，默认20
   * @returns 匹配的文章数组，包含搜索排名
   */
  async searchArticlesByTag(
    query: string,
    tagId: string,
    limit = 20,
  ): Promise<(Article & { search_rank: number })[]> {
    const cacheKey = `${this.CACHE_PREFIX}:tag:${tagId}:${query}:${limit}`;

    return this.queryWithCache<(Article & { search_rank: number })[]>(cacheKey, CACHE_TTL.searchResults, async () => {
      try {
        this.checkSupabaseClient();
        // 调用数据库带标签的搜索函数
        const { data, error } = await this.supabase.rpc('search_articles_by_tag', {
          query: query,
          tag_id_filter: tagId,
          limit_count: limit,
        });

        if (error) {
          this.handleError(error, '根据标签搜索文章', 'SearchService');
        }

        // 过滤只返回公开文章
        const filteredData = (data || []).filter((article: Article) => article.visibility === 'public');
        return filteredData;
      } catch (error) {
        console.error('Failed to search articles by tag:', error);
        return [];
      }
    });
  }

  /**
   * 获取搜索建议，基于部分关键词生成相关推荐
   * @param query 部分搜索关键词
   * @param limit 建议数量限制，默认5
   * @returns 搜索建议数组，包含文章标题和ID
   */
  async getSearchSuggestions(query: string, limit = 5): Promise<{ title: string; id: string }[]> {
    const cacheKey = `${this.CACHE_PREFIX}:suggestions:${query}:${limit}`;

    return this.queryWithCache<{ title: string; id: string }[]>(cacheKey, CACHE_TTL.searchSuggestions, async () => {
      try {
        this.checkSupabaseClient();
        // 使用新的搜索建议函数
        const { data, error } = await this.supabase.rpc('search_suggestions', {
          query: query,
          limit_count: limit,
        });

        if (error) {
          this.handleError(error, '获取搜索建议', 'SearchService');
        }

        return data || [];
      } catch (error) {
        console.error('Failed to get search suggestions:', error);
        return [];
      }
    });
  }

  /**
   * 搜索评论，根据关键词匹配评论内容
   * @param query 搜索关键词
   * @param limit 结果数量限制，默认20
   * @returns 匹配的评论数组，包含搜索排名
   */
  async searchComments(query: string, limit = 20): Promise<(Comment & { search_rank: number })[]> {
    const cacheKey = `${this.CACHE_PREFIX}:comments:${query}:${limit}`;

    return this.queryWithCache<(Comment & { search_rank: number })[]>(cacheKey, CACHE_TTL.searchResults, async () => {
      try {
        this.checkSupabaseClient();
        // 调用数据库搜索函数
        const { data, error } = await this.supabase.rpc('search_comments', {
          query: query,
          limit_count: limit,
        });

        if (error) {
          this.handleError(error, '搜索评论', 'SearchService');
        }

        return data || [];
      } catch (error) {
        console.error('Failed to search comments:', error);
        return [];
      }
    });
  }

  /**
   * 清理搜索相关缓存，包括文章搜索结果和搜索建议
   */
  clearSearchCache(): void {
    this.invalidateCache(`${this.CACHE_PREFIX}:*`);
  }
}

// 导出单例实例
export const searchService = SearchService.getInstance();
