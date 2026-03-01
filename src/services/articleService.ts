import { supabase, uploadContent, downloadContent } from './supabaseClient';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content_path: string;
  created_at: string;
}

export interface ArticleWithContent extends Article {
  content: string;
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
    .select('id, title, slug, content_path, created_at')
    .order('created_at', { 'ascending': false });

  return data || [];
}

export async function createArticle ({
  title,
  content
}: {
  title: string;
  content: string;
}): Promise<ArticleWithContent | null> {
  const id = crypto.randomUUID();
  const slug = generateSlug();
  const contentPath = await uploadContent(id, content);

  if (!contentPath) {
    return null;
  }

  const { 'data': articleData } = await supabase
    .from(TABLE_NAME)
    .insert({
      id,
      title,
      slug,
      'content_path': contentPath
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
