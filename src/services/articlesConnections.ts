import { turso } from './tursoClient';

export interface ArticleConnection {
  id: string;
  sourceArticleId: string;
  targetArticleId: string;
  relationshipType: string | null;
  createdAt: string;
}

export interface NeighborInfo {
  id: string;
  title: string;
  relationship: string | undefined;
}

export interface ArticleNeighbors {
  incoming: NeighborInfo[];
  outgoing: NeighborInfo[];
}

const TABLE_NAME = 'articles_connections';

function parseConnection (row: Record<string, unknown>): ArticleConnection {
  return {
    'id': row.id as string,
    'sourceArticleId': row.source_article_id as string,
    'targetArticleId': row.target_article_id as string,
    'relationshipType': (row.relationship_type as string) || null,
    'createdAt': row.created_at as string
  };
}

export async function addArticleConnection (params: {
  sourceArticleId: string;
  targetArticleId: string;
  relationshipType?: string;
}): Promise<ArticleConnection> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await turso.execute({
    'sql': `INSERT INTO ${TABLE_NAME} (id, source_article_id, target_article_id, relationship_type, created_at)
            VALUES (?, ?, ?, ?, ?)`,
    'args': [id, params.sourceArticleId, params.targetArticleId, params.relationshipType || null, now]
  });

  return {
    id,
    'sourceArticleId': params.sourceArticleId,
    'targetArticleId': params.targetArticleId,
    'relationshipType': params.relationshipType || null,
    'createdAt': now
  };
}

export async function deleteArticleConnection (connectionId: string): Promise<boolean> {
  const result = await turso.execute({
    'sql': `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
    'args': [connectionId]
  });
  return result.rowsAffected > 0;
}

export async function updateArticleConnection (connectionId: string, relationshipType: string): Promise<boolean> {
  await turso.execute({
    'sql': `UPDATE ${TABLE_NAME} SET relationship_type = ? WHERE id = ?`,
    'args': [relationshipType, connectionId]
  });
  return true;
}

export async function getArticleConnections (articleId: string): Promise<ArticleConnection[]> {
  const result = await turso.execute({
    'sql': `SELECT * FROM ${TABLE_NAME}
            WHERE source_article_id = ? OR target_article_id = ?
            ORDER BY created_at DESC`,
    'args': [articleId, articleId]
  });
  return result.rows.map(row => parseConnection(row as Record<string, unknown>));
}

export async function getArticleNeighbors (articleId: string): Promise<ArticleNeighbors> {
  const connections = await getArticleConnections(articleId);

  const incomingIds = new Set<string>();
  const outgoingIds = new Set<string>();
  const incomingMap = new Map<string, ArticleConnection>();
  const outgoingMap = new Map<string, ArticleConnection>();

  for (const conn of connections) {
    if (conn.targetArticleId === articleId) {
      if (!incomingIds.has(conn.sourceArticleId)) {
        incomingIds.add(conn.sourceArticleId);
        incomingMap.set(conn.sourceArticleId, conn);
      }
    }
    if (conn.sourceArticleId === articleId) {
      if (!outgoingIds.has(conn.targetArticleId)) {
        outgoingIds.add(conn.targetArticleId);
        outgoingMap.set(conn.targetArticleId, conn);
      }
    }
  }

  const allArticleIds = [...incomingIds, ...outgoingIds];
  if (allArticleIds.length === 0) {
    return { 'incoming': [], 'outgoing': [] };
  }

  const placeholders = allArticleIds.map(() => '?').join(',');
  const articlesResult = await turso.execute({
    'sql': `SELECT id, title FROM articles WHERE id IN (${placeholders})`,
    'args': allArticleIds
  });

  const titleMap = new Map<string, string>();
  for (const row of articlesResult.rows) {
    titleMap.set(row.id as string, row.title as string);
  }

  const incoming: NeighborInfo[] = [];
  for (const [id, conn] of incomingMap) {
    const title = titleMap.get(id);
    if (title) {
      incoming.push({
        id,
        title,
        'relationship': conn.relationshipType || undefined
      });
    }
  }

  const outgoing: NeighborInfo[] = [];
  for (const [id, conn] of outgoingMap) {
    const title = titleMap.get(id);
    if (title) {
      outgoing.push({
        id,
        title,
        'relationship': conn.relationshipType || undefined
      });
    }
  }

  return { incoming, outgoing };
}

export async function searchArticlesByTitle (query: string): Promise<Array<{ id: string; title: string; slug: string }>> {
  if (!query.trim()) {
    return [];
  }

  const result = await turso.execute({
    'sql': 'SELECT id, title, slug FROM articles WHERE title LIKE ? ORDER BY updated_at DESC LIMIT 50',
    'args': [`%${query}%`]
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'title': row.title as string,
    'slug': row.slug as string
  }));
}
