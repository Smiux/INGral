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
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 使用自定义函数获取版本历史，包含总数和作者信息
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_article_versions', {
          p_article_id: articleId,
          page_number: page,
          page_size: limit
        });
      
      if (versionError) {
        throw new Error(`获取版本历史失败: ${versionError.message}`);
      }
      
      // 获取总数
      const { data: countData, error: countError } = await supabase
        .rpc('count_article_versions', {
          p_article_id: articleId
        });
      
      if (countError) {
        throw new Error(`获取版本总数失败: ${countError.message}`);
      }
      
      const total = countData || 0;
      const versions: ArticleVersion[] = (versionData || []).map((item: ArticleVersion) => ({
        id: item.id,
        article_id: item.article_id,
        title: item.title,
        content: item.content,
        excerpt: item.excerpt,
        tags: item.tags,
        author_id: item.author_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        version_number: item.version_number,
        change_summary: item.change_summary,
        is_published: item.is_published,
        metadata: item.metadata,
        parent_version_id: item.parent_version_id,
        author: {
          id: item.author_id,
          name: item.author_name,
          avatar_url: item.author_avatar
        }
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
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
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
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 使用数据库函数比较版本差异
      const { error: diffError } = await supabase
        .rpc('compare_article_versions', {
          version1_id_param: oldVersionId,
          version2_id_param: newVersionId
        });
      
      if (diffError) {
        throw new Error(`比较版本差异失败: ${diffError.message}`);
      }
      
      // 获取两个版本的详细信息
      const [oldVersion, newVersion] = await Promise.all([
        this.getVersionById(oldVersionId),
        this.getVersionById(newVersionId)
      ]);
      
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
    const { versionId, articleId, restoreComment = '还原版本' } = options;
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 使用数据库函数还原版本，自动处理事务和版本创建
      const { data, error } = await supabase
        .rpc('restore_article_version', {
          version_id_param: versionId,
          user_id_param: 'auth.uid()',
          restore_comment_param: restoreComment
        });
      
      if (error) {
        throw new Error(`还原版本失败: ${error.message}`);
      }
      
      // 清除相关缓存
      this.clearArticleCache(articleId);
      
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('还原版本失败:', error);
      return { success: false, message: error instanceof Error ? error.message : '还原版本失败' };
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
   * 创建分支版本
   * @param versionId 基础版本ID
   * @param branchName 分支名称
   * @returns 新创建的分支版本
   */
  async createBranchVersion(versionId: string, branchName: string): Promise<{ success: boolean; message?: string; branchVersionId?: string }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 使用数据库函数创建分支版本
      const { data, error } = await supabase
        .rpc('create_branch_version', {
          version_id_param: versionId,
          author_id_param: 'auth.uid()',
          branch_name_param: branchName
        });
      
      if (error) {
        throw new Error(`创建分支版本失败: ${error.message}`);
      }
      
      // 清除相关缓存
      // 获取版本所属文章ID以清除缓存
      const version = await this.getVersionById(versionId);
      this.clearArticleCache(version.article_id);
      
      return { 
        success: data.success, 
        message: data.message,
        branchVersionId: data.branch_version_id 
      };
    } catch (error) {
      console.error('创建分支版本失败:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '创建分支版本失败' 
      };
    }
  }

  /**
   * 获取版本的标签列表
   * @param versionId 版本ID
   * @returns 标签列表
   */
  async getVersionTags(versionId: string): Promise<{ id: string; name: string }[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // 查询版本标签
      const { data, error } = await supabase
        .from('article_version_tags')
        .select(`
          tag_id,
          tag:tag_id (
            id,
            name
          )
        `)
        .eq('article_version_id', versionId);
      
      if (error) {
        throw new Error(`获取版本标签失败: ${error.message}`);
      }
      
      return (data || []).map((item: { tag_id: string; tag: { id: string; name: string }[] }) => ({
        id: item.tag_id,
        name: Array.isArray(item.tag) && item.tag.length > 0 && item.tag[0] ? item.tag[0].name : ''
      }));
    } catch (error) {
      console.error('获取版本标签失败:', error);
      return [];
    }
  }

  /**
   * 创建自定义版本记录
   * @param articleId 文章ID
   * @param changeSummary 变更摘要
   * @returns 新创建的版本
   */
  async createCustomVersion(articleId: string, changeSummary: string): Promise<ArticleVersion> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
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
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data: maxVersionData } = await supabase
        .from('article_versions')
        .select('version_number')
        .eq('article_id', articleId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      
      const newVersionNumber = (maxVersionData?.version_number || 0) + 1;
      
      // 创建新版本记录
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
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
          is_published: articleData.published,
          author_id: articleData.author_id
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
