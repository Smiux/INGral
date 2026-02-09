import React, { useState } from 'react';
import {
  Database,
  Link as LinkIcon,
  BarChart2,
  Plus,
  Trash2,
  PieChart,
  X,
  LayoutGrid
} from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

type TabType = 'nodes' | 'connections' | 'statistics';

interface GraphManagementPanelProps {
  onAddNode: () => void;
  onClose: () => void;
}

// 节点比较函数
const nodesEqual = (
  prev: Array<{ id: string; data: CustomNodeData; selected: boolean }>,
  next: Array<{ id: string; data: CustomNodeData; selected: boolean }>
) => {
  if (prev.length !== next.length) {
    return false;
  }

  for (let i = 0; i < prev.length; i += 1) {
    const prevNode = prev[i];
    const nextNode = next[i];

    if (!prevNode || !nextNode) {
      return false;
    }

    if (prevNode.id !== nextNode.id ||
        prevNode.selected !== nextNode.selected ||
        prevNode.data?.title !== nextNode.data?.title ||
        prevNode.data?.category !== nextNode.data?.category ||
        prevNode.data?.metadata?.content !== nextNode.data?.metadata?.content) {
      return false;
    }
  }
  return true;
};

// 边比较函数
const edgesEqual = (
  prev: Array<{ id: string; source: string; target: string; data: CustomEdgeData; selected: boolean }>,
  next: Array<{ id: string; source: string; target: string; data: CustomEdgeData; selected: boolean }>
) => {
  if (prev.length !== next.length) {
    return false;
  }

  for (let i = 0; i < prev.length; i += 1) {
    const prevEdge = prev[i];
    const nextEdge = next[i];

    if (!prevEdge || !nextEdge) {
      return false;
    }

    if (prevEdge.id !== nextEdge.id ||
        prevEdge.source !== nextEdge.source ||
        prevEdge.target !== nextEdge.target ||
        prevEdge.selected !== nextEdge.selected ||
        prevEdge.data?.type !== nextEdge.data?.type) {
      return false;
    }
  }
  return true;
};

export const GraphManagementPanel: React.FC<GraphManagementPanelProps> = ({
  onAddNode,
  onClose
}) => {
  const nodes = useStore(
    (state) => state.nodes as Array<{
      id: string;
      data: CustomNodeData;
      selected: boolean;
    }>,
    nodesEqual
  );

  const edges = useStore(
    (state) => state.edges as Array<{
      id: string;
      source: string;
      target: string;
      data: CustomEdgeData;
      selected: boolean;
    }>,
    edgesEqual
  );

  const reactFlowInstance = useReactFlow();
  const [activeTab, setActiveTab] = useState<TabType>('nodes');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'content'>('all');

  const handleDeleteSelectedNodes = () => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) {
      return;
    }
    reactFlowInstance.deleteElements({
      'nodes': selectedNodes.map((node) => ({ 'id': node.id }))
    });
  };

  const handleBatchDeleteConnections = () => {
    const selectedEdges = edges.filter((edge) => edge.selected);
    if (selectedEdges.length === 0) {
      return;
    }
    reactFlowInstance.deleteElements({
      'edges': selectedEdges.map((edge) => ({ 'id': edge.id }))
    });
  };

  const handleDeleteConnection = (edgeId: string) => {
    reactFlowInstance.deleteElements({ 'edges': [{ 'id': edgeId }] });
  };

  const handleToggleSelection = (id: string, type: 'node' | 'edge') => {
    const items = type === 'node' ? nodes : edges;
    const isSelected = items.find((item) => item.id === id)?.selected;
    const selectedIds = items.filter((item) => item.selected).map((item) => item.id);
    const newSelectedIds = isSelected
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];

    if (type === 'node') {
      reactFlowInstance.setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          'selected': newSelectedIds.includes(n.id)
        }))
      );
    } else {
      reactFlowInstance.setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          'selected': newSelectedIds.includes(e.id)
        }))
      );
    }
  };

  const getFilteredNodes = () => {
    if (!searchTerm.trim()) {
      return nodes;
    }
    const term = searchTerm.toLowerCase();
    return nodes.filter((node) => {
      const nodeTitle = String(node.data?.title || '').toLowerCase();
      const nodeContent = String(node.data?.metadata?.content || '').toLowerCase();
      switch (searchType) {
        case 'name':
          return nodeTitle.includes(term);
        case 'content':
          return nodeContent.includes(term);
        default:
          return nodeTitle.includes(term) || nodeContent.includes(term);
      }
    });
  };

  const getStats = () => {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const avgConnections = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;
    const nodeTypes = nodes.reduce<Record<string, number>>((acc, node) => {
      const category = String(node.data?.category || '默认');
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    const edgeTypes = edges.reduce<Record<string, number>>((acc, edge) => {
      const type = String(edge.data?.type || 'related');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return { totalNodes, totalEdges, avgConnections, nodeTypes, edgeTypes };
  };

  const filteredNodes = getFilteredNodes();
  const stats = getStats();
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);

  const tabs: Array<{ key: TabType; icon: React.ReactNode; label: string }> = [
    { 'key': 'nodes', 'icon': <Database size={16} />, 'label': '节点管理' },
    { 'key': 'connections', 'icon': <LinkIcon size={16} />, 'label': '连接管理' },
    { 'key': 'statistics', 'icon': <BarChart2 size={16} />, 'label': '统计信息' }
  ];

  return (
    <div className="panel-container">
      <header className="panel-header flex items-center justify-between">
        <div className="panel-title flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary-400" />
          图管理
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors" title="关闭面板">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="panel-content flex flex-col h-full">
        <nav className="border-b border-neutral-200 bg-white/90 backdrop-blur-sm z-10">
          <div className="flex space-x-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`py-3 px-6 text-sm font-medium transition-all ${activeTab === tab.key ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/80' : 'text-neutral-600 hover:bg-neutral-50'}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <div className="flex items-center gap-2">
                  <span className={activeTab === tab.key ? 'text-primary-400' : 'text-neutral-500'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          {activeTab === 'nodes' && (
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 shadow-sm border border-primary-100">
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="text-sm text-neutral-600 font-medium bg-white/70 px-3 py-1.5 rounded-lg shadow-sm">
                  节点数: {nodes.length} | 搜索结果: {filteredNodes.length} | 选中: {selectedNodes.length}
                </div>
                <button
                  className="px-5 py-2.5 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-secondary-400"
                  onClick={onAddNode}
                >
                  <Plus size={16} />
                  添加节点
                </button>
                <button
                  className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-[1.02] focus:outline-none ${selectedNodes.length === 0 ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg focus:ring-2 focus:ring-red-500'}`}
                  onClick={handleDeleteSelectedNodes}
                  disabled={selectedNodes.length === 0}
                >
                  <Trash2 size={16} />
                  删除选中节点
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                  <input
                    type="text"
                    placeholder="搜索节点名称或内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-neutral-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 bg-neutral-50 text-neutral-800"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                      title="清空搜索"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'all' | 'name' | 'content')}
                  className="min-w-[120px] px-4 py-2.5 border border-neutral-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 bg-neutral-50 text-neutral-800"
                >
                  <option value="all">全部</option>
                  <option value="name">名称</option>
                  <option value="content">内容</option>
                </select>
              </div>

              <ul className="max-h-60 overflow-y-auto bg-white/80 rounded-lg shadow-sm space-y-1.5 p-1">
                {filteredNodes.map((node) => (
                  <li
                    key={node.id}
                    className={`flex items-center gap-2 p-2.5 rounded-md cursor-pointer transition-all duration-200 ${selectedNodes.some((n) => n.id === node.id) ? 'bg-primary-100 text-primary-800 shadow-sm' : 'hover:bg-neutral-50 hover:shadow-sm'}`}
                    onClick={() => handleToggleSelection(node.id, 'node')}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate text-neutral-800">{String(node.data?.title || '未命名节点')}</div>
                      <div className="text-xs text-neutral-500">类别: {String(node.data?.category || '默认')}</div>
                      {node.data?.metadata?.content && (
                        <div className="text-xs text-neutral-500 truncate mt-1">
                          {String(node.data.metadata.content)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 shadow-sm border border-primary-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-neutral-800 flex items-center gap-2">
                  <LinkIcon size={18} className="text-primary-400" />
                  连接管理
                </h3>
                {selectedEdges.length > 0 && (
                  <button
                    onClick={handleBatchDeleteConnections}
                    className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    批量删除
                  </button>
                )}
              </div>

              <div className="border-t border-primary-100 pt-4">
                <h4 className="text-sm font-medium text-neutral-700 bg-white/70 px-3 py-1.5 rounded-lg shadow-sm mb-4">
                  连接列表 ({edges.length})
                </h4>
              </div>

              <div className="space-y-2 bg-white/80 rounded-lg shadow-sm p-1">
                {edges.map((edge) => {
                  const sourceNode = nodes.find((n) => n.id === edge.source);
                  const targetNode = nodes.find((n) => n.id === edge.target);

                  return (
                    <div
                      key={edge.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-200 ${selectedEdges.some((c) => c.id === edge.id) ? 'bg-primary-100 text-primary-800 shadow-sm' : 'hover:bg-neutral-50 hover:shadow-sm'}`}
                      onClick={() => handleToggleSelection(edge.id, 'edge')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-neutral-800 truncate">
                            {sourceNode?.data?.title || edge.source}
                          </div>
                          <div className="text-sm text-neutral-400 flex items-center justify-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="text-sm font-medium text-neutral-800 truncate">
                            {targetNode?.data?.title || edge.target}
                          </div>
                        </div>
                        <div className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                          {String(edge.data?.type || 'related')}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(edge.id);
                        }}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-full transition-all duration-200 hover:shadow-sm transform hover:scale-110"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 shadow-sm border border-primary-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-primary-700 font-medium">节点总数</p>
                      <p className="text-2xl font-bold text-primary-900">{stats.totalNodes}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-4 shadow-sm border border-secondary-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-600 flex items-center justify-center text-white">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-700 font-medium">连接总数</p>
                      <p className="text-2xl font-bold text-secondary-900">{stats.totalEdges}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 shadow-sm border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-white">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-700 font-medium">平均连接度</p>
                      <p className="text-2xl font-bold text-neutral-900">{stats.avgConnections.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-neutral-500" />
                  节点类别分布
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.nodeTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                            style={{ 'width': `${(count / stats.totalNodes) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-800">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-neutral-500" />
                  连接类别分布
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.edgeTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-secondary-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                            style={{ 'width': `${(count / stats.totalEdges) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-800">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GraphManagementPanel;
