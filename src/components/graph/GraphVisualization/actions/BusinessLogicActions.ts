import { useCallback } from 'react';
import type { EnhancedNode, EnhancedGraphConnection, SavedLayout } from '../types';
import type { GraphState, GraphAction } from '../GraphContextType';

interface BusinessLogicActionsProps {
  dispatch: React.Dispatch<GraphAction>;
  state: GraphState;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
}

export const useBusinessLogicActions = ({ dispatch, state, showNotification }: BusinessLogicActionsProps) => {
  // 业务逻辑操作
  const handleNodeClick = useCallback(async (node: EnhancedNode, event: React.MouseEvent) => {
    if (node._isAggregated && node._aggregatedNodes) {
      const updatedNode = { ...node, 'isExpanded': !node.isExpanded };

      if (updatedNode.isExpanded && node._aggregatedNodes) {
        // 展开聚合节点，添加子节点
        const newNodes = [...state.nodes.filter(n => n.id !== node.id), ...node._aggregatedNodes];
        dispatch({ 'type': 'SET_NODES', 'payload': newNodes });
      } else if (node._aggregatedNodes) {
        // 折叠聚合节点，移除子节点
        const aggregatedNodeIds = new Set(node._aggregatedNodes.map(n => n.id));
        const newNodes = state.nodes.filter(n => !aggregatedNodeIds.has(n.id));
        dispatch({ 'type': 'SET_NODES', 'payload': newNodes });
      }

      dispatch({ 'type': 'SELECT_NODE', 'payload': updatedNode });
    } else if (event.ctrlKey || event.metaKey) {
      // 如果按住Ctrl/Cmd键，则添加到选中节点列表
      const isSelected = state.selectedNodes.some(n => n.id === node.id);
      const newSelectedNodes = isSelected
        ? state.selectedNodes.filter(n => n.id !== node.id)
        : [...state.selectedNodes, node];

      dispatch({ 'type': 'SELECT_NODES', 'payload': newSelectedNodes });
    } else {
      // 正常点击，只选中当前节点
      // 避免重复设置相同的选中状态，防止触发不必要的重渲染
      const isCurrentlySelected = state.selectedNode?.id === node.id && state.selectedNodes.length === 1;
      if (!isCurrentlySelected) {
        dispatch({ 'type': 'SELECT_NODE', 'payload': node });
      }
    }
  }, [state.nodes, state.selectedNode, state.selectedNodes, dispatch]);

  const handleNodeDragStart = useCallback((

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
      'type': 'SET_NODES',
      'payload': state.nodes.map(n => {
        if (n.id === node.id) {
          // 使用拖拽后的位置更新节点，确保属性有值
          const updatedNode = {
            ...n,
            'x': node.x || 0,
            'y': node.y || 0
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
  }, [state.nodes, dispatch]);

  const handleConnectionClick = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ 'type': 'SELECT_CONNECTION', 'payload': connection });
  }, [dispatch]);

  const handleCanvasClick = useCallback(() => {
    dispatch({ 'type': 'CLEAR_SELECTION' });
  }, [dispatch]);

  const handleBoxSelectStart = useCallback((x: number, y: number) => {
    dispatch({ 'type': 'SET_IS_BOX_SELECTING', 'payload': true });
    dispatch({ 'type': 'SET_BOX_SELECTION', 'payload': { 'x1': x, 'y1': y, 'x2': x, 'y2': y } });
  }, [dispatch]);

  const handleBoxSelectUpdate = useCallback((x: number, y: number) => {
    dispatch({ 'type': 'SET_BOX_SELECTION', 'payload': { ...state.boxSelection, 'x2': x, 'y2': y } });
  }, [state.boxSelection, dispatch]);

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
      dispatch({ 'type': 'SELECT_NODES', 'payload': selectedNodes });
    }

    dispatch({ 'type': 'SET_IS_BOX_SELECTING', 'payload': false });
    dispatch({ 'type': 'SET_BOX_SELECTION', 'payload': { 'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0 } });
  }, [state.boxSelection, state.nodes, dispatch]);

  const handleUpdateNode = useCallback((updatedNode: EnhancedNode) => {
    dispatch({ 'type': 'UPDATE_NODE', 'payload': updatedNode });
    dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '节点属性已更新', 'type': 'success' } });
  }, [dispatch]);

  const handleUpdateConnection = useCallback((updatedConnection: EnhancedGraphConnection) => {
    dispatch({ 'type': 'UPDATE_CONNECTION', 'payload': updatedConnection });
    dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '连接属性已更新', 'type': 'success' } });
  }, [dispatch]);

  const handleCopyNodeStyle = useCallback(() => {
    if (!state.selectedNode) {
      showNotification('请先选择一个节点', 'error');
      return;
    }

    dispatch({ 'type': 'SET_COPIED_STYLE', 'payload': { 'type': 'node', 'style': state.currentTheme.node } });
    showNotification('已复制节点样式', 'success');
  }, [state.selectedNode, state.currentTheme, showNotification, dispatch]);

  const handleCopyConnectionStyle = useCallback(() => {
    if (!state.selectedConnection) {
      showNotification('请先选择一个连接', 'error');
      return;
    }

    dispatch({ 'type': 'SET_COPIED_STYLE', 'payload': { 'type': 'connection', 'style': state.currentTheme.link } });
    showNotification('已复制连接样式', 'success');
  }, [state.selectedConnection, state.currentTheme, showNotification, dispatch]);

  const handlePasteStyle = useCallback(() => {
    if (!state.copiedStyle) {
      showNotification('没有复制的样式', 'error');
      return;
    }

    const updatedTheme = {
      ...state.currentTheme,
      [state.copiedStyle.type]: state.copiedStyle.style
    };

    dispatch({ 'type': 'SET_CURRENT_THEME', 'payload': updatedTheme });
    showNotification(`已粘贴${state.copiedStyle.type === 'node' ? '节点' : '连接'}样式`, 'success');
  }, [state.copiedStyle, state.currentTheme, showNotification, dispatch]);

  const handleImportGraph = useCallback((graph: { nodes: EnhancedNode[]; connections: EnhancedGraphConnection[] }) => {
    const newNodes: EnhancedNode[] = graph.nodes.map((node: EnhancedNode) => ({
      'id': String(node.id || `node-${Date.now()}-${Math.random().toString(36)
        .substr(2, 9)}`),
      'title': node.title || '新节点',
      'connections': node.connections || 0,
      'x': Math.random() * 400 + 100,
      'y': Math.random() * 400 + 100,
      'type': node.type || 'concept',
      'isExpanded': false,
      '_isAggregated': false,
      '_aggregatedNodes': []
    }));

    const newConnections: EnhancedGraphConnection[] = graph.connections.map((connection: EnhancedGraphConnection) => {
      const source = connection.source && typeof connection.source === 'object' ? String((connection.source as EnhancedNode).id) : String(connection.source);
      const target = connection.target && typeof connection.target === 'object' ? String((connection.target as EnhancedNode).id) : String(connection.target);

      return {
        'id': `connection-${Date.now()}-${Math.random().toString(36)
          .substr(2, 9)}`,
        'type': connection.type || 'related',
        source,
        target,
        'label': connection.label || '',
        'weight': connection.weight || 1.0
      };
    });

    dispatch({ 'type': 'SET_NODES', 'payload': newNodes });
    dispatch({ 'type': 'SET_CONNECTIONS', 'payload': newConnections });
    showNotification('图谱已导入', 'success');
  }, [showNotification, dispatch]);

  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    dispatch({ 'type': 'ADD_SAVED_LAYOUT', 'payload': layout });
    showNotification('布局已保存', 'success');
  }, [showNotification, dispatch]);

  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    dispatch({ 'type': 'SET_LAYOUT_TYPE', 'payload': layout.layout.layoutType });
    dispatch({ 'type': 'SET_LAYOUT_DIRECTION', 'payload': layout.layout.layoutDirection });
    showNotification('布局已加载', 'success');
  }, [showNotification, dispatch]);

  const handleDeleteLayout = useCallback((layoutId: string) => {
    dispatch({ 'type': 'DELETE_SAVED_LAYOUT', 'payload': layoutId });
    showNotification('布局已删除', 'success');
  }, [showNotification, dispatch]);

  const handleCanvasDrop = useCallback((_event: React.DragEvent, x: number, y: number) => {
    // 计算新节点的位置，避免与现有节点重叠
    let finalX = x;
    let finalY = y;

    // 节点大小参数，用于计算避免重叠的距离
    const NODE_SIZE = 100;
    // 最小距离，避免重叠
    const MIN_DISTANCE = NODE_SIZE * 1.5;
    // 最大距离，不要离太远
    const MAX_DISTANCE = NODE_SIZE * 3;

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
            attempts += 1;

            // 优化：在现有节点附近寻找合适位置，而不是总是从原始位置偏移
            // 随机选择一个现有节点
            const randomIndex = Math.floor(Math.random() * state.nodes.length);
            const randomNode = state.nodes[randomIndex] || { 'x': 0, 'y': 0 };
            // 计算随机角度
            const angle = Math.random() * Math.PI * 2;
            // 计算新位置，在随机节点周围的合理范围内
            const newDistance = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
            finalX = (randomNode.x || 0) + Math.cos(angle) * newDistance;
            finalY = (randomNode.y || 0) + Math.sin(angle) * newDistance;
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
      'id': `node_${Date.now()}`,
      'title': '新节点',
      'connections': 0,
      'x': finalX,
      'y': finalY,
      'type': 'concept',
      'isExpanded': false,
      '_isAggregated': false,
      '_aggregatedNodes': []
    };

    dispatch({ 'type': 'ADD_NODE', 'payload': newNode });
    dispatch({ 'type': 'SELECT_NODE', 'payload': newNode });
    showNotification('节点已创建', 'success');
  }, [state.nodes, showNotification, dispatch]);

  // 分组操作
  const groupNodes = useCallback((nodes: EnhancedNode[]) => {
    if (nodes.length < 2) {
      showNotification('至少需要选择两个节点才能分组', 'error');
      return;
    }

    // 创建分组节点
    const group: EnhancedNode = {
      'id': `group_${Date.now()}`,
      'title': `分组 ${state.nodes.filter(n => n.type === 'group').length + 1}`,
      'type': 'group',
      'x': nodes.reduce((sum, node) => sum + (node.x || 0), 0) / nodes.length,
      'y': nodes.reduce((sum, node) => sum + (node.y || 0), 0) / nodes.length,
      'connections': 0,
      'isExpanded': true,
      '_isAggregated': false,
      '_aggregatedNodes': [],
      'memberIds': nodes.map(n => n.id)
    };

    dispatch({ 'type': 'GROUP_NODES', 'payload': { nodes, group } });
    showNotification('节点已分组', 'success');
  }, [state.nodes, showNotification, dispatch]);

  const ungroupNodes = useCallback((groupId: string) => {
    dispatch({ 'type': 'UNGROUP_NODES', 'payload': groupId });
    showNotification('节点已取消分组', 'success');
  }, [dispatch, showNotification]);

  const toggleGroupExpansion = useCallback((nodeId: string) => {
    // 找到分组节点
    const groupNode = state.nodes.find(node => node.id === nodeId && node.type === 'group');
    if (!groupNode) {
      return;
    }

    // 切换展开状态
    const updatedNode = { ...groupNode, 'isExpanded': !groupNode.isExpanded };
    dispatch({ 'type': 'UPDATE_NODE', 'payload': updatedNode });
    showNotification(`分组已${updatedNode.isExpanded ? '展开' : '折叠'}`, 'success');
  }, [state.nodes, showNotification, dispatch]);

  // 面板切换
  const togglePanel = useCallback((panelId: string | null) => {
    dispatch({
      'type': 'SET_ACTIVE_PANEL',
      'payload': state.activePanel === panelId ? null : panelId
    });
  }, [state.activePanel, dispatch]);

  return {
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
    groupNodes,
    ungroupNodes,
    toggleGroupExpansion,
    togglePanel
  };
};

export type BusinessLogicActions = ReturnType<typeof useBusinessLogicActions>;
