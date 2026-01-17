import { BaseService } from './baseService';

/**
 * 文章可见性类型
 */
export enum ArticleVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}

/**
 * 文章接口
 */
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  visibility: ArticleVisibility;
}

/**
 * 将标题转换为 Slug（用于 URL 和锚点）
 * @param title 标题文本
 * @returns Slug 字符串
 */
function titleToSlug (title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 移除特殊字符
    .replace(/[^\w\s-]/g, '')
    // 替换空格和下划线为连字符
    .replace(/[\s_]+/g, '-')
    // 移除首尾连字符
    .replace(/^-+|-+$/g, '');
}

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
    } catch {
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
    } catch {
      return [];
    }
  }

  /**
   * 创建文章
   * @param title 文章标题
   * @param content 文章内容
   * @param visibility 文章可见性
   * @param authorName 作者名称
   */
  async createArticle ({
    title,
    content,
    visibility = 'public',
    authorName
  }: {
    title: string;
    content: string;
    visibility?: 'public' | 'unlisted';
    authorName?: string;
  }): Promise<Article | null> {
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
        content,
        'author_name': authorName || 'Anonymous',
        visibility
      };

      const article = await this.create<Article>(this.TABLE_NAME, articleData);

      if (!article) {
        throw new Error('Failed to create article');
      }

      return article;
    } catch {
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
   */
  async updateArticle ({
    id,
    title,
    content,
    visibility,
    authorName
  }: {
    id: string;
    title: string;
    content: string;
    visibility?: 'public' | 'unlisted';
    authorName?: string;
  }): Promise<Article | null> {
    const now = new Date();
    const nowISO = now.toISOString();

    // 构建更新对象
    const updateData: Record<string, unknown> = {
      title,
      'slug': titleToSlug(title),
      content,
      'updated_at': nowISO
    };

    // 添加可选字段
    if (visibility !== undefined) {
      updateData.visibility = visibility;
    }
    if (authorName !== undefined) {
      updateData.author_name = authorName;
    }

    try {
      // 更新文章
      const article = await this.update<Article>(this.TABLE_NAME, id, updateData);

      if (!article) {
        throw new Error('Article not found');
      }

      return article;
    } catch {
      return null;
    }
  }

  /**
   * 删除文章
   * @param id 文章ID
   */
  async deleteArticle (id: string): Promise<boolean> {
    return this.delete(this.TABLE_NAME, id);
  }
}

// 导出单例实例
export const articleService = new ArticleService();
