/**
 * 节点管理组件
 * 负责节点的添加、删除、选择等操作
 */
import React, { useState } from 'react';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import type { NodeManagementProps, EnhancedNode } from './types';

/**
 * 节点管理组件
 * @param props - 组件属性
 */
export const NodeManagement: React.FC<NodeManagementProps> = ({
  nodes,
  connections,
  setNodes,
  setSelectedNode,
  selectedNodes,
  setSelectedNodes,
  showNotification,
  onAddNode,
  onDeleteNodes
}) => {
  // 批量编辑状态
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  // 批量编辑表单数据
  const [batchEditForm, setBatchEditForm] = useState({
    'title': '',
    'type': '',
    'connections': ''
  });

  /**
   * 添加新节点
   */
  const handleAddNode = () => {
    const newNode: EnhancedNode = {
      'id': `node-${Date.now()}`,
      'title': '新节点',
      'connections': 0,
      'type': 'concept',
      'shape': 'circle',
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
        'content': ''
      },
      'layout': {
        'x': Math.random() * 400 + 100,
        'y': Math.random() * 400 + 100,
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

    // 添加新节点到节点列表
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    setSelectedNode(newNode);
    setSelectedNodes([newNode]);
    showNotification('节点已添加', 'success');

    // 调用onAddNode回调函数
    if (onAddNode) {
      onAddNode(newNode);
    }
  };

  /**
   * 处理批量编辑表单变化
   */
  const handleBatchEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBatchEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * 应用批量编辑
   */
  const handleApplyBatchEdit = () => {
    if (selectedNodes.length === 0) {
      showNotification('请先选择要编辑的节点', 'error');
      return;
    }

    let updatedCount = 0;

    const updatedNodes = nodes.map(node => {
      // 只更新选中的节点
      if (!selectedNodes.some(selected => selected.id === node.id)) {
        return node;
      }

      const updatedNode = { ...node };
      let hasChanges = false;

      // 应用表单中的变化
      if (batchEditForm.title.trim()) {
        updatedNode.title = batchEditForm.title.trim();
        hasChanges = true;
      }

      if (batchEditForm.type.trim()) {
        updatedNode.type = batchEditForm.type.trim();
        hasChanges = true;
      }

      if (batchEditForm.connections.trim()) {
        const nodeConnections = parseInt(batchEditForm.connections.trim(), 10);
        if (!isNaN(nodeConnections)) {
          updatedNode.connections = nodeConnections;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        updatedCount += 1;
      }

      return updatedNode;
    });

    if (updatedCount > 0) {
      setNodes(updatedNodes);
      setBatchEditForm({ 'title': '', 'type': '', 'connections': '' });
      setIsBatchEditing(false);
      showNotification(`已更新 ${updatedCount} 个节点`, 'success');
    } else {
      showNotification('没有可应用的更改', 'info');
    }
  };

  /**
   * 取消批量编辑
   */
  const handleCancelBatchEdit = () => {
    setBatchEditForm({ 'title': '', 'type': '', 'connections': '' });
    setIsBatchEditing(false);
  };

  /**
   * 删除选中节点
   */
  const handleDeleteSelectedNodes = () => {
    if (selectedNodes.length === 0) {
      showNotification('请先选择要删除的节点', 'error');
      return;
    }

    const selectedNodeIds = new Set(selectedNodes.map(node => node.id));

    // 获取与选中节点关联的链接
    const associatedLinks = connections.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return selectedNodeIds.has(String(sourceId)) || selectedNodeIds.has(String(targetId));
    });

    // 调用onDeleteNodes回调函数，传递要删除的节点和关联的链接
    if (onDeleteNodes) {
      onDeleteNodes(selectedNodes, associatedLinks);
    }

    // 删除选中节点
    const updatedNodes = nodes.filter(node => !selectedNodeIds.has(node.id));
    setNodes(updatedNodes);
    setSelectedNode(null);
    setSelectedNodes([]);
    showNotification(`已删除 ${selectedNodes.length} 个节点`, 'success');
  };

  /**
   * 选择单个节点
   * @param node - 要选择的节点
   */
  const handleSelectNode = (node: EnhancedNode) => {
    setSelectedNode(node);
    setSelectedNodes([node]);
  };

  /**
   * 切换节点选择状态
   * @param node - 要切换选择状态的节点
   * @param event - 改变事件
   */
  const handleToggleNodeSelection = (node: EnhancedNode, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();

    let updatedSelectedNodes: EnhancedNode[];
    if (selectedNodes.some(n => n.id === node.id)) {
      updatedSelectedNodes = selectedNodes.filter(n => n.id !== node.id);
    } else {
      updatedSelectedNodes = [...selectedNodes, node];
    }

    setSelectedNodes(updatedSelectedNodes);
    setSelectedNode(updatedSelectedNodes.length === 1 ? updatedSelectedNodes[0] as EnhancedNode : null);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {!isBatchEditing ? (
        <div className="flex flex-wrap gap-2 items-center">
          {/* 节点统计 */}
          <div className="text-sm text-gray-600">
            节点数: {nodes.length} | 选中: {selectedNodes.length}
          </div>

          {/* 添加节点按钮 */}
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700"
            onClick={handleAddNode}
          >
            <Plus size={16} />
            添加节点
          </button>

          {/* 批量编辑按钮 */}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700"
            onClick={() => setIsBatchEditing(true)}
            disabled={selectedNodes.length === 0}
          >
            <Edit size={16} />
            批量编辑
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
      ) : (
        <div className="space-y-4">
          {/* 批量编辑表单 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">批量编辑节点 ({selectedNodes.length} 个选中)</h3>
              <button
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={handleCancelBatchEdit}
              >
                <X size={14} />
                取消
              </button>
            </div>

            <div className="space-y-3">
              {/* 节点标题 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">节点标题 (可选)</label>
                <input
                  type="text"
                  name="title"
                  value={batchEditForm.title}
                  onChange={handleBatchEditChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="输入新标题"
                />
              </div>

              {/* 节点类型 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">节点类型 (可选)</label>
                <input
                  type="text"
                  name="type"
                  value={batchEditForm.type}
                  onChange={handleBatchEditChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="输入节点类型"
                />
              </div>

              {/* 连接数 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">连接数 (可选)</label>
                <input
                  type="number"
                  name="connections"
                  value={batchEditForm.connections}
                  onChange={handleBatchEditChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="输入连接数"
                  min="0"
                />
              </div>

              {/* 应用按钮 */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  onClick={handleCancelBatchEdit}
                >
                  取消
                </button>
                <button
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  onClick={handleApplyBatchEdit}
                >
                  应用更改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 可拖拽节点模板 */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">拖拽创建节点</h3>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/graph-node', 'new-node');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="px-3 py-2 bg-blue-50 border-2 border-dashed border-blue-500 rounded-md cursor-move hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
          <Plus size={16} className="text-blue-500" />
          <span className="text-sm text-blue-600">拖拽到画布创建新节点</span>
        </div>
      </div>

      {/* 节点列表 */}
      <div className="mt-4 max-h-60 overflow-y-auto">
        <ul className="space-y-1">
          {nodes.map(node => (
            <li
              key={node.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${selectedNodes.some(n => n.id === node.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
              onClick={() => handleSelectNode(node)}
            >
              <input
                type="checkbox"
                checked={selectedNodes.some(n => n.id === node.id)}
                onChange={(e) => handleToggleNodeSelection(node, e)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="flex-1">
                <div className="text-sm font-medium truncate">{node.title}</div>
                <div className="text-xs text-gray-500">类型: {node.type || 'concept'} | 连接数: {node.connections}</div>
              </div>
              <div className="text-xs px-2 py-1 bg-gray-200 rounded-full">{node.shape || 'circle'}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
