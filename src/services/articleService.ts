import { BaseService } from './baseService';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'unlisted';
}

function titleToSlug (): string {
  return `article-${Date.now().toString(36)
    .substr(2, 9)}`;
}

export class ArticleService extends BaseService {
  private readonly TABLE_NAME = 'articles';

  async getArticleById (id: string): Promise<Article | null> {
    return this.getById<Article>(this.TABLE_NAME, id);
  }

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
    const slug = titleToSlug();

    try {
      const existingArticle = await this.getArticleBySlug(slug);
      const finalSlug = existingArticle ? `${slug}-${Date.now().toString(36)
        .substr(2, 9)}` : slug;

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
}

export const articleService = new ArticleService();
