export interface KnowledgeObject {
  id: string;
  type: 'definition' | 'theorem';
  name: Record<string, string[]>;
  description: Record<string, string[]>;
  extension?: {
    tags?: string[];
    notation?: string[];
    notes?: Record<string, string>[];
    examples?: Record<string, string>[];
    sources?: string[];
  };
}

export interface KnowledgeConnection {
  from: string;
  to: string;
  description: Record<string, string[]>;
  extension?: Record<string, unknown[]>;
}

export interface KnowledgeManifest {
  objects: KnowledgeObject[];
  connections: KnowledgeConnection[];
}

export interface KnowledgeNode {
  id: string;
  name: string;
  type: 'definition' | 'theorem';
  domain: string;
  tags: string[];
  degree: number;
  description: string;
}

export interface KnowledgeLink {
  source: string;
  target: string;
}

export interface GraphMetadata {
  totalNodes: number;
  totalLinks: number;
  domains: Record<string, { count: number }>;
  nodeTypes: Record<string, number>;
}

export const NODE_TYPE_SHAPES: Record<string, number> = {
  'definition': 1,
  'theorem': 0
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  'definition': '定义',
  'theorem': '定理'
};

export const SHAPE_SYMBOLS: Record<number, string> = {
  '0': '●',
  '1': '■'
};

export const PRIMARY_LOCALE = 'zh';
