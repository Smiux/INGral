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
  private readonly VERSIONS_TABLE = 'article_versions';
  private readonly CACHE_PREFIX = 'version';

  /**
   * 获取文章版本列表
   * @param params 获取文章版本参数
   * @returns 版本历史结果
   */
  async getArticleVersions(params: GetArticleVersionsParams): Promise<VersionHistoryResult> {
    const { articleId, page = 1, limit = 20 } = params;
    const cacheKey = `${this.CACHE_PREFIX}:article:${articleId}:${page}:${limit}`;

    return this.queryWithCache<VersionHistoryResult>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        // 计算偏移量
        const offset = (page - 1) * limit;
        
        // 获取版本总数
        const countResult = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.VERSIONS_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('article_id', articleId);
        }, 5 * 60 * 1000);
        
        const total = countResult.count || 0;
        
        // 获取版本列表
        const versionsResult = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.VERSIONS_TABLE)
            .select('*')
            .eq('article_id', articleId)
            .order('version_number', { ascending: false })
            .range(offset, offset + limit - 1);
        }, 5 * 60 * 1000);
        
        const versions = versionsResult.data || [];
        
        return {
          versions,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      } catch (error) {
        this.handleError(error, '获取文章版本列表', 'VersionHistoryService');
        return {
          versions: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    });
  }

  /**
   * 根据ID获取版本
   * @param versionId 版本ID
   * @returns 文章版本
   */
  async getVersionById(versionId: string): Promise<ArticleVersion | null> {
    const cacheKey = `${this.CACHE_PREFIX}:id:${versionId}`;

    return this.queryWithCache<ArticleVersion | null>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase
            .from(this.VERSIONS_TABLE)
            .select('*')
            .eq('id', versionId)
            .single<ArticleVersion>();
        }, 5 * 60 * 1000);
        
        return result.data;
      } catch (error) {
        this.handleError(error, '根据ID获取版本', 'VersionHistoryService');
        return null;
      }
    });
  }

  /**
   * 比较两个版本的差异
   * @param versionIdA 版本ID A
   * @param versionIdB 版本ID B
   * @returns 版本差异
   */
  async compareVersions(versionIdA: string, versionIdB: string): Promise<VersionDiff | null> {
    try {
      // 获取两个版本的数据
      const [versionA, versionB] = await Promise.all([
        this.getVersionById(versionIdA),
        this.getVersionById(versionIdB)
      ]);
      
      if (!versionA || !versionB) {
        throw new Error('无法找到要比较的版本');
      }
      
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
      this.handleError(error, '比较版本差异', 'VersionHistoryService');
      return null;
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
      // 获取要还原的版本
      const versionToRestore = await this.getVersionById(versionId);
      
      if (!versionToRestore) {
        throw new Error('无法找到要还原的版本');
      }
      
      // 1. 首先获取当前文章内容，创建一个新的版本作为还原前的快照
      const currentArticleResult = await this.executeWithRetry(async () => {
        return this.supabase
          .from('articles')
          .select('*')
          .eq('id', articleId)
          .single();
      }, 5 * 60 * 1000);
      
      const currentArticle = currentArticleResult.data;
      
      if (!currentArticle) {
        throw new Error('无法找到要还原的文章');
      }
      
      // 创建还原前的快照版本
      await this.executeWithRetry(async () => {
        return this.supabase
          .from(this.VERSIONS_TABLE)
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
      }, 5 * 60 * 1000);
      
      // 2. 还原版本到文章
      await this.executeWithRetry(async () => {
        return this.supabase
          .from('articles')
          .update({
            title: versionToRestore.title,
            content: versionToRestore.content,
            metadata: versionToRestore.metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', articleId);
      }, 5 * 60 * 1000);
      
      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:article:${articleId}:*`);
      
      return true;
    } catch (error) {
      this.handleError(error, '还原版本', 'VersionHistoryService');
      return false;
    }
  }
}

// 创建单例实例
export const versionHistoryService = new VersionHistoryService();

export default versionHistoryService;
