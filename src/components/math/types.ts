export type NodeType = 'Theorem' | 'Definition' | 'Instance' | 'Class' | 'Inductive' | 'Constructor';

export interface MathNode {
  id: string;
  name: string;
  type: NodeType;
  branch: string;
  module: string;
  degree: number;
}

export interface MathEdge {
  source: string;
  target: string;
}

export interface NodeData {
  id: string;
  type: NodeType;
  module: string;
  branch: string;
  declType: string;
  docString: string | null;
  moduleDoc: string;
  directDeps: string[];
  indirectDeps: string[];
  specialDeps: string[];
  extendsClasses: string[];
  sameModule: string[];
  goalState: string | null;
  proofTactic: string | null;
  sourceCode: string;
}

export interface MathMetadata {
  totalNodes: number;
  totalEdges: number;
  branches: Record<string, { color: string; count: number }>;
  nodeTypes: Record<string, number>;
  nodesChunks: number;
  edgesChunks: number;
  nodesdataChunks: number;
  moduleChunkMap: Record<string, number>;
}

export const NODE_TYPE_SHAPES: Record<NodeType, number> = {
  'Theorem': 0,
  'Definition': 1,
  'Inductive': 2,
  'Instance': 3,
  'Constructor': 4,
  'Class': 6
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  'Theorem': '定理',
  'Definition': '定义',
  'Instance': '实例',
  'Class': '类',
  'Inductive': '归纳类型',
  'Constructor': '构造器'
};
