export const dockBodyTransition = {
  'duration': 0.28,
  'ease': [0.33, 1, 0.68, 1] as [number, number, number, number]
};

export interface JumpNode {
  articleId: string;
  articleTitle: string;
}

export interface JumpEdge {
  sourceArticleId: string;
  targetArticleId: string;
  connectionLabel?: string | undefined;
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
  connectionLabel?: string | undefined;
}

export function addJumpToGraph (params: AddJumpParams): JumpGraph {
  const {
    graph, sourceArticleId, targetArticleId,
    sourceArticleTitle, targetArticleTitle,
    connectionLabel
  } = params;
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];

  if (!nodes.some(n => n.articleId === sourceArticleId)) {
    nodes.push({ 'articleId': sourceArticleId, 'articleTitle': sourceArticleTitle });
  }
  if (!nodes.some(n => n.articleId === targetArticleId)) {
    nodes.push({ 'articleId': targetArticleId, 'articleTitle': targetArticleTitle });
  }

  const edgeExists = edges.some(e =>
    e.sourceArticleId === sourceArticleId &&
    e.targetArticleId === targetArticleId &&
    e.connectionLabel === connectionLabel
  );
  if (!edgeExists) {
    edges.push({ sourceArticleId, targetArticleId, connectionLabel });
  }

  return { nodes, edges };
}
