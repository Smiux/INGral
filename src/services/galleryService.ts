import { turso } from './tursoClient';
import type {
  Gallery,
  GalleryListItem,
  CreateGalleryParams,
  UpdateGalleryParams,
  EmbeddedArticle,
  ArticleNode,
  ArticleEdge
} from '@/components/gallerys/gallery';

const TABLE_NAME = 'gallerys';

interface CachedGallery {
  gallery: Gallery;
  updatedAt: string;
}

interface CachedGalleryList {
  gallerys: GalleryListItem[];
  maxUpdatedAt: string;
}

const galleryCache = new Map<string, CachedGallery>();
const galleryListCache: CachedGalleryList = {
  'gallerys': [],
  'maxUpdatedAt': ''
};

export function invalidateGalleryCache (id?: string): void {
  if (id) {
    galleryCache.delete(id);
  } else {
    galleryCache.clear();
  }
  galleryListCache.maxUpdatedAt = '';
}

export function invalidateGalleryListCache (): void {
  galleryListCache.maxUpdatedAt = '';
}

function parseGallery (row: Record<string, unknown>): Gallery {
  return {
    'id': row.id as string,
    'title': row.title as string,
    'nodes': row.nodes ? JSON.parse(row.nodes as string) as ArticleNode[] : [],
    'edges': row.edges ? JSON.parse(row.edges as string) as ArticleEdge[] : [],
    'embeddedArticles': row.embedded_articles ? JSON.parse(row.embedded_articles as string) as EmbeddedArticle[] : [],
    'createdAt': row.created_at as string,
    'updatedAt': row.updated_at as string
  };
}

function countWords (text: string): number {
  let plainText = text;

  plainText = plainText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  plainText = plainText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  plainText = plainText.replace(/<[^>]+>/g, ' ');
  plainText = plainText.replace(/&nbsp;/g, ' ');
  plainText = plainText.replace(/&lt;/g, '<');
  plainText = plainText.replace(/&gt;/g, '>');
  plainText = plainText.replace(/&amp;/g, '&');
  plainText = plainText.replace(/&quot;/g, '"');
  plainText = plainText.replace(/&#\d+;/g, ' ');
  plainText = plainText.replace(/&[a-zA-Z]+;/g, ' ');

  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/gu) || []).length;
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

function parseGalleryListItem (row: Record<string, unknown>): GalleryListItem {
  const nodes = row.nodes ? JSON.parse(row.nodes as string) as ArticleNode[] : [];
  const edges = row.edges ? JSON.parse(row.edges as string) as ArticleEdge[] : [];
  const embeddedArticles = row.embedded_articles ? JSON.parse(row.embedded_articles as string) as EmbeddedArticle[] : [];

  let wordCount = 0;
  embeddedArticles.forEach(article => {
    wordCount += countWords(article.content || '');
  });

  return {
    'id': row.id as string,
    'title': row.title as string,
    'nodeCount': nodes.length,
    'edgeCount': edges.length,
    wordCount,
    'createdAt': row.created_at as string,
    'updatedAt': row.updated_at as string
  };
}

export async function getAllGallerys (): Promise<GalleryListItem[]> {
  const maxUpdatedAtResult = await turso.execute({
    'sql': `SELECT MAX(updated_at) as max_updated_at FROM ${TABLE_NAME}`,
    'args': []
  });

  const currentMaxUpdatedAt = (maxUpdatedAtResult.rows[0]?.max_updated_at as string) || '';

  if (galleryListCache.maxUpdatedAt === currentMaxUpdatedAt && galleryListCache.gallerys.length > 0) {
    return galleryListCache.gallerys;
  }

  const result = await turso.execute({
    'sql': `SELECT id, title, nodes, edges, embedded_articles, created_at, updated_at FROM ${TABLE_NAME} ORDER BY updated_at DESC`,
    'args': []
  });

  const galleryItems = result.rows.map(parseGalleryListItem);

  const allSlugs: string[] = [];
  result.rows.forEach(row => {
    const nodes = row.nodes ? JSON.parse(row.nodes as string) as ArticleNode[] : [];
    nodes.forEach(node => {
      if (node.data?.articleSlug && !node.data?.isEmbedded) {
        allSlugs.push(node.data.articleSlug);
      }
    });
  });

  if (allSlugs.length > 0) {
    const placeholders = allSlugs.map(() => '?').join(',');
    const articlesResult = await turso.execute({
      'sql': `SELECT slug, content FROM articles WHERE slug IN (${placeholders})`,
      'args': allSlugs
    });

    const contentMap = new Map<string, string>();
    articlesResult.rows.forEach(row => {
      contentMap.set(row.slug as string, (row.content as string) || '');
    });

    result.rows.forEach((row, index) => {
      const nodes = row.nodes ? JSON.parse(row.nodes as string) as ArticleNode[] : [];
      let additionalWordCount = 0;
      nodes.forEach(node => {
        if (node.data?.articleSlug && !node.data?.isEmbedded) {
          const content = contentMap.get(node.data.articleSlug);
          if (content) {
            additionalWordCount += countWords(content);
          }
        }
      });
      const item = galleryItems[index];
      if (item) {
        item.wordCount += additionalWordCount;
      }
    });
  }

  galleryListCache.gallerys = galleryItems;
  galleryListCache.maxUpdatedAt = currentMaxUpdatedAt;

  return galleryItems;
}

export async function getGalleryById (id: string): Promise<Gallery | null> {
  const updatedAtResult = await turso.execute({
    'sql': `SELECT updated_at FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [id]
  });

  if (updatedAtResult.rows.length === 0) {
    return null;
  }

  const currentUpdatedAt = updatedAtResult.rows[0]?.updated_at as string;
  const cached = galleryCache.get(id);

  if (cached && cached.updatedAt === currentUpdatedAt) {
    return cached.gallery;
  }

  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [id]
  });

  if (result.rows.length === 0 || !result.rows[0]) {
    return null;
  }

  const gallery = parseGallery(result.rows[0] as Record<string, unknown>);

  galleryCache.set(id, { gallery, 'updatedAt': currentUpdatedAt });

  return gallery;
}

export async function createGallery (params: CreateGalleryParams): Promise<string> {
  const id = crypto.randomUUID();
  const nodes = params.nodes || [];
  const edges = params.edges || [];
  const embeddedArticles = params.embeddedArticles || [];

  await turso.execute({
    'sql': `INSERT INTO ${TABLE_NAME} (id, title, nodes, edges, embedded_articles) VALUES (?, ?, ?, ?, ?)`,
    'args': [id, params.title, JSON.stringify(nodes), JSON.stringify(edges), JSON.stringify(embeddedArticles)]
  });

  return id;
}

export async function updateGallery (id: string, params: UpdateGalleryParams): Promise<void> {
  const updates: string[] = [];
  const args: (string | null)[] = [];

  if (params.title !== undefined) {
    updates.push('title = ?');
    args.push(params.title);
  }

  if (params.nodes !== undefined) {
    updates.push('nodes = ?');
    args.push(JSON.stringify(params.nodes));
  }

  if (params.edges !== undefined) {
    updates.push('edges = ?');
    args.push(JSON.stringify(params.edges));
  }

  if (params.embeddedArticles !== undefined) {
    updates.push('embedded_articles = ?');
    args.push(JSON.stringify(params.embeddedArticles));
  }

  if (updates.length === 0) {
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  args.push(id);

  await turso.execute({
    'sql': `UPDATE ${TABLE_NAME} SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  invalidateGalleryCache(id);
}

export async function deleteGallery (id: string): Promise<void> {
  await turso.execute({
    'sql': `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [id]
  });

  invalidateGalleryCache(id);
}

export async function searchArticlesByTitle (query: string): Promise<Array<{
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  summary: string | null;
  tags: string[] | null;
}>> {
  const result = await turso.execute({
    'sql': 'SELECT id, title, slug, cover_image, summary, tags FROM articles WHERE title LIKE ? LIMIT 50',
    'args': [`%${query}%`]
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'title': row.title as string,
    'slug': row.slug as string,
    'cover_image': row.cover_image as string | null,
    'summary': row.summary as string | null,
    'tags': row.tags ? JSON.parse(row.tags as string) : null
  }));
}
