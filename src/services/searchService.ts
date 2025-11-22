import { Article } from '../types';
import { supabase } from '../lib/supabase';
import { DatabaseCache, CACHE_TTL } from '../utils/db-optimization';

// 创建缓存实例
const cache = new DatabaseCache();

/**
 * 搜索服务类，提供全文搜索功能
 */
export class SearchService {
  /**
   * 搜索文章
   * @param query 搜索关键词
   * @param limit 结果数量限制
   * @returns 搜索结果数组
   */
  static async searchArticles(query: string, limit: number = 20): Promise<(Article & { search_rank: number })[]> {
    // 生成缓存键
    const cacheKey = `search:${query}:${limit}`;
    
    // 尝试从缓存获取
    const cachedResults = cache.get<(Article & { search_rank: number })[]>(cacheKey);
    if (cachedResults) {
      console.log('Cache hit for search query:', query);
      return cachedResults;
    }
    
    try {
      // 调用数据库搜索函数
      const { data, error } = await supabase.rpc('search_articles', {
        query: query,
        limit_count: limit
      });
      
      if (error) {
        console.error('Search error:', error);
        throw error;
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
   * 根据标签搜索文章
   * @param query 搜索关键词
   * @param tagId 标签ID
   * @param limit 结果数量限制
   * @returns 搜索结果数组
   */
  static async searchArticlesByTag(
    query: string, 
    tagId: string, 
    limit: number = 20
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
      // 调用数据库带标签的搜索函数
      const { data, error } = await supabase.rpc('search_articles_by_tag', {
        query: query,
        tag_id_filter: tagId,
        limit_count: limit
      });
      
      if (error) {
        console.error('Search by tag error:', error);
        throw error;
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
   * 获取搜索建议
   * @param query 部分搜索关键词
   * @param limit 建议数量限制
   * @returns 搜索建议数组
   */
  static async getSearchSuggestions(query: string, limit: number = 5): Promise<{ title: string; id: string }[]> {
    // 生成缓存键
    const cacheKey = `suggestions:${query}:${limit}`;
    
    // 尝试从缓存获取
    const cachedSuggestions = cache.get<{ title: string; id: string }[]>(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }
    
    try {
      // 简单的前缀匹配搜索建议
      const { data, error } = await supabase
        .from('articles')
        .select('id, title')
        .ilike('title', `${query}%`)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Get suggestions error:', error);
        throw error;
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
   * 清理搜索相关缓存
   */
  static clearSearchCache(): void {
    cache.invalidatePattern('search:*');
    cache.invalidatePattern('suggestions:*');
  }
}
