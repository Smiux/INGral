import { supabase } from '../lib/supabase';
import { ArticleVersion, VersionHistoryQueryParams, VersionHistoryResult, VersionDiff, RestoreVersionOptions } from '../types/version';
import { cache } from '../utils/cache';

/**
 * 版本历史服务类
 */
class VersionHistoryService {
  /** 缓存键前缀 */
  private readonly CACHE_PREFIX = 'version_history:';
  
  /** 缓存过期时间（毫秒） */
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 获取文章的版本历史列表
   * @param params 查询参数
   * @returns 版本历史列表和分页信息
   */
  async getArticleVersions(params: VersionHistoryQueryParams): Promise<VersionHistoryResult> {
    const { articleId, page = 1, limit = 20, order = 'desc' } = params;
    
    // 构建缓存键
    const cacheKey = `${this.CACHE_PREFIX}${articleId}:${page}:${limit}:${order}`;
    
    // 尝试从缓存获取
    const cachedResult = cache.get<VersionHistoryResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 查询总数
      const { count, error: countError } = await supabase
        .from('article_versions')
        .select('*', { count: 'exact' })
        .eq('article_id', articleId);
      
      if (countError) {
        throw new Error(`获取版本总数失败: ${countError.message}`);
      }
      
      // 查询版本列表，包含作者信息
      const { data, error } = await supabase
        .from('article_versions')
        .select(`
          id,
          article_id,
          title,
          content,
          excerpt,
          tags,
          author_id,
          created_at,
          version_number,
          change_summary,
          is_published,
          author:author_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('article_id', articleId)
        .order('version_number', { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw new Error(`获取版本历史失败: ${error.message}`);
      }
      
      const total = count || 0;
      const versions: ArticleVersion[] = (data || []).map(item => ({
        ...item,
        author: item.author || undefined
      }));
      
      const result: VersionHistoryResult = {
        versions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
      
      // 缓存结果
      cache.set(cacheKey, result, this.CACHE_TTL);
      
      return result;
    } catch (error) {
      console.error('获取文章版本历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个版本详情
   * @param versionId 版本ID
   * @returns 版本详情
   */
  async getVersionById(versionId: string): Promise<ArticleVersion> {
    const cacheKey = `${this.CACHE_PREFIX}version:${versionId}`;
    
    // 尝试从缓存获取
    const cachedVersion = cache.get<ArticleVersion>(cacheKey);
    if (cachedVersion) {
      return cachedVersion;
    }

    try {
      const { data, error } = await supabase
        .from('article_versions')
        .select(`
          id,
          article_id,
          title,
          content,
          excerpt,
          tags,
          author_id,
          created_at,
          version_number,
          change_summary,
          is_published,
          author:author_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('id', versionId)
        .single();
      
      if (error) {
        throw new Error(`获取版本详情失败: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('版本不存在');
      }
      
      const version: ArticleVersion = {
        ...data
      };
      
      // 缓存结果
      cache.set(cacheKey, version, this.CACHE_TTL);
      
      return version;
    } catch (error) {
      console.error(`获取版本${versionId}详情失败:`, error);
      throw error;
    }
  }

  /**
   * 比较两个版本的差异
   * @param oldVersionId 旧版本ID
   * @param newVersionId 新版本ID
   * @returns 版本差异信息
   */
  async compareVersions(oldVersionId: string, newVersionId: string): Promise<VersionDiff> {
    try {
      // 获取两个版本
      const [oldVersion, newVersion] = await Promise.all([
        this.getVersionById(oldVersionId),
        this.getVersionById(newVersionId)
      ]);
      
      // 检查是否为同一文章的版本
      if (oldVersion.article_id !== newVersion.article_id) {
        throw new Error('不能比较不同文章的版本');
      }
      
      const diff: VersionDiff = {
        title: {
          old: oldVersion.title,
          new: newVersion.title,
          changed: oldVersion.title !== newVersion.title
        },
        content: {
          old: oldVersion.content,
          new: newVersion.content,
          changed: oldVersion.content !== newVersion.content
        },
        metadata: {
          old: oldVersion.metadata || {},
          new: newVersion.metadata || {},
          changed: JSON.stringify(oldVersion.metadata) !== JSON.stringify(newVersion.metadata)
        },
        versionA: newVersion,
        versionB: oldVersion
      };
      
      // 标签比较已移除，因为新版接口不再包含标签差异
      
      // 内容差异将在前端使用diff库计算
      
      return diff;
    } catch (error) {
      console.error('比较版本差异失败:', error);
      throw error;
    }
  }

  /**
   * 还原文章到指定版本
   * @param options 还原选项
   * @returns 更新后的文章
   */
  async restoreVersion(options: RestoreVersionOptions): Promise<{ success: boolean; message?: string }> {
    const { versionId, articleId, createNewVersion = true, restoreComment = '还原版本' } = options;
    
    try {
      // 获取要还原的版本
      const version = await this.getVersionById(versionId);
      
      // 验证版本属于该文章
      if (version.article_id !== articleId) {
        throw new Error('版本不属于该文章');
      }
      
      // 开启事务
      await supabase.rpc('begin');
      
      try {
        // 更新文章
        const { data, error } = await supabase
          .from('articles')
          .update({
            title: version.title,
            content: version.content,
            excerpt: version.excerpt,
            tags: version.tags,
            is_published: version.is_published
          })
          .eq('id', articleId)
          .select()
          .single();
        
        if (error) {
          throw new Error(`更新文章失败: ${error.message}`);
        }
        
        // 如果需要创建新版本记录
        if (createNewVersion) {
          // 获取当前最大版本号
          const { data: maxVersionData } = await supabase
            .from('article_versions')
            .select('version_number')
            .eq('article_id', articleId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();
          
          const newVersionNumber = (maxVersionData?.version_number || 0) + 1;
          
          // 创建新的版本记录
          await supabase
            .from('article_versions')
            .insert({
              article_id: articleId,
              title: version.title,
              content: version.content,
              excerpt: version.excerpt,
              tags: version.tags,
              version_number: newVersionNumber,
              change_summary: `${restoreComment} (从版本 ${version.version_number} 还原)`,
              is_published: version.is_published
            });
        }
        
        // 提交事务
        await supabase.rpc('commit');
        
        // 清除相关缓存
        this.clearArticleCache(articleId);
        
        return data;
      } catch (err) {
        // 回滚事务
        await supabase.rpc('rollback');
        throw err;
      }
    } catch (error) {
      console.error('还原版本失败:', error);
      throw error;
    }
  }

  /**
   * 清除文章相关的缓存
   * @param articleId 文章ID
   */
  private clearArticleCache(articleId: string): void {
    // 清除所有相关缓存
    cache.keys()
      .filter(key => key.startsWith(`${this.CACHE_PREFIX}${articleId}:`))
      .forEach(key => cache.delete(key));
  }

  /**
   * 创建自定义版本记录
   * @param articleId 文章ID
   * @param changeSummary 变更摘要
   * @returns 新创建的版本
   */
  async createCustomVersion(articleId: string, changeSummary: string): Promise<ArticleVersion> {
    try {
      // 获取当前文章
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
      
      if (articleError) {
        throw new Error(`获取文章失败: ${articleError.message}`);
      }
      
      if (!articleData) {
        throw new Error('文章不存在');
      }
      
      // 获取当前最大版本号
      const { data: maxVersionData } = await supabase
        .from('article_versions')
        .select('version_number')
        .eq('article_id', articleId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      
      const newVersionNumber = (maxVersionData?.version_number || 0) + 1;
      
      // 创建新版本记录
      const { data, error } = await supabase
        .from('article_versions')
        .insert({
          article_id: articleId,
          title: articleData.title,
          content: articleData.content,
          excerpt: articleData.excerpt,
          tags: articleData.tags,
          version_number: newVersionNumber,
          change_summary: changeSummary,
          is_published: articleData.is_published
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`创建版本记录失败: ${error.message}`);
      }
      
      // 清除缓存
      this.clearArticleCache(articleId);
      
      return data as ArticleVersion;
    } catch (error) {
      console.error('创建自定义版本失败:', error);
      throw error;
    }
  }
}

// 导出单例
export default new VersionHistoryService();
