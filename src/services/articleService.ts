import { supabase, uploadContent, downloadContent, uploadCoverImage, deleteArticleFolder, getCoverImageUrl } from './supabaseClient';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content_path: string;
  created_at: string;
  updated_at: string;
  cover_image_path: string | null;
  summary: string | null;
  tags: string[] | null;
}

export interface ArticleWithContent extends Article {
  content: string;
}

export interface CreateArticleParams {
  title: string;
  content: string;
  coverImage?: File | Blob | null;
  summary?: string | undefined;
  tags?: string[] | undefined;
}

export interface UpdateArticleParams {
  articleId: string;
  title: string;
  content: string;
  coverImage?: File | Blob | null;
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

  const content = await downloadContent(data.content_path);
  return {
    ...data,
    'content': content || ''
  };
}

export async function getAllArticles (): Promise<Article[]> {
  const { data } = await supabase.from(TABLE_NAME)
    .select('id, title, slug, content_path, created_at, updated_at, cover_image_path, summary, tags')
    .order('updated_at', { 'ascending': false });

  return data || [];
}

export async function getAllArticlesWithContent (): Promise<ArticleWithContent[]> {
  const articles = await getAllArticles();

  const articlesWithContent = await Promise.all(
    articles.map(async (article) => {
      const content = await downloadContent(article.content_path);
      return {
        ...article,
        'content': content || ''
      };
    })
  );

  return articlesWithContent;
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
    .select('id, title, slug, content_path, created_at, updated_at, cover_image_path, summary, tags', { 'count': 'exact' })
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

export async function getArticleContentById (articleId: string): Promise<string> {
  const { data } = await supabase.from(TABLE_NAME)
    .select('content_path')
    .eq('id', articleId)
    .single<{ content_path: string }>();

  if (!data) {
    return '';
  }

  const content = await downloadContent(data.content_path);
  return content || '';
}

export async function getArticlesContentBatch (articleIds: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();

  const { data } = await supabase.from(TABLE_NAME)
    .select('id, content_path')
    .in('id', articleIds);

  if (!data) {
    return contentMap;
  }

  await Promise.all(
    data.map(async (item) => {
      const content = await downloadContent(item.content_path);
      contentMap.set(item.id, content || '');
    })
  );

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
  const contentPath = await uploadContent(slug, content);

  if (!contentPath) {
    return null;
  }

  let coverImagePath: string | null = null;
  if (coverImage) {
    coverImagePath = await uploadCoverImage(slug, coverImage);
  }

  const { 'data': articleData } = await supabase
    .from(TABLE_NAME)
    .insert({
      id,
      title,
      slug,
      'content_path': contentPath,
      'cover_image_path': coverImagePath,
      'summary': summary || null,
      'tags': tags || null
    })
    .select()
    .single<Article>();

  if (!articleData) {
    return null;
  }

  await supabase
    .from(TABLE_NAME)
    .update({ 'updated_at': articleData.created_at })
    .eq('id', id);

  return {
    ...articleData,
    'updated_at': articleData.created_at,
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
  const { 'data': existingArticle } = await supabase
    .from(TABLE_NAME)
    .select('slug')
    .eq('id', articleId)
    .single<{ slug: string }>();

  if (!existingArticle) {
    return null;
  }

  const slug = existingArticle.slug;
  const contentPath = await uploadContent(slug, content);

  if (!contentPath) {
    return null;
  }

  const updates: Partial<Article> = {
    title,
    'content_path': contentPath,
    'summary': summary || null,
    'tags': tags || null,
    'updated_at': new Date().toISOString()
  };

  if (coverImageModified) {
    if (coverImage) {
      const coverImagePath = await uploadCoverImage(slug, coverImage);
      updates.cover_image_path = coverImagePath;
    } else {
      updates.cover_image_path = null;
    }
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

export async function updateArticleCover (articleId: string, coverImage: File | Blob | null): Promise<string | null> {
  const { 'data': article } = await supabase
    .from(TABLE_NAME)
    .select('slug')
    .eq('id', articleId)
    .single<{ slug: string }>();

  if (!article) {
    return null;
  }

  if (coverImage) {
    const path = await uploadCoverImage(article.slug, coverImage);
    if (path) {
      await supabase
        .from(TABLE_NAME)
        .update({ 'cover_image_path': path })
        .eq('id', articleId);
    }
    return path;
  }

  await supabase
    .from(TABLE_NAME)
    .update({ 'cover_image_path': null })
    .eq('id', articleId);

  return null;
}

export async function updateArticleSummary (articleId: string, summary: string | null): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ summary })
    .eq('id', articleId);

  return !error;
}

export async function deleteArticle (articleId: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE_NAME)
    .select('slug')
    .eq('id', articleId)
    .single<{ slug: string }>();

  if (!data) {
    return false;
  }

  await deleteArticleFolder(data.slug);

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', articleId);

  return !error;
}

export { getCoverImageUrl };
