import { supabase } from './supabaseClient';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  cover_image: string | null;
  summary: string | null;
  tags: string[] | null;
}

export interface ArticleWithContent extends Article {
  content: string;
}

export interface CreateArticleParams {
  title: string;
  content: string;
  coverImage?: string | null;
  summary?: string | undefined;
  tags?: string[] | undefined;
}

export interface UpdateArticleParams {
  articleId: string;
  title: string;
  content: string;
  coverImage?: string | null;
  coverImageModified?: boolean;
  summary?: string | undefined;
  tags?: string[] | undefined;
}

const TABLE_NAME = 'articles';

function generateSlug (): string {
  const timestamp = Date.now()
    .toString(36)
    .slice(2, 11);
  return `article-${timestamp}`;
}

export async function getArticleBySlug (slug: string): Promise<ArticleWithContent | null> {
  const { data } = await supabase.from(TABLE_NAME).select('*')
    .eq('slug', slug)
    .single<Article>();

  if (!data) {
    return null;
  }

  return {
    ...data,
    'content': data.content || ''
  };
}

export async function getAllArticles (): Promise<Article[]> {
  const { data } = await supabase.from(TABLE_NAME)
    .select('id, title, slug, content, created_at, updated_at, cover_image, summary, tags')
    .order('updated_at', { 'ascending': false });

  return data || [];
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getArticlesPaginated (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedArticles> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase.from(TABLE_NAME)
    .select('id, title, slug, content, created_at, updated_at, cover_image, summary, tags', { 'count': 'exact' })
    .order('updated_at', { 'ascending': false })
    .range(from, to);

  if (error || !data) {
    return {
      'articles': [],
      'total': 0,
      page,
      pageSize,
      'totalPages': 0
    };
  }

  return {
    'articles': data,
    'total': count || 0,
    page,
    pageSize,
    'totalPages': Math.ceil((count || 0) / pageSize)
  };
}

export async function getArticlesContentBatch (articleIds: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();

  const { data } = await supabase.from(TABLE_NAME)
    .select('id, content')
    .in('id', articleIds);

  if (!data) {
    return contentMap;
  }

  data.forEach((item) => {
    contentMap.set(item.id, item.content || '');
  });

  return contentMap;
}

export async function createArticle ({
  title,
  content,
  coverImage,
  summary,
  tags
}: CreateArticleParams): Promise<ArticleWithContent | null> {
  const id = crypto.randomUUID();
  const slug = generateSlug();

  const now = new Date().toISOString();
  const { 'data': articleData } = await supabase
    .from(TABLE_NAME)
    .insert({
      id,
      title,
      slug,
      content,
      'cover_image': coverImage || null,
      'summary': summary || null,
      'tags': tags || null,
      'created_at': now,
      'updated_at': now
    })
    .select()
    .single<Article>();

  if (!articleData) {
    return null;
  }

  return {
    ...articleData,
    content
  };
}

export async function updateArticle ({
  articleId,
  title,
  content,
  coverImage,
  coverImageModified,
  summary,
  tags
}: UpdateArticleParams): Promise<ArticleWithContent | null> {
  const updates: Partial<Article> = {
    title,
    content,
    'summary': summary || null,
    'tags': tags || null,
    'updated_at': new Date().toISOString()
  };

  if (coverImageModified) {
    updates.cover_image = coverImage || null;
  }

  const { 'data': articleData } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', articleId)
    .select()
    .single<Article>();

  if (!articleData) {
    return null;
  }

  return {
    ...articleData,
    content
  };
}

export async function updateArticleCover (articleId: string, coverImage: string | null): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ 'cover_image': coverImage })
    .eq('id', articleId);

  return !error;
}

export async function updateArticleSummary (articleId: string, summary: string | null): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ summary })
    .eq('id', articleId);

  return !error;
}

export async function deleteArticle (articleId: string): Promise<boolean> {
  const { 'error': deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', articleId);

  return !deleteError;
}

export function getCoverImageUrl (coverImage: string | null | undefined): string | null {
  if (!coverImage) {
    return null;
  }
  if (coverImage.startsWith('data:')) {
    return coverImage;
  }
  return coverImage;
}

export async function fileToBase64 (file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
