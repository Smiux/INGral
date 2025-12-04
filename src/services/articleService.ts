import { BaseService } from './baseService';
import type { Article, ArticleLink } from '../types/index';
import { extractWikiLinks, titleToSlug, extractFormulas } from '../utils/markdown';

/**
 * 文章服务类，处理文章相关操作
 */
export class ArticleService extends BaseService {
  private readonly TABLE_NAME = 'articles';
  private readonly CACHE_PREFIX = 'article';

  /**
   * 按ID获取文章
   * @param id 文章ID
   */
  async getArticleById(id: string): Promise<Article | null> {
    return this.getById<Article>(this.TABLE_NAME, id, this.CACHE_PREFIX, 5 * 60 * 1000);
  }

  /**
   * 按Slug获取文章
   * @param slug 文章Slug
   */
  async getArticleBySlug(slug: string): Promise<Article | null> {
    const cacheKey = `${this.CACHE_PREFIX}:slug:${slug}`;
    
    return this.queryWithCache<Article | null>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME).select('*').eq('slug', slug).single<Article>();
      }, 5 * 60 * 1000);
      
      return result.data;
    });
  }

  /**
   * 按标题获取文章
   * @param title 文章标题
   */
  async getArticleByTitle(title: string): Promise<Article | null> {
    const cacheKey = `${this.CACHE_PREFIX}:title:${title.toLowerCase().trim()}`;
    
    return this.queryWithCache<Article | null>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME).select('*').ilike('title', `%${title}%`).limit(1).single<Article>();
      }, 5 * 60 * 1000);
      
      return result.data;
    });
  }

  /**
   * 获取所有文章
   * @param filterPublic 是否只获取公开文章
   * @param tagId 标签ID（可选）
   */
  async getAllArticles(filterPublic: boolean = false, tagId?: string): Promise<Article[]> {
    if (tagId) {
      return this.getArticlesByTag(tagId, filterPublic);
    }
    
    const params = filterPublic ? { visibility: 'public' } : undefined;
    return this.getList<Article>(this.TABLE_NAME, this.CACHE_PREFIX, params, 5 * 60 * 1000);
  }

  /**
   * 按标签获取文章
   * @param tagId 标签ID
   * @param filterPublic 是否只获取公开文章
   */
  async getArticlesByTag(tagId: string, filterPublic: boolean = false): Promise<Article[]> {
    const cacheKey = `${this.CACHE_PREFIX}:tag:${tagId}:${filterPublic ? 'public' : 'all'}`;
    
    return this.queryWithCache<Article[]>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        let query = this.supabase.from('article_tags')
          .select('article:article_id(*)');
        
        // 应用标签过滤
        query = query.eq('tag_id', tagId);
        
        return query;
      }, 5 * 60 * 1000);
      
      const articlesWithTags = result.data || [];
      let articles = articlesWithTags
        .filter((item) => item?.article !== undefined && typeof item.article === 'object' && !Array.isArray(item.article))
        .map((item) => {
          const article = item.article as unknown;
          return article as Article;
        });
      
      // 如果需要过滤公共文章
      if (filterPublic) {
        articles = articles.filter(article => article.visibility === 'public');
      }
      
      return articles;
    });
  }

  /**
   * 创建文章
   * @param title 文章标题
   * @param content 文章内容
   * @param visibility 文章可见性
   * @param authorName 作者名称
   * @param authorEmail 作者邮箱
   * @param authorUrl 作者URL
   * @param tags 标签ID数组
   */
  async createArticle(
    title: string,
    content: string,
    visibility: 'public' | 'unlisted' = 'public',
    authorName?: string,
    authorEmail?: string,
    authorUrl?: string,
    tags?: string[],
  ): Promise<Article | null> {
    // 生成文章slug
    const slug = titleToSlug(title);

    try {
      // 开始事务
      const transactionId = await this.startTransaction();

      try {
        // 检查slug是否已存在
        const existingArticle = await this.getArticleBySlug(slug);
        const finalSlug = existingArticle ? `${slug}-${Date.now().toString(36).substr(2, 9)}` : slug;

        // 创建文章
        const articleData = {
          title,
          slug: finalSlug,
          content,
          author_name: authorName || 'Anonymous',
          author_email: authorEmail || null,
          author_url: authorUrl || null,
          visibility,
        };

        const article = await this.create<Article>(this.TABLE_NAME, articleData, this.CACHE_PREFIX, 5 * 60 * 1000);
        
        if (!article) {
          throw new Error('Failed to create article');
        }

        // 如果提供了标签，处理标签关联
        if (tags && tags.length > 0) {
            for (const tagId of tags) {
              await this.executeWithRetry(async () => {
                return this.supabase.from('article_tags').insert({
                  article_id: article.id,
                  tag_id: tagId,
                });
              }, 5 * 60 * 1000);
            }
          }

        // 处理文章链接
        const links = extractWikiLinks(content);
        for (const linkedTitle of links) {
          const linkedArticle = await this.getArticleByTitle(linkedTitle);
          if (linkedArticle && linkedArticle.id !== article.id) {
            await this.createArticleLink(article.id, linkedArticle.id, 'referenced');
          }
        }

        // 提取并处理数学公式
        const formulas = extractFormulas(content);
        if (formulas.length > 0) {
          // 这里可以添加公式存储逻辑，目前我们将公式添加到article对象中
          (article as any).formulas = formulas;
        }

        // 提交事务
        await this.commitTransaction(transactionId);

        // 清除相关缓存
        this.invalidateCache('articles:all:*');
        this.invalidateCache('user:articles:*');

        return article;
      } catch (err) {
        // 回滚事务
        await this.rollbackTransaction();
        this.handleError(err, 'ArticleService', '创建文章');
      }
    } catch (err) {
      this.handleError(err, 'ArticleService', '创建文章');
    }
    
    return null;
  }

  /**
   * 更新文章
   * @param id 文章ID
   * @param title 文章标题
   * @param content 文章内容
   * @param visibility 文章可见性
   * @param authorName 作者名称
   * @param authorEmail 作者邮箱
   * @param authorUrl 作者URL
   * @param tags 标签ID数组
   */
  async updateArticle(
    id: string,
    title: string,
    content: string,
    visibility?: 'public' | 'unlisted',
    authorName?: string,
    authorEmail?: string,
    authorUrl?: string,
    tags?: string[],
  ): Promise<Article | null> {
    const now = new Date();
    const nowISO = now.toISOString();
    const isOfflineArticle = id.startsWith('temp_');

    // 如果不是离线文章，获取当前文章信息以计算编辑限制
    let currentArticle: Article | null = null;
    if (!isOfflineArticle) {
      currentArticle = await this.getArticleById(id);
    }

    // 计算编辑计数
    const editCount24h = (currentArticle?.edit_count_24h || 0) + 1;
    const editCount7d = (currentArticle?.edit_count_7d || 0) + 1;

    // 计算是否在24小时内和7天内
    const lastEditDate = currentArticle?.last_edit_date ? new Date(currentArticle.last_edit_date) : null;
    const isWithin24h = lastEditDate && (now.getTime() - lastEditDate.getTime() < 24 * 60 * 60 * 1000);
    const isWithin7d = lastEditDate && (now.getTime() - lastEditDate.getTime() < 7 * 24 * 60 * 60 * 1000);

    // 重置计数逻辑
    const finalEditCount24h = isWithin24h ? editCount24h : 1;
    const finalEditCount7d = isWithin7d ? editCount7d : 1;

    // 确定编辑限制状态
    const isChangePublic = finalEditCount24h > 3;
    const isSlowMode = finalEditCount24h > 3;
    const isUnstable = finalEditCount7d > 10;
    const slowModeUntil = isSlowMode ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined;

    // 构建更新对象
    const updateData: Record<string, unknown> = {
      title,
      slug: titleToSlug(title),
      content,
      updated_at: nowISO,
      is_offline: isOfflineArticle,
      synced: false,
      last_modified: nowISO,
      // 编辑限制相关字段
      edit_count_24h: finalEditCount24h,
      edit_count_7d: finalEditCount7d,
      last_edit_date: nowISO,
      is_change_public: isChangePublic,
      is_slow_mode: isSlowMode,
      slow_mode_until: slowModeUntil,
      is_unstable: isUnstable,
    };

    // 添加可选字段
    if (visibility !== undefined) updateData.visibility = visibility;
    if (authorName !== undefined) updateData.author_name = authorName;
    if (authorEmail !== undefined) updateData.author_email = authorEmail;
    if (authorUrl !== undefined) updateData.author_url = authorUrl;

    try {
      // 如果不是离线文章，尝试更新到数据库
      if (!isOfflineArticle) {
        // 开始事务
        const transactionId = await this.startTransaction();

        try {
          // 更新文章
          const article = await this.update<Article>(this.TABLE_NAME, id, updateData, this.CACHE_PREFIX, 5 * 60 * 1000);
          
          if (!article) {
            throw new Error('Article not found');
          }

          // 如果提供了标签，更新文章标签
          if (tags !== undefined) {
            // 首先删除所有现有标签
            await this.executeWithRetry(async () => {
              return this.supabase.from('article_tags').delete().eq('article_id', id);
            }, 5 * 60 * 1000);

            // 然后添加新标签
            if (tags.length > 0) {
              for (const tagId of tags) {
                await this.executeWithRetry(async () => {
                  return this.supabase.from('article_tags').insert({
                    article_id: id,
                    tag_id: tagId,
                  });
                }, 5 * 60 * 1000);
              }
            }
          }

          // 处理文章链接更新
          await this.updateArticleLinks(id, content);

          // 提取并处理数学公式
          const formulas = extractFormulas(content);
          if (formulas.length > 0) {
            (article as any).formulas = formulas;
          }

          // 提交事务
          await this.commitTransaction(transactionId);

          // 清除相关缓存
          this.invalidateCache(`article:id:${id}`);
          this.invalidateCache('article:slug:*');
          this.invalidateCache('articles:all:*');
          this.invalidateCache('user:articles:*');

          return article;
        } catch (dbError) {
          // 回滚事务
          await this.rollbackTransaction();
          this.handleError(dbError, 'ArticleService', '更新文章');
        }
      }
    } catch (err) {
      this.handleError(err, 'ArticleService', '更新文章');
    }
    
    return null;
  }

  /**
   * 删除文章
   * @param id 文章ID
   */
  async deleteArticle(id: string): Promise<boolean> {
    return this.delete(this.TABLE_NAME, id, this.CACHE_PREFIX);
  }

  /**
   * 创建文章链接
   * @param sourceId 源文章ID
   * @param targetId 目标文章ID
   * @param type 关系类型
   */
  async createArticleLink(
    sourceId: string,
    targetId: string,
    type = 'related',
  ): Promise<ArticleLink | null> {
    const tableName = 'article_links';
    const cachePrefix = 'article_link';

    // 检查是否已存在相同的链接
    const existingLink = await this.executeWithRetry(async () => {
          return this.supabase.from(tableName)
            .select('*')
            .eq('source_id', sourceId)
            .eq('target_id', targetId)
            .eq('relationship_type', type)
            .maybeSingle<ArticleLink>();
        }, 10 * 60 * 1000);

    if (existingLink.data) {
      return existingLink.data;
    }

    // 创建新链接
    const linkData = {
      source_id: sourceId,
      target_id: targetId,
      relationship_type: type,
    };

    return this.create<ArticleLink>(tableName, linkData, cachePrefix, 10 * 60 * 1000);
  }

  /**
   * 更新文章链接
   * @param articleId 文章ID
   * @param content 文章内容
   */
  async updateArticleLinks(articleId: string, content: string): Promise<void> {
    try {
      // 开始事务
      const transactionId = await this.startTransaction();

      try {
        // 删除所有源为该文章的旧链接
        await this.executeWithRetry(async () => {
          return this.supabase.from('article_links').delete().eq('source_id', articleId);
        }, 10 * 60 * 1000);

        // 提取新链接并添加
        const links = extractWikiLinks(content);
        for (const linkedTitle of links) {
          const linkedArticle = await this.getArticleByTitle(linkedTitle);
          if (linkedArticle && linkedArticle.id !== articleId) {
            await this.createArticleLink(articleId, linkedArticle.id, 'referenced');
          }
        }

        // 提交事务
        await this.commitTransaction(transactionId);

        // 清除文章链接缓存
        this.invalidateCache(`article:links:${articleId}`);
      } catch (err) {
        // 回滚事务
        await this.rollbackTransaction();
        this.handleError(err, 'ArticleService', '更新文章链接');
      }
    } catch (err) {
      this.handleError(err, 'ArticleService', '更新文章链接');
    }
  }

  /**
   * 获取文章链接
   * @param articleId 文章ID
   */
  async getArticleLinks(articleId: string): Promise<ArticleLink[]> {
    const cacheKey = `article:links:${articleId}`;
    
    return this.queryWithCache<ArticleLink[]>(cacheKey, 10 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from('article_links').select('*').eq('source_id', articleId);
      }, 10 * 60 * 1000);
      
      return result.data || [];
    });
  }

  /**
   * 移除文章所有链接
   * @param articleId 文章ID
   */
  async removeAllArticleLinks(articleId: string): Promise<boolean> {
    try {
      await this.executeWithRetry(async () => {
          return this.supabase.from('article_links')
            .delete()
            .or(`source_id.eq.${articleId},target_id.eq.${articleId}`);
        }, 10 * 60 * 1000);

      // 清除文章链接缓存
      this.invalidateCache('article:links:*');

      return true;
    } catch (err) {
      this.handleError(err, 'ArticleService', '移除文章链接');
      return false;
    }
  }

  /**
   * 搜索文章
   * @param query 搜索关键词
   * @param limit 限制数量
   * @param offset 偏移量
   */
  async searchArticles(
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<Article[]> {
    const cacheKey = `articles:search:${query.toLowerCase()}:${limit}:${offset}`;
    
    return this.queryWithCache<Article[]>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME)
          .select('*')
          .textSearch('title', query, { config: 'english' })
          .limit(limit)
          .range(offset, offset + limit - 1)
          .order('updated_at', { ascending: false });
      }, 5 * 60 * 1000);
      
      return result.data || [];
    });
  }

  /**
   * 更新文章阅读计数
   * @param articleId 文章ID
   */
  async updateArticleViewCount(articleId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_article_views', { article_id: articleId });
      // 清除相关缓存
      this.invalidateCache(`article:id:${articleId}`);
      this.invalidateCache('article:slug:*');
    } catch (err) {
      console.warn('Failed to update article view count:', err);
    }
  }
}

// 导出单例实例
export const articleService = new ArticleService();
