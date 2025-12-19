import type { GraphState, GraphAction } from './GraphContextType';
import type { EnhancedGraphConnection } from './types';

// ===========================
// Reducer函数
// ===========================

export const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
    // 节点和连接相关
    case 'SET_NODES':
      return { ...state, 'nodes': action.payload };
    case 'SET_CONNECTIONS':
      return { ...state, 'connections': action.payload };
    case 'ADD_NODE':
      return { ...state, 'nodes': [...state.nodes, action.payload] };
    case 'UPDATE_NODE':
      return {
        ...state,
        'nodes': state.nodes.map(node => node.id === action.payload.id ? action.payload : node)
      };
    case 'DELETE_NODE':
      return {
        ...state,
        'nodes': state.nodes.filter(node => node.id !== action.payload),
        'connections': state.connections.filter(connection =>
          String(connection.source) !== action.payload && String(connection.target) !== action.payload
        )
      };
    case 'ADD_CONNECTION':
      return { ...state, 'connections': [...state.connections, action.payload] };
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        'connections': state.connections.map(connection => connection.id === action.payload.id ? action.payload : connection)
      };
    case 'DELETE_CONNECTION':
      return {
        ...state,
        'connections': state.connections.filter(connection => connection.id !== action.payload)
      };

    // ReactFlow相关
    case 'SET_REACT_FLOW_INSTANCE':
      return { ...state, 'reactFlowInstance': action.payload };

    // 选择相关
    case 'SELECT_NODE':
      return {
        ...state,
        'selectedNode': action.payload,
        'selectedNodes': action.payload ? [action.payload] : [],
        'selectedConnection': null,
        'selectedConnections': []
      };
    case 'SELECT_NODES':
      return {
        ...state,
        'selectedNodes': action.payload,
        'selectedNode': action.payload.length > 0 ? (action.payload[0] || null) : null,
        'selectedConnection': null,
        'selectedConnections': []
      };
    case 'SELECT_CONNECTION':
      return {
        ...state,
        'selectedConnection': action.payload,
        'selectedConnections': action.payload ? [action.payload] : [],
        'selectedNode': null,
        'selectedNodes': []
      };
    case 'SELECT_CONNECTIONS':
      return {
        ...state,
        'selectedConnections': action.payload,
        'selectedConnection': action.payload.length > 0 ? (action.payload[0] || null) : null,
        'selectedNode': null,
        'selectedNodes': []
      };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        'selectedNode': null,
        'selectedNodes': [],
        'selectedConnection': null,
        'selectedConnections': []
      };

    // 交互相关
    case 'SET_IS_ADDING_CONNECTION':
      return { ...state, 'isAddingConnection': action.payload };
    case 'SET_CONNECTION_SOURCE_NODE':
      return { ...state, 'connectionSourceNode': action.payload };
    case 'SET_MOUSE_POSITION':
      return { ...state, 'mousePosition': action.payload };
    case 'SET_IS_SIMULATION_RUNNING':
      return { ...state, 'isSimulationRunning': action.payload };

    // 布局相关
    case 'SET_LAYOUT_TYPE':
      return { ...state, 'layoutType': action.payload };
    case 'SET_LAYOUT_DIRECTION':
      return { ...state, 'layoutDirection': action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, 'viewMode': action.payload };

    // UI相关
    case 'SET_IS_RIGHT_PANEL_VISIBLE':
      return { ...state, 'isRightPanelVisible': action.payload };
    case 'SET_IS_TOOLBAR_VISIBLE':
      return { ...state, 'isToolbarVisible': action.payload };
    case 'SET_IS_LEFT_TOOLBAR_VISIBLE':
      return { ...state, 'isLeftToolbarVisible': action.payload };
    case 'SET_ACTIVE_PANEL':
      return { ...state, 'activePanel': action.payload };
    case 'SET_CURRENT_THEME':
      return { ...state, 'currentTheme': action.payload };
    case 'SET_COPIED_STYLE':
      return { ...state, 'copiedStyle': action.payload };
    case 'SET_IS_BOX_SELECTING':
      return { ...state, 'isBoxSelecting': action.payload };
    case 'SET_BOX_SELECTION':
      return { ...state, 'boxSelection': action.payload };
    case 'SET_IS_SETTINGS_PANEL_OPEN':
      return { ...state, 'isSettingsPanelOpen': action.payload };

    case 'SET_TOOLBAR_AUTO_HIDE':
      return { ...state, 'toolbarAutoHide': action.payload };
    case 'SET_LEFT_TOOLBAR_AUTO_HIDE':
      return { ...state, 'leftToolbarAutoHide': action.payload };

    // 布局参数
    case 'SET_NODE_SPACING':
      return { ...state, 'nodeSpacing': action.payload };
    case 'SET_LEVEL_SPACING':
      return { ...state, 'levelSpacing': action.payload };
    case 'SET_FORCE_PARAMETERS':
      return { ...state, 'forceParameters': action.payload };

    // 保存的布局
    case 'SET_SAVED_LAYOUTS':
      return { ...state, 'savedLayouts': action.payload };
    case 'ADD_SAVED_LAYOUT':
      return { ...state, 'savedLayouts': [...state.savedLayouts, action.payload] };
    case 'DELETE_SAVED_LAYOUT':
      return {
        ...state,
        'savedLayouts': state.savedLayouts.filter(layout => layout.id !== action.payload)
      };

    // 通知相关
    case 'SHOW_NOTIFICATION':
      return { ...state, 'notification': action.payload };
    case 'CLOSE_NOTIFICATION':
      return { ...state, 'notification': null };

    // 历史记录相关
    case 'ADD_HISTORY':
      // 如果当前不在历史记录末尾，截断历史记录
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history];
      // 限制历史记录长度为50
      if (newHistory.length >= 50) {
        // 移除最旧的记录
        newHistory.shift();
      }
      newHistory.push(action.payload);
      return {
        ...state,
        'history': newHistory,
        'historyIndex': newHistory.length - 1
      };
    case 'UNDO':
      if (state.historyIndex >= 0) {
        const actionToUndo = state.history[state.historyIndex];
        if (!actionToUndo) {
          return state;
        }

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
          'nodes': newNodes,
          'connections': newConnections,
          'historyIndex': state.historyIndex - 1
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        const actionToRedo = state.history[nextIndex];
        if (!actionToRedo) {
          return state;
        }

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
          'nodes': newNodes,
          'connections': newConnections,
          'historyIndex': nextIndex
        };
      }
      return state;

    // 聚类相关
    case 'SET_CLUSTERS':
      return { ...state, 'clusters': action.payload };
    case 'SET_CLUSTER_COLORS':
      return { ...state, 'clusterColors': action.payload };
    case 'SET_CLUSTER_COUNT':
      return { ...state, 'clusterCount': action.payload };
    case 'SET_IS_CLUSTERING_ENABLED':
      return { ...state, 'isClusteringEnabled': action.payload };

    // 分组相关
    case 'GROUP_NODES': {
      const { 'nodes': nodesToGroup, group } = action.payload;
      const nodeIdsToGroup = new Set(nodesToGroup.map(node => node.id));

      // 过滤掉要分组的节点，添加分组节点
      const newNodes = [
        ...state.nodes.filter(node => !nodeIdsToGroup.has(node.id)),
        group
      ];

      // 更新被分组节点的属性
      const updatedNodes = newNodes.map(node => {
        if (nodeIdsToGroup.has(node.id)) {
          return { ...node, 'groupId': group.id };
        }
        return node;
      });

      return {
        ...state,
        'nodes': updatedNodes
      };
    }
    case 'UNGROUP_NODES': {
      const groupId = action.payload;

      // 找到分组节点
      const groupNode = state.nodes.find(node => node.id === groupId);
      if (!groupNode || !groupNode.memberIds) {
        return state;
      }

      // 移除分组节点，更新成员节点的groupId属性
      const newNodes = state.nodes
        // 移除分组节点
        .filter(node => node.id !== groupId)
        .map(node => {
          if (groupNode.memberIds?.includes(node.id)) {
            // 移除成员节点的groupId属性
            // 创建一个新对象，不包含groupId属性
            // 使用类型断言确保类型安全
            const rest = { ...node };
            // 删除groupId属性
            delete rest.groupId;
            return rest;
          }
          return node;
        });

      return {
        ...state,
        'nodes': newNodes
      };
    }

    default:
      return state;
  }
};
