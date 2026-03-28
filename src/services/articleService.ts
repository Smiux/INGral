import { supabase, uploadContent, downloadContent, uploadCoverImage, deleteCoverImage, deleteContent, getCoverImageUrl } from './supabaseClient';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content_path: string;
  created_at: string;
  cover_image_path: string | null;
  summary: string | null;
}

export interface ArticleWithContent extends Article {
  content: string;
}

export interface CreateArticleParams {
  title: string;
  content: string;
  coverImage?: File | Blob | null;
  summary?: string | undefined;
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
    .select('id, title, slug, content_path, created_at, cover_image_path, summary')
    .order('created_at', { 'ascending': false });

  return data || [];
}

export async function createArticle ({
  title,
  content,
  coverImage,
  summary
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
      'summary': summary || null
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
