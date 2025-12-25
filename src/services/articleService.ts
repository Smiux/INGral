import { BaseService } from './baseService';
import type { Article, ArticleLink } from '../types/index';
import { extractWikiLinks, titleToSlug, extractFormulas } from '../utils/markdown';
import { calculateEditLimitStatus, buildUpdateWithEditLimit } from '../utils/editLimitUtils';
import { validateTitle, validateContent, validateAuthorInfo, validateVisibility } from '../utils/inputValidation';

/**
 * 文章服务类，处理文章相关操作
 */
export class ArticleService extends BaseService {
  private readonly TABLE_NAME = 'articles';

  /**
   * 按ID获取文章
   * @param id 文章ID
   */
  async getArticleById (id: string): Promise<Article | null> {
    return this.getById<Article>(this.TABLE_NAME, id);
  }

  /**
   * 按Slug获取文章
   * @param slug 文章Slug
   */
  async getArticleBySlug (slug: string): Promise<Article | null> {
    try {
      const result = await this.supabase.from(this.TABLE_NAME).select('*')
        .eq('slug', slug)
        .single<Article>();
      return result.data;
    } catch (error) {
      this.handleError(error, 'ArticleService', '按Slug获取文章');
      return null;
    }
  }

  /**
   * 按标题获取文章
   * @param title 文章标题
   */
  async getArticleByTitle (title: string): Promise<Article | null> {
    try {
      const result = await this.supabase.from(this.TABLE_NAME).select('*')
        .ilike('title', `%${title}%`)
        .limit(1)
        .single<Article>();
      return result.data;
    } catch (error) {
      this.handleError(error, 'ArticleService', '按标题获取文章');
      return null;
    }
  }

  /**
   * 获取所有文章
   * @param filterPublic 是否只获取公开文章
   */
  async getAllArticles (filterPublic: boolean = false): Promise<Article[]> {
    try {
      let query = this.supabase.from(this.TABLE_NAME).select('*');

      if (filterPublic) {
        query = query.eq('visibility', 'public');
      }

      const result = await query;
      return result.data || [];
    } catch (error) {
      this.handleError(error, 'ArticleService', '获取所有文章');
      return [];
    }
  }

  /**
   * 创建文章
   * @param title 文章标题
   * @param content 文章内容
   * @param visibility 文章可见性
   * @param authorName 作者名称
   * @param authorEmail 作者邮箱
   * @param authorUrl 作者URL
   */
  async createArticle ({
    title,
    content,
    visibility = 'public',
    authorName,
    authorEmail,
    authorUrl
  }: {
    title: string;
    content: string;
    visibility?: 'public' | 'unlisted';
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
  }): Promise<Article | null> {
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

    const authorValidation = validateAuthorInfo({ 'name': authorName, 'email': authorEmail, 'url': authorUrl });
    if (!authorValidation.isValid) {
      throw new Error(authorValidation.message);
    }

    // 使用清理后的内容
    const sanitizedContent = contentValidation.content;

    // 生成文章slug
    const slug = titleToSlug(title);

    try {
      // 检查slug是否已存在
      const existingArticle = await this.getArticleBySlug(slug);
      const finalSlug = existingArticle ? `${slug}-${Date.now().toString(36)
        .substr(2, 9)}` : slug;

      // 创建文章
      const articleData = {
        title,
        'slug': finalSlug,
        'content': sanitizedContent,
        'author_name': authorName || 'Anonymous',
        'author_email': authorEmail || null,
        'author_url': authorUrl || null,
        visibility,
        'status': 'published',
        'version': 1
      };

      const article = await this.create<Article>(this.TABLE_NAME, articleData);

      if (!article) {
        throw new Error('Failed to create article');
      }

      // 创建初始版本记录
      await this.supabase.from('article_versions').insert({
        'article_id': article.id,
        'version_number': 1,
        title,
        'content': sanitizedContent,
        'metadata': {
          visibility,
          'author_name': authorName || 'Anonymous',
          'author_email': authorEmail || null,
          'author_url': authorUrl || null
        },
        'author_id': 'user',
        'change_summary': '初始版本',
        'is_published': true
      });

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
        article.formulas = formulas;
      }

      return article;
    } catch (err) {
      this.handleError(err, 'ArticleService', '创建文章');
      return null;
    }
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
   */
  async updateArticle ({
    id,
    title,
    content,
    visibility,
    authorName,
    authorEmail,
    authorUrl
  }: {
    id: string;
    title: string;
    content: string;
    visibility?: 'public' | 'unlisted';
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
  }): Promise<Article | null> {
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

    const authorValidation = validateAuthorInfo({ 'name': authorName, 'email': authorEmail, 'url': authorUrl });
    if (!authorValidation.isValid) {
      throw new Error(authorValidation.message);
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
    const editLimitStatus = calculateEditLimitStatus({
      'currentEditCount24h': currentArticle?.edit_count_24h || 0,
      'currentEditCount7d': currentArticle?.edit_count_7d || 0,
      'lastEditDate': currentArticle?.last_edit_date ?? null
    });

    // 构建基础更新对象
    const baseUpdateData: Record<string, unknown> = {
      title,
      'slug': titleToSlug(title),
      'content': sanitizedContent,
      'updated_at': nowISO,
      'is_offline': isOfflineArticle,
      'synced': false,
      'last_modified': nowISO
    };

    // 构建包含编辑限制字段的更新对象
    const updateData: Record<string, unknown> = buildUpdateWithEditLimit(baseUpdateData, editLimitStatus);

    // 添加可选字段
    if (visibility !== undefined) {
      updateData.visibility = visibility;
    }
    if (authorName !== undefined) {
      updateData.author_name = authorName;
    }
    if (authorEmail !== undefined) {
      updateData.author_email = authorEmail;
    }
    if (authorUrl !== undefined) {
      updateData.author_url = authorUrl;
    }
    // 确保状态字段存在，默认保持published状态
    updateData.status = 'published';

    try {
      // 如果不是离线文章，获取当前文章信息以计算编辑限制
      if (!isOfflineArticle) {
        // 1. 获取当前文章内容，创建版本快照
        const latestArticle = await this.getArticleById(id);
        if (latestArticle) {
          // 获取当前最大版本号
          const versionResult = await this.supabase.from('article_versions')
            .select('version_number')
            .eq('article_id', id)
            .order('version_number', { 'ascending': false })
            .limit(1)
            .maybeSingle();
          const maxVersion = versionResult?.data?.version_number || 0;

          // 创建版本快照
          await this.supabase.from('article_versions').insert({
            'article_id': id,
            'version_number': maxVersion + 1,
            'title': latestArticle.title,
            'content': latestArticle.content,
            'metadata': {
              'visibility': latestArticle.visibility,
              'author_name': latestArticle.author_name,
              'author_email': latestArticle.author_email,
              'author_url': latestArticle.author_url
            },
            'author_id': 'user',
            'change_summary': '自动保存版本',
            'is_published': latestArticle.status === 'published'
          });
        }

        // 2. 更新文章
        const article = await this.update<Article>(this.TABLE_NAME, id, updateData);

        if (!article) {
          throw new Error('Article not found');
        }

        // 3. 处理文章链接更新
        await this.updateArticleLinks(id, content);

        // 4. 提取并处理数学公式
        const formulas = extractFormulas(content);
        if (formulas.length > 0) {
          article.formulas = formulas;
        }

        return article;
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
  async deleteArticle (id: string): Promise<boolean> {
    return this.delete(this.TABLE_NAME, id);
  }

  /**
   * 创建文章链接
   * @param sourceId 源文章ID
   * @param targetId 目标文章ID
   * @param type 关系类型
   */
  async createArticleLink (
    sourceId: string,
    targetId: string,
    type = 'related'
  ): Promise<ArticleLink | null> {
    const tableName = 'article_links';

    // 检查是否已存在相同的链接
    const existingLink = await this.supabase.from(tableName)
      .select('*')
      .eq('source_id', sourceId)
      .eq('target_id', targetId)
      .eq('relationship_type', type)
      .maybeSingle<ArticleLink>();

    if (existingLink.data) {
      return existingLink.data;
    }

    // 创建新链接
    const linkData = {
      'source_id': sourceId,
      'target_id': targetId,
      'relationship_type': type
    };

    return this.create<ArticleLink>(tableName, linkData);
  }

  /**
   * 更新文章链接
   * @param articleId 文章ID
   * @param content 文章内容
   */
  async updateArticleLinks (articleId: string, content: string): Promise<void> {
    try {
      // 删除所有源为该文章的旧链接
      await this.supabase.from('article_links').delete()
        .eq('source_id', articleId);

      // 提取新链接并添加
      const links = extractWikiLinks(content);
      for (const linkedTitle of links) {
        const linkedArticle = await this.getArticleByTitle(linkedTitle);
        if (linkedArticle && linkedArticle.id !== articleId) {
          await this.createArticleLink(articleId, linkedArticle.id, 'referenced');
        }
      }
    } catch (err) {
      this.handleError(err, 'ArticleService', '更新文章链接');
    }
  }

  /**
   * 获取文章链接
   * @param articleId 文章ID
   */
  async getArticleLinks (articleId: string): Promise<ArticleLink[]> {
    try {
      const result = await this.supabase.from('article_links').select('*')
        .eq('source_id', articleId);
      return result.data || [];
    } catch (error) {
      this.handleError(error, 'ArticleService', '获取文章链接');
      return [];
    }
  }

  /**
   * 移除文章所有链接
   * @param articleId 文章ID
   */
  async removeAllArticleLinks (articleId: string): Promise<boolean> {
    try {
      await this.supabase.from('article_links')
        .delete()
        .or(`source_id.eq.${articleId},target_id.eq.${articleId}`);

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
  async searchArticles (
    query: string,
    limit = 10,
    offset = 0
  ): Promise<Article[]> {
    try {
      const result = await this.supabase.from(this.TABLE_NAME)
        .select('*')
        .textSearch('title', query, { 'config': 'english' })
        .limit(limit)
        .range(offset, offset + limit - 1)
        .order('updated_at', { 'ascending': false });

      return result.data || [];
    } catch (error) {
      this.handleError(error, 'ArticleService', '搜索文章');
      return [];
    }
  }

  /**
   * 更新文章阅读计数
   * @param articleId 文章ID
   */
  async updateArticleViewCount (articleId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_article_views', { 'article_id': articleId });
    } catch (err) {
      console.warn('Failed to update article view count:', err);
    }
  }

  /**
   * 点赞文章
   * @param articleId 文章ID
   */
  async upvoteArticle (articleId: string): Promise<boolean> {
    try {
      // 更新articles表的upvotes字段
      await this.supabase.from(this.TABLE_NAME)
        .update({ 'upvotes': 'upvotes + 1' })
        .eq('id', articleId);

      // 记录交互
      await this.supabase.from('article_interactions')
        .insert({
          'article_id': articleId,
          'interaction_type': 'upvote'
        });

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
  async downvoteArticle (articleId: string): Promise<boolean> {
    try {
      // 更新articles表的upvotes字段
      await this.supabase.from(this.TABLE_NAME)
        .update({ 'upvotes': 'GREATEST(upvotes - 1, 0)' })
        .eq('id', articleId);

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
  async bookmarkArticle (articleId: string): Promise<boolean> {
    try {
      // 记录收藏交互
      await this.supabase.from('article_interactions')
        .insert({
          'article_id': articleId,
          'interaction_type': 'bookmark'
        });

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
  async unbookmarkArticle (articleId: string): Promise<boolean> {
    try {
      // 删除收藏交互
      await this.supabase.from('article_interactions')
        .delete()
        .eq('article_id', articleId)
        .eq('interaction_type', 'bookmark');

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
  async isArticleBookmarked (articleId: string): Promise<boolean> {
    try {
      const result = await this.supabase.from('article_interactions')
        .select('id')
        .eq('article_id', articleId)
        .eq('interaction_type', 'bookmark')
        .maybeSingle();

      return result.data !== null;
    } catch (err) {
      this.handleError(err, 'ArticleService', '检查文章收藏状态');
      return false;
    }
  }
}

// 导出单例实例
export const articleService = new ArticleService();
