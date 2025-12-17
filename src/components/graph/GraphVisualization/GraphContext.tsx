import React, { useReducer, ReactNode, useCallback, useEffect } from 'react';

// 导入类型定义
import type { ReactFlowInstance } from 'reactflow';
import type { EnhancedNode, EnhancedGraphConnection, LayoutType, LayoutDirection, RecentAction, SavedLayout, ForceParameters } from './types';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';
import { PRESET_THEMES } from './ThemeTypes';

// 导入Context和类型
import { GraphContext, GraphAction, GraphState, GraphActions } from './GraphContextType';

// 导入服务
import { graphService } from '../../../services/graphService';

// ===========================
// 初始状态
// ===========================

const getInitialState = (): GraphState => {
  // 从localStorage加载保存的状态
  const savedRightPanelVisible = localStorage.getItem('graphRightPanelVisible');
  const savedToolbarAutoHide = localStorage.getItem('graphToolbarAutoHide');
  const savedTheme = localStorage.getItem('graphCurrentTheme');
  
  return {
    // 节点和连接数据
    nodes: [],
    connections: [],
    selectedNode: null,
    selectedNodes: [],
    selectedConnection: null,
    selectedConnections: [],
    // ReactFlow实例引用
    reactFlowInstance: null,
    
    // 交互状态
    isAddingConnection: false,
    connectionSourceNode: null,
    mousePosition: null,
    isSimulationRunning: true,
    
    // 布局状态
    layoutType: 'force',
    layoutDirection: 'top-bottom',
    viewMode: '2d',
    
    // UI状态
    isRightPanelVisible: savedRightPanelVisible ? JSON.parse(savedRightPanelVisible) : true,
    isToolbarVisible: true,
    isLeftToolbarVisible: true,
    activePanel: null,
    currentTheme: savedTheme ? JSON.parse(savedTheme) : PRESET_THEMES[0] || {
      id: 'default',
      name: '默认主题',
      node: {
        fill: '#8b5cf6',
        stroke: '#fff',
        strokeWidth: 2,
        radius: 20,
        fontSize: 12,
        textFill: '#fff'
      },
      link: {
        stroke: '#999',
        strokeWidth: 2,
        strokeOpacity: 0.6
      },
      backgroundColor: '#f9fafb'
    },
    copiedStyle: null,
    isBoxSelecting: false,
    boxSelection: { x1: 0, y1: 0, x2: 0, y2: 0 },
    isSettingsPanelOpen: false,
    toolbarAutoHide: savedToolbarAutoHide ? JSON.parse(savedToolbarAutoHide) : false,
    leftToolbarAutoHide: false,
    
    // 布局参数
    nodeSpacing: 50,
    levelSpacing: 100,
    forceParameters: {
      charge: -300,
      linkStrength: 0.1,
      linkDistance: 150,
      gravity: 0.1
    },
    
    // 保存的布局
    savedLayouts: [],
    
    // 通知状态
    notification: null,
    
    // 历史记录
    history: [],
    historyIndex: -1,
    
    // 聚类状态
    clusters: {},
    clusterColors: [],
    clusterCount: 3,
    isClusteringEnabled: false
  };
};

// ===========================
// Reducer函数
// ===========================

const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
    // 节点和连接相关
    case 'SET_NODES':
      return { ...state, nodes: action.payload };
    case 'SET_CONNECTIONS':
      return { ...state, connections: action.payload };
    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.payload] };
    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(node => node.id === action.payload.id ? action.payload : node)
      };
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(node => node.id !== action.payload),
        connections: state.connections.filter(connection => 
          String(connection.source) !== action.payload && String(connection.target) !== action.payload
        )
      };
    case 'ADD_CONNECTION':
      return { ...state, connections: [...state.connections, action.payload] };
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map(connection => connection.id === action.payload.id ? action.payload : connection)
      };
    case 'DELETE_CONNECTION':
      return {
        ...state,
        connections: state.connections.filter(connection => connection.id !== action.payload)
      };
    
    // ReactFlow相关
    case 'SET_REACT_FLOW_INSTANCE':
      return { ...state, reactFlowInstance: action.payload };
    
    // 选择相关
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
        selectedNodes: action.payload ? [action.payload] : [],
        selectedConnection: null,
        selectedConnections: []
      };
    case 'SELECT_NODES':
      return {
        ...state,
        selectedNodes: action.payload,
        selectedNode: action.payload.length > 0 ? (action.payload[0] || null) : null,
        selectedConnection: null,
        selectedConnections: []
      };
    case 'SELECT_CONNECTION':
      return {
        ...state,
        selectedConnection: action.payload,
        selectedConnections: action.payload ? [action.payload] : [],
        selectedNode: null,
        selectedNodes: []
      };
    case 'SELECT_CONNECTIONS':
      return {
        ...state,
        selectedConnections: action.payload,
        selectedConnection: action.payload.length > 0 ? (action.payload[0] || null) : null,
        selectedNode: null,
        selectedNodes: []
      };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedNode: null,
        selectedNodes: [],
        selectedConnection: null,
        selectedConnections: []
      };
    
    // 交互相关
    case 'SET_IS_ADDING_CONNECTION':
      return { ...state, isAddingConnection: action.payload };
    case 'SET_CONNECTION_SOURCE_NODE':
      return { ...state, connectionSourceNode: action.payload };
    case 'SET_MOUSE_POSITION':
      return { ...state, mousePosition: action.payload };
    case 'SET_IS_SIMULATION_RUNNING':
      return { ...state, isSimulationRunning: action.payload };
    
    // 布局相关
    case 'SET_LAYOUT_TYPE':
      return { ...state, layoutType: action.payload };
    case 'SET_LAYOUT_DIRECTION':
      return { ...state, layoutDirection: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    
    // UI相关
    case 'SET_IS_RIGHT_PANEL_VISIBLE':
      return { ...state, isRightPanelVisible: action.payload };
    case 'SET_IS_TOOLBAR_VISIBLE':
      return { ...state, isToolbarVisible: action.payload };
    case 'SET_IS_LEFT_TOOLBAR_VISIBLE':
      return { ...state, isLeftToolbarVisible: action.payload };
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload };
    case 'SET_CURRENT_THEME':
      return { ...state, currentTheme: action.payload };
    case 'SET_COPIED_STYLE':
      return { ...state, copiedStyle: action.payload };
    case 'SET_IS_BOX_SELECTING':
      return { ...state, isBoxSelecting: action.payload };
    case 'SET_BOX_SELECTION':
      return { ...state, boxSelection: action.payload };
    case 'SET_IS_SETTINGS_PANEL_OPEN':
      return { ...state, isSettingsPanelOpen: action.payload };

    case 'SET_TOOLBAR_AUTO_HIDE':
      return { ...state, toolbarAutoHide: action.payload };
    case 'SET_LEFT_TOOLBAR_AUTO_HIDE':
      return { ...state, leftToolbarAutoHide: action.payload };
    
    // 布局参数
    case 'SET_NODE_SPACING':
      return { ...state, nodeSpacing: action.payload };
    case 'SET_LEVEL_SPACING':
      return { ...state, levelSpacing: action.payload };
    case 'SET_FORCE_PARAMETERS':
      return { ...state, forceParameters: action.payload };
    
    // 保存的布局
    case 'SET_SAVED_LAYOUTS':
      return { ...state, savedLayouts: action.payload };
    case 'ADD_SAVED_LAYOUT':
      return { ...state, savedLayouts: [...state.savedLayouts, action.payload] };
    case 'DELETE_SAVED_LAYOUT':
      return {
        ...state,
        savedLayouts: state.savedLayouts.filter(layout => layout.id !== action.payload)
      };
    
    // 通知相关
    case 'SHOW_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'CLOSE_NOTIFICATION':
      return { ...state, notification: null };
    
    // 历史记录相关
    case 'ADD_HISTORY':
      // 如果当前不在历史记录末尾，截断历史记录
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history];
      // 限制历史记录长度为50
      if (newHistory.length >= 50) {
        newHistory.shift(); // 移除最旧的记录
      }
      newHistory.push(action.payload);
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    case 'UNDO':
      if (state.historyIndex >= 0) {
        const actionToUndo = state.history[state.historyIndex];
        if (!actionToUndo) return state;
        
        let newNodes = [...state.nodes];
        let newConnections = [...state.connections];
        
        // 根据操作类型执行撤销
        switch (actionToUndo.type) {
          case 'addNode':
            // 撤销添加节点，删除该节点
            newNodes = newNodes.filter(node => node.id !== actionToUndo.nodeId);
            break;
          case 'deleteNode':
            // 撤销删除节点，重新添加该节点和关联的连接
            newNodes.push(actionToUndo.data.node);
            newConnections.push(...actionToUndo.data.connections);
            break;
          case 'addConnection':
            // 撤销添加连接，删除该连接
            newConnections = newConnections.filter(connection => connection.id !== actionToUndo.connectionId);
            break;
          case 'deleteConnection':
            // 撤销删除连接，重新添加该连接
            newConnections.push(actionToUndo.data);
            break;
        }
        
        return {
          ...state,
          nodes: newNodes,
          connections: newConnections,
          historyIndex: state.historyIndex - 1
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        const actionToRedo = state.history[nextIndex];
        if (!actionToRedo) return state;
        
        let newNodes = [...state.nodes];
        let newConnections = [...state.connections];
        
        // 根据操作类型执行重做
        switch (actionToRedo.type) {
          case 'addNode':
            // 重做添加节点，重新添加该节点
            newNodes.push(actionToRedo.data.node);
            break;
          case 'deleteNode':
            // 重做删除节点，删除该节点和关联的连接
            newNodes = newNodes.filter(node => node.id !== actionToRedo.nodeId);
            newConnections = newConnections.filter(connection => {
              return !actionToRedo.data.connections.some((l: EnhancedGraphConnection) => l.id === connection.id);
            });
            break;
          case 'addConnection':
            // 重做添加连接，重新添加该连接
            newConnections.push(actionToRedo.data);
            break;
          case 'deleteConnection':
            // 重做删除连接，删除该连接
            newConnections = newConnections.filter(connection => connection.id !== actionToRedo.connectionId);
            break;
        }
        
        return {
          ...state,
          nodes: newNodes,
          connections: newConnections,
          historyIndex: nextIndex
        };
      }
      return state;
    
    // 聚类相关
    case 'SET_CLUSTERS':
      return { ...state, clusters: action.payload };
    case 'SET_CLUSTER_COLORS':
      return { ...state, clusterColors: action.payload };
    case 'SET_CLUSTER_COUNT':
      return { ...state, clusterCount: action.payload };
    case 'SET_IS_CLUSTERING_ENABLED':
      return { ...state, isClusteringEnabled: action.payload };
    
    // 分组相关
    case 'GROUP_NODES': {
      const { nodes: nodesToGroup, group } = action.payload;
      const nodeIdsToGroup = new Set(nodesToGroup.map(node => node.id));
      
      // 过滤掉要分组的节点，添加分组节点
      const newNodes = [
        ...state.nodes.filter(node => !nodeIdsToGroup.has(node.id)),
        group
      ];
      
      // 更新被分组节点的属性
      const updatedNodes = newNodes.map(node => {
        if (nodeIdsToGroup.has(node.id)) {
          return { ...node, groupId: group.id };
        }
        return node;
      });
      
      return {
        ...state,
        nodes: updatedNodes
      };
    }
    case 'UNGROUP_NODES': {
      const groupId = action.payload;
      
      // 找到分组节点
      const groupNode = state.nodes.find(node => node.id === groupId);
      if (!groupNode || !groupNode.memberIds) return state;
      
      // 移除分组节点，更新成员节点的groupId属性
      const newNodes = state.nodes
        .filter(node => node.id !== groupId) // 移除分组节点
        .map(node => {
          if (groupNode.memberIds?.includes(node.id)) {
            // 移除成员节点的groupId属性
            // 创建一个新对象，不包含groupId属性
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { groupId, ...rest } = node;
            return rest;
          }
          return node;
        });
      
      return {
        ...state,
        nodes: newNodes
      };
    }
    
    default:
      return state;
  }
};

// ===========================
// Provider组件
// ===========================

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 使用Reducer管理状态
  const [state, dispatch] = useReducer(graphReducer, getInitialState());
  
  // 保存状态到localStorage
  useEffect(() => {
    localStorage.setItem('graphRightPanelVisible', JSON.stringify(state.isRightPanelVisible));
  }, [state.isRightPanelVisible]);
  
  useEffect(() => {
    localStorage.setItem('graphToolbarAutoHide', JSON.stringify(state.toolbarAutoHide));
  }, [state.toolbarAutoHide]);
  
  useEffect(() => {
    localStorage.setItem('graphCurrentTheme', JSON.stringify(state.currentTheme));
  }, [state.currentTheme]);
  
  // 通知自动关闭
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.notification) {
      timer = setTimeout(() => {
        dispatch({ type: 'CLOSE_NOTIFICATION' });
      }, 3000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.notification]);
  
  // 工具栏自动隐藏
  useEffect(() => {
    if (!state.toolbarAutoHide) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (e.clientY < 100) {
        dispatch({ type: 'SET_IS_TOOLBAR_VISIBLE', payload: true });
      }
      
      timeoutId = setTimeout(() => {
        dispatch({ type: 'SET_IS_TOOLBAR_VISIBLE', payload: false });
      }, 3000);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [state.toolbarAutoHide]);
  
  // 左侧工具栏自动隐藏
  useEffect(() => {
    if (!state.leftToolbarAutoHide) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (e.clientX < 200) {
        dispatch({ type: 'SET_IS_LEFT_TOOLBAR_VISIBLE', payload: true });
      }
      
      timeoutId = setTimeout(() => {
        dispatch({ type: 'SET_IS_LEFT_TOOLBAR_VISIBLE', payload: false });
      }, 3000);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [state.leftToolbarAutoHide]);
  
  // 加载图谱数据
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        dispatch({ type: 'SET_NODES', payload: [] });
        dispatch({ type: 'SET_CONNECTIONS', payload: [] });
        dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: true });
        
        const graphs = await graphService.getAllGraphs('unlisted');
        if (graphs && graphs.length > 0 && graphs[0] && graphs[0].id) {
          const graphData = await graphService.getGraphById(graphs[0].id);
          if (graphData && graphData.nodes && graphData.links) {
            const enhancedNodes = graphData.nodes.map(node => ({
              ...node,
              isExpanded: false,
              _isAggregated: false,
              _aggregatedNodes: [],
              type: node.type || 'concept'
            }));
            
            const enhancedConnections = graphData.links.map(connection => ({
              ...connection,
              id: `connection-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              source: connection.source as string,
              target: connection.target as string
            }));
            
            dispatch({ type: 'SET_NODES', payload: enhancedNodes });
            dispatch({ type: 'SET_CONNECTIONS', payload: enhancedConnections });
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '知识图谱加载成功', type: 'success' } });
          } else {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '知识图谱数据为空，您可以创建新节点', type: 'info' } });
          }
        } else {
          dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '没有找到知识图谱，您可以创建新图谱', type: 'info' } });
        }
      } catch (error) {
        console.error('加载图谱数据失败:', error);
        dispatch({ type: 'SET_NODES', payload: [] });
        dispatch({ type: 'SET_CONNECTIONS', payload: [] });
        dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: false });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '加载数据失败，请稍后重试', type: 'error' } });
      } finally {
        dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: false });
      }
    };
    
    loadGraphData();
  }, []);
  
  // ===========================
  // Actions实现
  // ===========================
  
  // ReactFlow相关操作
  const setReactFlowInstance = useCallback((instance: ReactFlowInstance | null) => {
    dispatch({ type: 'SET_REACT_FLOW_INSTANCE', payload: instance });
  }, []);
  
  // 节点和连接操作
  const setNodes = useCallback((nodes: EnhancedNode[]) => {
    dispatch({ type: 'SET_NODES', payload: nodes });
  }, []);
  
  const setConnections = useCallback((connections: EnhancedGraphConnection[]) => {
    dispatch({ type: 'SET_CONNECTIONS', payload: connections });
  }, []);
  
  const addNode = useCallback((node: EnhancedNode) => {
    dispatch({ type: 'ADD_NODE', payload: node });
  }, []);
  
  const updateNode = useCallback((node: EnhancedNode) => {
    dispatch({ type: 'UPDATE_NODE', payload: node });
  }, []);
  
  const deleteNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', payload: nodeId });
  }, []);
  
  const addConnection = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ type: 'ADD_CONNECTION', payload: connection });
  }, []);
  
  const updateConnection = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ type: 'UPDATE_CONNECTION', payload: connection });
  }, []);
  
  const deleteConnection = useCallback((connectionId: string) => {
    dispatch({ type: 'DELETE_CONNECTION', payload: connectionId });
  }, []);
  
  // 选择操作
  const selectNode = useCallback((node: EnhancedNode | null) => {
    dispatch({ type: 'SELECT_NODE', payload: node });
  }, []);
  
  const selectNodes = useCallback((nodes: EnhancedNode[]) => {
    dispatch({ type: 'SELECT_NODES', payload: nodes });
  }, []);
  
  const selectConnection = useCallback((connection: EnhancedGraphConnection | null) => {
    dispatch({ type: 'SELECT_CONNECTION', payload: connection });
  }, []);
  
  const selectConnections = useCallback((connections: EnhancedGraphConnection[]) => {
    dispatch({ type: 'SELECT_CONNECTIONS', payload: connections });
  }, []);
  
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);
  
  // 交互操作
  const setIsAddingConnection = useCallback((isAddingConnection: boolean) => {
    dispatch({ type: 'SET_IS_ADDING_CONNECTION', payload: isAddingConnection });
  }, []);
  
  const setConnectionSourceNode = useCallback((node: EnhancedNode | null) => {
    dispatch({ type: 'SET_CONNECTION_SOURCE_NODE', payload: node });
  }, []);
  
  const setMousePosition = useCallback((position: { x: number; y: number } | null) => {
    dispatch({ type: 'SET_MOUSE_POSITION', payload: position });
  }, []);
  
  const setIsSimulationRunning = useCallback((isRunning: boolean) => {
    dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: isRunning });
  }, []);
  
  // 布局操作
  const setLayoutType = useCallback((layoutType: LayoutType) => {
    dispatch({ type: 'SET_LAYOUT_TYPE', payload: layoutType });
  }, []);
  
  const setLayoutDirection = useCallback((layoutDirection: LayoutDirection) => {
    dispatch({ type: 'SET_LAYOUT_DIRECTION', payload: layoutDirection });
  }, []);
  
  const setViewMode = useCallback((viewMode: '2d' | '3d') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: viewMode });
  }, []);
  
  // UI操作
  const setIsRightPanelVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_RIGHT_PANEL_VISIBLE', payload: isVisible });
  }, []);
  
  const setIsToolbarVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_TOOLBAR_VISIBLE', payload: isVisible });
  }, []);
  
  const setIsLeftToolbarVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_LEFT_TOOLBAR_VISIBLE', payload: isVisible });
  }, []);
  
  const setActivePanel = useCallback((panelId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panelId });
  }, []);
  
  const setCurrentTheme = useCallback((theme: GraphTheme) => {
    dispatch({ type: 'SET_CURRENT_THEME', payload: theme });
  }, []);
  
  const setCopiedStyle = useCallback((style: { type: 'node' | 'connection'; style: NodeStyle | LinkStyle } | null) => {
    dispatch({ type: 'SET_COPIED_STYLE', payload: style });
  }, []);
  
  const setIsBoxSelecting = useCallback((isSelecting: boolean) => {
    dispatch({ type: 'SET_IS_BOX_SELECTING', payload: isSelecting });
  }, []);
  
  const setBoxSelection = useCallback((selection: { x1: number; y1: number; x2: number; y2: number }) => {
    dispatch({ type: 'SET_BOX_SELECTION', payload: selection });
  }, []);
  
  const setIsSettingsPanelOpen = useCallback((isOpen: boolean) => {
    dispatch({ type: 'SET_IS_SETTINGS_PANEL_OPEN', payload: isOpen });
  }, []);
  
  const setToolbarAutoHide = useCallback((autoHide: boolean) => {
    dispatch({ type: 'SET_TOOLBAR_AUTO_HIDE', payload: autoHide });
  }, []);
  
  const setLeftToolbarAutoHide = useCallback((autoHide: boolean) => {
    dispatch({ type: 'SET_LEFT_TOOLBAR_AUTO_HIDE', payload: autoHide });
  }, []);
  
  // 布局参数操作
  const setNodeSpacing = useCallback((spacing: number) => {
    dispatch({ type: 'SET_NODE_SPACING', payload: spacing });
  }, []);
  
  const setLevelSpacing = useCallback((spacing: number) => {
    dispatch({ type: 'SET_LEVEL_SPACING', payload: spacing });
  }, []);
  
  const setForceParameters = useCallback((params: ForceParameters) => {
    dispatch({ type: 'SET_FORCE_PARAMETERS', payload: params });
  }, []);
  
  // 保存的布局操作
  const setSavedLayouts = useCallback((layouts: SavedLayout[]) => {
    dispatch({ type: 'SET_SAVED_LAYOUTS', payload: layouts });
  }, []);
  
  const addSavedLayout = useCallback((layout: SavedLayout) => {
    dispatch({ type: 'ADD_SAVED_LAYOUT', payload: layout });
  }, []);
  
  const deleteSavedLayout = useCallback((layoutId: string) => {
    dispatch({ type: 'DELETE_SAVED_LAYOUT', payload: layoutId });
  }, []);
  
  // 通知操作
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    dispatch({ type: 'SHOW_NOTIFICATION', payload: { message, type } });
  }, []);
  
  // 布局算法实现
  const applyLayout = useCallback((layoutType: LayoutType, direction: LayoutDirection) => {
    const nodes = [...state.nodes];
    const connections = [...state.connections];
    
    let newNodes = [...nodes];
    
    // 根据布局类型应用不同的布局算法
    switch (layoutType) {
      case 'force':
        // 力导向布局：随机初始化位置
        newNodes = nodes.map(node => ({
          ...node,
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
          vx: 0,
          vy: 0
        }));
        break;
      case 'hierarchical':
        // 层级布局
        {
          const nodeMap = new Map<string, EnhancedNode>();
          const childrenMap = new Map<string, string[]>();
          const parentsMap = new Map<string, string[]>();
          
          // 初始化节点映射
          nodes.forEach(node => {
            nodeMap.set(node.id, node);
            childrenMap.set(node.id, []);
            parentsMap.set(node.id, []);
          });
          
          // 构建父子关系
          connections.forEach(connection => {
            const sourceId = typeof connection.source === 'string' ? connection.source : (connection.source as EnhancedNode).id;
            const targetId = typeof connection.target === 'string' ? connection.target : (connection.target as EnhancedNode).id;
            
            childrenMap.get(sourceId)?.push(targetId);
            parentsMap.get(targetId)?.push(sourceId);
          });
          
          // 找到根节点
          const rootNodes = nodes.filter(node => parentsMap.get(node.id)?.length === 0);
          
          // 层级布局递归函数
          const layoutHierarchyNode = (node: EnhancedNode, x: number, y: number, level: number = 0) => {
            // 设置节点位置
            switch (direction) {
              case 'top-bottom':
                node.x = x;
                node.y = y + level * state.levelSpacing;
                break;
              case 'bottom-top':
                node.x = x;
                node.y = y - level * state.levelSpacing;
                break;
              case 'left-right':
                node.x = x + level * state.levelSpacing;
                node.y = y;
                break;
              case 'right-left':
                node.x = x - level * state.levelSpacing;
                node.y = y;
                break;
            }
            
            // 布局子节点
            const childrenIds = childrenMap.get(node.id) || [];
            childrenIds.forEach((childId, childIndex) => {
              const child = nodeMap.get(childId);
              if (child) {
                layoutHierarchyNode(
                  child, 
                  x + childIndex * 150, 
                  y, 
                  level + 1
                );
              }
            });
          };
          
          // 应用布局
          rootNodes.forEach((root, rootIndex) => {
            layoutHierarchyNode(root, rootIndex * state.nodeSpacing * 2, 100);
          });
        }
        break;
      case 'circular':
        // 环形布局
        {
          const centerX = 300;
          const centerY = 300;
          const radius = 200;
          const angleStep = (2 * Math.PI) / nodes.length;
          
          newNodes = nodes.map((node, index) => {
            const angle = index * angleStep;
            return {
              ...node,
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle)
            };
          });
        }
        break;
      case 'grid':
        // 网格布局
        {
          const gridSize = Math.ceil(Math.sqrt(nodes.length));
          const offsetX = 100;
          const offsetY = 100;
          
          newNodes = nodes.map((node, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            return {
              ...node,
              x: offsetX + col * state.nodeSpacing,
              y: offsetY + row * state.nodeSpacing
            };
          });
        }
        break;
      case 'radial':
        // 放射状布局
        {
          const centerX = 300;
          const centerY = 300;
          
          // 找到中心节点（连接数最多的节点）
          let centerNode = nodes[0];
          let maxConnections = 0;
          
          nodes.forEach(node => {
            const connectionsCount = connections.filter(connection => {
              const sourceId = typeof connection.source === 'string' ? connection.source : (connection.source as EnhancedNode).id;
              const targetId = typeof connection.target === 'string' ? connection.target : (connection.target as EnhancedNode).id;
              return sourceId === node.id || targetId === node.id;
            }).length;
            
            if (connectionsCount > maxConnections) {
              maxConnections = connectionsCount;
              centerNode = node;
            }
          });
          
          // 设置中心节点位置
          if (centerNode) {
            centerNode.x = centerX;
            centerNode.y = centerY;
            
            // 布局其他节点
            let angle = 0;
            const angleStep = (2 * Math.PI) / (nodes.length - 1);
            
            newNodes = nodes.map(node => {
              if (node.id !== centerNode!.id) {
                const radius = state.nodeSpacing;
                const newNode = {
                  ...node,
                  x: centerX + radius * Math.cos(angle),
                  y: centerY + radius * Math.sin(angle)
                };
                angle += angleStep;
                return newNode;
              }
              return node;
            });
          }
        }
        break;
      case 'tree':
        // 树形布局
        {
          const nodeMap = new Map<string, EnhancedNode>();
          const childrenMap = new Map<string, string[]>();
          const parentsMap = new Map<string, string[]>();
          
          // 初始化节点映射
          nodes.forEach(node => {
            nodeMap.set(node.id, node);
            childrenMap.set(node.id, []);
            parentsMap.set(node.id, []);
          });
          
          // 构建父子关系
          connections.forEach(connection => {
            const sourceId = typeof connection.source === 'string' ? connection.source : (connection.source as EnhancedNode).id;
            const targetId = typeof connection.target === 'string' ? connection.target : (connection.target as EnhancedNode).id;
            
            childrenMap.get(sourceId)?.push(targetId);
            parentsMap.get(targetId)?.push(sourceId);
          });
          
          // 找到根节点
          const rootNodes = nodes.filter(node => parentsMap.get(node.id)?.length === 0);
          
          // 树形布局递归函数
          const layoutTreeNode = (node: EnhancedNode, x: number, y: number, level: number = 0) => {
            // 设置节点位置
            switch (direction) {
              case 'top-bottom':
                node.x = x;
                node.y = y + level * state.levelSpacing;
                break;
              case 'bottom-top':
                node.x = x;
                node.y = y - level * state.levelSpacing;
                break;
              case 'left-right':
                node.x = x + level * state.levelSpacing;
                node.y = y;
                break;
              case 'right-left':
                node.x = x - level * state.levelSpacing;
                node.y = y;
                break;
            }
            
            // 布局子节点
            const childrenIds = childrenMap.get(node.id) || [];
            childrenIds.forEach((childId, childIndex) => {
              const child = nodeMap.get(childId);
              if (child) {
                layoutTreeNode(
                  child, 
                  x + (childIndex - childrenIds.length / 2) * state.nodeSpacing, 
                  y, 
                  level + 1
                );
              }
            });
          };
          
          // 应用布局
          rootNodes.forEach((root, rootIndex) => {
            layoutTreeNode(root, rootIndex * state.nodeSpacing * 3, 100);
          });
        }
        break;
    }
    
    // 更新节点状态
    dispatch({ type: 'SET_NODES', payload: newNodes });
    // 更新布局类型和方向
    dispatch({ type: 'SET_LAYOUT_TYPE', payload: layoutType });
    dispatch({ type: 'SET_LAYOUT_DIRECTION', payload: direction });
    showNotification(`已应用${layoutType}布局`, 'success');
  }, [state.nodes, state.connections, state.nodeSpacing, state.levelSpacing, dispatch, showNotification]);
  
  const closeNotification = useCallback(() => {
    dispatch({ type: 'CLOSE_NOTIFICATION' });
  }, []);
  
  // 历史记录操作
  const addHistory = useCallback((action: RecentAction) => {
    dispatch({ type: 'ADD_HISTORY', payload: action });
  }, []);
  
  const undo = useCallback(() => {
    if (state.historyIndex >= 0) {
      dispatch({ type: 'UNDO' });
      showNotification('已撤销操作', 'info');
    }
  }, [state.historyIndex, showNotification]);
  
  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      dispatch({ type: 'REDO' });
      showNotification('已重做操作', 'info');
    }
  }, [state.historyIndex, state.history.length, showNotification]);
  
  // 聚类操作
  const setClusters = useCallback((clusters: Record<string, number>) => {
    dispatch({ type: 'SET_CLUSTERS', payload: clusters });
  }, []);
  
  const setClusterColors = useCallback((colors: string[]) => {
    dispatch({ type: 'SET_CLUSTER_COLORS', payload: colors });
  }, []);
  
  const setClusterCount = useCallback((count: number) => {
    dispatch({ type: 'SET_CLUSTER_COUNT', payload: count });
  }, []);
  
  const setIsClusteringEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_IS_CLUSTERING_ENABLED', payload: enabled });
  }, []);
  
  const performKMeansClustering = useCallback(() => {
    if (state.nodes.length === 0 || state.clusterCount <= 0 || state.clusterCount > state.nodes.length) {
      showNotification('聚类参数无效', 'error');
      return;
    }

    const clusters: Record<string, number> = {};

    // 如果只有一个聚类，所有节点都属于同一个聚类
    if (state.clusterCount === 1) {
      state.nodes.forEach(node => {
        clusters[node.id] = 0;
      });
      dispatch({ type: 'SET_CLUSTERS', payload: clusters });
      
      // 生成聚类颜色
      const colors = Array.from({ length: 1 }, (_, index) => {
        const hue = (index * 137.5) % 360;
        return `hsl(${hue}, 70%, 60%)`;
      });
      dispatch({ type: 'SET_CLUSTER_COLORS', payload: colors });
      showNotification('聚类已完成', 'success');
      return;
    }

    // 准备节点数据（使用连接数和类型作为特征）
    const nodeFeatures = state.nodes.map(node => {
      const nodeType = node.type || 'concept';
      const typeValue = nodeType === 'concept' ? 0 : nodeType === 'article' ? 1 : nodeType === 'resource' ? 2 : 3;
      return {
        id: node.id,
        connections: node.connections || 0,
        type: typeValue,
      };
    });

    // 归一化特征值
    const connectionsMin = Math.min(...nodeFeatures.map(n => n.connections));
    const connectionsMax = Math.max(...nodeFeatures.map(n => n.connections));
    const typeMin = Math.min(...nodeFeatures.map(n => n.type));
    const typeMax = Math.max(...nodeFeatures.map(n => n.type));

    const normalize = (value: number, min: number, max: number) => {
      return max === min ? 0 : (value - min) / (max - min);
    };

    const normalizedFeatures = nodeFeatures.map(n => ({
      id: n.id,
      connections: normalize(n.connections, connectionsMin, connectionsMax),
      type: normalize(n.type, typeMin, typeMax),
    }));

    // 随机初始化k个中心点
    const centroids: typeof normalizedFeatures[number][] = [];
    const selectedIndices = new Set<number>();

    while (selectedIndices.size < state.clusterCount && normalizedFeatures.length > 0) {
      const randomIndex = Math.floor(Math.random() * normalizedFeatures.length);
      if (!selectedIndices.has(randomIndex)) {
        selectedIndices.add(randomIndex);
        const randomFeature = normalizedFeatures[randomIndex];
        if (randomFeature) {
          centroids.push(randomFeature);
        }
      }
    }

    // 确保我们有足够的中心点
    while (centroids.length < state.clusterCount && normalizedFeatures.length > 0) {
      const feature = normalizedFeatures[0];
      if (feature) {
        centroids.push(feature);
      }
    }

    // 迭代聚类
    const maxIterations = 100;
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
      // 1. 分配每个节点到最近的中心点
      const newClusters: Record<string, number> = {};
      normalizedFeatures.forEach(node => {
        let minDistance = Infinity;
        let closestCentroidIndex = 0;

        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(node.connections - centroid.connections, 2) +
            Math.pow(node.type - centroid.type, 2),
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestCentroidIndex = index;
          }
        });

        newClusters[node.id] = closestCentroidIndex;
      });

      // 2. 更新中心点
      const newCentroids: typeof normalizedFeatures[number][] = [];
      for (let i = 0; i < state.clusterCount; i++) {
        const clusterNodes = normalizedFeatures.filter(n => newClusters[n.id] === i);
        if (clusterNodes.length === 0) {
          // 如果某个聚类没有节点，保留原中心点
          const centroid = centroids[i];
          if (centroid) {
            newCentroids.push(centroid);
          } else if (normalizedFeatures.length > 0) {
            const feature = normalizedFeatures[0];
            if (feature) {
              newCentroids.push(feature);
            }
          }
        } else {
          const avgConnections = clusterNodes.reduce((sum, node) => sum + node.connections, 0) / clusterNodes.length;
          const avgType = clusterNodes.reduce((sum, node) => sum + node.type, 0) / clusterNodes.length;

          newCentroids.push({
            id: `centroid-${i}`,
            connections: avgConnections,
            type: avgType,
          });
        }
      }

      // 3. 检查是否收敛
      converged = true;
      for (let i = 0; i < centroids.length && i < newCentroids.length; i++) {
        const centroid = centroids[i];
        const newCentroid = newCentroids[i];
        if (centroid && newCentroid) {
          if (
            Math.abs(centroid.connections - newCentroid.connections) > 0.001 ||
            Math.abs(centroid.type - newCentroid.type) > 0.001
          ) {
            converged = false;
            break;
          }
        }
      }

      // 更新聚类结果和中心点
      Object.assign(clusters, newClusters);
      centroids.splice(0, centroids.length, ...newCentroids);
      iteration++;
    }

    // 更新聚类结果
    dispatch({ type: 'SET_CLUSTERS', payload: clusters });
    
    // 生成聚类颜色
    const colors = Array.from({ length: state.clusterCount }, (_, index) => {
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    });
    dispatch({ type: 'SET_CLUSTER_COLORS', payload: colors });
    
    showNotification('聚类已完成', 'success');
  }, [state.nodes, state.clusterCount, showNotification]);
  
  // 业务逻辑操作
  const handleNodeClick = useCallback(async (node: EnhancedNode, event: React.MouseEvent) => {
    if (node._isAggregated && node._aggregatedNodes) {
      const updatedNode = { ...node, isExpanded: !node.isExpanded };
      
      if (updatedNode.isExpanded && node._aggregatedNodes) {
        // 展开聚合节点，添加子节点
        const newNodes = [...state.nodes.filter(n => n.id !== node.id), ...node._aggregatedNodes];
        dispatch({ type: 'SET_NODES', payload: newNodes });
      } else if (node._aggregatedNodes) {
        // 折叠聚合节点，移除子节点
        const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
        const newNodes = state.nodes.filter(n => !aggregatedNodeIds.has(n.id));
        dispatch({ type: 'SET_NODES', payload: newNodes });
      }
      
      dispatch({ type: 'SELECT_NODE', payload: updatedNode });
    } else if (event.ctrlKey || event.metaKey) {
      // 如果按住Ctrl/Cmd键，则添加到选中节点列表
      const isSelected = state.selectedNodes.some(n => n.id === node.id);
      const newSelectedNodes = isSelected
        ? state.selectedNodes.filter(n => n.id !== node.id)
        : [...state.selectedNodes, node];
      
      dispatch({ type: 'SELECT_NODES', payload: newSelectedNodes });
    } else {
      // 正常点击，只选中当前节点
      // 避免重复设置相同的选中状态，防止触发不必要的重渲染
      const isCurrentlySelected = state.selectedNode?.id === node.id && state.selectedNodes.length === 1;
      if (!isCurrentlySelected) {
        dispatch({ type: 'SELECT_NODE', payload: node });
      }
    }
  }, [state.nodes, state.selectedNode, state.selectedNodes]);
  
  const handleNodeDragStart = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _node: EnhancedNode
  ) => {
    // 拖拽开始时的处理逻辑
  }, []);
  
  const handleNodeDragEnd = useCallback((
    node: EnhancedNode
  ) => {
    // 拖拽结束时更新节点位置到状态中
    // 确保节点位置持久化
    dispatch({
      type: 'SET_NODES',
      payload: state.nodes.map(n => {
        if (n.id === node.id) {
          // 使用拖拽后的位置更新节点，确保属性有值
          const updatedNode = {
            ...n,
            x: node.x || 0,
            y: node.y || 0
          };
          
          // 只有当fx/fy有值时才添加它们
          if (node.fx !== undefined && node.fx !== null) {
            updatedNode.fx = node.fx;
          }
          if (node.fy !== undefined && node.fy !== null) {
            updatedNode.fy = node.fy;
          }
          
          return updatedNode;
        }
        return n;
      })
    });
  }, [state.nodes]);
  
  const handleConnectionClick = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ type: 'SELECT_CONNECTION', payload: connection });
  }, []);
  
  const handleCanvasClick = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);
  
  const handleBoxSelectStart = useCallback((x: number, y: number) => {
    dispatch({ type: 'SET_IS_BOX_SELECTING', payload: true });
    dispatch({ type: 'SET_BOX_SELECTION', payload: { x1: x, y1: y, x2: x, y2: y } });
  }, []);
  
  const handleBoxSelectUpdate = useCallback((x: number, y: number) => {
    dispatch({ type: 'SET_BOX_SELECTION', payload: { ...state.boxSelection, x2: x, y2: y } });
  }, [state.boxSelection]);
  
  const handleBoxSelectEnd = useCallback(() => {
    const { x1, y1, x2, y2 } = state.boxSelection;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    const selectedNodes = state.nodes.filter(node => {
      return node.x !== undefined && node.y !== undefined && 
             node.x >= minX && node.x <= maxX && 
             node.y >= minY && node.y <= maxY;
    });
    
    if (selectedNodes.length > 0) {
      dispatch({ type: 'SELECT_NODES', payload: selectedNodes });
    }
    
    dispatch({ type: 'SET_IS_BOX_SELECTING', payload: false });
    dispatch({ type: 'SET_BOX_SELECTION', payload: { x1: 0, y1: 0, x2: 0, y2: 0 } });
  }, [state.boxSelection, state.nodes]);
  
  const handleUpdateNode = useCallback((updatedNode: EnhancedNode) => {
    dispatch({ type: 'UPDATE_NODE', payload: updatedNode });
    dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '节点属性已更新', type: 'success' } });
  }, []);
  
  const handleUpdateConnection = useCallback((updatedConnection: EnhancedGraphConnection) => {
    dispatch({ type: 'UPDATE_CONNECTION', payload: updatedConnection });
    dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: '连接属性已更新', type: 'success' } });
  }, []);
  
  const handleCopyNodeStyle = useCallback(() => {
    if (!state.selectedNode) {
      showNotification('请先选择一个节点', 'error');
      return;
    }
    
    dispatch({ type: 'SET_COPIED_STYLE', payload: { type: 'node', style: state.currentTheme.node } });
    showNotification('已复制节点样式', 'success');
  }, [state.selectedNode, state.currentTheme, showNotification]);
  
  const handleCopyConnectionStyle = useCallback(() => {
    if (!state.selectedConnection) {
      showNotification('请先选择一个连接', 'error');
      return;
    }
    
    dispatch({ type: 'SET_COPIED_STYLE', payload: { type: 'connection', style: state.currentTheme.link } });
    showNotification('已复制连接样式', 'success');
  }, [state.selectedConnection, state.currentTheme, showNotification]);
  
  const handlePasteStyle = useCallback(() => {
    if (!state.copiedStyle) {
      showNotification('没有复制的样式', 'error');
      return;
    }
    
    const updatedTheme: GraphTheme = {
      ...state.currentTheme,
      [state.copiedStyle.type]: state.copiedStyle.style
    };
    
    dispatch({ type: 'SET_CURRENT_THEME', payload: updatedTheme });
    showNotification(`已粘贴${state.copiedStyle.type === 'node' ? '节点' : '连接'}样式`, 'success');
  }, [state.copiedStyle, state.currentTheme, showNotification]);
  
  const handleImportGraph = useCallback((graph: { nodes: EnhancedNode[]; connections: EnhancedGraphConnection[] }) => {
    const newNodes: EnhancedNode[] = graph.nodes.map((node: EnhancedNode) => ({
      id: String(node.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
      title: node.title || '新节点',
      connections: node.connections || 0,
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
      type: node.type || 'concept',
      isExpanded: false,
      _isAggregated: false,
      _aggregatedNodes: []
    }));
    
    const newConnections: EnhancedGraphConnection[] = graph.connections.map((connection: EnhancedGraphConnection) => {
      const source = connection.source && typeof connection.source === 'object' ? String((connection.source as EnhancedNode).id) : String(connection.source);
      const target = connection.target && typeof connection.target === 'object' ? String((connection.target as EnhancedNode).id) : String(connection.target);
      
      return {
        id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: connection.type || 'related',
        source: source,
        target: target,
        label: connection.label || '',
        weight: connection.weight || 1.0
      };
    });
    
    dispatch({ type: 'SET_NODES', payload: newNodes });
    dispatch({ type: 'SET_CONNECTIONS', payload: newConnections });
    showNotification('图谱已导入', 'success');
  }, [showNotification]);
  
  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    dispatch({ type: 'ADD_SAVED_LAYOUT', payload: layout });
    showNotification('布局已保存', 'success');
  }, [showNotification]);
  
  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    dispatch({ type: 'SET_LAYOUT_TYPE', payload: layout.layout.layoutType });
    dispatch({ type: 'SET_LAYOUT_DIRECTION', payload: layout.layout.layoutDirection });
    showNotification('布局已加载', 'success');
  }, [showNotification]);
  
  const handleDeleteLayout = useCallback((layoutId: string) => {
    dispatch({ type: 'DELETE_SAVED_LAYOUT', payload: layoutId });
    showNotification('布局已删除', 'success');
  }, [showNotification]);
  
  const handleCanvasDrop = useCallback((_event: React.DragEvent, x: number, y: number) => {
    // 计算新节点的位置，避免与现有节点重叠
    let finalX = x;
    let finalY = y;
    
    // 节点大小参数，用于计算避免重叠的距离
    const NODE_SIZE = 100;
    const MIN_DISTANCE = NODE_SIZE * 1.5; // 最小距离，避免重叠
    const MAX_DISTANCE = NODE_SIZE * 3; // 最大距离，不要离太远
    
    if (state.nodes.length === 0) {
      // 如果是第一个节点，在视图中心创建
      finalX = 0;
      finalY = 0;
    } else {
      // 检查是否与现有节点重叠
      let isOverlapping = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 20;
      
      while (isOverlapping && attempts < MAX_ATTEMPTS) {
        isOverlapping = false;
        
        // 检查当前位置是否与任何现有节点重叠
        for (const node of state.nodes) {
          const distance = Math.sqrt(
            Math.pow(finalX - (node.x || 0), 2) + 
            Math.pow(finalY - (node.y || 0), 2)
          );
          
          if (distance < MIN_DISTANCE) {
            isOverlapping = true;
            attempts++;
            
            // 优化：在现有节点附近寻找合适位置，而不是总是从原始位置偏移
            // 随机选择一个现有节点
            const randomIndex = Math.floor(Math.random() * state.nodes.length);
            const randomNode = state.nodes[randomIndex] || { x: 0, y: 0 };
            // 计算随机角度
            const angle = Math.random() * Math.PI * 2;
            // 计算新位置，在随机节点周围的合理范围内
            const distance = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
            finalX = (randomNode.x || 0) + Math.cos(angle) * distance;
            finalY = (randomNode.y || 0) + Math.sin(angle) * distance;
            break;
          }
        }
      }
      
      // 如果尝试了MAX_ATTEMPTS次仍未找到合适位置，使用原始位置
      if (attempts >= MAX_ATTEMPTS) {
        finalX = x;
        finalY = y;
      }
    }
    
    const newNode: EnhancedNode = {
      id: `node_${Date.now()}`,
      title: '新节点',
      connections: 0,
      x: finalX,
      y: finalY,
      type: 'concept',
      is_custom: true,
      isExpanded: false,
      _isAggregated: false,
      _aggregatedNodes: []
    };
    
    dispatch({ type: 'ADD_NODE', payload: newNode });
    dispatch({ type: 'ADD_HISTORY', payload: {
      type: 'addNode',
      nodeId: newNode.id,
      timestamp: Date.now(),
      data: { node: newNode }
    } });
    showNotification('节点创建成功', 'success');
  }, [state.nodes, showNotification]);
  
  const togglePanel = useCallback((panelId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: state.activePanel === panelId ? null : panelId });
  }, [state.activePanel]);
  
  // 分组操作
  const groupNodes = useCallback((nodes: EnhancedNode[]) => {
    if (nodes.length < 2) {
      showNotification('至少需要选择2个节点进行分组', 'error');
      return;
    }
    
    // 创建分组节点
    const group: EnhancedNode = {
      id: `group_${Date.now()}`,
      title: `分组 (${nodes.length}个节点)`,
      connections: 0,
      type: 'aggregate',
      isGroup: true,
      memberIds: nodes.map(node => node.id),
      x: nodes.reduce((sum, node) => sum + (node.x || 0), 0) / nodes.length,
      y: nodes.reduce((sum, node) => sum + (node.y || 0), 0) / nodes.length,
      isExpanded: true,
      _isAggregated: false,
      _aggregatedNodes: []
    };
    
    // 添加分组到历史记录
    dispatch({ type: 'ADD_HISTORY', payload: {
      type: 'groupNodes',
      groupId: group.id,
      timestamp: Date.now(),
      data: { nodes, group }
    } });
    
    // 更新状态
    dispatch({ type: 'GROUP_NODES', payload: { nodes, group } });
    showNotification('节点已分组', 'success');
  }, [showNotification]);
  
  const ungroupNodes = useCallback((groupId: string) => {
    // 添加到历史记录
    dispatch({ type: 'ADD_HISTORY', payload: {
      type: 'ungroupNodes',
      groupId,
      timestamp: Date.now(),
      data: { nodes: [], group: {} as EnhancedNode }
    } });
    
    // 更新状态
    dispatch({ type: 'UNGROUP_NODES', payload: groupId });
    showNotification('分组已取消', 'success');
  }, [showNotification]);
  
  const toggleGroupExpansion = useCallback((nodeId: string) => {
    // 切换分组节点的展开状态
    const updatedNodes = state.nodes.map(node => {
      if (node.id === nodeId && node.isGroup) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      return node;
    });
    
    dispatch({ type: 'SET_NODES', payload: updatedNodes });
  }, [state.nodes]);
  
  // 构建actions对象
  const actions: GraphActions = {
    // ReactFlow相关
    setReactFlowInstance,
    
    // 节点和连接操作
    setNodes,
    setConnections,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    updateConnection,
    deleteConnection,
    
    // 选择操作
    selectNode,
    selectNodes,
    selectConnection,
    selectConnections,
    clearSelection,
    
    // 交互操作
    setIsAddingConnection,
    setConnectionSourceNode,
    setMousePosition,
    setIsSimulationRunning,
    
    // 布局操作
    setLayoutType,
    setLayoutDirection,
    setViewMode,
    applyLayout,
    
    // UI操作
    setIsRightPanelVisible,
    setIsToolbarVisible,
    setIsLeftToolbarVisible,
    setActivePanel,
    setCurrentTheme,
    setCopiedStyle,
    setIsBoxSelecting,
    setBoxSelection,
    setIsSettingsPanelOpen,
    setToolbarAutoHide,
    setLeftToolbarAutoHide,
    
    // 布局参数操作
    setNodeSpacing,
    setLevelSpacing,
    setForceParameters,
    
    // 保存的布局操作
    setSavedLayouts,
    addSavedLayout,
    deleteSavedLayout,
    
    // 通知操作
    showNotification,
    closeNotification,
    
    // 历史记录操作
    addHistory,
    undo,
    redo,
    
    // 聚类操作
    setClusters,
    setClusterColors,
    setClusterCount,
    setIsClusteringEnabled,
    performKMeansClustering,
    
    // 分组操作
    groupNodes,
    ungroupNodes,
    toggleGroupExpansion,
    
    // 业务逻辑操作
    handleNodeClick,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleConnectionClick,
    handleCanvasClick,
    handleBoxSelectStart,
    handleBoxSelectUpdate,
    handleBoxSelectEnd,
    handleUpdateNode,
    handleUpdateConnection,
    handleCopyNodeStyle,
    handleCopyConnectionStyle,
    handlePasteStyle,
    handleImportGraph,
    handleSaveLayout,
    handleLoadLayout,
    handleDeleteLayout,
    handleCanvasDrop,
    togglePanel
  };
  
  return (
    <GraphContext.Provider value={{ state, actions }}>
      {children}
    </GraphContext.Provider>
  );
};
