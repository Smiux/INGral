/**
 * 版本历史服务
 * 提供版本历史管理功能
 */
import type {
  ArticleVersion,
  VersionDiff,
  VersionHistoryResult,
  GetArticleVersionsParams,
  RestoreVersionParams,
} from '../types/version';
import { BaseService } from './baseService';

/**
 * 版本历史服务类
 */
export class VersionHistoryService extends BaseService {
  /**
   * 获取文章版本列表
   * @param params 获取文章版本参数
   * @returns 版本历史结果
   */
  async getArticleVersions(params: GetArticleVersionsParams): Promise<VersionHistoryResult> {
    const { articleId, page = 1, limit = 20 } = params;

    try {
      this.checkSupabaseClient();
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 获取版本总数
      const { count: total, error: countError } = await this.supabase
        .from('article_versions')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);
      
      if (countError) {
        this.handleSupabaseError(countError, '获取版本总数');
      }
      
      // 获取版本列表
      const { data: versions, error: versionsError } = await this.supabase
        .from('article_versions')
        .select('*')
        .eq('article_id', articleId)
        .order('version_number', { ascending: false })
        .range(offset, offset + limit - 1)
        .returns<ArticleVersion[]>();
      
      if (versionsError) {
        this.handleSupabaseError(versionsError, '获取版本列表');
      }
      
      return {
        versions: versions || [],
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
      };
    } catch (error) {
      console.error('获取文章版本列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取版本
   * @param versionId 版本ID
   * @returns 文章版本
   */
  async getVersionById(versionId: string): Promise<ArticleVersion> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('article_versions')
        .select('*')
        .eq('id', versionId)
        .single<ArticleVersion>();
      
      if (error) {
        this.handleSupabaseError(error, '根据ID获取版本');
      }
      
      return data;
    } catch (error) {
      console.error('根据ID获取版本失败:', error);
      throw error;
    }
  }

  /**
   * 比较两个版本的差异
   * @param versionIdA 版本ID A
   * @param versionIdB 版本ID B
   * @returns 版本差异
   */
  async compareVersions(versionIdA: string, versionIdB: string): Promise<VersionDiff> {
    try {
      this.checkSupabaseClient();
      
      // 获取两个版本的数据
      const [versionA, versionB] = await Promise.all([
        this.getVersionById(versionIdA),
        this.getVersionById(versionIdB)
      ]);
      
      // 比较版本差异
      return {
        title: {
          old: versionA.title,
          new: versionB.title,
          changed: versionA.title !== versionB.title,
        },
        content: {
          old: versionA.content,
          new: versionB.content,
          changed: versionA.content !== versionB.content,
        },
        metadata: {
          old: versionA.metadata,
          new: versionB.metadata,
          changed: JSON.stringify(versionA.metadata) !== JSON.stringify(versionB.metadata),
        },
        versionA,
        versionB,
      };
    } catch (error) {
      console.error('比较版本差异失败:', error);
      throw error;
    }
  }

  /**
   * 还原版本
   * @param params 还原版本参数
   * @returns 是否成功
   */
  async restoreVersion(params: RestoreVersionParams): Promise<boolean> {
    const { versionId, articleId, restoreComment = '手动还原' } = params;

    try {
      this.checkSupabaseClient();
      
      // 开始事务
      const { data: versionToRestore, error: versionError } = await this.supabase
        .from('article_versions')
        .select('*')
        .eq('id', versionId)
        .single<ArticleVersion>();
      
      if (versionError) {
        this.handleSupabaseError(versionError, '获取要还原的版本');
      }
      
      // 1. 首先获取当前文章内容，创建一个新的版本作为还原前的快照
      const { data: currentArticle, error: articleError } = await this.supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
      
      if (articleError) {
        this.handleSupabaseError(articleError, '获取当前文章');
      }
      
      // 创建还原前的快照版本
      const { error: snapshotError } = await this.supabase
        .from('article_versions')
        .insert({
          article_id: articleId,
          version_number: (versionToRestore.version_number + 1),
          title: currentArticle.title,
          content: currentArticle.content,
          metadata: currentArticle.metadata,
          author_id: 'system',
          change_summary: `还原前的快照 - ${restoreComment}`,
          is_published: currentArticle.is_published,
        });
      
      if (snapshotError) {
        this.handleSupabaseError(snapshotError, '创建还原前快照');
      }
      
      // 2. 还原版本到文章
      const { error: restoreError } = await this.supabase
        .from('articles')
        .update({
          title: versionToRestore.title,
          content: versionToRestore.content,
          metadata: versionToRestore.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId);
      
      if (restoreError) {
        this.handleSupabaseError(restoreError, '还原版本到文章');
      }
      
      return true;
    } catch (error) {
      console.error('还原版本失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const versionHistoryService = new VersionHistoryService();

export default versionHistoryService;
