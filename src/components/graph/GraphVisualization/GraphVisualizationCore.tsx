// 导入类型
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

// 导入自定义Hook
import { useGraphVisualization } from './useGraphVisualization';

// 导出类型定义
export interface GraphVisualizationCoreProps {
  children: (
    props: {
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
      isLeftPanelCollapsed: boolean;
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
      
      // 状态更新函数
      setNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
      setLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
      setSelectedNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
      setSelectedNodes: React.Dispatch<React.SetStateAction<EnhancedNode[]>>;
      setSelectedLink: React.Dispatch<React.SetStateAction<EnhancedGraphLink | null>>;
      setSelectedLinks: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
      setIsAddingLink: React.Dispatch<React.SetStateAction<boolean>>;
      setLinkSourceNode: React.Dispatch<React.SetStateAction<EnhancedNode | null>>;
      setMousePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
      setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
      setLayoutType: React.Dispatch<React.SetStateAction<LayoutType>>;
      setLayoutDirection: React.Dispatch<React.SetStateAction<LayoutDirection>>;
      setViewMode: React.Dispatch<React.SetStateAction<'2d' | '3d'>>;
      setIsLeftPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
      setIsRightPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
      setIsToolbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
      setIsLeftToolbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
      setActivePanel: React.Dispatch<React.SetStateAction<string | null>>;
      setCurrentTheme: React.Dispatch<React.SetStateAction<GraphTheme>>;
      setCopiedStyle: React.Dispatch<React.SetStateAction<{ type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null>>;
      setIsBoxSelecting: React.Dispatch<React.SetStateAction<boolean>>;
      setBoxSelection: React.Dispatch<React.SetStateAction<{ x1: number; y1: number; x2: number; y2: number }>>;
      setIsSettingsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
      setIsShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
      setNodeSpacing: React.Dispatch<React.SetStateAction<number>>;
      setLevelSpacing: React.Dispatch<React.SetStateAction<number>>;
      setForceParameters: React.Dispatch<React.SetStateAction<ForceParameters>>;
      setSavedLayouts: React.Dispatch<React.SetStateAction<SavedLayout[]>>;
      setNotification: React.Dispatch<React.SetStateAction<{ message: string; type: 'success' | 'info' | 'error' } | null>>;
      setToolbarAutoHide: React.Dispatch<React.SetStateAction<boolean>>;
      setLeftToolbarAutoHide: React.Dispatch<React.SetStateAction<boolean>>;
      
      // 回调函数
      showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
      closeNotification: () => void;
      handleNodeClick: (node: EnhancedNode, event: React.MouseEvent) => Promise<void>;
      handleNodeDragStart: () => void;
      handleNodeDragEnd: () => void;
      handleLinkClick: (link: EnhancedGraphLink) => void;
      handleCanvasClick: () => void;
      handleBoxSelectStart: (x: number, y: number) => void;
      handleBoxSelectUpdate: (x: number, y: number) => void;
      handleBoxSelectEnd: () => void;
      handleUpdateNode: (updatedNode: EnhancedNode) => void;
      handleUpdateLink: (updatedLink: EnhancedGraphLink) => void;
      handleUndo: () => void;
      handleRedo: () => void;
      handleCopyNodeStyle: () => void;
      handleCopyLinkStyle: () => void;
      handlePasteStyle: () => void;
      handleImportGraph: (graph: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => void;
      handleSaveLayout: (layout: SavedLayout) => void;
      handleLoadLayout: (layout: SavedLayout) => void;
      handleDeleteLayout: (layoutId: string) => void;
      handleCanvasDrop: (event: React.DragEvent, x: number, y: number) => void;
      togglePanel: (panelId: string | null) => void;
      addHistory: (action: RecentAction) => void;
    }
  ) => React.ReactNode;
}

/**
 * 知识图谱可视化核心组件
 * 作为useGraphVisualization Hook的容器，将状态和函数传递给子组件
 */
export const GraphVisualizationCore = ({ children }: GraphVisualizationCoreProps) => {
  // 使用自定义Hook获取所有状态和函数
  const graphProps = useGraphVisualization();

  // 将所有状态和函数传递给子组件
  return children(graphProps);
};