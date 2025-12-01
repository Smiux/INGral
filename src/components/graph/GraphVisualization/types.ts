/**
 * 知识图谱可视化组件类型定义
 * 提供所有图谱相关组件共享的类型定义
 */

import type * as d3 from 'd3';

// 节点数据接口
export interface NodeData {
  id?: string | number;
  name?: string;
  title?: string; // 添加title属性
  created_by?: string;
  connections?: number;
  created_at?: string;
}

// 链接数据接口
export interface LinkData {
  id?: string | number;
  source?: string | number | NodeData;
  target?: string | number | NodeData;
  type?: string;
  created_at?: string;
}

// 图表数据接口
export interface GraphData {
  id?: string | number;
  name?: string; // 修改为可选属性
  nodes: NodeData[];
  links: LinkData[];
  is_template?: boolean;
  created_at?: string; // 添加创建时间属性
}

// 增强节点接口，扩展d3.SimulationNodeDatum
export interface EnhancedNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  slug?: string;
  connections: number;
  content?: string;
  is_custom?: boolean;
  created_by?: string; // 改为可选字段，与GraphNode接口保持一致
  createdAt?: number;
  type?: 'concept' | 'article' | 'resource' | string;
}

// 增强链接接口，扩展d3.SimulationLinkDatum
export interface EnhancedGraphLink extends d3.SimulationLinkDatum<EnhancedNode> {
  type: string;
  id: string;
  // 明确声明source和target的类型，支持节点对象或ID
  source: EnhancedNode | string | number;
  target: EnhancedNode | string | number;
}

// 布局类型
export type LayoutType = 'force' | 'hierarchical' | 'circular' | 'grid';

// 布局方向
export type LayoutDirection = 'top-bottom' | 'left-right';

// 操作历史记录类型
export type RecentAction =
  | { type: 'addNode'; nodeId: string; timestamp: number; data: { node: EnhancedNode } }
  | { type: 'deleteNode'; nodeId: string; timestamp: number; data: { node: EnhancedNode; links: EnhancedGraphLink[] } }
  | { type: 'addLink'; linkId: string; timestamp: number; data: EnhancedGraphLink }
  | { type: 'deleteLink'; linkId: string; timestamp: number; data: EnhancedGraphLink };

// 图谱控制属性
export interface GraphControlsProps {
  isEditMode: boolean;
  setIsEditMode: (isEditMode: boolean) => void;
  isSimulationRunning: boolean;
  setIsSimulationRunning: (isRunning: boolean) => void;
  layoutType: LayoutType;
  setLayoutType: (layout: LayoutType) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (direction: LayoutDirection) => void;
  isAddingLink: boolean;
  cancelAddLink: () => void;
}

// 节点管理属性
export interface NodeManagementProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  selectedNode: EnhancedNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  selectedNodes: EnhancedNode[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  onAddNode?: (node: EnhancedNode) => void;
  onDeleteNodes?: (nodes: EnhancedNode[], links: EnhancedGraphLink[]) => void;
}

// 链接管理属性
export interface LinkManagementProps {
  links: EnhancedGraphLink[];
  setLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
  nodes: EnhancedNode[];
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  isAddingLink: boolean;
  setIsAddingLink: React.Dispatch<React.SetStateAction<boolean>>;
  linkSourceNode: EnhancedNode | null;
  setLinkSourceNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  mousePosition: { x: number; y: number } | null;
  setMousePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

// 图谱画布属性
export interface GraphCanvasProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  isSimulationRunning: boolean;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  onNodeClick: (node: EnhancedNode) => void;
  onNodeDragStart: (node: EnhancedNode) => void;
  onNodeDragEnd: (node: EnhancedNode) => void;
  onLinkClick: (link: EnhancedGraphLink) => void;
  onCanvasClick: (event: React.MouseEvent) => void;
  onCanvasDrop: (event: React.DragEvent, x: number, y: number) => void;
  theme: import('./ThemeTypes').GraphTheme; // 主题样式
}

// 布局管理属性
export interface LayoutManagerProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  width: number;
  height: number;
}

// 聚类分析属性
export interface ClusterAnalysisProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  clusters: Record<string, number>;
  setClusters: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  clusterColors: string[];
  setClusterColors: React.Dispatch<React.SetStateAction<string[]>>;
  clusterCount: number;
  setClusterCount: React.Dispatch<React.SetStateAction<number>>;
  isClusteringEnabled: boolean;
  setIsClusteringEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}
