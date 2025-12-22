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

// 节点形状类型
export type NodeShape = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | string;

// 节点类型
export type NodeType = 'concept' | 'article' | 'resource' | 'aggregate' | string;

// 节点样式接口（增强版）
export interface NodeStyleEnhanced extends NodeStyle {
  // 扩展样式属性
  boxShadow?: string;
  textShadow?: string;
  opacity?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
}

// 节点状态接口
export interface NodeState {
  isExpanded: boolean;
  isFixed: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isDragging: boolean;
  isCollapsed: boolean;
}

// 节点元数据接口
export interface NodeMetadata {
  slug?: string;
  content?: string;
  is_custom: boolean;
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// 节点布局接口
export interface NodeLayout {
  // 2D布局
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;

  // 3D布局（预留）
  z?: number;
  fz?: number | null;

  // 固定状态
  isFixed: boolean;

  // 扩展状态
  isExpanded: boolean;
}

// 节点地理信息接口
export interface NodeGeolocation {
  latitude?: number;
  longitude?: number;
  location?: string;
  region?: string;
  country?: string;
}

// 节点语义信息接口
export interface NodeSemantics {
  semantic_score?: number;
  search_rank?: number;
  entity_matches?: Array<{ text: string; type: string; score: number }>;
  matched_concepts?: Array<{ id: string; name: string; relevance: number }>;
  keywords?: Array<{ text: string; weight: number }>;
  topics?: Array<{ id: string; name: string; confidence: number }>;
}

// 节点聚合信息接口
export interface NodeAggregation {
  _aggregatedNodes: EnhancedNode[];
  _isAggregated: boolean;
  _averageImportance: number;
  _clusterCenter: { x: number; y: number };
  _clusterSize: number;
  _aggregationLevel: number;
}

// 节点动画信息接口
export interface NodeAnimation {
  _targetX?: number;
  _targetY?: number;
  _targetZ?: number;
  _velocityX?: number;
  _velocityY?: number;
  _velocityZ?: number;
  _animationProgress?: number;
}

// 节点分组信息接口
export interface NodeGroup {
  groupId?: string;
  isGroup: boolean;
  memberIds: string[];
  groupTitle?: string;
  groupType?: string;
  isGroupExpanded: boolean;
}

// 节点连接点信息接口
export interface NodeHandles {
  handleCount: number;
  handlePositions: Position[];
  lockedHandles: Record<string, boolean>;
  handleLabels: Record<string, string>;
}

// 增强节点接口（优化版）
export interface EnhancedNode extends BaseNodeData {
  // 基础属性
  type: NodeType;
  shape: NodeShape;

  // 样式
  style?: NodeStyleEnhanced;

  // 状态
  state: NodeState;

  // 元数据
  metadata: NodeMetadata;

  // 布局
  layout: NodeLayout;

  // 地理信息
  geolocation?: NodeGeolocation;

  // 语义信息
  semantics?: NodeSemantics;

  // 聚合信息
  aggregation?: NodeAggregation;

  // 动画信息
  animation?: NodeAnimation;

  // 分组信息
  group: NodeGroup;

  // 连接点信息
  handles: NodeHandles;

  // 自定义数据扩展（使用泛型增强类型安全性）
  customData?: Record<string, unknown>;
}

// 基础连接数据接口
export interface BaseConnectionData {
  id: string;
  source: EnhancedNode | string | number;
  target: EnhancedNode | string | number;
  type: string;
}

// 连接样式接口（增强版）
export interface ConnectionStyleEnhanced extends ConnectionStyle {
  // 扩展样式属性
  strokeLinecap?: string;
  strokeLinejoin?: string;
  strokeDashoffset?: string;
  opacity?: number;
  arrowSize?: number;
  arrowColor?: string;
  arrowType?: 'default' | 'triangle' | 'circle' | 'diamond' | 'none';
  labelStyle?: {
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
  };
}

// 连接元数据接口
export interface ConnectionMetadata {
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  description?: string;
}

// 连接状态接口
export interface ConnectionState {
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
}

// 连接曲线控制接口
export interface ConnectionCurveControl {
  controlPointsCount: number;
  controlPoints: Array<{
    x: number;
    y: number;
    isLocked: boolean;
    label?: string;
  }>;
  curveType: 'default' | 'smoothstep' | 'step' | 'straight' | 'custom';
  tension?: number;
  locked: boolean;
}

// 连接语义信息接口
export interface ConnectionSemantics {
  relevanceScore?: number;
  relationshipType?: string;
  confidenceLevel?: number;
  tags?: string[];
  description?: string;
  sourceAnchor?: string;
  targetAnchor?: string;
}

// 连接动画信息接口
export interface ConnectionAnimation {
  dynamicEffect?: string;
  animationType?: 'none' | 'pulse' | 'flow' | 'bounce';
  animationSpeed?: number;
  animationDirection?: 'forward' | 'backward' | 'alternate';
  isAnimating: boolean;
}

// 增强连接接口（优化版）
export interface EnhancedGraphConnection extends BaseConnectionData {
  // 基础属性
  weight: number;
  label?: string;

  // 样式
  style: ConnectionStyleEnhanced;

  // 元数据
  metadata: ConnectionMetadata;

  // 状态
  state: ConnectionState;

  // 曲线控制
  curveControl: ConnectionCurveControl;

  // 语义信息
  semantics?: ConnectionSemantics;

  // 动画信息
  animation: ConnectionAnimation;

  // 自定义属性扩展
  customData?: Record<string, unknown>;

  // 确保source和target可以是字符串或EnhancedNode对象
  source: string | number | EnhancedNode;
  target: string | number | EnhancedNode;
}

// 图谱元数据接口
export interface GraphMetadata {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  is_template: boolean;
  tags?: string[];
  category?: string;
  visibility?: 'public' | 'private' | 'shared';
  thumbnail?: string;
  is_published: boolean;
  publish_date?: number;
}

// 图谱配置接口
export interface GraphConfig {
  // 布局配置
  defaultLayout: {
    type: LayoutType;
    direction: LayoutDirection;
    nodeSpacing: number;
    levelSpacing: number;
    forceParameters?: ForceParameters;
  };

  // 主题配置
  defaultTheme: string;

  // 交互配置
  interaction: {
    enableDrag: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    enableSelection: boolean;
    enableConnection: boolean;
    enableBoxSelection: boolean;
    enableNodeResizing: boolean;
    enableNodeRotation: boolean;
  };

  // 渲染配置
  rendering: {
    enableAnimations: boolean;
    animationSpeed: number;
    enableLabels: boolean;
    enableTooltips: boolean;
    enableContextMenu: boolean;
    enableAutoLayout: boolean;
  };

  // 性能配置
  performance: {
    maxNodes: number;
    maxConnections: number;
    enableNodeCulling: boolean;
    enableConnectionCulling: boolean;
    cullingDistance: number;
  };
}

// 图谱统计信息接口
export interface GraphStats {
  nodeCount: number;
  connectionCount: number;
  nodeTypes: Record<string, number>;
  connectionTypes: Record<string, number>;
  averageNodeConnections: number;
  graphDensity: number;
  clusteringCoefficient: number;
  diameter: number;
  radius: number;
}

// 图表数据接口（优化版）
export interface GraphData {
  // 元数据
  metadata: GraphMetadata;

  // 配置
  config: GraphConfig;

  // 数据
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];

  // 统计信息（动态计算）
  stats?: GraphStats;

  // 保存的布局
  savedLayouts?: SavedLayout[];

  // 自定义数据扩展
  customData?: Record<string, unknown>;
}

// 节点主题配置
export interface NodeTheme {
  [type: string]: NodeStyle;
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
  setNodes: (_nodes: EnhancedNode[]) => void;
  selectedNode: EnhancedNode | null;
  setSelectedNode: (_node: EnhancedNode | null) => void;
  selectedNodes: EnhancedNode[];
  setSelectedNodes: (_nodes: EnhancedNode[]) => void;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
  onAddNode?: (_node: EnhancedNode) => void;
  onDeleteNodes?: (_nodes: EnhancedNode[], _connections: EnhancedGraphConnection[]) => void;
}

// 连接管理属性
export interface ConnectionManagementProps {
  connections: EnhancedGraphConnection[];
  setConnections: (_connections: EnhancedGraphConnection[]) => void;
  nodes: EnhancedNode[];
  setNodes: (_nodes: EnhancedNode[]) => void;
  isAddingConnection: boolean;
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  connectionSourceNode: EnhancedNode | null;
  setConnectionSourceNode: (_node: EnhancedNode | null) => void;
  mousePosition: { x: number; y: number } | null;
  setMousePosition: (_position: { x: number; y: number } | null) => void;
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
