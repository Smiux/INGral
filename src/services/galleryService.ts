import { turso } from './tursoClient';
import type {
  Gallery,
  GalleryListItem,
  GraphData,
  CreateGalleryParams,
  UpdateGalleryParams
} from '@/components/gallerys/gallery';

const TABLE_NAME = 'gallerys';

interface CachedGallery {
  gallery: Gallery;
  updatedAt: string;
}

const galleryCache = new Map<string, CachedGallery>();

export function invalidateGalleryCache (id?: string): void {
  if (id) {
    galleryCache.delete(id);
  } else {
    galleryCache.clear();
  }
}

function parseGallery (row: Record<string, unknown>): Gallery {
  return {
    'id': row.id as string,
    'title': row.title as string,
    'description': (row.description as string | null) ?? undefined,
    'graphData': JSON.parse(row.graph_data as string) as GraphData,
    'createdAt': row.created_at as string,
    'updatedAt': row.updated_at as string
  };
}

function parseGalleryListItem (row: Record<string, unknown>): GalleryListItem {
  const graphData = JSON.parse(row.graph_data as string) as GraphData;
  return {
    'id': row.id as string,
    'title': row.title as string,
    'description': (row.description as string | null) ?? undefined,
    'nodeCount': graphData.nodes.length,
    'edgeCount': graphData.edges.length,
    'createdAt': row.created_at as string,
    'updatedAt': row.updated_at as string
  };
}

export async function getAllGallerys (): Promise<GalleryListItem[]> {
  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME} ORDER BY updated_at DESC`,
    'args': []
  });
  return result.rows.map(parseGalleryListItem);
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
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  const gallery = parseGallery(row as Record<string, unknown>);

  galleryCache.set(id, { gallery, 'updatedAt': currentUpdatedAt });

  return gallery;
}

export async function createGallery (params: CreateGalleryParams): Promise<string> {
  const id = crypto.randomUUID();
  const graphData = params.graphData || { 'nodes': [], 'edges': [] };

  await turso.execute({
    'sql': `INSERT INTO ${TABLE_NAME} (id, title, description, graph_data) VALUES (?, ?, ?, ?)`,
    'args': [id, params.title, params.description ?? null, JSON.stringify(graphData)]
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

  if (params.description !== undefined) {
    updates.push('description = ?');
    args.push(params.description ?? null);
  }

  if (params.graphData !== undefined) {
    updates.push('graph_data = ?');
    args.push(JSON.stringify(params.graphData));
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
