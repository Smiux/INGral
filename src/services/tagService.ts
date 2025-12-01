import { BaseService } from './baseService';
import type { Tag, ArticleTag, Article, PaginationParams } from '../types';
import { DB_CONFIG } from '../config';

export class TagService extends BaseService {
  private static instance: TagService;

  private constructor() {
    super();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService();
    }
    return TagService.instance;
  }

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
    try {
      this.checkSupabaseClient();
      
      const query = this.supabase.from('tags').select('*')
        .order(options?.sortBy || DB_CONFIG.DEFAULT_SORT_BY, { ascending: options?.sortOrder === 'asc' })
        .limit(options?.limit || DB_CONFIG.DEFAULT_LIMIT);

      // 应用分页
      const paginatedQuery = this.applyPagination(query, options?.limit, options?.offset);

      const result = await paginatedQuery;

      if (result.error) {
        this.handleSupabaseError(result.error, '获取标签列表');
      }

      return this.handleSuccessResponse(result.data, []);
    } catch (error) {
      console.error('获取标签列表错误:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取标签
   */
  async getTagById(tagId: string): Promise<Tag | null> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // 记录不存在
          return null;
        }
        this.handleSupabaseError(error, '获取标签');
      }

      return data;
    } catch (error) {
      console.error('获取标签错误:', error);
      throw error;
    }
  }

  /**
   * 根据Slug获取标签
   */
  async getTagBySlug(slug: string): Promise<Tag | null> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // 记录不存在
          return null;
        }
        this.handleSupabaseError(error, '根据Slug获取标签');
      }

      return data;
    } catch (error) {
      console.error('根据Slug获取标签错误:', error);
      throw error;
    }
  }

  /**
   * 创建标签（支持层级关系）
   */
  async createTag(tagData: {
    name: string;
    description?: string;
    color?: string;
    parent_id?: string | null;
    is_system_tag?: boolean;
  }): Promise<Tag> {
    try {
      this.checkSupabaseClient();
      
      // 生成slug
      const slug = this.generateSlug(tagData.name);

      const { data, error } = await this.supabase
        .from('tags')
        .insert({
          name: tagData.name,
          description: tagData.description,
          color: tagData.color || '#007bff',
          slug,
          parent_id: tagData.parent_id || null,
          is_system_tag: tagData.is_system_tag || false,
          usage_count: 0,
        })
        .select('*')
        .single();

      if (error) {
        this.handleSupabaseError(error, '创建标签');
      }

      return data;
    } catch (error) {
      console.error('创建标签错误:', error);
      throw error;
    }
  }

  /**
   * 获取标签树（支持层级关系）
   */
  async getTagTree(): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      const { data: allTags, error } = await this.supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        this.handleSupabaseError(error, '获取标签树');
      }

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
      console.error('获取标签树错误:', error);
      throw error;
    }
  }

  /**
   * 获取子标签
   */
  async getChildTags(parentId: string): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('parent_id', parentId)
        .order('name', { ascending: true });

      if (error) {
        this.handleSupabaseError(error, '获取子标签');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('获取子标签错误:', error);
      throw error;
    }
  }

  /**
   * 批量创建标签
   */
  async batchCreateTags(tags: Array<{
    name: string;
    description?: string;
    color?: string;
  }>): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      // 生成每个标签的slug
      const tagsWithSlug = tags.map(tag => ({
        ...tag,
        slug: this.generateSlug(tag.name),
        color: tag.color || '#007bff',
        usage_count: 0,
      }));

      const { data, error } = await this.supabase
        .from('tags')
        .insert(tagsWithSlug)
        .select('*');

      if (error) {
        this.handleSupabaseError(error, '批量创建标签');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('批量创建标签错误:', error);
      throw error;
    }
  }

  /**
   * 批量删除标签
   */
  async batchDeleteTags(tagIds: string[]): Promise<boolean> {
    try {
      this.checkSupabaseClient();
      
      const { error } = await this.supabase
        .from('tags')
        .delete()
        .in('id', tagIds);

      if (error) {
        this.handleSupabaseError(error, '批量删除标签');
      }

      return true;
    } catch (error) {
      console.error('批量删除标签错误:', error);
      throw error;
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
    try {
      this.checkSupabaseClient();
      
      // 获取标签总数
      const totalResult = await this.supabase
        .from('tags')
        .select('id', { count: 'exact', head: true });

      // 获取系统标签数量
      const systemTagsResult = await this.supabase
        .from('tags')
        .select('id', { count: 'exact', head: true })
        .eq('is_system_tag', true);

      // 获取热门标签
      const popularTagsResult = await this.supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(10);

      // 这里可以添加标签使用趋势的查询，根据实际需求实现
      const tagUsageTrend: Array<{
        tagId: string;
        tagName: string;
        usageCount: number;
        month: string;
      }> = [];

      if (totalResult.error || systemTagsResult.error || popularTagsResult.error) {
        this.handleSupabaseError(totalResult.error || systemTagsResult.error || popularTagsResult.error, '获取标签统计信息');
      }

      return {
        total: totalResult.count || 0,
        systemTags: systemTagsResult.count || 0,
        popularTags: this.handleSuccessResponse(popularTagsResult.data, []),
        tagUsageTrend,
      };
    } catch (error) {
      console.error('获取标签统计信息错误:', error);
      throw error;
    }
  }

  /**
   * 自动生成标签（基于文章内容）
   */
  async generateTagsFromContent(): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      // 这里可以添加基于文章内容自动生成标签的逻辑
      // 例如：使用NLP库提取关键词，然后与现有标签匹配或创建新标签
      
      // 简化实现，返回空数组
      return [];
    } catch (error) {
      console.error('自动生成标签错误:', error);
      throw error;
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string): Promise<boolean> {
    try {
      this.checkSupabaseClient();
      
      const { error } = await this.supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        this.handleSupabaseError(error, '删除标签');
      }

      return true;
    } catch (error) {
      console.error('删除标签错误:', error);
      throw error;
    }
  }

  /**
   * 获取文章的标签
   */
  async getArticleTags(articleId: string): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      const result = await this.supabase
        .from('article_tags')
        .select('tag:tag_id(*)')
        .eq('article_id', articleId);

      if (result.error) {
        this.handleSupabaseError(result.error, '获取文章标签');
      }

      return result.data?.map((item: { tag: unknown }) => item.tag as Tag) || [];
    } catch (error) {
      console.error('获取文章标签错误:', error);
      throw error;
    }
  }

  /**
   * 为文章添加标签
   */
  async addTagToArticle(articleId: string, tagId: string): Promise<ArticleTag> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('article_tags')
        .insert({
          article_id: articleId,
          tag_id: tagId,
        })
        .select('*')
        .single();

      if (error) {
        this.handleSupabaseError(error, '添加标签到文章');
      }

      return data;
    } catch (error) {
      console.error('添加标签到文章错误:', error);
      throw error;
    }
  }

  /**
   * 从文章中移除标签
   */
  async removeTagFromArticle(articleId: string, tagId: string): Promise<boolean> {
    try {
      this.checkSupabaseClient();
      
      const { error } = await this.supabase
        .from('article_tags')
        .delete()
        .eq('article_id', articleId)
        .eq('tag_id', tagId);

      if (error) {
        this.handleSupabaseError(error, '从文章移除标签');
      }

      return true;
    } catch (error) {
      console.error('从文章移除标签错误:', error);
      throw error;
    }
  }

  /**
   * 根据标签获取文章
   */
  async getArticlesByTag(tagId: string, options?: PaginationParams): Promise<Article[]> {
    try {
      this.checkSupabaseClient();
      
      const query = this.supabase
        .from('article_tags')
        .select('article:article_id(*)')
        .eq('tag_id', tagId);

      // 应用分页
      const paginatedQuery = this.applyPagination(query, options?.limit, options?.offset);

      const result = await paginatedQuery;

      if (result.error) {
        this.handleSupabaseError(result.error, '根据标签获取文章');
      }

      return result.data?.map((item: { article: unknown }) => item.article as Article) || [];
    } catch (error) {
      console.error('根据标签获取文章错误:', error);
      throw error;
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(query: string): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) {
        this.handleSupabaseError(error, '搜索标签');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('搜索标签错误:', error);
      throw error;
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit = 10): Promise<Tag[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {
        this.handleSupabaseError(error, '获取热门标签');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('获取热门标签错误:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const tagService = TagService.getInstance();
