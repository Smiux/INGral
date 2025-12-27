import type { Dispatch } from 'react';
import type { GraphState, GraphAction, GraphActions, GraphNode, GraphConnection, SavedLayout } from './GraphTypes';
import { GraphUtils } from './GraphUtils';

export const createGraphActions = (dispatch: Dispatch<GraphAction>, state: GraphState): GraphActions => ({
  'setNodes': (nodes: GraphNode[]) => {
    dispatch({ 'type': 'SET_NODES', 'payload': nodes });
  },

  'setConnections': (connections: GraphConnection[]) => {
    dispatch({ 'type': 'SET_CONNECTIONS', 'payload': connections });
  },

  'addNode': (node: GraphNode) => {
    dispatch({ 'type': 'ADD_NODE', 'payload': node });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': { 'type': 'addNode', 'nodeId': node.id, 'timestamp': Date.now(), 'data': { node } }
    });
  },

  'updateNode': (node: GraphNode) => {
    dispatch({ 'type': 'UPDATE_NODE', 'payload': node });
  },

  'deleteNode': (nodeId: string) => {
    const nodeToDelete = state.nodes.find(node => node.id === nodeId);
    if (!nodeToDelete) {
      return;
    }

    const relatedConnections = state.connections.filter(
      connection => String(connection.source) === nodeId || String(connection.target) === nodeId
    );

    dispatch({ 'type': 'DELETE_NODE', 'payload': nodeId });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': {
        'type': 'deleteNode',
        nodeId,
        'timestamp': Date.now(),
        'data': { 'node': nodeToDelete, 'connections': relatedConnections }
      }
    });
  },

  'addConnection': (connection: GraphConnection) => {
    dispatch({ 'type': 'ADD_CONNECTION', 'payload': connection });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': { 'type': 'addConnection', 'connectionId': connection.id, 'timestamp': Date.now(), 'data': connection }
    });
  },

  'updateConnection': (connection: GraphConnection) => {
    dispatch({ 'type': 'UPDATE_CONNECTION', 'payload': connection });
  },

  'deleteConnection': (connectionId: string) => {
    const connectionToDelete = state.connections.find(connection => connection.id === connectionId);
    if (!connectionToDelete) {
      return;
    }

    dispatch({ 'type': 'DELETE_CONNECTION', 'payload': connectionId });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': { 'type': 'deleteConnection', connectionId, 'timestamp': Date.now(), 'data': connectionToDelete }
    });
  },

  'selectNode': (node: GraphNode | null) => {
    dispatch({ 'type': 'SELECT_NODE', 'payload': node });
  },

  'selectNodes': (nodes: GraphNode[]) => {
    dispatch({ 'type': 'SELECT_NODES', 'payload': nodes });
  },

  'selectConnection': (connection: GraphConnection | null) => {
    dispatch({ 'type': 'SELECT_CONNECTION', 'payload': connection });
  },

  'selectConnections': (connections: GraphConnection[]) => {
    dispatch({ 'type': 'SELECT_CONNECTIONS', 'payload': connections });
  },

  'clearSelection': () => {
    dispatch({ 'type': 'CLEAR_SELECTION' });
  },

  'setIsAddingConnection': (isAddingConnection: boolean) => {
    dispatch({ 'type': 'SET_IS_ADDING_CONNECTION', 'payload': isAddingConnection });
  },

  'setConnectionSourceNode': (node: GraphNode | null) => {
    dispatch({ 'type': 'SET_CONNECTION_SOURCE_NODE', 'payload': node });
  },

  'setMousePosition': (position: { x: number; y: number } | null) => {
    dispatch({ 'type': 'SET_MOUSE_POSITION', 'payload': position });
  },

  'setIsSimulationRunning': (isRunning: boolean) => {
    dispatch({ 'type': 'SET_IS_SIMULATION_RUNNING', 'payload': isRunning });
  },

  'setLayoutType': (layoutType: 'force' | 'tree' | 'hierarchical' | 'circular' | 'grid' | 'radial' | 'geographic') => {
    dispatch({ 'type': 'SET_LAYOUT_TYPE', 'payload': layoutType });
  },

  'setLayoutDirection': (layoutDirection: 'top-bottom' | 'left-right' | 'bottom-top' | 'right-left') => {
    dispatch({ 'type': 'SET_LAYOUT_DIRECTION', 'payload': layoutDirection });
  },

  'setViewMode': (viewMode: '2d' | '3d') => {
    dispatch({ 'type': 'SET_VIEW_MODE', 'payload': viewMode });
  },

  'setIsRightPanelVisible': (isVisible: boolean) => {
    dispatch({ 'type': 'SET_IS_RIGHT_PANEL_VISIBLE', 'payload': isVisible });
  },

  'setIsToolbarVisible': (isVisible: boolean) => {
    dispatch({ 'type': 'SET_IS_TOOLBAR_VISIBLE', 'payload': isVisible });
  },

  'setIsLeftToolbarVisible': (isVisible: boolean) => {
    dispatch({ 'type': 'SET_IS_LEFT_TOOLBAR_VISIBLE', 'payload': isVisible });
  },

  'setActivePanel': (panel: string) => {
    dispatch({ 'type': 'SET_ACTIVE_PANEL', 'payload': panel });
  },

  'setIsBoxSelecting': (isBoxSelecting: boolean) => {
    dispatch({ 'type': 'SET_IS_BOX_SELECTING', 'payload': isBoxSelecting });
  },

  'setBoxSelection': (selection: { x1: number; y1: number; x2: number; y2: number }) => {
    dispatch({ 'type': 'SET_BOX_SELECTION', 'payload': selection });
  },

  'setIsSettingsPanelOpen': (isOpen: boolean) => {
    dispatch({ 'type': 'SET_IS_SETTINGS_PANEL_OPEN', 'payload': isOpen });
  },

  'setToolbarAutoHide': (autoHide: boolean) => {
    dispatch({ 'type': 'SET_TOOLBAR_AUTO_HIDE', 'payload': autoHide });
  },

  'setLeftToolbarAutoHide': (autoHide: boolean) => {
    dispatch({ 'type': 'SET_LEFT_TOOLBAR_AUTO_HIDE', 'payload': autoHide });
  },

  'setNodeSpacing': (spacing: number) => {
    dispatch({ 'type': 'SET_NODE_SPACING', 'payload': spacing });
  },

  'setLevelSpacing': (spacing: number) => {
    dispatch({ 'type': 'SET_LEVEL_SPACING', 'payload': spacing });
  },

  'setForceParameters': (parameters: { charge?: number; linkStrength?: number; linkDistance?: number; gravity?: number }) => {
    dispatch({ 'type': 'SET_FORCE_PARAMETERS', 'payload': parameters });
  },

  'setSavedLayouts': (layouts: SavedLayout[]) => {
    dispatch({ 'type': 'SET_SAVED_LAYOUTS', 'payload': layouts });
  },

  'addSavedLayout': (layout: SavedLayout) => {
    dispatch({ 'type': 'ADD_SAVED_LAYOUT', 'payload': layout });
  },

  'deleteSavedLayout': (layoutId: string) => {
    dispatch({ 'type': 'DELETE_SAVED_LAYOUT', 'payload': layoutId });
  },

  'showNotification': (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { message, type } });
  },

  'closeNotification': () => {
    dispatch({ 'type': 'CLOSE_NOTIFICATION' });
  },

  'undo': () => {
    dispatch({ 'type': 'UNDO' });
  },

  'redo': () => {
    dispatch({ 'type': 'REDO' });
  },

  'setClusters': (clusters: Record<string, number>) => {
    dispatch({ 'type': 'SET_CLUSTERS', 'payload': clusters });
  },

  'setClusterColors': (colors: string[]) => {
    dispatch({ 'type': 'SET_CLUSTER_COLORS', 'payload': colors });
  },

  'setClusterCount': (count: number) => {
    dispatch({ 'type': 'SET_CLUSTER_COUNT', 'payload': count });
  },

  'setIsClusteringEnabled': (enabled: boolean) => {
    dispatch({ 'type': 'SET_IS_CLUSTERING_ENABLED', 'payload': enabled });
  },

  'groupNodes': (nodes: GraphNode[], group: GraphNode) => {
    dispatch({ 'type': 'GROUP_NODES', 'payload': { nodes, group } });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': { 'type': 'groupNodes', 'groupId': group.id, 'timestamp': Date.now(), 'data': { nodes, group } }
    });
  },

  'ungroupNodes': (groupId: string) => {
    const groupNode = state.nodes.find(node => node.id === groupId);
    if (!groupNode) {
      return;
    }

    const memberNodes = state.nodes.filter(node => groupNode.group.memberIds?.includes(node.id));

    dispatch({ 'type': 'UNGROUP_NODES', 'payload': groupId });
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': { 'type': 'ungroupNodes', groupId, 'timestamp': Date.now(), 'data': { 'nodes': memberNodes, 'group': groupNode } }
    });
  },

  'handleImportGraph': (graph: { nodes: GraphNode[]; connections: GraphConnection[] }) => {
    dispatch({ 'type': 'SET_NODES', 'payload': graph.nodes });
    dispatch({ 'type': 'SET_CONNECTIONS', 'payload': graph.connections });
  },

  'handleSaveLayout': (layout: SavedLayout) => {
    dispatch({ 'type': 'ADD_SAVED_LAYOUT', 'payload': layout });
  },

  'handleLoadLayout': (layoutId: string) => {
    const layout = state.savedLayouts.find((l: SavedLayout) => l.id === layoutId);
    if (layout) {
      const graph = GraphUtils.importFromJSON(JSON.stringify({ 'nodes': layout.nodePositions, 'connections': [] }));
      dispatch({ 'type': 'SET_NODES', 'payload': graph.nodes });
      dispatch({ 'type': 'SET_CONNECTIONS', 'payload': graph.connections });
    }
  },

  'handleDeleteLayout': (layoutId: string) => {
    dispatch({ 'type': 'DELETE_SAVED_LAYOUT', 'payload': layoutId });
  },

  'addHistory': (history: unknown) => {
    dispatch({ 'type': 'ADD_HISTORY', 'payload': history });
  },

  'setReactFlowInstance': (instance: unknown) => {
    dispatch({ 'type': 'SET_REACT_FLOW_INSTANCE', 'payload': instance });
  }
});
