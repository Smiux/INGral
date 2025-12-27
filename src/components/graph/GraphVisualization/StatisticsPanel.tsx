import React from 'react';
import { BarChart2, Link as LinkIcon, Network, PieChart } from 'lucide-react';

import type { GraphNode, GraphConnection } from './GraphTypes';

interface StatisticsPanelProps {
  nodes: GraphNode[];
  links: GraphConnection[];
}

/**
 * 图谱统计信息面板
 * 显示图谱的基本统计数据，包括节点数量、链接数量、平均连接度等
 */
export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ nodes, links }) => {
  // 计算基本统计数据
  const totalNodes = nodes.length;
  const totalLinks = links.length;

  // 计算平均连接度
  const avgConnections = totalNodes > 0 ? (totalLinks * 2) / totalNodes : 0;

  // 计算不同类型节点的数量
  const nodeTypes = nodes.reduce<Record<string, number>>((acc, node) => {
    const type = node.type || 'concept';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // 计算不同类型链接的数量
  const linkTypes = links.reduce<Record<string, number>>((acc, link) => {
    const type = link.type || 'related';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      {/* 整体统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">节点总数</p>
              <p className="text-2xl font-bold text-blue-900">{totalNodes}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">链接总数</p>
              <p className="text-2xl font-bold text-green-900">{totalLinks}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-purple-700 font-medium">平均连接度</p>
            <p className="text-2xl font-bold text-purple-900">{avgConnections.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* 节点类型统计 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gray-500" />
          节点类型分布
        </h3>
        <div className="space-y-2">
          {Object.entries(nodeTypes).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{type}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ 'width': `${(count / totalNodes) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-800">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 链接类型统计 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gray-500" />
          链接类型分布
        </h3>
        <div className="space-y-2">
          {Object.entries(linkTypes).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{type}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ 'width': `${(count / totalLinks) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-800">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
