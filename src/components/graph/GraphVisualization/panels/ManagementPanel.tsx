import React, { useState } from 'react';
import {
  CircleDot,
  Link as LinkIcon,
  Plus,
  Trash2,
  X,
  Settings2,
  ArrowRight,
  Search,
  ChevronDown
} from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomNodeData } from '../Node';
import type { CustomEdgeData } from '../Edge';
import {
  PANEL_CONTAINER_CLASS,
  PANEL_HEADER_CLASS,
  PANEL_TITLE_CLASS,
  PANEL_CLOSE_BTN_CLASS,
  getInputClass,
  TAB_CONTAINER_CLASS,
  getTabButtonClasses,
  DROPDOWN_MENU_CLASS,
  PANEL_MOTION_VARIANTS_LEFT,
  PANEL_MOTION_TRANSITION
} from './panelStyles';

type TabType = 'nodes' | 'connections';

interface ManagementPanelProps {
  onAddNode: () => void;
  onClose: () => void;
}

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

export const ManagementPanel: React.FC<ManagementPanelProps> = ({
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

  const [nodeSearchTerm, setNodeSearchTerm] = useState('');
  const [nodeSearchType, setNodeSearchType] = useState<'all' | 'name' | 'content'>('all');
  const [showNodeSearchMenu, setShowNodeSearchMenu] = useState(false);
  const [showNodeDistribution, setShowNodeDistribution] = useState(false);

  const [connectionSearchTerm, setConnectionSearchTerm] = useState('');
  const [connectionSearchType, setConnectionSearchType] = useState<'all' | 'label' | 'name'>('all');
  const [showConnectionSearchMenu, setShowConnectionSearchMenu] = useState(false);
  const [showConnectionDistribution, setShowConnectionDistribution] = useState(false);

  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);

  const getFilteredNodes = () => {
    if (!nodeSearchTerm.trim()) {
      return nodes;
    }
    const term = nodeSearchTerm.toLowerCase();
    return nodes.filter((node) => {
      const nodeTitle = String(node.data?.title || '').toLowerCase();
      const nodeContent = String(node.data?.metadata?.content || '').toLowerCase();
      switch (nodeSearchType) {
        case 'name':
          return nodeTitle.includes(term);
        case 'content':
          return nodeContent.includes(term);
        default:
          return nodeTitle.includes(term) || nodeContent.includes(term);
      }
    });
  };

  const getFilteredEdges = () => {
    if (!connectionSearchTerm.trim()) {
      return edges;
    }
    const term = connectionSearchTerm.toLowerCase();
    return edges.filter((edge) => {
      const label = String(edge.data?.type || 'related').toLowerCase();
      const sourceTitle = String(nodes.find((n) => n.id === edge.source)?.data?.title || '').toLowerCase();
      const targetTitle = String(nodes.find((n) => n.id === edge.target)?.data?.title || '').toLowerCase();
      const displayName = `${sourceTitle}→${targetTitle}`;

      switch (connectionSearchType) {
        case 'label':
          return label.includes(term);
        case 'name':
          return displayName.includes(term);
        default:
          return label.includes(term) || displayName.includes(term);
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

  const handleDeleteSelectedNodes = () => {
    const selectedNodesList = nodes.filter((node) => node.selected);
    if (selectedNodesList.length === 0) {
      return;
    }
    reactFlowInstance.deleteElements({
      'nodes': selectedNodesList.map((node) => ({ 'id': node.id }))
    });
  };

  const handleBatchDeleteConnections = () => {
    const selectedEdgesList = edges.filter((edge) => edge.selected);
    if (selectedEdgesList.length === 0) {
      return;
    }
    reactFlowInstance.deleteElements({
      'edges': selectedEdgesList.map((edge) => ({ 'id': edge.id }))
    });
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

  const filteredNodes = getFilteredNodes();
  const filteredEdges = getFilteredEdges();
  const stats = getStats();

  const tabs: Array<{ key: TabType; icon: React.ReactNode; label: string }> = [
    { 'key': 'nodes', 'icon': <CircleDot size={16} />, 'label': '节点管理' },
    { 'key': 'connections', 'icon': <LinkIcon size={16} />, 'label': '连接管理' }
  ];

  const nodeSearchTypeLabel = (() => {
    if (nodeSearchType === 'all') {
      return '全部';
    }
    return nodeSearchType === 'name' ? '名称' : '内容';
  })();
  const connectionSearchTypeLabel = (() => {
    if (connectionSearchType === 'all') {
      return '全部';
    }
    return connectionSearchType === 'label' ? '标签' : '连接名';
  })();

  return (
    <motion.div
      className={PANEL_CONTAINER_CLASS}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={PANEL_MOTION_VARIANTS_LEFT}
      transition={PANEL_MOTION_TRANSITION}
    >
      <header className={PANEL_HEADER_CLASS}>
        <div className={PANEL_TITLE_CLASS}>
          <Settings2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          图管理
        </div>
        <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
          <X size={16} />
        </button>
      </header>

      <div className="px-4 py-2 border-b border-slate-200/40 dark:border-slate-700/40">
        <div className="flex items-center justify-around text-xs text-slate-400 dark:text-slate-500">
          <span>{stats.totalNodes} 节点</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>{stats.totalEdges} 连接</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>平均连接度 {stats.avgConnections.toFixed(2)}</span>
        </div>
      </div>

      <nav className={TAB_CONTAINER_CLASS}>
        <div className="flex w-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={getTabButtonClasses(activeTab === tab.key, tab.key === 'connections' ? 'green' : 'sky')}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className={(() => {
                if (activeTab === tab.key) {
                  return tab.key === 'connections' ? 'text-green-400' : 'text-sky-400';
                }
                return 'text-slate-500 dark:text-slate-500';
              })()}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex flex-col flex-1 overflow-hidden">
        {activeTab === 'nodes' && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/40 dark:border-slate-700/40">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索节点..."
                  value={nodeSearchTerm}
                  onChange={(e) => setNodeSearchTerm(e.target.value)}
                  className={`${getInputClass('sky')} pl-9`}
                />
              </div>

              <button
                onClick={onAddNode}
                className="p-2 rounded text-slate-400 dark:text-slate-500 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-900/20 transition-colors"
                title="添加节点"
              >
                <Plus size={16} />
              </button>

              <button
                onClick={handleDeleteSelectedNodes}
                disabled={selectedNodes.length === 0}
                className={`p-2 rounded transition-colors ${
                  selectedNodes.length === 0
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20'
                }`}
                title="删除选中节点"
              >
                <Trash2 size={16} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNodeSearchMenu(!showNodeSearchMenu)}
                  className="px-3 py-2 rounded text-xs text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50/60 dark:hover:bg-sky-900/20 transition-colors flex items-center gap-1"
                >
                  {nodeSearchTypeLabel}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {showNodeSearchMenu && (
                    <motion.div
                      initial={{ 'opacity': 0, 'y': -8, 'scale': 0.95 }}
                      animate={{ 'opacity': 1, 'y': 0, 'scale': 1 }}
                      exit={{ 'opacity': 0, 'y': -8, 'scale': 0.95 }}
                      transition={{ 'duration': 0.15 }}
                      className={DROPDOWN_MENU_CLASS}
                    >
                      {(['all', 'name', 'content'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setNodeSearchType(type);
                            setShowNodeSearchMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            nodeSearchType === type
                              ? 'text-sky-500 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-900/20'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          {(() => {
                            if (type === 'all') {
                              return '全部';
                            }
                            return type === 'name' ? '名称' : '内容';
                          })()}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {nodeSearchTerm && <span>搜索结果: {filteredNodes.length} 项</span>}
                {nodeSearchTerm && selectedNodes.length > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
                {selectedNodes.length > 0 && <span>选中: {selectedNodes.length} 项</span>}
              </div>

              <button
                onClick={() => setShowNodeDistribution(!showNodeDistribution)}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                节点类别分布
                <ChevronDown size={12} className={`transition-transform ${showNodeDistribution ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {showNodeDistribution && (
                <motion.div
                  initial={{ 'height': 0, 'opacity': 0 }}
                  animate={{ 'height': 'auto', 'opacity': 1 }}
                  exit={{ 'height': 0, 'opacity': 0 }}
                  transition={{ 'duration': 0.2, 'ease': [0.4, 0, 0.2, 1] }}
                  className="mx-4 mb-2 overflow-hidden"
                >
                  <div className="p-3 rounded bg-slate-100/40 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30">
                    {Object.entries(stats.nodeTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3 py-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-16 truncate">{type}</span>
                        <div className="flex-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-1.5">
                          <div
                            className="bg-sky-400/60 dark:bg-sky-500/40 h-1.5 rounded-full transition-all duration-300"
                            style={{ 'width': `${(count / stats.totalNodes) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ul className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 bg-slate-100/60 dark:bg-slate-800/40">
              {filteredNodes.length === 0 ? (
                <li className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  {nodeSearchTerm ? '无匹配结果' : '暂无节点'}
                </li>
              ) : (
                filteredNodes.map((node) => (
                  <li
                    key={node.id}
                    className={`flex items-center gap-2 p-2.5 rounded cursor-pointer transition-colors ${
                      selectedNodes.some((n) => n.id === node.id)
                        ? 'bg-sky-50/60 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                    onClick={() => handleToggleSelection(node.id, 'node')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{String(node.data?.title || '未命名节点')}</div>
                      <div className="text-xs text-slate-400/70 dark:text-slate-500/70">
                        类别: {String(node.data?.category || '默认')}
                      </div>
                      {node.data?.metadata?.content && (
                        <div className="text-xs text-slate-400/70 dark:text-slate-500/70 truncate mt-0.5">
                          {String(node.data.metadata.content)}
                        </div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {activeTab === 'connections' && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/40 dark:border-slate-700/40">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索连接..."
                  value={connectionSearchTerm}
                  onChange={(e) => setConnectionSearchTerm(e.target.value)}
                  className={`${getInputClass('green')} pl-9`}
                />
              </div>

              <button
                onClick={handleBatchDeleteConnections}
                disabled={selectedEdges.length === 0}
                className={`p-2 rounded transition-colors ${
                  selectedEdges.length === 0
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20'
                }`}
                title="批量删除"
              >
                <Trash2 size={16} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowConnectionSearchMenu(!showConnectionSearchMenu)}
                  className="px-3 py-2 rounded text-xs text-slate-400 dark:text-slate-500 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1"
                >
                  {connectionSearchTypeLabel}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {showConnectionSearchMenu && (
                    <motion.div
                      initial={{ 'opacity': 0, 'y': -8, 'scale': 0.95 }}
                      animate={{ 'opacity': 1, 'y': 0, 'scale': 1 }}
                      exit={{ 'opacity': 0, 'y': -8, 'scale': 0.95 }}
                      transition={{ 'duration': 0.15 }}
                      className={DROPDOWN_MENU_CLASS}
                    >
                      {(['all', 'label', 'name'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setConnectionSearchType(type);
                            setShowConnectionSearchMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            connectionSearchType === type
                              ? 'text-green-500 dark:text-green-400 bg-green-50/60 dark:bg-green-900/20'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          {(() => {
                            if (type === 'all') {
                              return '全部';
                            }
                            return type === 'label' ? '标签' : '连接名';
                          })()}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {connectionSearchTerm && <span>搜索结果: {filteredEdges.length} 项</span>}
                {connectionSearchTerm && selectedEdges.length > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
                {selectedEdges.length > 0 && <span>选中: {selectedEdges.length} 项</span>}
              </div>

              <button
                onClick={() => setShowConnectionDistribution(!showConnectionDistribution)}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                连接类别分布
                <ChevronDown size={12} className={`transition-transform ${showConnectionDistribution ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {showConnectionDistribution && (
                <motion.div
                  initial={{ 'height': 0, 'opacity': 0 }}
                  animate={{ 'height': 'auto', 'opacity': 1 }}
                  exit={{ 'height': 0, 'opacity': 0 }}
                  transition={{ 'duration': 0.2, 'ease': [0.4, 0, 0.2, 1] }}
                  className="mx-4 mb-2 overflow-hidden"
                >
                  <div className="p-3 rounded bg-slate-100/40 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30">
                    {Object.entries(stats.edgeTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3 py-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-16 truncate">{type}</span>
                        <div className="flex-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-1.5">
                          <div
                            className="bg-green-400/60 dark:bg-green-500/40 h-1.5 rounded-full transition-all duration-300"
                            style={{ 'width': `${(count / stats.totalEdges) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ul className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 bg-slate-100/60 dark:bg-slate-800/40">
              {filteredEdges.length === 0 ? (
                <li className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  {connectionSearchTerm ? '无匹配结果' : '暂无连接'}
                </li>
              ) : (
                filteredEdges.map((edge) => {
                  const sourceNode = nodes.find((n) => n.id === edge.source);
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  const isSelected = selectedEdges.some((c) => c.id === edge.id);

                  return (
                    <li
                      key={edge.id}
                      className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                      }`}
                      onClick={() => handleToggleSelection(edge.id, 'edge')}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm truncate">{sourceNode?.data?.title || edge.source}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <span className="text-sm truncate">{targetNode?.data?.title || edge.target}</span>
                      </div>
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {String(edge.data?.type || 'related')}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ManagementPanel;
