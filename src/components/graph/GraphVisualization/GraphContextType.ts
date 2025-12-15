import { createContext } from 'react';
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

// ===========================
// 类型定义
// ===========================

// 图谱状态接口
export interface GraphState {
  // 节点和链接数据
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  selectedLink: EnhancedGraphLink | null;
  selectedLinks: EnhancedGraphLink[];
  
  // 交互状态
  isAddingLink: boolean;
  linkSourceNode: EnhancedNode | null;
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
  copiedStyle: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null;
  isBoxSelecting: boolean;
  boxSelection: { x1: number; y1: number; x2: number; y2: number };
  isSettingsPanelOpen: boolean;
  isShortcutsOpen: boolean;
  toolbarAutoHide: boolean;
  leftToolbarAutoHide: boolean;
  
  // 布局参数
  nodeSpacing: number;
  levelSpacing: number;
  forceParameters: ForceParameters;
  
  // 保存的布局
  savedLayouts: SavedLayout[];
  
  // 通知状态
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;
  
  // 历史记录
  history: RecentAction[];
  historyIndex: number;
  
  // 聚类状态
  clusters: Record<string, number>; // 节点ID到聚类ID的映射
  clusterColors: string[]; // 聚类颜色数组
  clusterCount: number; // 聚类数量
  isClusteringEnabled: boolean; // 是否启用聚类
}

// Action类型定义
export type GraphAction =
  // 节点和链接相关
  | { type: 'SET_NODES'; payload: EnhancedNode[] }
  | { type: 'SET_LINKS'; payload: EnhancedGraphLink[] }
  | { type: 'ADD_NODE'; payload: EnhancedNode }
  | { type: 'UPDATE_NODE'; payload: EnhancedNode }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_LINK'; payload: EnhancedGraphLink }
  | { type: 'UPDATE_LINK'; payload: EnhancedGraphLink }
  | { type: 'DELETE_LINK'; payload: string }
  
  // 选择相关
  | { type: 'SELECT_NODE'; payload: EnhancedNode | null }
  | { type: 'SELECT_NODES'; payload: EnhancedNode[] }
  | { type: 'SELECT_LINK'; payload: EnhancedGraphLink | null }
  | { type: 'SELECT_LINKS'; payload: EnhancedGraphLink[] }
  | { type: 'CLEAR_SELECTION' }
  
  // 交互相关
  | { type: 'SET_IS_ADDING_LINK'; payload: boolean }
  | { type: 'SET_LINK_SOURCE_NODE'; payload: EnhancedNode | null }
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
  | { type: 'SET_COPIED_STYLE'; payload: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null }
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
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; type: 'success' | 'info' | 'error' } }
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
  | { type: 'UNGROUP_NODES'; payload: string }; // payload为分组ID

// 图谱上下文接口
export interface GraphContextType {
  state: GraphState;
  actions: GraphActions;
}

// 图谱操作接口
export interface GraphActions {
  // 节点和链接操作
  setNodes: (nodes: EnhancedNode[]) => void;
  setLinks: (links: EnhancedGraphLink[]) => void;
  addNode: (node: EnhancedNode) => void;
  updateNode: (node: EnhancedNode) => void;
  deleteNode: (nodeId: string) => void;
  addLink: (link: EnhancedGraphLink) => void;
  updateLink: (link: EnhancedGraphLink) => void;
  deleteLink: (linkId: string) => void;
  
  // 选择操作
  selectNode: (node: EnhancedNode | null) => void;
  selectNodes: (nodes: EnhancedNode[]) => void;
  selectLink: (link: EnhancedGraphLink | null) => void;
  selectLinks: (links: EnhancedGraphLink[]) => void;
  clearSelection: () => void;
  
  // 交互操作
  setIsAddingLink: (isAddingLink: boolean) => void;
  setLinkSourceNode: (node: EnhancedNode | null) => void;
  setMousePosition: (position: { x: number; y: number } | null) => void;
  setIsSimulationRunning: (isRunning: boolean) => void;
  
  // 布局操作
  setLayoutType: (layoutType: LayoutType) => void;
  setLayoutDirection: (layoutDirection: LayoutDirection) => void;
  setViewMode: (viewMode: '2d' | '3d') => void;
  applyLayout: (layoutType: LayoutType, direction: LayoutDirection) => void;
  
  // UI操作
  setIsRightPanelVisible: (isVisible: boolean) => void;
  setIsToolbarVisible: (isVisible: boolean) => void;
  setIsLeftToolbarVisible: (isVisible: boolean) => void;
  setActivePanel: (panelId: string | null) => void;
  setCurrentTheme: (theme: GraphTheme) => void;
  setCopiedStyle: (style: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null) => void;
  setIsBoxSelecting: (isSelecting: boolean) => void;
  setBoxSelection: (selection: { x1: number; y1: number; x2: number; y2: number }) => void;
  setIsSettingsPanelOpen: (isOpen: boolean) => void;
  setIsShortcutsOpen: (isOpen: boolean) => void;
  setToolbarAutoHide: (autoHide: boolean) => void;
  setLeftToolbarAutoHide: (autoHide: boolean) => void;
  
  // 布局参数操作
  setNodeSpacing: (spacing: number) => void;
  setLevelSpacing: (spacing: number) => void;
  setForceParameters: (params: ForceParameters) => void;
  
  // 保存的布局操作
  setSavedLayouts: (layouts: SavedLayout[]) => void;
  addSavedLayout: (layout: SavedLayout) => void;
  deleteSavedLayout: (layoutId: string) => void;
  
  // 通知操作
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  closeNotification: () => void;
  
  // 历史记录操作
  addHistory: (action: RecentAction) => void;
  undo: () => void;
  redo: () => void;
  
  // 聚类操作
  setClusters: (clusters: Record<string, number>) => void;
  setClusterColors: (colors: string[]) => void;
  setClusterCount: (count: number) => void;
  setIsClusteringEnabled: (enabled: boolean) => void;
  performKMeansClustering: () => void;
  
  // 分组操作
  groupNodes: (nodes: EnhancedNode[]) => void;
  ungroupNodes: (groupId: string) => void;
  toggleGroupExpansion: (nodeId: string) => void;
  
  // 业务逻辑操作
  handleNodeClick: (node: EnhancedNode, event: React.MouseEvent) => Promise<void>;
  handleNodeDragStart: (node: EnhancedNode) => void;
  handleNodeDragEnd: (node: EnhancedNode) => void;
  handleLinkClick: (link: EnhancedGraphLink) => void;
  handleCanvasClick: () => void;
  handleBoxSelectStart: (x: number, y: number) => void;
  handleBoxSelectUpdate: (x: number, y: number) => void;
  handleBoxSelectEnd: () => void;
  handleUpdateNode: (updatedNode: EnhancedNode) => void;
  handleUpdateLink: (updatedLink: EnhancedGraphLink) => void;
  handleCopyNodeStyle: () => void;
  handleCopyLinkStyle: () => void;
  handlePasteStyle: () => void;
  handleImportGraph: (graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => void;
  handleSaveLayout: (layout: SavedLayout) => void;
  handleLoadLayout: (layout: SavedLayout) => void;
  handleDeleteLayout: (layoutId: string) => void;
  handleCanvasDrop: (event: React.DragEvent, x: number, y: number) => void;
  togglePanel: (panelId: string | null) => void;
}

// ===========================
// Context创建
// ===========================

export const GraphContext = createContext<GraphContextType | undefined>(undefined);
