/**
 * 聚类分析组件
 * 负责节点聚类功能
 */
import React from 'react';
import type { ClusterAnalysisProps } from './types';

/**
 * 聚类分析组件
 * @param props - 组件属性
 */
export const ClusterAnalysis: React.FC<ClusterAnalysisProps> = ({
  nodes,
  setClusters,
  clusterColors,
  setClusterColors,
  clusterCount,
  setClusterCount,
  isClusteringEnabled,
  setIsClusteringEnabled,
}) => {
  /**
   * 简单的k-means聚类算法实现
   */
  const performKMeansClustering = () => {
    if (nodes.length === 0 || clusterCount <= 0 || clusterCount > nodes.length) {
      return;
    }

    const clusters: Record<string, number> = {};

    // 如果只有一个聚类，所有节点都属于同一个聚类
    if (clusterCount === 1) {
      nodes.forEach(node => {
        clusters[node.id] = 0;
      });
      setClusters(clusters);
      generateClusterColors(clusterCount);
      return;
    }

    // 准备节点数据（使用连接数和类型作为特征）
    const nodeFeatures = nodes.map(node => {
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

    while (selectedIndices.size < clusterCount && normalizedFeatures.length > 0) {
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
    while (centroids.length < clusterCount && normalizedFeatures.length > 0) {
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
      for (let i = 0; i < clusterCount; i++) {
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

    setClusters(clusters);
    generateClusterColors(clusterCount);
  };

  /**
   * 生成聚类颜色
   * @param count - 聚类数量
   */
  const generateClusterColors = (count: number) => {
    const colors = Array.from({ length: count }, (_, index) => {
      // 使用黄金角分布颜色
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    });
    setClusterColors(colors);
  };

  /**
   * 切换聚类显示
   */
  const toggleClustering = () => {
    setIsClusteringEnabled(prev => !prev);
    if (!isClusteringEnabled) {
      performKMeansClustering();
    }
  };

  /**
   * 应用聚类
   */
  const applyClustering = () => {
    performKMeansClustering();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex flex-wrap gap-2 items-center">
        <h3 className="font-medium text-lg">聚类分析</h3>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isClusteringEnabled}
              onChange={toggleClustering}
              className="cursor-pointer"
            />
            <span className="text-sm">启用聚类</span>
          </label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            聚类数量
          </label>
          <input
            type="range"
            min="1"
            max={Math.min(10, nodes.length)}
            value={clusterCount}
            onChange={(e) => setClusterCount(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-600 mt-1">
            {clusterCount} 个聚类
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            聚类算法
          </label>
          <select
            className="w-full p-2 border rounded-md"
            disabled
          >
            <option value="kmeans">K-means</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={applyClustering}
          disabled={!isClusteringEnabled || nodes.length === 0}
        >
          应用聚类
        </button>
      </div>

      {isClusteringEnabled && clusterColors.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">聚类颜色</h4>
          <div className="flex flex-wrap gap-2">
            {clusterColors.map((color, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">聚类 {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
