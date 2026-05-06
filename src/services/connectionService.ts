import { turso } from './tursoClient';

export interface ConnectionPointData {
  id: string;
  articleId: string;
  documentPos: number;
  to: number;
  selectedText: string;
  color: string;
  createdAt: number;
}

export interface ConnectionData {
  id: string;
  sourcePointId: string;
  targetPointId: string;
  label: string;
  createdAt: number;
}

export interface SaveConnectionDataParams {
  points: ConnectionPointData[];
  connections: ConnectionData[];
}

const POINTS_TABLE = 'connection_points';
const CONNECTIONS_TABLE = 'connections';

export async function getConnectionPointsByArticles (articleIds: string[]): Promise<ConnectionPointData[]> {
  if (articleIds.length === 0) {
    return [];
  }

  const placeholders = articleIds.map(() => '?').join(',');
  const result = await turso.execute({
    'sql': `SELECT id, article_id, document_pos, to_pos, selected_text, color, created_at
            FROM ${POINTS_TABLE}
            WHERE article_id IN (${placeholders})`,
    'args': articleIds
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'articleId': row.article_id as string,
    'documentPos': row.document_pos as number,
    'to': row.to_pos as number,
    'selectedText': row.selected_text as string,
    'color': row.color as string,
    'createdAt': row.created_at as number
  }));
}

export async function getConnectionsByPointIds (pointIds: string[]): Promise<ConnectionData[]> {
  if (pointIds.length === 0) {
    return [];
  }

  const placeholders = pointIds.map(() => '?').join(',');
  const result = await turso.execute({
    'sql': `SELECT id, source_point_id, target_point_id, label, created_at
            FROM ${CONNECTIONS_TABLE}
            WHERE source_point_id IN (${placeholders}) OR target_point_id IN (${placeholders})`,
    'args': [...pointIds, ...pointIds]
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'sourcePointId': row.source_point_id as string,
    'targetPointId': row.target_point_id as string,
    'label': (row.label as string) || '',
    'createdAt': row.created_at as number
  }));
}

export async function getConnectionPointsByIds (pointIds: string[]): Promise<ConnectionPointData[]> {
  if (pointIds.length === 0) {
    return [];
  }

  const placeholders = pointIds.map(() => '?').join(',');
  const result = await turso.execute({
    'sql': `SELECT id, article_id, document_pos, to_pos, selected_text, color, created_at
            FROM ${POINTS_TABLE}
            WHERE id IN (${placeholders})`,
    'args': pointIds
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'articleId': row.article_id as string,
    'documentPos': row.document_pos as number,
    'to': row.to_pos as number,
    'selectedText': row.selected_text as string,
    'color': row.color as string,
    'createdAt': row.created_at as number
  }));
}

export async function saveConnectionData (params: SaveConnectionDataParams): Promise<void> {
  const { points, connections } = params;

  await turso.batch([
    {
      'sql': `DELETE FROM ${CONNECTIONS_TABLE}`,
      'args': []
    },
    {
      'sql': `DELETE FROM ${POINTS_TABLE}`,
      'args': []
    },
    ...points.map(point => ({
      'sql': `INSERT INTO ${POINTS_TABLE} (id, article_id, document_pos, to_pos, selected_text, color, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'args': [point.id, point.articleId, point.documentPos, point.to, point.selectedText, point.color, point.createdAt]
    })),
    ...connections.map(conn => ({
      'sql': `INSERT INTO ${CONNECTIONS_TABLE} (id, source_point_id, target_point_id, label, created_at)
              VALUES (?, ?, ?, ?, ?)`,
      'args': [conn.id, conn.sourcePointId, conn.targetPointId, conn.label, conn.createdAt]
    }))
  ]);
}

export async function getAllConnectionPoints (): Promise<ConnectionPointData[]> {
  const result = await turso.execute({
    'sql': `SELECT id, article_id, document_pos, to_pos, selected_text, color, created_at FROM ${POINTS_TABLE}`,
    'args': []
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'articleId': row.article_id as string,
    'documentPos': row.document_pos as number,
    'to': row.to_pos as number,
    'selectedText': row.selected_text as string,
    'color': row.color as string,
    'createdAt': row.created_at as number
  }));
}

export async function getAllConnections (): Promise<ConnectionData[]> {
  const result = await turso.execute({
    'sql': `SELECT id, source_point_id, target_point_id, label, created_at FROM ${CONNECTIONS_TABLE}`,
    'args': []
  });

  return result.rows.map(row => ({
    'id': row.id as string,
    'sourcePointId': row.source_point_id as string,
    'targetPointId': row.target_point_id as string,
    'label': (row.label as string) || '',
    'createdAt': row.created_at as number
  }));
}
