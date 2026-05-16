import { createContext, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

export interface ConnectionPoint {
  id: string;
  articleId: string;
  documentPos: number;
  to: number;
  selectedText: string;
  color: string;
  createdAt: number;
}

export interface Connection {
  id: string;
  sourcePointId: string;
  targetPointId: string;
  label: string;
  createdAt: number;
}

export interface ConnectionState {
  points: Map<string, ConnectionPoint>;
  connections: Map<string, Connection>;
  selectedPointId: string | null;
  isConnecting: boolean;
  isLoaded: boolean;
}

export type ConnectionAction =
  | { type: 'ADD_POINT'; point: ConnectionPoint }
  | { type: 'REMOVE_POINT'; pointId: string }
  | { type: 'ADD_CONNECTION'; connection: Connection }
  | { type: 'REMOVE_CONNECTION'; connectionId: string }
  | { type: 'UPDATE_CONNECTION_LABEL'; connectionId: string; label: string }
  | { type: 'SELECT_POINT'; pointId: string | null }
  | { type: 'SET_CONNECTING'; isConnecting: boolean }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_DATA'; points: ConnectionPoint[]; connections: Connection[] };

export interface ConnectionContextValue {
  state: ConnectionState;
  dispatch: React.Dispatch<ConnectionAction>;
  addPoint: (articleId: string, documentPos: number, to: number, selectedText: string) => string;
  removePoint: (pointId: string) => void;
  addConnection: (sourcePointId: string, targetPointId: string) => string;
  removeConnection: (connectionId: string) => void;
  updateConnectionLabel: (connectionId: string, label: string) => void;
  selectPoint: (pointId: string | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  getPointsByArticle: (articleId: string) => ConnectionPoint[];
  getConnectionsForPoint: (pointId: string) => Connection[];
}

export interface ConnectionLinesProps {
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export interface ArticleConnectionLinesProps {
  articleId: string;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  editorRef?: RefObject<{ getEditor: () => Editor | null } | null>;
  renderedArticleIds?: string[] | undefined;
  renderCrossArticle?: boolean;
}

export interface ConnectionPointManagerProps {
  articleId: string;
  editorRef: RefObject<{ getEditor: () => Editor | null } | null>;
  interactive?: boolean;
}

export interface ExtendedConnectionContextValue extends ConnectionContextValue {
  save: () => Promise<boolean>;
  isLoading: boolean;
}

export const ConnectionContext = createContext<ExtendedConnectionContextValue | null>(null);

export interface JumpNode {
  articleId: string;
  articleTitle: string;
}

export interface JumpEdge {
  sourceArticleId: string;
  targetArticleId: string;
  connectionId?: string | undefined;
  connectionLabel?: string | undefined;
  sourcePointId?: string | undefined;
  sourcePointText?: string | undefined;
  sourcePointColor?: string | undefined;
  targetPointId?: string | undefined;
  targetPointText?: string | undefined;
  targetPointColor?: string | undefined;
}

export interface JumpGraph {
  nodes: JumpNode[];
  edges: JumpEdge[];
}

interface AddJumpParams {
  graph: JumpGraph;
  sourceArticleId: string;
  targetArticleId: string;
  sourceArticleTitle: string;
  targetArticleTitle: string;
  connectionId?: string | undefined;
  connectionLabel?: string | undefined;
  sourcePointId?: string | undefined;
  sourcePointText?: string | undefined;
  sourcePointColor?: string | undefined;
  targetPointId?: string | undefined;
  targetPointText?: string | undefined;
  targetPointColor?: string | undefined;
}

export function addJumpToGraph (params: AddJumpParams): JumpGraph {
  const {
    graph, sourceArticleId, targetArticleId,
    sourceArticleTitle, targetArticleTitle,
    connectionId, connectionLabel,
    sourcePointId, sourcePointText, sourcePointColor,
    targetPointId, targetPointText, targetPointColor
  } = params;
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];

  if (!nodes.some(n => n.articleId === sourceArticleId)) {
    nodes.push({ 'articleId': sourceArticleId, 'articleTitle': sourceArticleTitle });
  }
  if (!nodes.some(n => n.articleId === targetArticleId)) {
    nodes.push({ 'articleId': targetArticleId, 'articleTitle': targetArticleTitle });
  }

  const edgeExists = edges.some(e => {
    if (connectionId !== undefined && e.connectionId !== undefined) {
      return e.connectionId === connectionId &&
        e.sourceArticleId === sourceArticleId &&
        e.targetArticleId === targetArticleId;
    }
    return e.sourceArticleId === sourceArticleId &&
      e.targetArticleId === targetArticleId &&
      e.connectionId === connectionId;
  });
  if (!edgeExists) {
    edges.push({
      sourceArticleId, targetArticleId, connectionId, connectionLabel,
      sourcePointId, sourcePointText, sourcePointColor,
      targetPointId, targetPointText, targetPointColor
    });
  }

  return { nodes, edges };
}
