import { turso } from './tursoClient';

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

interface CachedArticle {
  article: ArticleWithContent;
  timestamp: number;
}

const articleCache = new Map<string, CachedArticle>();
const listCache = new Map<string, { articles: Article[]; timestamp: number }>();
const CACHE_TTL = 30 * 1000;

function generateSlug (): string {
  const timestamp = Date.now()
    .toString(36)
    .slice(2, 11);
  return `article-${timestamp}`;
}

function parseArticleRow (row: Record<string, unknown>): Article {
  return {
    'id': row.id as string,
    'title': row.title as string,
    'slug': row.slug as string,
    'content': row.content as string | null,
    'created_at': row.created_at as string,
    'updated_at': row.updated_at as string,
    'cover_image': row.cover_image as string | null,
    'summary': row.summary as string | null,
    'tags': row.tags ? JSON.parse(row.tags as string) : null
  };
}

function isCacheValid (timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

export function invalidateArticleCache (slug?: string): void {
  if (slug) {
    articleCache.delete(slug);
    listCache.clear();
  } else {
    articleCache.clear();
    listCache.clear();
  }
}

export async function getArticleBySlug (slug: string): Promise<ArticleWithContent | null> {
  const cached = articleCache.get(slug);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.article;
  }

  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} WHERE slug = ?`,
    'args': [slug]
  });

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const data = parseArticleRow(result.rows[0] as Record<string, unknown>);
  const article: ArticleWithContent = {
    ...data,
    'content': data.content || ''
  };

  articleCache.set(slug, { article, 'timestamp': Date.now() });
  return article;
}

export async function getAllArticles (): Promise<Article[]> {
  const cached = listCache.get('all');
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.articles;
  }

  const result = await turso.execute({
    'sql': `SELECT id, title, slug, content, created_at, updated_at, cover_image, summary, tags
            FROM ${TABLE_NAME}
            ORDER BY updated_at DESC`,
    'args': []
  });

  const articles = result.rows.map(row => parseArticleRow(row as Record<string, unknown>));
  listCache.set('all', { articles, 'timestamp': Date.now() });

  return articles;
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
  const offset = (page - 1) * pageSize;

  const result = await turso.execute({
    'sql': `SELECT *, COUNT(*) OVER() as total_count
            FROM ${TABLE_NAME}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?`,
    'args': [pageSize, offset]
  });

  if (result.rows.length === 0) {
    return {
      'articles': [],
      'total': 0,
      page,
      pageSize,
      'totalPages': 0
    };
  }

  const total = (result.rows[0]?.total_count as number | undefined) || 0;
  const articles = result.rows.map(row => parseArticleRow(row as Record<string, unknown>));

  listCache.delete('all');

  return {
    articles,
    total,
    page,
    pageSize,
    'totalPages': Math.ceil(total / pageSize)
  };
}

export async function getArticlesContentBatch (articleIds: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();

  if (articleIds.length === 0) {
    return contentMap;
  }

  const placeholders = articleIds.map(() => '?').join(',');
  const result = await turso.execute({
    'sql': `SELECT id, content FROM ${TABLE_NAME} WHERE id IN (${placeholders})`,
    'args': articleIds
  });

  result.rows.forEach(row => {
    contentMap.set(row.id as string, (row.content as string) || '');
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
  const tagsJson = tags ? JSON.stringify(tags) : null;

  await turso.execute({
    'sql': `INSERT INTO ${TABLE_NAME} (id, title, slug, content, cover_image, summary, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'args': [id, title, slug, content, coverImage || null, summary || null, tagsJson, now, now]
  });

  invalidateArticleCache();

  return {
    id,
    title,
    slug,
    content,
    'created_at': now,
    'updated_at': now,
    'cover_image': coverImage || null,
    'summary': summary || null,
    'tags': tags || null
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
  const now = new Date().toISOString();
  const tagsJson = tags ? JSON.stringify(tags) : null;

  if (coverImageModified) {
    await turso.execute({
      'sql': `UPDATE ${TABLE_NAME}
              SET title = ?, content = ?, cover_image = ?, summary = ?, tags = ?, updated_at = ?
              WHERE id = ?`,
      'args': [title, content, coverImage || null, summary || null, tagsJson, now, articleId]
    });
  } else {
    await turso.execute({
      'sql': `UPDATE ${TABLE_NAME}
              SET title = ?, content = ?, summary = ?, tags = ?, updated_at = ?
              WHERE id = ?`,
      'args': [title, content, summary || null, tagsJson, now, articleId]
    });
  }

  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [articleId]
  });

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const data = parseArticleRow(result.rows[0] as Record<string, unknown>);

  const article: ArticleWithContent = {
    ...data,
    content
  };

  articleCache.delete(data.slug);
  invalidateArticleCache();

  return article;
}

export async function updateArticleCover (articleId: string, coverImage: string | null): Promise<boolean> {
  const result = await turso.execute({
    'sql': `UPDATE ${TABLE_NAME} SET cover_image = ? WHERE id = ?`,
    'args': [coverImage, articleId]
  });

  invalidateArticleCache();

  return result.rowsAffected > 0;
}

export async function updateArticleSummary (articleId: string, summary: string | null): Promise<boolean> {
  const result = await turso.execute({
    'sql': `UPDATE ${TABLE_NAME} SET summary = ? WHERE id = ?`,
    'args': [summary, articleId]
  });

  invalidateArticleCache();

  return result.rowsAffected > 0;
}

export async function deleteArticle (articleId: string): Promise<boolean> {
  const result = await turso.execute({
    'sql': `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [articleId]
  });

  invalidateArticleCache();

  return result.rowsAffected > 0;
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
