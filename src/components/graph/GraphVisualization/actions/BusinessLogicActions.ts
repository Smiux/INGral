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
    if (node.aggregation?._isAggregated && node.aggregation?._aggregatedNodes) {
      const isExpanded = !node.state.isExpanded;
      const updatedNode = {
        ...node,
        'state': {
          ...node.state,
          isExpanded
        }
      };

      if (isExpanded && node.aggregation._aggregatedNodes) {
        // 展开聚合节点，添加子节点
        const newNodes = [...state.nodes.filter(n => n.id !== node.id), ...node.aggregation._aggregatedNodes];
        dispatch({ 'type': 'SET_NODES', 'payload': newNodes });
      } else if (node.aggregation._aggregatedNodes) {
        // 折叠聚合节点，移除子节点
        const aggregatedNodeIds = new Set(node.aggregation._aggregatedNodes.map((n: EnhancedNode) => n.id));
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
          return {
            ...n,
            'layout': {
              ...n.layout,
              'x': node.layout.x || 0,
              'y': node.layout.y || 0,
              'fx': node.layout.fx !== undefined ? node.layout.fx : null,
              'fy': node.layout.fy !== undefined ? node.layout.fy : null
            }
          };
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
      return node.layout.x !== undefined && node.layout.y !== undefined &&
             node.layout.x >= minX && node.layout.x <= maxX &&
             node.layout.y >= minY && node.layout.y <= maxY;
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

  const handleImportGraph = useCallback((graph: { nodes: EnhancedNode[]; connections: EnhancedGraphConnection[] }) => {
    const newNodes: EnhancedNode[] = graph.nodes.map((node: EnhancedNode) => ({
      'id': String(node.id || `node-${Date.now()}-${Math.random().toString(36)
        .substr(2, 9)}`),
      'title': node.title || '新节点',
      'connections': node.connections || 0,
      'type': node.type || 'concept',
      'shape': node.shape || 'rect',
      'state': {
        'isExpanded': node.state?.isExpanded || false,
        'isFixed': node.state?.isFixed || false,
        'isSelected': node.state?.isSelected || false,
        'isHovered': node.state?.isHovered || false,
        'isDragging': node.state?.isDragging || false,
        'isCollapsed': node.state?.isCollapsed || false
      },
      'metadata': {
        'is_custom': node.metadata?.is_custom || true,
        'createdAt': node.metadata?.createdAt || Date.now(),
        'updatedAt': node.metadata?.updatedAt || Date.now(),
        'version': node.metadata?.version || 1
      },
      'layout': {
        'x': node.layout?.x || Math.random() * 400 + 100,
        'y': node.layout?.y || Math.random() * 400 + 100,
        'isFixed': node.layout?.isFixed || false,
        'isExpanded': node.layout?.isExpanded || false
      },
      'group': {
        'isGroup': node.group?.isGroup || false,
        'memberIds': node.group?.memberIds || [],
        'isGroupExpanded': node.group?.isGroupExpanded || false
      },
      'handles': {
        'handleCount': node.handles?.handleCount || 4,
        'handlePositions': node.handles?.handlePositions || ['top', 'right', 'bottom', 'left'],
        'lockedHandles': node.handles?.lockedHandles || {},
        'handleLabels': node.handles?.handleLabels || {}
      },
      'aggregation': {
        '_isAggregated': node.aggregation?._isAggregated || false,
        '_aggregatedNodes': node.aggregation?._aggregatedNodes || [],
        '_averageImportance': node.aggregation?._averageImportance || 0,
        '_clusterCenter': node.aggregation?._clusterCenter || { 'x': 0, 'y': 0 },
        '_clusterSize': node.aggregation?._clusterSize || 0,
        '_aggregationLevel': node.aggregation?._aggregationLevel || 0
      }
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
        'weight': connection.weight || 1.0,
        'metadata': {
          'createdAt': connection.metadata?.createdAt || Date.now(),
          'updatedAt': connection.metadata?.updatedAt || Date.now(),
          'version': connection.metadata?.version || 1
        },
        'state': {
          'isSelected': connection.state?.isSelected || false,
          'isHovered': connection.state?.isHovered || false,
          'isEditing': connection.state?.isEditing || false
        },
        'curveControl': {
          'controlPointsCount': connection.curveControl?.controlPointsCount || 1,
          'controlPoints': connection.curveControl?.controlPoints || [],
          'curveType': connection.curveControl?.curveType || 'default',
          'locked': connection.curveControl?.locked || false
        },
        'animation': {
          'dynamicEffect': connection.animation?.dynamicEffect || 'none',
          'isAnimating': connection.animation?.isAnimating || false
        }
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
            Math.pow(finalX - (node.layout.x || 0), 2) +
            Math.pow(finalY - (node.layout.y || 0), 2)
          );

          if (distance < MIN_DISTANCE) {
            isOverlapping = true;
            attempts += 1;

            // 优化：在现有节点附近寻找合适位置，而不是总是从原始位置偏移
            // 随机选择一个现有节点
            const randomIndex = Math.floor(Math.random() * state.nodes.length);
            const randomNode = state.nodes[randomIndex] || { 'layout': { 'x': 0, 'y': 0 } };
            // 计算随机角度
            const angle = Math.random() * Math.PI * 2;
            // 计算新位置，在随机节点周围的合理范围内
            const newDistance = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
            finalX = (randomNode.layout.x || 0) + Math.cos(angle) * newDistance;
            finalY = (randomNode.layout.y || 0) + Math.sin(angle) * newDistance;
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
      'type': 'concept',
      'shape': 'rect',
      'state': {
        'isExpanded': false,
        'isFixed': false,
        'isSelected': false,
        'isHovered': false,
        'isDragging': false,
        'isCollapsed': false
      },
      'metadata': {
        'is_custom': true,
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1
      },
      'layout': {
        'x': finalX,
        'y': finalY,
        'isFixed': false,
        'isExpanded': false
      },
      'group': {
        'isGroup': false,
        'memberIds': [],
        'isGroupExpanded': false
      },
      'handles': {
        'handleCount': 4,
        'handlePositions': ['top', 'right', 'bottom', 'left'],
        'lockedHandles': {},
        'handleLabels': {}
      },
      'aggregation': {
        '_isAggregated': false,
        '_aggregatedNodes': [],
        '_averageImportance': 0,
        '_clusterCenter': { 'x': 0, 'y': 0 },
        '_clusterSize': 0,
        '_aggregationLevel': 0
      }
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

    // 计算分组中心位置
    const centerX = nodes.reduce((sum, node) => sum + (node.layout.x || 0), 0) / nodes.length;
    const centerY = nodes.reduce((sum, node) => sum + (node.layout.y || 0), 0) / nodes.length;

    // 创建分组节点
    const group: EnhancedNode = {
      'id': `group_${Date.now()}`,
      'title': `分组 ${state.nodes.filter(n => n.type === 'group').length + 1}`,
      'connections': 0,
      'type': 'group',
      'shape': 'rect',
      'state': {
        'isExpanded': true,
        'isFixed': false,
        'isSelected': false,
        'isHovered': false,
        'isDragging': false,
        'isCollapsed': false
      },
      'metadata': {
        'is_custom': true,
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1
      },
      'layout': {
        'x': centerX,
        'y': centerY,
        'isFixed': false,
        'isExpanded': true
      },
      'group': {
        'isGroup': true,
        'memberIds': nodes.map(n => n.id),
        'isGroupExpanded': true
      },
      'handles': {
        'handleCount': 4,
        'handlePositions': ['top', 'right', 'bottom', 'left'],
        'lockedHandles': {},
        'handleLabels': {}
      }
    };

    // 调用GROUP_NODES动作
    dispatch({ 'type': 'GROUP_NODES', 'payload': { nodes, group } });
    // 添加分组操作到历史记录
    dispatch({
      'type': 'ADD_HISTORY',
      'payload': {
        'type': 'groupNodes',
        'groupId': group.id,
        'timestamp': Date.now(),
        'data': { nodes, group }
      }
    });
    showNotification('节点已分组', 'success');
  }, [state.nodes, showNotification, dispatch]);

  const ungroupNodes = useCallback((groupId: string) => {
    // 找到分组节点及其成员
    const groupNode = state.nodes.find(node => node.id === groupId && node.type === 'group');
    if (groupNode && groupNode.group.memberIds) {
      const memberNodes = state.nodes.filter(node => groupNode.group.memberIds?.includes(node.id));
      // 添加取消分组操作到历史记录
      dispatch({
        'type': 'ADD_HISTORY',
        'payload': {
          'type': 'ungroupNodes',
          groupId,
          'timestamp': Date.now(),
          'data': { 'nodes': memberNodes, 'group': groupNode }
        }
      });
    }
    // 调用UNGROUP_NODES动作
    dispatch({ 'type': 'UNGROUP_NODES', 'payload': groupId });
    showNotification('节点已取消分组', 'success');
  }, [dispatch, showNotification, state.nodes]);

  const toggleGroupExpansion = useCallback((nodeId: string) => {
    // 找到分组节点
    const groupNode = state.nodes.find(node => node.id === nodeId && node.type === 'group');
    if (!groupNode) {
      return;
    }

    // 切换展开状态
    const isExpanded = !groupNode.group.isGroupExpanded;
    const updatedNode = {
      ...groupNode,
      'group': {
        ...groupNode.group,
        'isGroupExpanded': isExpanded
      }
    };
    dispatch({ 'type': 'UPDATE_NODE', 'payload': updatedNode });
    showNotification(`分组已${isExpanded ? '展开' : '折叠'}`, 'success');
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
