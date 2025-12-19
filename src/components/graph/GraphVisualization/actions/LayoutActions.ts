import { useCallback } from 'react';
import type { LayoutType, LayoutDirection, ForceParameters, SavedLayout, EnhancedNode } from '../types';
import type { GraphState, GraphAction } from '../GraphContextType';

interface LayoutActionsProps {
  dispatch: React.Dispatch<GraphAction>;
  state: GraphState;
  showNotification: (_message: string, _type: 'success' | 'error' | 'info') => void;
}

export const useLayoutActions = ({ dispatch, state, showNotification }: LayoutActionsProps) => {
  // 布局操作
  const setLayoutType = useCallback((layoutType: LayoutType) => {
    dispatch({ 'type': 'SET_LAYOUT_TYPE', 'payload': layoutType });
  }, [dispatch]);

  const setLayoutDirection = useCallback((layoutDirection: LayoutDirection) => {
    dispatch({ 'type': 'SET_LAYOUT_DIRECTION', 'payload': layoutDirection });
  }, [dispatch]);

  const setViewMode = useCallback((viewMode: '2d' | '3d') => {
    dispatch({ 'type': 'SET_VIEW_MODE', 'payload': viewMode });
  }, [dispatch]);

  // 布局参数操作
  const setNodeSpacing = useCallback((spacing: number) => {
    dispatch({ 'type': 'SET_NODE_SPACING', 'payload': spacing });
  }, [dispatch]);

  const setLevelSpacing = useCallback((spacing: number) => {
    dispatch({ 'type': 'SET_LEVEL_SPACING', 'payload': spacing });
  }, [dispatch]);

  const setForceParameters = useCallback((params: ForceParameters) => {
    dispatch({ 'type': 'SET_FORCE_PARAMETERS', 'payload': params });
  }, [dispatch]);

  // 保存的布局操作
  const setSavedLayouts = useCallback((layouts: SavedLayout[]) => {
    dispatch({ 'type': 'SET_SAVED_LAYOUTS', 'payload': layouts });
  }, [dispatch]);

  const addSavedLayout = useCallback((layout: SavedLayout) => {
    dispatch({ 'type': 'ADD_SAVED_LAYOUT', 'payload': layout });
  }, [dispatch]);

  const deleteSavedLayout = useCallback((layoutId: string) => {
    dispatch({ 'type': 'DELETE_SAVED_LAYOUT', 'payload': layoutId });
  }, [dispatch]);

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
          'x': Math.random() * 400 + 100,
          'y': Math.random() * 400 + 100,
          'vx': 0,
          'vy': 0
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
              'x': centerX + radius * Math.cos(angle),
              'y': centerY + radius * Math.sin(angle)
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
              'x': offsetX + col * state.nodeSpacing,
              'y': offsetY + row * state.nodeSpacing
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
                  'x': centerX + radius * Math.cos(angle),
                  'y': centerY + radius * Math.sin(angle)
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
    dispatch({ 'type': 'SET_NODES', 'payload': newNodes });
    // 更新布局类型和方向
    dispatch({ 'type': 'SET_LAYOUT_TYPE', 'payload': layoutType });
    dispatch({ 'type': 'SET_LAYOUT_DIRECTION', 'payload': direction });
    showNotification(`已应用${layoutType}布局`, 'success');
  }, [state.nodes, state.connections, state.nodeSpacing, state.levelSpacing, dispatch, showNotification]);

  return {
    setLayoutType,
    setLayoutDirection,
    setViewMode,
    setNodeSpacing,
    setLevelSpacing,
    setForceParameters,
    setSavedLayouts,
    addSavedLayout,
    deleteSavedLayout,
    applyLayout
  };
};

export type LayoutActions = ReturnType<typeof useLayoutActions>;
