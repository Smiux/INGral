/**
 * 知识图谱可视化组件类型定义
 * 提供所有图谱相关组件共享的类型定义
 */



// 基础节点数据接口
export interface BaseNodeData {
  id: string;
  title: string;
  connections: number;
}

// 节点形状类型
export type NodeShape = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | string;

// 节点类型
export type NodeType = 'concept' | 'article' | 'resource' | 'aggregate' | string;

// 增强节点接口
export interface EnhancedNode extends BaseNodeData {
  // 基础属性
  slug?: string;
  content?: string;
  is_custom?: boolean;
  created_by?: string;
  createdAt?: number;

  // 类型和形状
  type?: NodeType;
  shape?: NodeShape;

  // 布局相关
  isExpanded?: boolean;
  isFixed?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;

  // 地理布局相关
  latitude?: number;
  longitude?: number;
  location?: string;

  // 语义搜索相关
  semantic_score?: number;
  search_rank?: number;
  entity_matches?: Array<{ text: string; type: string }>;
  matched_concepts?: string[];

  // 节点聚合相关
  _aggregatedNodes?: EnhancedNode[];
  _isAggregated?: boolean;
  _averageImportance?: number;
  _clusterCenter?: { x: number; y: number };
  _clusterSize?: number;

  // 动画相关
  _targetX?: number;
  _targetY?: number;

  // 节点分组相关
  groupId?: string;
  isGroup?: boolean;
  memberIds?: string[];
  groupTitle?: string;
  groupType?: string;

  // 连接点相关
  handleCount?: number;
  handlePositions?: Position[];
  lockedHandles?: Record<string, boolean>;

  // 自定义属性扩展
  [key: string]: unknown;
}

// 基础连接数据接口
export interface BaseConnectionData {
  id: string;
  source: EnhancedNode | string | number;
  target: EnhancedNode | string | number;
  type: string;
}

// 增强连接接口
export interface EnhancedGraphConnection extends BaseConnectionData {
  // 连接权重
  weight?: number;

  // 连接标签
  label?: string;

  // 曲线控制属性
  controlPointsCount?: number;
  dynamicEffect?: string;
  controlPoints?: Array<{ x: number; y: number; isLocked?: boolean }>;

  // 样式属性
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    animation?: string;
    arrowCount?: number;
    [key: string]: unknown;
  };

  // 自定义属性扩展
  [key: string]: unknown;
}

// 图表数据接口
export interface GraphData {
  id?: string | number;
  name?: string;
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  is_template?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

// 节点样式配置
export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius?: number;
  fontSize: number;
  textFill: string;
  hoverStrokeWidth?: number;
  borderRadius?: number;
  selectedStrokeWidth?: number;
  hoverTextFill?: string;
  selectedFill?: string;
  selectedStroke?: string;
  [key: string]: unknown;
}

// 节点主题配置
export interface NodeTheme {
  [type: string]: NodeStyle;
}

// 连接样式配置
export interface ConnectionStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  animation?: string;
  arrowCount?: number;
  strokeOpacity?: number;
  [key: string]: unknown;
}

// 连接主题配置
export interface ConnectionTheme {
  [type: string]: ConnectionStyle;
}

// 链接样式接口
export interface LinkStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
}

// 图表主题接口
export interface GraphTheme {
  id: string;
  name: string;
  node: NodeStyle;
  link: LinkStyle;
  backgroundColor: string;
}

// 连接点配置
export interface HandleConfig {
  id: string;
  type: 'source' | 'target' | 'both';
  position: Position;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

// 连接点位置类型
export type Position = 'left' | 'top' | 'right' | 'bottom' | { x: number; y: number };

// 连接点配置
export interface ConnectionPoint {
  id: string;
  position: Position;
  type: 'source' | 'target' | 'both';
  style?: React.CSSProperties;
  isVisible?: boolean;
  isLocked?: boolean;
}

// 节点形状渲染配置
export interface ShapeConfig {
  render: (_props: { style: NodeStyle; radius: number; contentWidth?: number; contentHeight?: number; [key: string]: unknown }) => React.ReactNode;
  handlePositions?: Position[];
  generateHandlePositions?: (_props: { radius: number; count: number; shape: string }) => Position[];
  [key: string]: unknown;
}

// 节点形状配置映射
export interface ShapeConfigMap {
  [shape: string]: ShapeConfig;
}

// 节点配置
export interface NodeConfig {
  type: string;
  shape?: string;
  handles?: HandleConfig[];
  style?: NodeStyle;
  [key: string]: unknown;
}

// 节点配置映射
export interface NodeConfigMap {
  [type: string]: NodeConfig;
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
