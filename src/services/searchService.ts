import type { Article, Comment } from '../types';
import { BaseService } from './baseService';
import { DatabaseCache, CACHE_TTL } from '../utils/db-optimization';

// 创建缓存实例
const cache = new DatabaseCache();

/**
 * 搜索服务类，提供基于关键词的文章和评论全文搜索功能
 * 包含搜索缓存管理、搜索建议获取和搜索历史清理
 */
export class SearchService extends BaseService {
  private static instance: SearchService;

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
   * @param {string} query 搜索关键词
   * @param {number} [limit=20] 结果数量限制，默认20
   * @returns {Promise<(Article & { search_rank: number })[]>} 匹配的文章数组，包含搜索排名
   */
  async searchArticles(query: string, limit = 20): Promise<(Article & { search_rank: number })[]> {
    // 生成缓存键
    const cacheKey = `search:${query}:${limit}`;

    // 尝试从缓存获取
    const cachedResults = cache.get<(Article & { search_rank: number })[]>(cacheKey);
    if (cachedResults) {
      console.log('Cache hit for search query:', query);
      return cachedResults;
    }

    try {
      this.checkSupabaseClient();
      // 调用数据库搜索函数
      const { data, error } = await this.supabase.rpc('search_articles', {
        query: query,
        limit_count: limit,
      });

      if (error) {
        this.handleSupabaseError(error, '搜索文章');
      }

      // 将结果缓存，搜索结果缓存时间较短
      cache.set(cacheKey, data || [], CACHE_TTL.searchResults);

      return data || [];
    } catch (error) {
      console.error('Failed to search articles:', error);
      throw error;
    }
  }

  /**
   * 根据标签搜索文章，结合关键词和标签过滤
   * @param {string} query 搜索关键词
   * @param {string} tagId 标签ID，用于过滤特定标签的文章
   * @param {number} [limit=20] 结果数量限制，默认20
   * @returns {Promise<(Article & { search_rank: number })[]>} 匹配的文章数组，包含搜索排名
   */
  async searchArticlesByTag(
    query: string,
    tagId: string,
    limit = 20,
  ): Promise<(Article & { search_rank: number })[]> {
    // 生成缓存键
    const cacheKey = `search:tag:${tagId}:${query}:${limit}`;

    // 尝试从缓存获取
    const cachedResults = cache.get<(Article & { search_rank: number })[]>(cacheKey);
    if (cachedResults) {
      console.log('Cache hit for search with tag:', tagId, 'query:', query);
      return cachedResults;
    }

    try {
      this.checkSupabaseClient();
      // 调用数据库带标签的搜索函数
      const { data, error } = await this.supabase.rpc('search_articles_by_tag', {
        query: query,
        tag_id_filter: tagId,
        limit_count: limit,
      });

      if (error) {
        this.handleSupabaseError(error, '根据标签搜索文章');
      }

      // 将结果缓存
      cache.set(cacheKey, data || [], CACHE_TTL.searchResults);

      return data || [];
    } catch (error) {
      console.error('Failed to search articles by tag:', error);
      throw error;
    }
  }

  /**
   * 获取搜索建议，基于部分关键词生成相关推荐
   * @param {string} query 部分搜索关键词
   * @param {number} [limit=5] 建议数量限制，默认5
   * @returns {Promise<{ title: string; id: string }[]>} 搜索建议数组，包含文章标题和ID
   */
  async getSearchSuggestions(query: string, limit = 5): Promise<{ title: string; id: string }[]> {
    // 生成缓存键
    const cacheKey = `suggestions:${query}:${limit}`;

    // 尝试从缓存获取
    const cachedSuggestions = cache.get<{ title: string; id: string }[]>(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    try {
      this.checkSupabaseClient();
      // 使用新的搜索建议函数
      const { data, error } = await this.supabase.rpc('search_suggestions', {
        query: query,
        limit_count: limit,
      });

      if (error) {
        this.handleSupabaseError(error, '获取搜索建议');
      }

      // 将结果缓存
      cache.set(cacheKey, data || [], CACHE_TTL.searchSuggestions);

      return data || [];
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * 搜索评论，根据关键词匹配评论内容
   * @param {string} query 搜索关键词
   * @param {number} [limit=20] 结果数量限制，默认20
   * @returns {Promise<(Comment & { search_rank: number })[]>} 匹配的评论数组，包含搜索排名
   */
  async searchComments(query: string, limit = 20): Promise<(Comment & { search_rank: number })[]> {
    // 生成缓存键
    const cacheKey = `search:comments:${query}:${limit}`;

    // 尝试从缓存获取
    const cachedResults = cache.get<(Comment & { search_rank: number })[]>(cacheKey);
    if (cachedResults) {
      console.log('Cache hit for comment search query:', query);
      return cachedResults;
    }

    try {
      this.checkSupabaseClient();
      // 调用数据库搜索函数
      const { data, error } = await this.supabase.rpc('search_comments', {
        query: query,
        limit_count: limit,
      });

      if (error) {
        this.handleSupabaseError(error, '搜索评论');
      }

      // 将结果缓存，搜索结果缓存时间较短
      cache.set(cacheKey, data || [], CACHE_TTL.searchResults);

      return data || [];
    } catch (error) {
      console.error('Failed to search comments:', error);
      throw error;
    }
  }

  /**
   * 清理搜索相关缓存，包括文章搜索结果和搜索建议
   */
  clearSearchCache(): void {
    cache.invalidatePattern('search:*');
    cache.invalidatePattern('suggestions:*');
  }
}

// 导出单例实例
export const searchService = SearchService.getInstance();
