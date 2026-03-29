import { supabase, uploadContent, downloadContent, uploadCoverImage, deleteCoverImage, deleteContent, getCoverImageUrl } from './supabaseClient';

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

export async function createArticle ({
  title,
  content,
  coverImage,
  summary,
  tags
}: CreateArticleParams): Promise<ArticleWithContent | null> {
  const id = crypto.randomUUID();
  const slug = generateSlug();
  const contentPath = await uploadContent(id, content);

  if (!contentPath) {
    return null;
  }

  let coverImagePath: string | null = null;
  if (coverImage) {
    coverImagePath = await uploadCoverImage(id, coverImage);
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
  const contentPath = await uploadContent(articleId, content);

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
    let coverImagePath: string | null = null;
    if (coverImage) {
      coverImagePath = await uploadCoverImage(articleId, coverImage);
    }

    const { 'data': existingArticle } = await supabase
      .from(TABLE_NAME)
      .select('cover_image_path')
      .eq('id', articleId)
      .single<{ cover_image_path: string | null }>();

    if (coverImage === null && existingArticle?.cover_image_path) {
      await deleteCoverImage(existingArticle.cover_image_path);
    }

    updates.cover_image_path = coverImagePath;
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
  if (coverImage) {
    const path = await uploadCoverImage(articleId, coverImage);
    if (path) {
      await supabase
        .from(TABLE_NAME)
        .update({ 'cover_image_path': path })
        .eq('id', articleId);
    }
    return path;
  }
  const { data } = await supabase
    .from(TABLE_NAME)
    .select('cover_image_path')
    .eq('id', articleId)
    .single<{ cover_image_path: string | null }>();

  if (data?.cover_image_path) {
    await deleteCoverImage(data.cover_image_path);
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
    .select('content_path, cover_image_path')
    .eq('id', articleId)
    .single<{ content_path: string; cover_image_path: string | null }>();

  if (!data) {
    return false;
  }

  await deleteContent(data.content_path);

  if (data.cover_image_path) {
    await deleteCoverImage(data.cover_image_path);
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', articleId);

  return !error;
}

export { getCoverImageUrl };
