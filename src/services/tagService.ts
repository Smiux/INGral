import { BaseService } from './baseService';
import type { Tag, ArticleTag, Article, PaginationParams } from '../types';

/**
 * 标签服务类，处理标签相关操作
 */
export class TagService extends BaseService {
  private readonly TABLE_NAME = 'tags';
  private readonly CACHE_PREFIX = 'tag';

  /**
   * 获取所有标签
   * @param options 查询选项
   */
  async getAllTags(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'usage_count' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:all`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        let query = this.supabase.from(this.TABLE_NAME).select('*')
          .order(options?.sortBy || 'name', { ascending: options?.sortOrder === 'asc' });

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const result = await this.executeWithRetry(async () => query, 5 * 60 * 1000);
        return result.data || [];
      } catch (error) {
        this.handleError(error, 'TagService', '获取所有标签');
        return [];
      }
    });
  }

  /**
   * 根据ID获取标签
   * @param tagId 标签ID
   */
  async getTagById(tagId: string): Promise<Tag | null> {
    return this.getById<Tag>(this.TABLE_NAME, tagId, this.CACHE_PREFIX, 5 * 60 * 1000);
  }

  /**
   * 根据Slug获取标签
   * @param slug 标签Slug
   */
  async getTagBySlug(slug: string): Promise<Tag | null> {
    const cacheKey = `${this.CACHE_PREFIX}:slug:${slug}`;
    
    return this.queryWithCache<Tag | null>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase.from(this.TABLE_NAME).select('*').eq('slug', slug).single<Tag>();
        }, 5 * 60 * 1000);
        
        return result.data;
      } catch (error) {
        this.handleError(error, 'TagService', '根据Slug获取标签');
        return null;
      }
    });
  }

  /**
   * 创建标签（支持层级关系）
   * @param tagData 标签数据
   */
  async createTag(tagData: {
    name: string;
    description?: string;
    color?: string;
    parent_id?: string | null;
    is_system_tag?: boolean;
  }): Promise<Tag | null> {
    try {
      // 生成slug
      const slug = this.generateSlug(tagData.name);

      const tagRecord = {
        name: tagData.name,
        description: tagData.description,
        color: tagData.color || 'var(--primary-500)',
        slug,
        parent_id: tagData.parent_id || null,
        is_system_tag: tagData.is_system_tag || false,
        usage_count: 0,
      };

      const tag = await this.create<Tag>(this.TABLE_NAME, tagRecord, this.CACHE_PREFIX, 5 * 60 * 1000);
      
      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:all`);
      
      return tag;
    } catch (error) {
      this.handleError(error, 'TagService', '创建标签');
      return null;
    }
  }

  /**
   * 获取标签树（支持层级关系）
   */
  async getTagTree(): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:tree`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase.from(this.TABLE_NAME).select('*').order('name', { ascending: true });
        }, 5 * 60 * 1000);

        const allTags = result.data || [];
        
        // 构建标签树
        const tagMap = new Map<string, Tag & { children?: Tag[] }>();
        const rootTags: Tag[] = [];

        // 初始化标签映射
        allTags.forEach(tag => {
          tagMap.set(tag.id, { ...tag, children: [] });
        });

        // 构建层级关系
        allTags.forEach(tag => {
          if (tag.parent_id) {
            const parentTag = tagMap.get(tag.parent_id);
            if (parentTag) {
              parentTag.children?.push(tag);
            }
          } else {
            rootTags.push(tag);
          }
        });

        return rootTags;
      } catch (error) {
        this.handleError(error, 'TagService', '获取标签树');
        return [];
      }
    });
  }

  /**
   * 获取子标签
   * @param parentId 父标签ID
   */
  async getChildTags(parentId: string): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:children:${parentId}`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase.from(this.TABLE_NAME)
            .select('*')
            .eq('parent_id', parentId)
            .order('name', { ascending: true });
        }, 5 * 60 * 1000);

        return result.data || [];
      } catch (error) {
        this.handleError(error, 'TagService', '获取子标签');
        return [];
      }
    });
  }

  /**
   * 批量创建标签
   * @param tags 标签数据数组
   */
  async batchCreateTags(tags: Array<{
    name: string;
    description?: string;
    color?: string;
  }>): Promise<Tag[]> {
    try {
      // 生成每个标签的slug
      const tagsWithSlug = tags.map(tag => ({
        ...tag,
        slug: this.generateSlug(tag.name),
        color: tag.color || 'var(--primary-500)',
        usage_count: 0,
      }));

      const result = await this.executeWithRetry(async () => {
        return this.supabase
          .from(this.TABLE_NAME)
          .insert(tagsWithSlug)
          .select('*');
      }, 5 * 60 * 1000);

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:all`);
      
      return result.data || [];
    } catch (error) {
      this.handleError(error, 'TagService', '批量创建标签');
      return [];
    }
  }

  /**
   * 批量删除标签
   * @param tagIds 标签ID数组
   */
  async batchDeleteTags(tagIds: string[]): Promise<boolean> {
    try {
      const result = await this.executeWithRetry(async () => {
        return this.supabase
          .from(this.TABLE_NAME)
          .delete()
          .in('id', tagIds);
      }, 5 * 60 * 1000);

      if (result.error) {
        this.handleError(result.error, 'TagService', '批量删除标签');
        return false;
      }

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:*`);
      
      return true;
    } catch (error) {
      this.handleError(error, 'TagService', '批量删除标签');
      return false;
    }
  }

  /**
   * 获取标签统计信息
   */
  async getTagStatistics(): Promise<{
    total: number;
    systemTags: number;
    popularTags: Tag[];
    tagUsageTrend: Array<{
      tagId: string;
      tagName: string;
      usageCount: number;
      month: string;
    }>;
  }> {
    const cacheKey = `${this.CACHE_PREFIX}:stats`;
    
    return this.queryWithCache<{
      total: number;
      systemTags: number;
      popularTags: Tag[];
      tagUsageTrend: Array<{
        tagId: string;
        tagName: string;
        usageCount: number;
        month: string;
      }>;
    }>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        // 获取标签总数
        const totalResult = await this.supabase
          .from(this.TABLE_NAME)
          .select('id', { count: 'exact', head: true });

        // 获取系统标签数量
        const systemTagsResult = await this.supabase
          .from(this.TABLE_NAME)
          .select('id', { count: 'exact', head: true })
          .eq('is_system_tag', true);

        // 获取热门标签
        const popularTagsResult = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.TABLE_NAME)
            .select('*')
            .order('usage_count', { ascending: false })
            .limit(10);
        }, 5 * 60 * 1000);

        // 标签使用趋势（简化实现）
        const tagUsageTrend: Array<{
          tagId: string;
          tagName: string;
          usageCount: number;
          month: string;
        }> = [];

        return {
          total: totalResult.count || 0,
          systemTags: systemTagsResult.count || 0,
          popularTags: popularTagsResult.data || [],
          tagUsageTrend,
        };
      } catch (error) {
        this.handleError(error, 'TagService', '获取标签统计信息');
        return {
          total: 0,
          systemTags: 0,
          popularTags: [],
          tagUsageTrend: [],
        };
      }
    });
  }

  /**
   * 自动生成标签（基于文章内容）
   */
  async generateTagsFromContent(): Promise<Tag[]> {
    try {
      // 这里可以添加基于文章内容自动生成标签的逻辑
      // 例如：使用NLP库提取关键词，然后与现有标签匹配或创建新标签
      
      // 简化实现，返回空数组
      return [];
    } catch (error) {
      this.handleError(error, 'TagService', '自动生成标签');
      return [];
    }
  }

  /**
   * 删除标签
   * @param tagId 标签ID
   */
  async deleteTag(tagId: string): Promise<boolean> {
    const result = await this.delete(this.TABLE_NAME, tagId, this.CACHE_PREFIX);
    
    // 清除相关缓存
    if (result) {
      this.invalidateCache(`${this.CACHE_PREFIX}:all`);
    }
    
    return result;
  }

  /**
   * 获取文章的标签
   * @param articleId 文章ID
   */
  async getArticleTags(articleId: string): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:article:${articleId}`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase.from('article_tags')
            .select('tag:tag_id(*)')
            .eq('article_id', articleId);
        }, 5 * 60 * 1000);

        return result.data?.map((item: { tag: unknown }) => item.tag as Tag) || [];
      } catch (error) {
        this.handleError(error, 'TagService', '获取文章标签');
        return [];
      }
    });
  }

  /**
   * 为文章添加标签
   * @param articleId 文章ID
   * @param tagId 标签ID
   */
  async addTagToArticle(articleId: string, tagId: string): Promise<ArticleTag | null> {
    try {
      const tableName = 'article_tags';
      const cachePrefix = 'article_tag';

      const articleTag = await this.create<ArticleTag>(tableName, {
        article_id: articleId,
        tag_id: tagId,
      }, cachePrefix, 5 * 60 * 1000);
      
      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:article:${articleId}`);
      
      return articleTag;
    } catch (error) {
      this.handleError(error, 'TagService', '添加标签到文章');
      return null;
    }
  }

  /**
   * 从文章中移除标签
   * @param articleId 文章ID
   * @param tagId 标签ID
   */
  async removeTagFromArticle(articleId: string, tagId: string): Promise<boolean> {
    try {
      const result = await this.executeWithRetry(async () => {
        return this.supabase
          .from('article_tags')
          .delete()
          .eq('article_id', articleId)
          .eq('tag_id', tagId);
      }, 5 * 60 * 1000);

      if (result.error) {
        this.handleError(result.error, 'TagService', '从文章移除标签');
        return false;
      }

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:article:${articleId}`);
      
      return true;
    } catch (error) {
      this.handleError(error, 'TagService', '从文章移除标签');
      return false;
    }
  }

  /**
   * 根据标签获取文章
   * @param tagId 标签ID
   * @param options 分页选项
   */
  async getArticlesByTag(tagId: string, options?: PaginationParams): Promise<Article[]> {
    const cacheKey = `${this.CACHE_PREFIX}:articles:${tagId}:${options?.limit || 10}:${options?.offset || 0}`;
    
    return this.queryWithCache<Article[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        let query = this.supabase
          .from('article_tags')
          .select('article:article_id(*)')
          .eq('tag_id', tagId);

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const result = await this.executeWithRetry(async () => query, 5 * 60 * 1000);
        return result.data?.map((item: { article: unknown }) => item.article as Article) || [];
      } catch (error) {
        this.handleError(error, 'TagService', '根据标签获取文章');
        return [];
      }
    });
  }

  /**
   * 搜索标签
   * @param query 搜索关键词
   */
  async searchTags(query: string): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:search:${query.toLowerCase()}`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.TABLE_NAME)
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);
        }, 5 * 60 * 1000);

        return result.data || [];
      } catch (error) {
        this.handleError(error, 'TagService', '搜索标签');
        return [];
      }
    });
  }

  /**
   * 获取热门标签
   * @param limit 限制数量
   */
  async getPopularTags(limit = 10): Promise<Tag[]> {
    const cacheKey = `${this.CACHE_PREFIX}:popular:${limit}`;
    
    return this.queryWithCache<Tag[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.TABLE_NAME)
            .select('*')
            .order('usage_count', { ascending: false })
            .limit(limit);
        }, 5 * 60 * 1000);

        return result.data || [];
      } catch (error) {
        this.handleError(error, 'TagService', '获取热门标签');
        return [];
      }
    });
  }
}

// 导出单例实例
export const tagService = new TagService();
