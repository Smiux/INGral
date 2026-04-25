export interface ArticleNodeData {
  articleSlug: string;
  articleTitle: string;
  articleSummary?: string | undefined;
  coverImage?: string | null | undefined;
  tags?: string[] | null | undefined;
  [key: string]: unknown;
}

export interface ArticleEdgeData {
  relationshipType?: string | undefined;
  type?: string | undefined;
  curveType?: 'default' | 'straight' | 'smoothstep' | 'simplebezier' | undefined;
  [key: string]: unknown;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    type?: string | undefined;
    position: { x: number; y: number };
    data: ArticleNodeData;
    selected?: boolean | undefined;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string | undefined;
    data?: ArticleEdgeData | undefined;
    selected?: boolean | undefined;
  }>;
}

export interface Gallery {
  id: string;
  title: string;
  description?: string | undefined;
  graphData: GraphData;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryListItem {
  id: string;
  title: string;
  description?: string | undefined;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryParams {
  title: string;
  description?: string | undefined;
  graphData?: GraphData | undefined;
}

export interface UpdateGalleryParams {
  title?: string | undefined;
  description?: string | undefined;
  graphData?: GraphData | undefined;
}
