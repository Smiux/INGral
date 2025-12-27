import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

export type Position = 'left' | 'top' | 'right' | 'bottom';

export type NodeShape = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | string;

export type NodeType = 'concept' | 'article' | 'resource' | 'aggregate' | string;

export type LayoutType = 'force' | 'tree' | 'hierarchical' | 'circular' | 'grid' | 'radial' | 'geographic';

export type LayoutDirection = 'top-bottom' | 'left-right' | 'bottom-top' | 'right-left';

export type ViewMode = '2d' | '3d';

export interface NodeState {
  isExpanded: boolean;
  isFixed: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isDragging: boolean;
  isCollapsed: boolean;
}

export interface NodeMetadata {
  slug?: string;
  content?: string;
  is_custom: boolean;
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface NodeLayout {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  z?: number;
  fz?: number | null;
  isFixed: boolean;
  isExpanded: boolean;
}

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textFill?: string;
  radius?: number;
  opacity?: number;
  arrowCount?: number;
}

export interface NodeHandles {
  handleCount: number;
  handlePositions?: Position[];
  lockedHandles: Record<string, boolean>;
  handleLabels: Record<string, string>;
}

export interface NodeGroup {
  groupId?: string;
  isGroup: boolean;
  memberIds: string[];
  groupTitle?: string;
  groupType?: string;
  isGroupExpanded: boolean;
}

export interface GraphNode {
  id: string;
  title: string;
  connections: number;
  type?: NodeType;
  shape: NodeShape;
  description?: string;
  content?: string;
  creator_id?: string;
  color?: string;
  size?: number;
  x?: number;
  y?: number;
  z?: number;
  style?: NodeStyle;
  state: NodeState;
  metadata: NodeMetadata;
  layout: NodeLayout;
  handles: NodeHandles;
  group: NodeGroup;
  customData?: Record<string, unknown>;
}

export interface ConnectionState {
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
}

export interface ConnectionMetadata {
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  description?: string;
}

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

export interface ConnectionAnimation {
  dynamicEffect?: string;
  animationType?: 'none' | 'pulse' | 'flow' | 'bounce';
  animationSpeed?: number;
  animationDirection?: 'forward' | 'backward' | 'alternate';
  isAnimating: boolean;
}

export interface ConnectionStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  arrowCount?: number;
}

export interface GraphConnection {
  id: string;
  source: string | number;
  target: string | number;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: string;
  weight: number;
  label?: string;
  style?: ConnectionStyle;
  metadata: ConnectionMetadata;
  state: ConnectionState;
  curveControl: ConnectionCurveControl;
  animation: ConnectionAnimation;
  customData?: Record<string, unknown>;
}

export interface GraphMetadata {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  tags?: string[];
  category?: string;
  visibility?: 'public' | 'private';
  thumbnail?: string;
  is_published: boolean;
  publish_date?: number;
}

export interface ForceParameters {
  charge?: number;
  linkStrength?: number;
  linkDistance?: number;
  gravity?: number;
}

export interface GraphConfig {
  defaultLayout: {
    type: LayoutType;
    direction: LayoutDirection;
    nodeSpacing: number;
    levelSpacing: number;
    forceParameters?: ForceParameters;
  };
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
  rendering: {
    enableAnimations: boolean;
    animationSpeed: number;
    enableLabels: boolean;
    enableTooltips: boolean;
    enableContextMenu: boolean;
    enableAutoLayout: boolean;
  };
  performance: {
    maxNodes: number;
    maxConnections: number;
    enableNodeCulling: boolean;
    enableConnectionCulling: boolean;
    cullingDistance: number;
  };
}

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

export interface SavedLayout {
  id: string;
  name: string;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  nodePositions: Record<string, { x: number; y: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphData {
  metadata: GraphMetadata;
  config: GraphConfig;
  nodes: GraphNode[];
  connections: GraphConnection[];
  stats?: GraphStats;
  savedLayouts?: SavedLayout[];
  customData?: Record<string, unknown>;
}

export interface CustomNodeData {
  node: GraphNode;
  [key: string]: unknown;
}

export type CustomNode = ReactFlowNode<CustomNodeData>;

export interface CustomEdgeData {
  connection: GraphConnection;
  [key: string]: unknown;
}

export type CustomEdge = ReactFlowEdge<CustomEdgeData>;

export type GraphAction =
  | { type: 'SET_NODES'; payload: GraphNode[] }
  | { type: 'SET_CONNECTIONS'; payload: GraphConnection[] }
  | { type: 'ADD_NODE'; payload: GraphNode }
  | { type: 'UPDATE_NODE'; payload: GraphNode }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_CONNECTION'; payload: GraphConnection }
  | { type: 'UPDATE_CONNECTION'; payload: GraphConnection }
  | { type: 'DELETE_CONNECTION'; payload: string }
  | { type: 'SET_REACT_FLOW_INSTANCE'; payload: unknown }
  | { type: 'SELECT_NODE'; payload: GraphNode | null }
  | { type: 'SELECT_NODES'; payload: GraphNode[] }
  | { type: 'SELECT_CONNECTION'; payload: GraphConnection | null }
  | { type: 'SELECT_CONNECTIONS'; payload: GraphConnection[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_IS_ADDING_CONNECTION'; payload: boolean }
  | { type: 'SET_CONNECTION_SOURCE_NODE'; payload: GraphNode | null }
  | { type: 'SET_MOUSE_POSITION'; payload: { x: number; y: number } | null }
  | { type: 'SET_IS_SIMULATION_RUNNING'; payload: boolean }
  | { type: 'SET_LAYOUT_TYPE'; payload: LayoutType }
  | { type: 'SET_LAYOUT_DIRECTION'; payload: LayoutDirection }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_IS_RIGHT_PANEL_VISIBLE'; payload: boolean }
  | { type: 'SET_IS_TOOLBAR_VISIBLE'; payload: boolean }
  | { type: 'SET_IS_LEFT_TOOLBAR_VISIBLE'; payload: boolean }
  | { type: 'SET_ACTIVE_PANEL'; payload: string }
  | { type: 'SET_IS_BOX_SELECTING'; payload: boolean }
  | { type: 'SET_BOX_SELECTION'; payload: { x1: number; y1: number; x2: number; y2: number } }
  | { type: 'SET_IS_SETTINGS_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_TOOLBAR_AUTO_HIDE'; payload: boolean }
  | { type: 'SET_LEFT_TOOLBAR_AUTO_HIDE'; payload: boolean }
  | { type: 'SET_NODE_SPACING'; payload: number }
  | { type: 'SET_LEVEL_SPACING'; payload: number }
  | { type: 'SET_FORCE_PARAMETERS'; payload: ForceParameters }
  | { type: 'SET_SAVED_LAYOUTS'; payload: SavedLayout[] }
  | { type: 'ADD_SAVED_LAYOUT'; payload: SavedLayout }
  | { type: 'DELETE_SAVED_LAYOUT'; payload: string }
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; type: 'success' | 'error' | 'info' | 'warning' } }
  | { type: 'CLOSE_NOTIFICATION' }
  | { type: 'ADD_HISTORY'; payload: unknown }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_CLUSTERS'; payload: Record<string, number> }
  | { type: 'SET_CLUSTER_COLORS'; payload: string[] }
  | { type: 'SET_CLUSTER_COUNT'; payload: number }
  | { type: 'SET_IS_CLUSTERING_ENABLED'; payload: boolean }
  | { type: 'GROUP_NODES'; payload: { nodes: GraphNode[]; group: GraphNode } }
  | { type: 'UNGROUP_NODES'; payload: string };

export interface GraphState {
  nodes: GraphNode[];
  connections: GraphConnection[];
  reactFlowInstance: unknown;
  selectedNode: GraphNode | null;
  selectedNodes: GraphNode[];
  selectedConnection: GraphConnection | null;
  selectedConnections: GraphConnection[];
  isAddingConnection: boolean;
  connectionSourceNode: GraphNode | null;
  mousePosition: { x: number; y: number } | null;
  isSimulationRunning: boolean;
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  viewMode: ViewMode;
  isRightPanelVisible: boolean;
  isToolbarVisible: boolean;
  isLeftToolbarVisible: boolean;
  activePanel: string;
  isBoxSelecting: boolean;
  boxSelection: { x1: number; y1: number; x2: number; y2: number };
  isSettingsPanelOpen: boolean;
  toolbarAutoHide: boolean;
  leftToolbarAutoHide: boolean;
  nodeSpacing: number;
  levelSpacing: number;
  forceParameters: ForceParameters;
  savedLayouts: SavedLayout[];
  notification: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  history: HistoryEntry[];
  historyIndex: number;
  clusters: Record<string, number>;
  clusterColors: string[];
  clusterCount: number;
  isClusteringEnabled: boolean;
}

export interface HistoryEntry {
  type: string;
  nodeId?: string;
  connectionId?: string;
  groupId?: string;
  timestamp: number;
  data: 
    | { type: 'addNode'; node: GraphNode; connections: GraphConnection[] }
    | { type: 'deleteNode'; node: GraphNode; connections: GraphConnection[] }
    | { type: 'addConnection'; connection: GraphConnection }
    | { type: 'deleteConnection'; connection: GraphConnection }
    | { type: 'groupNodes'; group: GraphNode; nodes: GraphNode[] }
    | { type: 'ungroupNodes'; group: GraphNode; nodes: GraphNode[] };
}

export interface GraphActions {
  setNodes: (_nodes: GraphNode[]) => void;
  setConnections: (_connections: GraphConnection[]) => void;
  addNode: (_node: GraphNode) => void;
  updateNode: (_node: GraphNode) => void;
  deleteNode: (_nodeId: string) => void;
  addConnection: (_connection: GraphConnection) => void;
  updateConnection: (_connection: GraphConnection) => void;
  deleteConnection: (_connectionId: string) => void;
  selectNode: (_node: GraphNode | null) => void;
  selectNodes: (_nodes: GraphNode[]) => void;
  selectConnection: (_connection: GraphConnection | null) => void;
  selectConnections: (_connections: GraphConnection[]) => void;
  clearSelection: () => void;
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  setConnectionSourceNode: (_node: GraphNode | null) => void;
  setMousePosition: (_position: { x: number; y: number } | null) => void;
  setIsSimulationRunning: (_isRunning: boolean) => void;
  setLayoutType: (_layoutType: LayoutType) => void;
  setLayoutDirection: (_layoutDirection: LayoutDirection) => void;
  setViewMode: (_viewMode: ViewMode) => void;
  setIsRightPanelVisible: (_isVisible: boolean) => void;
  setIsToolbarVisible: (_isVisible: boolean) => void;
  setIsLeftToolbarVisible: (_isVisible: boolean) => void;
  setActivePanel: (_panel: string) => void;
  setIsBoxSelecting: (_isBoxSelecting: boolean) => void;
  setBoxSelection: (_selection: { x1: number; y1: number; x2: number; y2: number }) => void;
  setIsSettingsPanelOpen: (_isOpen: boolean) => void;
  setToolbarAutoHide: (_autoHide: boolean) => void;
  setLeftToolbarAutoHide: (_autoHide: boolean) => void;
  setNodeSpacing: (_spacing: number) => void;
  setLevelSpacing: (_spacing: number) => void;
  setForceParameters: (_parameters: ForceParameters) => void;
  setSavedLayouts: (_layouts: SavedLayout[]) => void;
  addSavedLayout: (_layout: SavedLayout) => void;
  deleteSavedLayout: (_layoutId: string) => void;
  showNotification: (_message: string, _type: 'success' | 'error' | 'info' | 'warning') => void;
  closeNotification: () => void;
  undo: () => void;
  redo: () => void;
  setClusters: (_clusters: Record<string, number>) => void;
  setClusterColors: (_colors: string[]) => void;
  setClusterCount: (_count: number) => void;
  setIsClusteringEnabled: (_enabled: boolean) => void;
  groupNodes: (_nodes: GraphNode[], _group: GraphNode) => void;
  ungroupNodes: (_groupId: string) => void;
  handleImportGraph: (_graph: { nodes: GraphNode[]; connections: GraphConnection[] }) => void;
  handleSaveLayout: (_layout: SavedLayout) => void;
  handleLoadLayout: (_layoutId: string) => void;
  handleDeleteLayout: (_layoutId: string) => void;
  addHistory: (_history: HistoryEntry) => void;
  setReactFlowInstance: (_instance: unknown) => void;
}

export interface GraphContextValue {
  state: GraphState;
  actions: GraphActions;
}
