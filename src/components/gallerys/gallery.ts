import type { Node, Edge } from '@xyflow/react';

export interface ArticleNodeData {
  articleSlug: string;
  articleTitle: string;
  articleSummary?: string | undefined;
  coverImage?: string | null | undefined;
  tags?: string[] | null | undefined;
  isEmbedded?: boolean | undefined;
  embeddedArticleId?: string | undefined;
  [key: string]: unknown;
}

export interface EmbeddedArticle {
  id: string;
  title: string;
  content: string;
  summary?: string | undefined;
  tags?: string[] | undefined;
  coverImage?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleEdgeData {
  relationshipType?: string | undefined;
  curveType?: 'default' | 'straight' | 'smoothstep' | 'simplebezier' | undefined;
  [key: string]: unknown;
}

export type ArticleNode = Node<ArticleNodeData>;
export type ArticleEdge = Edge<ArticleEdgeData>;

export interface Gallery {
  id: string;
  title: string;
  nodes: ArticleNode[];
  edges: ArticleEdge[];
  embeddedArticles: EmbeddedArticle[];
  createdAt: string;
  updatedAt: string;
}

export interface GalleryListItem {
  id: string;
  title: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryParams {
  title: string;
  nodes?: ArticleNode[];
  edges?: ArticleEdge[];
  embeddedArticles?: EmbeddedArticle[];
}

export interface UpdateGalleryParams {
  title?: string | undefined;
  nodes?: ArticleNode[];
  edges?: ArticleEdge[];
  embeddedArticles?: EmbeddedArticle[];
}
