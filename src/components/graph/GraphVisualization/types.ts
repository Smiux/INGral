/**
 * 知识图谱可视化组件类型定义
 * 提供所有图谱相关组件共享的类型定义
 */



// 节点数据接口
export interface NodeData {
  id?: string | number;
  name?: string;
  // 添加title属性
  title?: string;
  created_by?: string;
  connections?: number;
  created_at?: string;
}

// 连接数据接口
export interface ConnectionData {
  id?: string | number;
  source?: string | number | NodeData;
  target?: string | number | NodeData;
  type?: string;
  created_at?: string;
}

// 图表数据接口
export interface GraphData {
  id?: string | number;
  // 修改为可选属性
  name?: string;
  nodes: NodeData[];
  connections: ConnectionData[];
  is_template?: boolean;
  // 添加创建时间属性
  created_at?: string;
}

// 增强节点接口
export interface EnhancedNode {
  id: string;
  title: string;
  slug?: string;
  connections: number;
  content?: string;
  is_custom?: boolean;
  // 改为可选字段，与GraphNode接口保持一致
  created_by?: string;
  createdAt?: number;
  type?: 'concept' | 'article' | 'resource' | 'aggregate' | string;
  // 新增：用于自定义节点形状
  shape?: 'circle' | 'rectangle' | 'triangle' | 'hexagon' | 'diamond' | string;
  // 新增：用于控制节点在树形布局中是否展开
  isExpanded?: boolean;
  // 新增：用于控制节点是否固定位置
  isFixed?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  // 地理布局相关属性
  latitude?: number;
  longitude?: number;
  location?: string;
  // 语义搜索相关属性
  semantic_score?: number;
  search_rank?: number;
  entity_matches?: Array<{ text: string; type: string }>;
  matched_concepts?: string[];
  // 节点聚合相关属性
  _aggregatedNodes?: EnhancedNode[];
  _isAggregated?: boolean;
  _averageImportance?: number;
  _clusterCenter?: { x: number; y: number };
  _clusterSize?: number;
  // 动画相关属性
  // 目标X坐标，用于平滑动画
  _targetX?: number;
  // 目标Y坐标，用于平滑动画
  _targetY?: number;
  // 节点分组相关属性
  // 所属分组ID
  groupId?: string;
  // 是否为分组节点
  isGroup?: boolean;
  // 分组包含的节点ID列表
  memberIds?: string[];
  // 分组标题
  groupTitle?: string;
  // 分组类型
  groupType?: string;
}

// 增强连接接口
export interface EnhancedGraphConnection {
  type: string;
  id: string;
  // 明确声明source和target的类型，支持节点对象或ID
  source: EnhancedNode | string | number;
  target: EnhancedNode | string | number;
  // 连接权重，用于力导向布局和重要性排序
  weight?: number;
  // 连接标签，用于显示连接类型或描述
  label?: string;
}

// 布局类型
export type LayoutType = 'force' | 'tree' | 'hierarchical' | 'circular' | 'grid' | 'radial' | 'geographic';

// 布局方向
export type LayoutDirection = 'top-bottom' | 'left-right' | 'bottom-top' | 'right-left';

// 自定义布局配置接口
export interface CustomLayout {
  id: string;
  name: string;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  nodeSpacing?: number;
  levelSpacing?: number;
  forceParameters?: ForceParameters | undefined;
  createdAt: number;
  updatedAt: number;
}

// 保存的布局数据接口
export interface SavedLayout {
  id: string;
  name: string;
  layout: CustomLayout;
  nodePositions: Record<string, { x: number; y: number }>;
  createdAt: number;
  updatedAt: number;
}

// 操作历史记录类型
export type RecentAction =
  | { type: 'addNode'; nodeId: string; timestamp: number; data: { node: EnhancedNode } }
  | { type: 'deleteNode'; nodeId: string; timestamp: number; data: { node: EnhancedNode; connections: EnhancedGraphConnection[] } }
  | { type: 'addConnection'; connectionId: string; timestamp: number; data: EnhancedGraphConnection }
  | { type: 'deleteConnection'; connectionId: string; timestamp: number; data: EnhancedGraphConnection }
  | { type: 'groupNodes'; groupId: string; timestamp: number; data: { nodes: EnhancedNode[]; group: EnhancedNode } }
  | { type: 'ungroupNodes'; groupId: string; timestamp: number; data: { nodes: EnhancedNode[]; group: EnhancedNode } };

// 图谱控制属性
export interface GraphControlsProps {
  isEditMode: boolean;
  setIsEditMode: (_isEditMode: boolean) => void;
  isSimulationRunning: boolean;
  setIsSimulationRunning: (_isRunning: boolean) => void;
  layoutType: LayoutType;
  setLayoutType: (_layout: LayoutType) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (_direction: LayoutDirection) => void;
  isAddingConnection: boolean;
  cancelAddConnection: () => void;
}

// 节点管理属性
export interface NodeManagementProps {
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  selectedNode: EnhancedNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  selectedNodes: EnhancedNode[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
  onAddNode?: (_node: EnhancedNode) => void;
  onDeleteNodes?: (_nodes: EnhancedNode[], _connections: EnhancedGraphConnection[]) => void;
}

// 连接管理属性
export interface ConnectionManagementProps {
  connections: EnhancedGraphConnection[];
  setConnections: React.Dispatch<React.SetStateAction<EnhancedGraphConnection[]>>;
  nodes: EnhancedNode[];
  setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
  isAddingConnection: boolean;
  setIsAddingConnection: React.Dispatch<React.SetStateAction<boolean>>;
  connectionSourceNode: EnhancedNode | null;
  setConnectionSourceNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
  mousePosition: { x: number; y: number } | null;
  setMousePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
}

// 力导向布局参数接口
export interface ForceParameters {
  charge?: number;
  linkStrength?: number;
  linkDistance?: number;
  gravity?: number;
}

// 图谱画布属性
export interface GraphCanvasProps {
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  isSimulationRunning: boolean;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  nodeSpacing?: number;
  levelSpacing?: number;
  forceParameters?: ForceParameters;
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  onNodeClick: (_node: EnhancedNode, _event: React.MouseEvent) => void;
  onNodeDragStart: (_node: EnhancedNode) => void;
  onNodeDragEnd: (_node: EnhancedNode) => void;
  onConnectionClick: (_connection: EnhancedGraphConnection) => void;
  onCanvasClick: (_event: React.MouseEvent) => void;
  onCanvasDrop: (_event: React.DragEvent, _x: number, _y: number) => void;
  onBoxSelectStart: (_x: number, _y: number) => void;
  onBoxSelectUpdate: (_x: number, _y: number) => void;
  onBoxSelectEnd: () => void;
  isBoxSelecting: boolean;
  boxSelection: { x1: number; y1: number; x2: number; y2: number };
  // 主题样式
  theme: import('./ThemeTypes').GraphTheme;
  // 是否正在添加连接
  isAddingConnection?: boolean;
  // 连接源节点
  connectionSourceNode?: EnhancedNode | null;
  // 当前鼠标位置
  mousePosition?: { x: number; y: number } | null;
}

// 布局管理属性
export interface LayoutManagerProps {
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  width: number;
  height: number;
}

// 聚类分析属性
export interface ClusterAnalysisProps {
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  clusters: Record<string, number>;
  setClusters: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  clusterColors: string[];
  setClusterColors: React.Dispatch<React.SetStateAction<string[]>>;
  clusterCount: number;
  setClusterCount: React.Dispatch<React.SetStateAction<number>>;
  isClusteringEnabled: boolean;
  setIsClusteringEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}
