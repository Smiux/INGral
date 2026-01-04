/**
 * 图谱管理综合面板
 * 合并节点管理、连接管理、统计信息和分析功能，通过标签页切换
 */
import React, { useState, useCallback } from 'react';
import {
  Database,
  Link as LinkIcon,
  BarChart2,
  Plus,
  Trash2,
  PieChart
} from 'lucide-react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './CustomEdge';

// 定义标签页类型
type TabType = 'nodes' | 'connections' | 'statistics';

interface GraphManagementPanelProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<CustomEdgeData>[];
  reactFlowInstance: ReactFlowInstance;
  onAddNode: () => void;
}

/**
 * 图谱管理综合面板组件
 */
export const GraphManagementPanel: React.FC<GraphManagementPanelProps> = ({
  nodes,
  edges,
  reactFlowInstance,
  onAddNode
}) => {
  // 直接从nodes和edges中过滤出选中的节点和连接，使用React Flow内置的selected属性
  const selectedNodes = nodes.filter(node => node.selected);
  const selectedEdges = edges.filter(edge => edge.selected);
  // 当前激活的标签页
  const [activeTab, setActiveTab] = useState<TabType>('nodes');



  /**
   * 删除选中节点
   */
  const handleDeleteSelectedNodes = () => {
    if (selectedNodes.length === 0) {
      return;
    }

    // 使用React Flow内置的deleteElements方法删除选中节点
    reactFlowInstance.deleteElements({
      'nodes': selectedNodes
    });
  };

  /**
   * 批量删除连接
   */
  const handleBatchDeleteConnections = () => {
    if (selectedEdges.length === 0) {
      return;
    }

    // 使用React Flow内置的deleteElements方法批量删除选中连接
    reactFlowInstance.deleteElements({
      'edges': selectedEdges
    });
  };

  /**
   * 删除单个连接
   */
  const handleDeleteConnection = (edgeId: string) => {
    // 使用React Flow内置的deleteElements方法删除单个连接
    reactFlowInstance.deleteElements({
      'edges': [{ 'id': edgeId }]
    });
  };

  /**
   * 处理节点点击选择
   */
  const handleNodeClick = (node: Node<CustomNodeData>) => {
    // 检查节点是否已选中
    const isSelected = node.selected || false;

    // 获取当前选中的节点ID列表
    const selectedNodeIds = selectedNodes.map(n => n.id);

    // 如果已选中，则从选中列表中移除
    // 如果未选中，则添加到选中列表
    const newSelectedNodeIds = isSelected
      ? selectedNodeIds.filter(id => id !== node.id)
      : [...selectedNodeIds, node.id];

    // 更新所有节点的选中状态
    reactFlowInstance.setNodes((nds) =>
      nds.map(n => ({
        ...n,
        'selected': newSelectedNodeIds.includes(n.id)
      }))
    );
  };

  /**
   * 处理连接点击选择
   */
  const handleConnectionClick = (edge: Edge<CustomEdgeData>) => {
    // 检查连接是否已选中
    const isSelected = edge.selected || false;

    // 获取当前选中的连接ID列表
    const selectedEdgeIds = selectedEdges.map(e => e.id);

    // 如果已选中，则从选中列表中移除
    // 如果未选中，则添加到选中列表
    const newSelectedEdgeIds = isSelected
      ? selectedEdgeIds.filter(id => id !== edge.id)
      : [...selectedEdgeIds, edge.id];

    // 更新所有连接的选中状态
    reactFlowInstance.setEdges((eds) =>
      eds.map(e => ({
        ...e,
        'selected': newSelectedEdgeIds.includes(e.id)
      }))
    );
  };

  // === 统计信息功能 ===
  /**
   * 计算基本统计数据
   */
  const calculateBasicStats = useCallback(() => {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const avgConnections = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;

    // 计算不同类型节点的数量
    const nodeTypes = nodes.reduce<Record<string, number>>((acc, node) => {
      const category = node.data?.category || '默认';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // 计算不同类型链接的数量
    const edgeTypes = edges.reduce<Record<string, number>>((acc, edge) => {
      const type = edge.data?.type || 'related';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalNodes,
      totalEdges,
      avgConnections,
      nodeTypes,
      edgeTypes
    };
  }, [nodes, edges]);

  /**
   * 渲染节点管理标签页
   */
  const renderNodesTab = () => (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex flex-wrap gap-2 items-center">
        {/* 节点统计 */}
        <div className="text-sm text-gray-600">
          节点数: {nodes.length} | 选中: {selectedNodes.length}
        </div>

        {/* 添加节点按钮 */}
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700"
          onClick={onAddNode}
        >
          <Plus size={16} />
          添加节点
        </button>

        {/* 删除选中节点按钮 */}
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700"
          onClick={handleDeleteSelectedNodes}
          disabled={selectedNodes.length === 0}
        >
          <Trash2 size={16} />
          删除选中节点
        </button>
      </div>

      {/* 节点列表 */}
      <div className="mt-4 max-h-60 overflow-y-auto">
        <ul className="space-y-1">
          {nodes.map(node => (
            <li
              key={node.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${selectedNodes.some(n => n.id === node.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
              onClick={() => handleNodeClick(node)}
            >
              <div className="flex-1">
                <div className="text-sm font-medium truncate">{node.data?.title || '未命名节点'}</div>
                <div className="text-xs text-gray-500">类别: {node.data?.category || '默认'}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  /**
   * 渲染连接管理标签页
   */
  const renderConnectionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">连接管理</h3>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">连接列表 ({edges.length})</h4>
          <div className="flex gap-2">
            {selectedEdges.length > 0 && (
              <button
                onClick={handleBatchDeleteConnections}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              >
                批量删除
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {edges.map((edge) => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);

          return (
            <div
              key={edge.id}
              className={`flex items-center justify-between p-3 border-b ${selectedEdges.some(c => c.id === edge.id) ? 'bg-blue-50' : ''} rounded-md cursor-pointer transition-colors hover:bg-gray-50`}
              onClick={() => handleConnectionClick(edge)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {sourceNode?.data?.title || edge.source}
                  </div>
                  <div className="text-sm text-gray-600">→</div>
                  <div className="font-medium text-gray-800">
                    {targetNode?.data?.title || edge.target}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{edge.data?.type || 'related'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConnection(edge.id);
                  }}
                  className="p-1 hover:bg-red-50 text-red-600"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /**
   * 渲染统计信息标签页
   */
  const renderStatisticsTab = () => {
    const stats = calculateBasicStats();

    return (
      <div className="p-4 space-y-4">
        {/* 整体统计卡片 */}
        <div className="space-y-4">
          {/* 节点总数 */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">节点总数</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalNodes}</p>
              </div>
            </div>
          </div>

          {/* 连接总数 */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">连接总数</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalEdges}</p>
              </div>
            </div>
          </div>

          {/* 平均连接度 */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">平均连接度</p>
                <p className="text-2xl font-bold text-purple-900">{stats.avgConnections.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 节点类型统计 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            节点类别分布
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.nodeTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ 'width': `${(count / stats.totalNodes) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 连接类别统计 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            连接类别分布
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.edgeTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ 'width': `${(count / stats.totalEdges) * 100}%` }}
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

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-full">
      {/* 标签页导航 - 横向滚动 */}
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm z-10">
        <div className="overflow-x-auto whitespace-nowrap">
          <div className="flex space-x-1 p-1">
            <button
              className={`py-3 px-6 text-sm font-medium transition-all ${activeTab === 'nodes' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('nodes')}
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                节点管理
              </div>
            </button>
            <button
              className={`py-3 px-6 text-sm font-medium transition-all ${activeTab === 'connections' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('connections')}
            >
              <div className="flex items-center gap-2">
                <LinkIcon size={16} />
                连接管理
              </div>
            </button>
            <button
              className={`py-3 px-6 text-sm font-medium transition-all ${activeTab === 'statistics' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('statistics')}
            >
              <div className="flex items-center gap-2">
                <BarChart2 size={16} />
                统计信息
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 标签页内容 - 固定区域，不随菜单滚动 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === 'nodes' && renderNodesTab()}
        {activeTab === 'connections' && renderConnectionsTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </div>
    </div>
  );
};

export default React.memo(GraphManagementPanel);
