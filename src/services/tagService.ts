import { supabase } from '../lib/supabase';
import { Tag, ArticleTag, Article } from '../types';

export class TagService {
  /**
   * 获取所有标签
   * @param options 查询选项
   */
  static async getAllTags(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'usage_count' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Tag[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      // 使用更简单直接的方式处理查询，避免类型断言
      let query = supabase.from('tags').select('*')
        .order(options?.sortBy || 'created_at', { ascending: options?.sortOrder === 'asc' })
        .limit(options?.limit || 1000);
      
      // 使用正确的方式处理offset
      if (options?.offset && options.offset > 0) {
        query = query.range(options.offset, options.offset + (options?.limit || 1000) - 1);
      }
      
      const result = await query;

      if (result.error) {
        console.error('获取标签列表失败:', result.error);
        throw new Error('获取标签列表失败');
      }

      return result.data || [];
    } catch (error) {
      console.error('获取标签列表错误:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取标签
   */
  static async getTagById(tagId: string): Promise<Tag | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // 记录不存在
          return null;
        }
        console.error('获取标签失败:', error);
        throw new Error('获取标签失败');
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
  static async getTagBySlug(slug: string): Promise<Tag | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // 记录不存在
          return null;
        }
        console.error('根据Slug获取标签失败:', error);
        throw new Error('根据Slug获取标签失败');
      }

      return data;
    } catch (error) {
      console.error('根据Slug获取标签错误:', error);
      throw error;
    }
  }

  /**
   * 创建新标签
   */
  static async createTag(tagData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Tag> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      // 生成slug（简单实现，实际项目中可能需要更复杂的slug生成逻辑）
      const slug = tagData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: tagData.name,
          description: tagData.description,
          color: tagData.color || '#007bff',
          slug, // 添加slug字段
          // 其他字段会由数据库自动生成或设置默认值
        })
        .select('*')
        .single();

      if (error) {
        console.error('创建标签失败:', error);
        throw new Error('创建标签失败');
      }

      return data;
    } catch (error) {
      console.error('创建标签错误:', error);
      throw error;
    }
  }

  /**
   * 更新标签
   */
  static async updateTag(tagId: string, tagData: {
    name?: string;
    description?: string;
    color?: string;
  }): Promise<Tag> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data, error } = await supabase
        .from('tags')
        .update(tagData)
        .eq('id', tagId)
        .select('*')
        .single();

      if (error) {
        console.error('更新标签失败:', error);
        throw new Error('更新标签失败');
      }

      return data;
    } catch (error) {
      console.error('更新标签错误:', error);
      throw error;
    }
  }

  /**
   * 删除标签
   */
  static async deleteTag(tagId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        console.error('删除标签失败:', error);
        throw new Error('删除标签失败');
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
  static async getArticleTags(articleId: string): Promise<Tag[]> {
    try {
      // 使用正确的类型定义方式
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const result = await supabase
        .from('article_tags')
        .select('tag:tag_id(*)')
        .eq('article_id', articleId);

      if (result.error) {
        console.error('获取文章标签失败:', result.error);
        throw new Error('获取文章标签失败');
      }

      // 使用两步类型转换：先转换为unknown，再转换为目标类型
      return result.data?.map(item => item.tag as unknown as Tag) || [];
    } catch (error) {
      console.error('获取文章标签错误:', error);
      throw error;
    }
  }

  /**
   * 为文章添加标签
   */
  static async addTagToArticle(articleId: string, tagId: string): Promise<ArticleTag> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data, error } = await supabase
        .from('article_tags')
        .insert({
          article_id: articleId,
          tag_id: tagId,
        })
        .select('*')
        .single();

      if (error) {
        console.error('添加标签到文章失败:', error);
        throw new Error('添加标签到文章失败');
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
  static async removeTagFromArticle(articleId: string, tagId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { error } = await supabase
        .from('article_tags')
        .delete()
        .eq('article_id', articleId)
        .eq('tag_id', tagId);

      if (error) {
        console.error('从文章移除标签失败:', error);
        throw new Error('从文章移除标签失败');
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
  static async getArticlesByTag(tagId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Article[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 使用适当的类型定义
      let query = supabase
        .from('article_tags')
        .select('article:article_id(*)')
        .eq('tag_id', tagId);

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset && options.offset > 0) {
        // 使用range替代offset，确保options.limit有默认值
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const result = await query;

      if (result.error) {
        console.error('根据标签获取文章失败:', result.error);
        throw new Error('根据标签获取文章失败');
      }

      // 使用两步类型转换：先转换为unknown，再转换为目标类型
      return result.data?.map(item => item.article as unknown as Article) || [];
    } catch (error) {
      console.error('根据标签获取文章错误:', error);
      throw error;
    }
  }

  /**
   * 搜索标签
   */
  static async searchTags(query: string): Promise<Tag[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) {
        console.error('搜索标签失败:', error);
        throw new Error('搜索标签失败');
      }

      return data;
    } catch (error) {
      console.error('搜索标签错误:', error);
      throw error;
    }
  }

  /**
   * 获取热门标签
   */
  static async getPopularTags(limit: number = 10): Promise<Tag[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取热门标签失败:', error);
        throw new Error('获取热门标签失败');
      }

      return data;
    } catch (error) {
      console.error('获取热门标签错误:', error);
      throw error;
    }
  }
}