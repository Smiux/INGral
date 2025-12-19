import { createContext } from 'react';
import type { ReactFlowInstance } from 'reactflow';
import type { EnhancedNode, EnhancedGraphConnection, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

// ===========================
// 类型定义
// ===========================

// 图谱状态接口
export interface GraphState {
  // 节点和连接数据
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  selectedConnection: EnhancedGraphConnection | null;
  selectedConnections: EnhancedGraphConnection[];
  // ReactFlow实例引用
  reactFlowInstance: ReactFlowInstance | null;

  // 交互状态
  isAddingConnection: boolean;
  connectionSourceNode: EnhancedNode | null;
  mousePosition: { x: number; y: number } | null;
  isSimulationRunning: boolean;

  // 布局状态
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  viewMode: '2d' | '3d';

  // UI状态
  isRightPanelVisible: boolean;
  isToolbarVisible: boolean;
  isLeftToolbarVisible: boolean;
  activePanel: string | null;
  currentTheme: GraphTheme;
  copiedStyle: { type: 'node' | 'connection'; style: NodeStyle | LinkStyle } | null;
  isBoxSelecting: boolean;
  boxSelection: { x1: number; y1: number; x2: number; y2: number };
  isSettingsPanelOpen: boolean;
  toolbarAutoHide: boolean;
  leftToolbarAutoHide: boolean;

  // 布局参数
  nodeSpacing: number;
  levelSpacing: number;
  forceParameters: ForceParameters;

  // 保存的布局
  savedLayouts: SavedLayout[];

  // 通知状态
  notification: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;

  // 历史记录
  history: RecentAction[];
  historyIndex: number;

  // 聚类状态
  // 节点ID到聚类ID的映射
  clusters: Record<string, number>;
  // 聚类颜色数组
  clusterColors: string[];
  // 聚类数量
  clusterCount: number;
  // 是否启用聚类
  isClusteringEnabled: boolean;
}

// Action类型定义
export type GraphAction =
  // 节点和连接相关
  | { type: 'SET_NODES'; payload: EnhancedNode[] }
  | { type: 'SET_CONNECTIONS'; payload: EnhancedGraphConnection[] }
  | { type: 'ADD_NODE'; payload: EnhancedNode }
  | { type: 'UPDATE_NODE'; payload: EnhancedNode }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_CONNECTION'; payload: EnhancedGraphConnection }
  | { type: 'UPDATE_CONNECTION'; payload: EnhancedGraphConnection }
  | { type: 'DELETE_CONNECTION'; payload: string }

  // 选择相关
  | { type: 'SELECT_NODE'; payload: EnhancedNode | null }
  | { type: 'SELECT_NODES'; payload: EnhancedNode[] }
  | { type: 'SELECT_CONNECTION'; payload: EnhancedGraphConnection | null }
  | { type: 'SELECT_CONNECTIONS'; payload: EnhancedGraphConnection[] }
  | { type: 'CLEAR_SELECTION' }

  // 交互相关
  | { type: 'SET_IS_ADDING_CONNECTION'; payload: boolean }
  | { type: 'SET_CONNECTION_SOURCE_NODE'; payload: EnhancedNode | null }
  | { type: 'SET_MOUSE_POSITION'; payload: { x: number; y: number } | null }
  | { type: 'SET_IS_SIMULATION_RUNNING'; payload: boolean }

  // 布局相关
  | { type: 'SET_LAYOUT_TYPE'; payload: LayoutType }
  | { type: 'SET_LAYOUT_DIRECTION'; payload: LayoutDirection }
  | { type: 'SET_VIEW_MODE'; payload: '2d' | '3d' }

  // UI相关
  | { type: 'SET_IS_RIGHT_PANEL_VISIBLE'; payload: boolean }
  | { type: 'SET_IS_TOOLBAR_VISIBLE'; payload: boolean }
  | { type: 'SET_IS_LEFT_TOOLBAR_VISIBLE'; payload: boolean }
  | { type: 'SET_ACTIVE_PANEL'; payload: string | null }
  | { type: 'SET_CURRENT_THEME'; payload: GraphTheme }
  | { type: 'SET_COPIED_STYLE'; payload: { type: 'node' | 'connection'; style: NodeStyle | LinkStyle } | null }
  | { type: 'SET_IS_BOX_SELECTING'; payload: boolean }
  | { type: 'SET_BOX_SELECTION'; payload: { x1: number; y1: number; x2: number; y2: number } }
  | { type: 'SET_IS_SETTINGS_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_IS_SHORTCUTS_OPEN'; payload: boolean }
  | { type: 'SET_TOOLBAR_AUTO_HIDE'; payload: boolean }
  | { type: 'SET_LEFT_TOOLBAR_AUTO_HIDE'; payload: boolean }

  // 布局参数
  | { type: 'SET_NODE_SPACING'; payload: number }
  | { type: 'SET_LEVEL_SPACING'; payload: number }
  | { type: 'SET_FORCE_PARAMETERS'; payload: ForceParameters }

  // 保存的布局
  | { type: 'SET_SAVED_LAYOUTS'; payload: SavedLayout[] }
  | { type: 'ADD_SAVED_LAYOUT'; payload: SavedLayout }
  | { type: 'DELETE_SAVED_LAYOUT'; payload: string }

  // 通知相关
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; type: 'success' | 'info' | 'error' | 'warning' } }
  | { type: 'CLOSE_NOTIFICATION' }

  // 历史记录相关
  | { type: 'ADD_HISTORY'; payload: RecentAction }
  | { type: 'UNDO' }
  | { type: 'REDO' }

  // 聚类相关
  | { type: 'SET_CLUSTERS'; payload: Record<string, number> }
  | { type: 'SET_CLUSTER_COLORS'; payload: string[] }
  | { type: 'SET_CLUSTER_COUNT'; payload: number }
  | { type: 'SET_IS_CLUSTERING_ENABLED'; payload: boolean }

  // 分组相关
  | { type: 'GROUP_NODES'; payload: { nodes: EnhancedNode[]; group: EnhancedNode } }
  // payload为分组ID
  | { type: 'UNGROUP_NODES'; payload: string }
  // ReactFlow相关
  | { type: 'SET_REACT_FLOW_INSTANCE'; payload: ReactFlowInstance | null };

// 图谱上下文接口
export interface GraphContextType {
  state: GraphState;
  actions: GraphActions;
}

// 图谱操作接口
export interface GraphActions {
  // 节点和连接操作
  setReactFlowInstance: (_instance: ReactFlowInstance | null) => void;
  setNodes: (_nodes: EnhancedNode[]) => void;
  setConnections: (_connections: EnhancedGraphConnection[]) => void;
  addNode: (_node: EnhancedNode) => void;
  updateNode: (_node: EnhancedNode) => void;
  deleteNode: (_nodeId: string) => void;
  addConnection: (_connection: EnhancedGraphConnection) => void;
  updateConnection: (_connection: EnhancedGraphConnection) => void;
  deleteConnection: (_connectionId: string) => void;

  // 选择操作
  selectNode: (_node: EnhancedNode | null) => void;
  selectNodes: (_nodes: EnhancedNode[]) => void;
  selectConnection: (_connection: EnhancedGraphConnection | null) => void;
  selectConnections: (_connections: EnhancedGraphConnection[]) => void;
  clearSelection: () => void;

  // 交互操作
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  setConnectionSourceNode: (_node: EnhancedNode | null) => void;
  setMousePosition: (_position: { x: number; y: number } | null) => void;
  setIsSimulationRunning: (_isRunning: boolean) => void;

  // 布局操作
  setLayoutType: (_layoutType: LayoutType) => void;
  setLayoutDirection: (_layoutDirection: LayoutDirection) => void;
  setViewMode: (_viewMode: '2d' | '3d') => void;
  applyLayout: (_layoutType: LayoutType, _direction: LayoutDirection) => void;

  // UI操作
  setIsRightPanelVisible: (_isVisible: boolean) => void;
  setIsToolbarVisible: (_isVisible: boolean) => void;
  setIsLeftToolbarVisible: (_isVisible: boolean) => void;
  setActivePanel: (_panelId: string | null) => void;
  setCurrentTheme: (_theme: GraphTheme) => void;
  setCopiedStyle: (_style: { type: 'node' | 'connection'; style: NodeStyle | LinkStyle } | null) => void;
  setIsBoxSelecting: (_isSelecting: boolean) => void;
  setBoxSelection: (_selection: { x1: number; y1: number; x2: number; y2: number }) => void;
  setIsSettingsPanelOpen: (_isOpen: boolean) => void;
  setToolbarAutoHide: (_autoHide: boolean) => void;
  setLeftToolbarAutoHide: (_autoHide: boolean) => void;

  // 布局参数操作
  setNodeSpacing: (_spacing: number) => void;
  setLevelSpacing: (_spacing: number) => void;
  setForceParameters: (_params: ForceParameters) => void;

  // 保存的布局操作
  setSavedLayouts: (_layouts: SavedLayout[]) => void;
  addSavedLayout: (_layout: SavedLayout) => void;
  deleteSavedLayout: (_layoutId: string) => void;

  // 通知操作
  showNotification: (_message: string, _type: 'success' | 'info' | 'error' | 'warning') => void;
  closeNotification: () => void;

  // 历史记录操作
  addHistory: (_action: RecentAction) => void;
  undo: () => void;
  redo: () => void;

  // 聚类操作
  setClusters: (_clusters: Record<string, number>) => void;
  setClusterColors: (_colors: string[]) => void;
  setClusterCount: (_count: number) => void;
  setIsClusteringEnabled: (_enabled: boolean) => void;
  performKMeansClustering: () => void;

  // 分组操作
  groupNodes: (_nodes: EnhancedNode[]) => void;
  ungroupNodes: (_groupId: string) => void;
  toggleGroupExpansion: (_nodeId: string) => void;

  // 业务逻辑操作
  handleNodeClick: (_node: EnhancedNode, _event: React.MouseEvent) => Promise<void>;
  handleNodeDragStart: (_node: EnhancedNode) => void;
  handleNodeDragEnd: (_node: EnhancedNode) => void;
  handleConnectionClick: (_connection: EnhancedGraphConnection) => void;
  handleCanvasClick: () => void;
  handleBoxSelectStart: (_x: number, _y: number) => void;
  handleBoxSelectUpdate: (_x: number, _y: number) => void;
  handleBoxSelectEnd: () => void;
  handleUpdateNode: (_updatedNode: EnhancedNode) => void;
  handleUpdateConnection: (_updatedConnection: EnhancedGraphConnection) => void;
  handleCopyNodeStyle: () => void;
  handleCopyConnectionStyle: () => void;
  handlePasteStyle: () => void;
  handleImportGraph: (_graph: { nodes: EnhancedNode[]; connections: EnhancedGraphConnection[] }) => void;
  handleSaveLayout: (_layout: SavedLayout) => void;
  handleLoadLayout: (_layout: SavedLayout) => void;
  handleDeleteLayout: (_layoutId: string) => void;
  handleCanvasDrop: (_event: React.DragEvent, _x: number, _y: number) => void;
  togglePanel: (_panelId: string | null) => void;
}

// ===========================
// Context创建
// ===========================

export const GraphContext = createContext<GraphContextType | undefined>(undefined);
