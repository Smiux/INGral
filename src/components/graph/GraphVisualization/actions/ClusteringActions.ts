import { useCallback } from 'react';
import type { GraphState, GraphAction } from '../GraphContextType';
import type { EnhancedNode } from '../types';

interface ClusteringActionsProps {
  dispatch: React.Dispatch<GraphAction>;
  state: GraphState;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
}

export const useClusteringActions = ({ dispatch, state, showNotification }: ClusteringActionsProps) => {
  // 聚类操作
  const setClusters = useCallback((clusters: Record<string, number>) => {
    dispatch({ 'type': 'SET_CLUSTERS', 'payload': clusters });
  }, [dispatch]);

  const setClusterColors = useCallback((colors: string[]) => {
    dispatch({ 'type': 'SET_CLUSTER_COLORS', 'payload': colors });
  }, [dispatch]);

  const setClusterCount = useCallback((count: number) => {
    dispatch({ 'type': 'SET_CLUSTER_COUNT', 'payload': count });
  }, [dispatch]);

  const setIsClusteringEnabled = useCallback((enabled: boolean) => {
    dispatch({ 'type': 'SET_IS_CLUSTERING_ENABLED', 'payload': enabled });
  }, [dispatch]);

  // K-means聚类算法实现
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
      dispatch({ 'type': 'SET_CLUSTERS', 'payload': clusters });

      // 生成聚类颜色
      const colors = Array.from({ 'length': 1 }, (_, index) => {
        const hue = (index * 137.5) % 360;
        return `hsl(${hue}, 70%, 60%)`;
      });
      dispatch({ 'type': 'SET_CLUSTER_COLORS', 'payload': colors });
      showNotification('聚类已完成', 'success');
      return;
    }

    // 准备节点数据（使用连接数和类型作为特征）
    const nodeFeatures = state.nodes.map((node: EnhancedNode) => {
      const nodeType = node.type || 'concept';
      let typeValue: number;
      switch (nodeType) {
        case 'concept':
          typeValue = 0;
          break;
        case 'article':
          typeValue = 1;
          break;
        case 'resource':
          typeValue = 2;
          break;
        default:
          typeValue = 3;
          break;
      }
      return {
        'id': node.id,
        'connections': node.connections || 0,
        'type': typeValue
      };
    });

    // 归一化特征值
    const connectionsMin = Math.min(...nodeFeatures.map((n: { connections: number }) => n.connections));
    const connectionsMax = Math.max(...nodeFeatures.map((n: { connections: number }) => n.connections));
    const typeMin = Math.min(...nodeFeatures.map((n: { type: number }) => n.type));
    const typeMax = Math.max(...nodeFeatures.map((n: { type: number }) => n.type));

    const normalize = (value: number, min: number, max: number) => {
      return max === min ? 0 : (value - min) / (max - min);
    };

    const normalizedFeatures = nodeFeatures.map((n: { id: string; connections: number; type: number }) => ({
      'id': n.id,
      'connections': normalize(n.connections, connectionsMin, connectionsMax),
      'type': normalize(n.type, typeMin, typeMax)
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
      normalizedFeatures.forEach((node: { id: string; connections: number; type: number }) => {
        let minDistance = Infinity;
        let closestCentroidIndex = 0;

        centroids.forEach((centroid: { connections: number; type: number }, index: number) => {
          const distance = Math.sqrt(
            Math.pow(node.connections - centroid.connections, 2) +
            Math.pow(node.type - centroid.type, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestCentroidIndex = index;
          }
        });

        newClusters[node.id] = closestCentroidIndex;
      });

      // 辅助函数：计算新的中心点
      const calculateNewCentroid = (i: number, clusterNodes: typeof normalizedFeatures) => {
        if (clusterNodes.length === 0) {
          // 如果某个聚类没有节点，保留原中心点或使用第一个特征点
          const centroid = centroids[i];
          if (centroid) {
            return centroid;
          }
          return normalizedFeatures.length > 0 ? normalizedFeatures[0] : null;
        }

        // 计算聚类的平均特征值
        const avgConnections = clusterNodes.reduce((sum: number, node: { connections: number }) => sum + node.connections, 0) / clusterNodes.length;
        const avgType = clusterNodes.reduce((sum: number, node: { type: number }) => sum + node.type, 0) / clusterNodes.length;

        return {
          'id': `centroid-${i}`,
          'connections': avgConnections,
          'type': avgType
        };
      };

      // 2. 更新中心点
      const newCentroids: typeof normalizedFeatures[number][] = [];
      for (let i = 0; i < state.clusterCount; i += 1) {
        const clusterNodes = normalizedFeatures.filter((n: { id: string }) => newClusters[n.id] === i);
        const newCentroid = calculateNewCentroid(i, clusterNodes);
        if (newCentroid) {
          newCentroids.push(newCentroid);
        }
      }

      // 3. 检查是否收敛
      converged = true;
      for (let i = 0; i < centroids.length && i < newCentroids.length; i += 1) {
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
      iteration += 1;
    }

    // 更新聚类结果
    dispatch({ 'type': 'SET_CLUSTERS', 'payload': clusters });

    // 生成聚类颜色
    const colors = Array.from({ 'length': state.clusterCount }, (_, index) => {
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    });
    dispatch({ 'type': 'SET_CLUSTER_COLORS', 'payload': colors });

    showNotification('聚类已完成', 'success');
  }, [state.nodes, state.clusterCount, showNotification, dispatch]);

  return {
    setClusters,
    setClusterColors,
    setClusterCount,
    setIsClusteringEnabled,
    performKMeansClustering
  };
};

export type ClusteringActions = ReturnType<typeof useClusteringActions>;
