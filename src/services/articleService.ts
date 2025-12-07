import { BaseService } from './baseService';
import type { Article, ArticleLink } from '../types/index';
import { extractWikiLinks, titleToSlug, extractFormulas } from '../utils/markdown';
import { calculateEditLimitStatus, buildUpdateWithEditLimit } from '../utils/editLimitUtils';
import { validateTitle, validateContent, validateAuthorInfo, validateVisibility, validateTags } from '../utils/inputValidation';

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
    return this.getByField<Article>(this.TABLE_NAME, 'slug', slug, this.CACHE_PREFIX, 5 * 60 * 1000);
  }

  /**
   * 按标题获取文章
   * @param title 文章标题
   */
  async getArticleByTitle(title: string): Promise<Article | null> {
    const cacheKey = this.generateCacheKey(this.CACHE_PREFIX, 'title', title.toLowerCase().trim());
    
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
    // 验证输入
    const titleValidation = validateTitle(title);
    if (!titleValidation.isValid) {
      throw new Error(titleValidation.message);
    }
    
    const contentValidation = validateContent(content);
    if (!contentValidation.isValid) {
      throw new Error(contentValidation.message);
    }
    
    const visibilityValidation = validateVisibility(visibility);
    if (!visibilityValidation.isValid) {
      throw new Error(visibilityValidation.message);
    }
    
    const authorValidation = validateAuthorInfo({ name: authorName, email: authorEmail, url: authorUrl });
    if (!authorValidation.isValid) {
      throw new Error(authorValidation.message);
    }
    
    const tagsValidation = validateTags(tags);
    if (!tagsValidation.isValid) {
      throw new Error(tagsValidation.message);
    }
    
    // 使用清理后的内容
    const sanitizedContent = contentValidation.content;
    
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
          content: sanitizedContent,
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
          article.formulas = formulas;
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
    // 验证输入
    const titleValidation = validateTitle(title);
    if (!titleValidation.isValid) {
      throw new Error(titleValidation.message);
    }
    
    const contentValidation = validateContent(content);
    if (!contentValidation.isValid) {
      throw new Error(contentValidation.message);
    }
    
    if (visibility !== undefined) {
      const visibilityValidation = validateVisibility(visibility);
      if (!visibilityValidation.isValid) {
        throw new Error(visibilityValidation.message);
      }
    }
    
    const authorValidation = validateAuthorInfo({ name: authorName, email: authorEmail, url: authorUrl });
    if (!authorValidation.isValid) {
      throw new Error(authorValidation.message);
    }
    
    const tagsValidation = validateTags(tags);
    if (!tagsValidation.isValid) {
      throw new Error(tagsValidation.message);
    }
    
    // 使用清理后的内容
    const sanitizedContent = contentValidation.content;
    
    const now = new Date();
    const nowISO = now.toISOString();
    const isOfflineArticle = id.startsWith('temp_');

    // 如果不是离线文章，获取当前文章信息以计算编辑限制
    let currentArticle: Article | null = null;
    if (!isOfflineArticle) {
      currentArticle = await this.getArticleById(id);
    }

    // 计算编辑限制状态
    const editLimitStatus = calculateEditLimitStatus(
      currentArticle?.edit_count_24h || 0,
      currentArticle?.edit_count_7d || 0,
      currentArticle?.last_edit_date
    );

    // 构建基础更新对象
    const baseUpdateData: Record<string, unknown> = {
      title,
      slug: titleToSlug(title),
      content: sanitizedContent,
      updated_at: nowISO,
      is_offline: isOfflineArticle,
      synced: false,
      last_modified: nowISO
    };

    // 构建包含编辑限制字段的更新对象
    const updateData: Record<string, unknown> = buildUpdateWithEditLimit(baseUpdateData, editLimitStatus);

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
            article.formulas = formulas;
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

  /**
   * 点赞文章
   * @param articleId 文章ID
   */
  async upvoteArticle(articleId: string): Promise<boolean> {
    try {
      // 更新articles表的upvotes字段
      await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME)
          .update({ upvotes: `upvotes + 1` })
          .eq('id', articleId);
      }, 5 * 60 * 1000);

      // 记录交互
      await this.executeWithRetry(async () => {
        return this.supabase.from('article_interactions')
          .insert({
            article_id: articleId,
            interaction_type: 'upvote'
          });
      }, 5 * 60 * 1000);

      // 清除相关缓存
      this.invalidateCache(`article:id:${articleId}`);
      this.invalidateCache('article:slug:*');

      return true;
    } catch (err) {
      this.handleError(err, 'ArticleService', '点赞文章');
      return false;
    }
  }

  /**
   * 取消点赞文章
   * @param articleId 文章ID
   */
  async downvoteArticle(articleId: string): Promise<boolean> {
    try {
      // 更新articles表的upvotes字段
      await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME)
          .update({ upvotes: `GREATEST(upvotes - 1, 0)` })
          .eq('id', articleId);
      }, 5 * 60 * 1000);

      // 清除相关缓存
      this.invalidateCache(`article:id:${articleId}`);
      this.invalidateCache('article:slug:*');

      return true;
    } catch (err) {
      this.handleError(err, 'ArticleService', '取消点赞文章');
      return false;
    }
  }

  /**
   * 收藏文章
   * @param articleId 文章ID
   */
  async bookmarkArticle(articleId: string): Promise<boolean> {
    try {
      // 记录收藏交互
      await this.executeWithRetry(async () => {
        return this.supabase.from('article_interactions')
          .insert({
            article_id: articleId,
            interaction_type: 'bookmark'
          });
      }, 5 * 60 * 1000);

      // 清除相关缓存
      this.invalidateCache(`article:id:${articleId}`, `${this.CACHE_PREFIX}:bookmarked:${articleId}`);

      return true;
    } catch (err) {
      this.handleError(err, 'ArticleService', '收藏文章');
      return false;
    }
  }

  /**
   * 取消收藏文章
   * @param articleId 文章ID
   */
  async unbookmarkArticle(articleId: string): Promise<boolean> {
    try {
      // 删除收藏交互
      await this.executeWithRetry(async () => {
        return this.supabase.from('article_interactions')
          .delete()
          .eq('article_id', articleId)
          .eq('interaction_type', 'bookmark');
      }, 5 * 60 * 1000);

      // 清除相关缓存
      this.invalidateCache(`article:id:${articleId}`, `${this.CACHE_PREFIX}:bookmarked:${articleId}`);

      return true;
    } catch (err) {
      this.handleError(err, 'ArticleService', '取消收藏文章');
      return false;
    }
  }

  /**
   * 检查文章是否被当前用户收藏
   * @param articleId 文章ID
   */
  async isArticleBookmarked(articleId: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(this.CACHE_PREFIX, 'bookmarked', articleId);
    
    return this.queryWithCache<boolean>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        const result = await this.executeWithRetry(async () => {
          return this.supabase.from('article_interactions')
            .select('id')
            .eq('article_id', articleId)
            .eq('interaction_type', 'bookmark')
            .maybeSingle();
        }, 5 * 60 * 1000);

        return result.data !== null;
      } catch (err) {
        this.handleError(err, 'ArticleService', '检查文章收藏状态');
        return false;
      }
    });
  }
}

// 导出单例实例
export const articleService = new ArticleService();
