import { useEffect } from 'react';
import type { GraphState, GraphAction } from './GraphContextType';
import { graphService } from '../../../services/graphService';

// ===========================
// 副作用处理
// ===========================


interface GraphEffectsProps {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
}

export const useGraphEffects = ({ state, dispatch }: GraphEffectsProps) => {
  // 保存状态到localStorage
  useEffect(() => {
    localStorage.setItem('graphRightPanelVisible', JSON.stringify(state.isRightPanelVisible));
  }, [state.isRightPanelVisible]);

  useEffect(() => {
    localStorage.setItem('graphToolbarAutoHide', JSON.stringify(state.toolbarAutoHide));
  }, [state.toolbarAutoHide]);

  // 通知自动关闭
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.notification) {
      timer = setTimeout(() => {
        dispatch({ 'type': 'CLOSE_NOTIFICATION' });
      }, 3000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [state.notification, dispatch]);

  // 右侧工具栏自动隐藏
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let handleMouseMove: ((_e: MouseEvent) => void) | undefined;

    if (state.toolbarAutoHide) {
      handleMouseMove = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          dispatch({ 'type': 'SET_IS_TOOLBAR_VISIBLE', 'payload': false });
        }, 3000);
      };

      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleMouseMove) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [state.toolbarAutoHide, dispatch]);

  // 左侧工具栏自动隐藏
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let handleMouseMove: ((_e: MouseEvent) => void) | undefined;

    if (state.leftToolbarAutoHide) {
      handleMouseMove = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          dispatch({ 'type': 'SET_IS_LEFT_TOOLBAR_VISIBLE', 'payload': false });
        }, 3000);
      };

      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleMouseMove) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [state.leftToolbarAutoHide, dispatch]);

  // 加载图谱数据
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        dispatch({ 'type': 'SET_NODES', 'payload': [] });
        dispatch({ 'type': 'SET_CONNECTIONS', 'payload': [] });
        dispatch({ 'type': 'SET_IS_SIMULATION_RUNNING', 'payload': true });

        const graphs = await graphService.getAllGraphs('unlisted');
        if (graphs && graphs.length > 0 && graphs[0] && graphs[0].id) {
          const graphData = await graphService.getGraphById(graphs[0].id);
          if (graphData && graphData.nodes && graphData.links) {
            const enhancedNodes = graphData.nodes.map(node => ({
              'id': node.id,
              'title': node.title,
              'connections': node.connections || 0,
              'type': node.type || 'concept',
              'shape': 'rect' as const,
              'style': {
                'fill': '#3b82f6',
                'stroke': '#2563eb',
                'strokeWidth': 2,
                'fontSize': 14,
                'textFill': '#fff'
              },
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
                'version': 1,
                'content': node.content || ''
              },
              'layout': {
                'x': node.x || 0,
                'y': node.y || 0,
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
                'handlePositions': ['top' as const, 'right' as const, 'bottom' as const, 'left' as const],
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
            }));

            const enhancedConnections = graphData.links.map(connection => ({
              'id': `connection-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              'source': connection.source as string,
              'target': connection.target as string,
              'type': connection.type || 'related',
              'label': connection.label || '',
              'weight': connection.weight || 1.0,
              'style': {
                'stroke': '#94a3b8',
                'strokeWidth': 2
              },
              'metadata': {
                'createdAt': Date.now(),
                'updatedAt': Date.now(),
                'version': 1
              },
              'state': {
                'isSelected': false,
                'isHovered': false,
                'isEditing': false
              },
              'curveControl': {
                'controlPointsCount': 1,
                'controlPoints': [],
                'curveType': 'default' as const,
                'locked': false
              },
              'animation': {
                'dynamicEffect': 'none',
                'isAnimating': false
              }
            }));

            dispatch({ 'type': 'SET_NODES', 'payload': enhancedNodes });
            dispatch({ 'type': 'SET_CONNECTIONS', 'payload': enhancedConnections });
            dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '知识图谱加载成功', 'type': 'success' } });
          } else {
            dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '知识图谱数据为空，您可以创建新节点', 'type': 'info' } });
          }
        } else {
          dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '没有找到知识图谱，您可以创建新图谱', 'type': 'info' } });
        }
      } catch (error) {
        console.error('加载图谱数据失败:', error);
        dispatch({ 'type': 'SET_NODES', 'payload': [] });
        dispatch({ 'type': 'SET_CONNECTIONS', 'payload': [] });
        dispatch({ 'type': 'SET_IS_SIMULATION_RUNNING', 'payload': false });
        dispatch({ 'type': 'SHOW_NOTIFICATION', 'payload': { 'message': '加载数据失败，请稍后重试', 'type': 'error' } });
      } finally {
        dispatch({ 'type': 'SET_IS_SIMULATION_RUNNING', 'payload': false });
      }
    };

    loadGraphData();
  }, [dispatch]);
};
