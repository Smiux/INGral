import type { GraphState, GraphAction, GraphConnection, GraphNode, HistoryEntry } from './GraphTypes';

export const getInitialState = (): GraphState => ({
  'nodes': [],
  'connections': [],
  'reactFlowInstance': null,
  'selectedNode': null,
  'selectedNodes': [],
  'selectedConnection': null,
  'selectedConnections': [],
  'isAddingConnection': false,
  'connectionSourceNode': null,
  'mousePosition': null,
  'isSimulationRunning': false,
  'layoutType': 'force',
  'layoutDirection': 'top-bottom',
  'viewMode': '2d',
  'isRightPanelVisible': false,
  'isToolbarVisible': true,
  'isLeftToolbarVisible': true,
  'activePanel': '',
  'isBoxSelecting': false,
  'boxSelection': { 'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0 },
  'isSettingsPanelOpen': false,
  'toolbarAutoHide': false,
  'leftToolbarAutoHide': false,
  'nodeSpacing': 100,
  'levelSpacing': 100,
  'forceParameters': {
    'charge': -300,
    'linkStrength': 0.1,
    'linkDistance': 100,
    'gravity': 0.1
  },
  'savedLayouts': [],
  'notification': null,
  'history': [],
  'historyIndex': -1,
  'clusters': {},
  'clusterColors': [],
  'clusterCount': 0,
  'isClusteringEnabled': false
});

export const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
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
    case 'SET_REACT_FLOW_INSTANCE':
      return { ...state, 'reactFlowInstance': action.payload };
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
        'selectedNode': action.payload.length > 0 ? action.payload[0] || null : null,
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
        'selectedConnection': action.payload.length > 0 ? action.payload[0] || null : null,
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
    case 'SET_IS_ADDING_CONNECTION':
      return { ...state, 'isAddingConnection': action.payload };
    case 'SET_CONNECTION_SOURCE_NODE':
      return { ...state, 'connectionSourceNode': action.payload };
    case 'SET_MOUSE_POSITION':
      return { ...state, 'mousePosition': action.payload };
    case 'SET_IS_SIMULATION_RUNNING':
      return { ...state, 'isSimulationRunning': action.payload };
    case 'SET_LAYOUT_TYPE':
      return { ...state, 'layoutType': action.payload };
    case 'SET_LAYOUT_DIRECTION':
      return { ...state, 'layoutDirection': action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, 'viewMode': action.payload };
    case 'SET_IS_RIGHT_PANEL_VISIBLE':
      return { ...state, 'isRightPanelVisible': action.payload };
    case 'SET_IS_TOOLBAR_VISIBLE':
      return { ...state, 'isToolbarVisible': action.payload };
    case 'SET_IS_LEFT_TOOLBAR_VISIBLE':
      return { ...state, 'isLeftToolbarVisible': action.payload };
    case 'SET_ACTIVE_PANEL':
      return { ...state, 'activePanel': action.payload };
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
    case 'SET_NODE_SPACING':
      return { ...state, 'nodeSpacing': action.payload };
    case 'SET_LEVEL_SPACING':
      return { ...state, 'levelSpacing': action.payload };
    case 'SET_FORCE_PARAMETERS':
      return { ...state, 'forceParameters': action.payload };
    case 'SET_SAVED_LAYOUTS':
      return { ...state, 'savedLayouts': action.payload };
    case 'ADD_SAVED_LAYOUT':
      return { ...state, 'savedLayouts': [...state.savedLayouts, action.payload] };
    case 'DELETE_SAVED_LAYOUT':
      return {
        ...state,
        'savedLayouts': state.savedLayouts.filter(layout => layout.id !== action.payload)
      };
    case 'SHOW_NOTIFICATION':
      return { ...state, 'notification': action.payload };
    case 'CLOSE_NOTIFICATION':
      return { ...state, 'notification': null };
    case 'ADD_HISTORY':
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history];
      if (newHistory.length >= 50) {
        newHistory.shift();
      }
      newHistory.push(action.payload as HistoryEntry);
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

        switch (actionToUndo.type) {
          case 'addNode':
            newNodes = newNodes.filter(node => node.id !== actionToUndo.nodeId);
            break;
          case 'deleteNode':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToUndo.data && actionToUndo.data.type === 'deleteNode') {
              newNodes.push(actionToUndo.data.node);
              newConnections.push(...actionToUndo.data.connections);
            }
            break;
          case 'addConnection':
            newConnections = newConnections.filter(connection => connection.id !== actionToUndo.connectionId);
            break;
          case 'deleteConnection':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToUndo.data && actionToUndo.data.type === 'deleteConnection') {
              newConnections.push(actionToUndo.data.connection);
            }
            break;
          case 'groupNodes':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToUndo.data && actionToUndo.data.type === 'groupNodes') {
              const groupToRemove = actionToUndo.data.group;
              const nodesToUpdate = actionToUndo.data.nodes;
              newNodes = newNodes.filter(node => node.id !== groupToRemove.id);
              newNodes = newNodes.map(node => {
                if (nodesToUpdate.some((n: GraphNode) => n.id === node.id)) {
                  return {
                    ...node,
                    'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false }
                  };
                }
                return node;
              });
            }
            break;
          case 'ungroupNodes':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToUndo.data && actionToUndo.data.type === 'ungroupNodes') {
              newNodes.push(actionToUndo.data.group);
              const nodesToUpdate = actionToUndo.data.nodes;
              newNodes = newNodes.map(node => {
                if (nodesToUpdate.some((n: GraphNode) => n.id === node.id)) {
                  return {
                    ...node,
                    'group': {
                      'isGroup': false,
                      'memberIds': [],
                      'isGroupExpanded': false
                    }
                  };
                }
                return node;
              });
            }
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

        switch (actionToRedo.type) {
          case 'addNode':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToRedo.data && actionToRedo.data.type === 'addNode') {
              newNodes.push(actionToRedo.data.node);
            }
            break;
          case 'deleteNode':
            newNodes = newNodes.filter(node => node.id !== actionToRedo.nodeId);
            // 使用类型守卫检查 data 类型
            if ('type' in actionToRedo.data && actionToRedo.data.type === 'deleteNode') {
              const { connections } = actionToRedo.data;
              newConnections = newConnections.filter(connection => {
                return !connections.some((l: GraphConnection) => l.id === connection.id);
              });
            }
            break;
          case 'addConnection':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToRedo.data && actionToRedo.data.type === 'addConnection') {
              newConnections.push(actionToRedo.data.connection);
            }
            break;
          case 'deleteConnection':
            newConnections = newConnections.filter(connection => connection.id !== actionToRedo.connectionId);
            break;
          case 'groupNodes':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToRedo.data && actionToRedo.data.type === 'groupNodes') {
              const groupToAdd = actionToRedo.data.group;
              const nodesToUpdate = actionToRedo.data.nodes;
              newNodes.push(groupToAdd);
              newNodes = newNodes.map(node => {
                if (nodesToUpdate.some((n: GraphNode) => n.id === node.id)) {
                  return {
                    ...node,
                    'group': {
                      'isGroup': false,
                      'memberIds': [],
                      'isGroupExpanded': false
                    }
                  };
                }
                return node;
              });
            }
            break;
          case 'ungroupNodes':
            // 使用类型守卫检查 data 类型
            if ('type' in actionToRedo.data && actionToRedo.data.type === 'ungroupNodes') {
              const groupToRemove = actionToRedo.data.group;
              const nodesToUpdate = actionToRedo.data.nodes;
              newNodes = newNodes.filter(node => node.id !== groupToRemove.id);
              newNodes = newNodes.map(node => {
                if (nodesToUpdate.some((n: GraphNode) => n.id === node.id)) {
                  return {
                    ...node,
                    'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false }
                  };
                }
                return node;
              });
            }
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
    case 'SET_CLUSTERS':
      return { ...state, 'clusters': action.payload };
    case 'SET_CLUSTER_COLORS':
      return { ...state, 'clusterColors': action.payload };
    case 'SET_CLUSTER_COUNT':
      return { ...state, 'clusterCount': action.payload };
    case 'SET_IS_CLUSTERING_ENABLED':
      return { ...state, 'isClusteringEnabled': action.payload };
    case 'GROUP_NODES': {
      const { 'nodes': nodesToGroup, group } = action.payload;
      const nodeIdsToGroup = new Set(nodesToGroup.map(node => node.id));

      const updatedGroup = {
        ...group,
        'isGroup': true,
        'memberIds': nodesToGroup.map(node => node.id)
      };

      const filteredNodes = [
        ...state.nodes.filter(node => !nodeIdsToGroup.has(node.id)),
        updatedGroup
      ];

      const updatedNodes = filteredNodes.map(node => {
        if (nodeIdsToGroup.has(node.id)) {
          return {
            ...node,
            'group': {
              'isGroup': false,
              'memberIds': [],
              'isGroupExpanded': false
            }
          };
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

      const groupNode = state.nodes.find(node => node.id === groupId);
      if (!groupNode || !groupNode.group.memberIds) {
        return state;
      }

      const newNodes = state.nodes
        .filter(node => node.id !== groupId)
        .map(node => {
          if (groupNode.group.memberIds?.includes(node.id)) {
            return {
              ...node,
              'group': {
                'isGroup': false,
                'memberIds': [],
                'isGroupExpanded': false
              }
            };
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
