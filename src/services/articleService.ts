import { turso } from './tursoClient';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  updated_at: string;
  cover_image: string | null;
  tags: string[] | null;
}

export interface CreateArticleParams {
  title: string;
  content: string;
  coverImage?: string | null;
  tags?: string[] | undefined;
}

export interface UpdateArticleParams {
  articleId: string;
  title: string;
  content: string;
  coverImage?: string | null;
  coverImageModified?: boolean;
  tags?: string[] | undefined;
}

const TABLE_NAME = 'articles';

interface CachedArticle {
  article: Article;
  updatedAt: string;
}

interface CachedList {
  articles: Article[];
  total: number;
  updatedAt: string;
}

interface CachedTotal {
  total: number;
  updatedAt: string;
}

const articleCache = new Map<string, CachedArticle>();
const listCache = new Map<string, CachedList>();
const totalCache: CachedTotal = { 'total': 0, 'updatedAt': '' };

function generateSlug (): string {
  const timestamp = Date.now()
    .toString(36)
    .slice(2, 11);
  return `article-${timestamp}`;
}

function parseArticle (row: Record<string, unknown>): Article {
  return {
    'id': row.id as string,
    'title': row.title as string,
    'slug': row.slug as string,
    'content': (row.content as string) || '',
    'created_at': row.created_at as string,
    'updated_at': row.updated_at as string,
    'cover_image': row.cover_image as string | null,
    'tags': row.tags ? JSON.parse(row.tags as string) : null
  };
}

function invalidateArticleCacheBySlug (slug: string): void {
  articleCache.delete(slug);
}

function invalidateListCache (): void {
  listCache.clear();
  totalCache.updatedAt = '';
}

async function getMaxUpdatedAt (): Promise<string> {
  const result = await turso.execute({
    'sql': `SELECT MAX(updated_at) as max_updated_at FROM ${TABLE_NAME}`,
    'args': []
  });
  return (result.rows[0]?.max_updated_at as string) || '';
}

function cacheArticle (article: Article): void {
  articleCache.set(article.slug, { article, 'updatedAt': article.updated_at });
}

function cacheArticleList (articles: Article[]): void {
  for (const article of articles) {
    cacheArticle(article);
  }
}

async function getArticleByField (
  field: 'id' | 'slug',
  value: string
): Promise<Article | null> {
  const updatedAtResult = await turso.execute({
    'sql': `SELECT slug, updated_at FROM ${TABLE_NAME} WHERE ${field} = ?`,
    'args': [value]
  });

  if (updatedAtResult.rows.length === 0) {
    return null;
  }

  const slug = updatedAtResult.rows[0]?.slug as string;
  const currentUpdatedAt = updatedAtResult.rows[0]?.updated_at as string;
  const cached = articleCache.get(slug);

  if (cached && cached.updatedAt === currentUpdatedAt) {
    return cached.article;
  }

  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} WHERE ${field} = ?`,
    'args': [value]
  });

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const article = parseArticle(result.rows[0] as Record<string, unknown>);
  articleCache.set(slug, { article, 'updatedAt': currentUpdatedAt });

  return article;
}

export async function getArticleBySlug (slug: string): Promise<Article | null> {
  return getArticleByField('slug', slug);
}

export async function getAllArticles (): Promise<Article[]> {
  const currentMaxUpdatedAt = await getMaxUpdatedAt();
  const cached = listCache.get('all');

  if (cached && cached.updatedAt === currentMaxUpdatedAt) {
    return cached.articles;
  }

  const result = await turso.execute({
    'sql': `SELECT id, title, slug, content, created_at, updated_at, cover_image, tags
            FROM ${TABLE_NAME}
            ORDER BY updated_at DESC`,
    'args': []
  });

  const articles = result.rows.map(row => parseArticle(row as Record<string, unknown>));
  listCache.set('all', { articles, 'total': articles.length, 'updatedAt': currentMaxUpdatedAt });
  cacheArticleList(articles);

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
  const currentMaxUpdatedAt = await getMaxUpdatedAt();

  const cacheKey = `page_${page}_${pageSize}`;
  const cached = listCache.get(cacheKey);

  if (cached && cached.updatedAt === currentMaxUpdatedAt) {
    return {
      'articles': cached.articles,
      'total': cached.total,
      page,
      pageSize,
      'totalPages': Math.ceil(cached.total / pageSize)
    };
  }

  const cachedAll = listCache.get('all');
  if (cachedAll && cachedAll.updatedAt === currentMaxUpdatedAt) {
    const offset = (page - 1) * pageSize;
    const articles = cachedAll.articles.slice(offset, offset + pageSize);
    listCache.set(cacheKey, { articles, 'total': cachedAll.total, 'updatedAt': currentMaxUpdatedAt });

    return {
      articles,
      'total': cachedAll.total,
      page,
      pageSize,
      'totalPages': Math.ceil(cachedAll.total / pageSize)
    };
  }

  let total = totalCache.total;
  if (totalCache.updatedAt !== currentMaxUpdatedAt) {
    const countResult = await turso.execute({
      'sql': `SELECT COUNT(*) as total FROM ${TABLE_NAME}`,
      'args': []
    });
    total = (countResult.rows[0]?.total as number) || 0;
    totalCache.total = total;
    totalCache.updatedAt = currentMaxUpdatedAt;
  }

  const offset = (page - 1) * pageSize;

  const result = await turso.execute({
    'sql': `SELECT id, title, slug, content, created_at, updated_at, cover_image, tags
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

  const articles = result.rows.map(row => parseArticle(row as Record<string, unknown>));

  listCache.set(cacheKey, { articles, total, 'updatedAt': currentMaxUpdatedAt });
  cacheArticleList(articles);

  return {
    articles,
    total,
    page,
    pageSize,
    'totalPages': Math.ceil(total / pageSize)
  };
}

export async function createArticle ({
  title,
  content,
  coverImage,
  tags
}: CreateArticleParams): Promise<Article | null> {
  const id = crypto.randomUUID();
  const slug = generateSlug();
  const now = new Date().toISOString();
  const tagsJson = tags ? JSON.stringify(tags) : null;

  await turso.execute({
    'sql': `INSERT INTO ${TABLE_NAME} (id, title, slug, content, cover_image, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'args': [id, title, slug, content, coverImage || null, tagsJson, now, now]
  });

  invalidateListCache();

  const article = {
    id,
    title,
    slug,
    content,
    'created_at': now,
    'updated_at': now,
    'cover_image': coverImage || null,
    'tags': tags || null
  };
  cacheArticle(article);

  return article;
}

export async function updateArticle ({
  articleId,
  title,
  content,
  coverImage,
  coverImageModified,
  tags
}: UpdateArticleParams): Promise<Article | null> {
  const now = new Date().toISOString();
  const tagsJson = tags ? JSON.stringify(tags) : null;

  if (coverImageModified) {
    await turso.execute({
      'sql': `UPDATE ${TABLE_NAME}
              SET title = ?, content = ?, cover_image = ?, tags = ?, updated_at = ?
              WHERE id = ?`,
      'args': [title, content, coverImage || null, tagsJson, now, articleId]
    });
  } else {
    await turso.execute({
      'sql': `UPDATE ${TABLE_NAME}
              SET title = ?, content = ?, tags = ?, updated_at = ?
              WHERE id = ?`,
      'args': [title, content, tagsJson, now, articleId]
    });
  }

  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [articleId]
  });

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const article = parseArticle(result.rows[0] as Record<string, unknown>);

  invalidateArticleCacheBySlug(article.slug);
  invalidateListCache();
  cacheArticle(article);

  return article;
}

export async function deleteArticle (articleId: string): Promise<boolean> {
  const result = await turso.execute({
    'sql': `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [articleId]
  });

  invalidateListCache();

  return result.rowsAffected > 0;
}
