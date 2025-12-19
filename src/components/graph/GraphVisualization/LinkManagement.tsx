/**
 * 连接管理组件
 * 负责连接的添加、删除、选择等操作
 */
import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import type { ConnectionManagementProps, EnhancedNode, EnhancedGraphConnection } from './types';

/**
 * 连接管理组件
 * @param props - 组件属性
 */
export const LinkManagement: React.FC<ConnectionManagementProps & {
  selectedConnections?: EnhancedGraphConnection[];
  setSelectedConnections?: React.Dispatch<React.SetStateAction<EnhancedGraphConnection[]>>;
}> = ({
  connections,
  setConnections,
  nodes,
  setNodes,
  isAddingConnection,
  setIsAddingConnection,
  connectionSourceNode,
  setConnectionSourceNode,

  setMousePosition,
  showNotification,
  selectedConnections = [],
  setSelectedConnections = () => {}
}) => {
  // 批量编辑状态
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  // 批量编辑表单数据
  const [batchEditForm, setBatchEditForm] = useState({
    'type': '',
    'weight': ''
  });

  /**
   * 切换连接选择状态
   * @param connection - 要切换选择状态的连接
   */
  const handleToggleConnectionSelection = (connection: EnhancedGraphConnection) => {
    if (selectedConnections.some(c => c.id === connection.id)) {
      // 已选中，移除
      setSelectedConnections(prev => prev.filter(c => c.id !== connection.id));
    } else {
      // 未选中，添加
      setSelectedConnections(prev => [...prev, connection]);
    }
  };

  /**
   * 选择所有连接
   */
  const handleSelectAllConnections = () => {
    setSelectedConnections(connections);
  };

  /**
   * 取消选择所有连接
   */
  const handleClearConnectionSelection = () => {
    setSelectedConnections([]);
  };

  /**
   * 批量删除连接
   */
  const handleBatchDeleteConnections = () => {
    if (selectedConnections.length === 0) {
      showNotification('请先选择要删除的连接', 'error');
      return;
    }

    const selectedConnectionIds = new Set(selectedConnections.map(connection => connection.id));
    const updatedConnections = connections.filter(connection => !selectedConnectionIds.has(connection.id));

    // 更新节点连接数
    const updatedNodes = nodes.map(node => {
      let connectionCount = 0;
      updatedConnections.forEach(connection => {
        const sourceId = typeof connection.source === 'object' ? (connection.source as EnhancedNode).id : String(connection.source);
        const targetId = typeof connection.target === 'object' ? (connection.target as EnhancedNode).id : String(connection.target);
        if (sourceId === node.id || targetId === node.id) {
          connectionCount += 1;
        }
      });
      return { ...node, 'connections': connectionCount };
    });

    setConnections(updatedConnections);
    setNodes(updatedNodes);
    setSelectedConnections([]);
    showNotification(`已删除 ${selectedConnections.length} 个连接`, 'success');
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
    if (selectedConnections.length === 0) {
      showNotification('请先选择要编辑的连接', 'error');
      return;
    }

    let updatedCount = 0;
    const updatedConnections = connections.map(connection => {
      if (!selectedConnections.some(selected => selected.id === connection.id)) {
        return connection;
      }

      const updatedConnection = { ...connection };
      let hasChanges = false;

      if (batchEditForm.type.trim()) {
        updatedConnection.type = batchEditForm.type.trim();
        hasChanges = true;
      }

      if (batchEditForm.weight.trim()) {
        const weight = parseFloat(batchEditForm.weight.trim());
        if (!isNaN(weight)) {
          updatedConnection.weight = weight;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        updatedCount += 1;
      }

      return updatedConnection;
    });

    if (updatedCount > 0) {
      setConnections(updatedConnections);
      setBatchEditForm({ 'type': '', 'weight': '' });
      setIsBatchEditing(false);
      showNotification(`已更新 ${updatedCount} 个连接`, 'success');
    } else {
      showNotification('没有可应用的更改', 'info');
    }
  };

  /**
   * 取消批量编辑
   */
  const handleCancelBatchEdit = () => {
    setBatchEditForm({ 'type': '', 'weight': '' });
    setIsBatchEditing(false);
  };

  /**
   * 取消添加连接
   */
  const handleCancelAddConnection = () => {
    setIsAddingConnection(false);
    setConnectionSourceNode(null);
    setMousePosition(null);
    showNotification('已取消添加连接', 'info');
  };

  /**
   * 删除连接
   * @param connectionId - 连接ID
   */
  const handleDeleteConnection = (connectionId: string) => {
    const connectionToDelete = connections.find(connection => connection.id === connectionId);
    if (!connectionToDelete) {
      return;
    }

    // 获取连接源和目标ID
    const sourceId = typeof connectionToDelete.source === 'object' ? (connectionToDelete.source as EnhancedNode).id : String(connectionToDelete.source);
    const targetId = typeof connectionToDelete.target === 'object' ? (connectionToDelete.target as EnhancedNode).id : String(connectionToDelete.target);

    // 更新节点连接数
    setNodes(prev => prev.map(node => {
      if (node.id === sourceId || node.id === targetId) {
        return { ...node, 'connections': Math.max(0, node.connections - 1) };
      }
      return node;
    }));

    // 删除连接
    setConnections(prev => prev.filter(connection => connection.id !== connectionId));
    showNotification('连接已删除', 'success');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {!isBatchEditing ? (
        <>
          {/* 连接操作工具栏 */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* 连接统计 */}
            <div className="text-sm text-gray-600">
              连接数: {connections.length} | 选中: {selectedConnections.length}
            </div>

            {/* 添加连接状态 */}
            {isAddingConnection && connectionSourceNode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">
                  正在从 "{connectionSourceNode.title}" 创建连接...
                </span>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center gap-1"
                  onClick={handleCancelAddConnection}
                >
                  <Trash2 size={14} />
                  取消
                </button>
              </div>
            )}

            {/* 批量操作按钮 */}
            <div className="ml-auto flex gap-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-blue-700"
                onClick={handleSelectAllConnections}
              >
                全选
              </button>
              <button
                className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-gray-700"
                onClick={handleClearConnectionSelection}
              >
                清除选择
              </button>
              <button
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-green-700"
                onClick={() => setIsBatchEditing(true)}
                disabled={selectedConnections.length === 0}
              >
                <Edit size={14} />
                批量编辑
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-red-700"
                onClick={handleBatchDeleteConnections}
                disabled={selectedConnections.length === 0}
              >
                <Trash2 size={14} />
                批量删除
              </button>
            </div>
          </div>

          {/* 连接列表 */}
          <div className="mt-4 max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {connections.map(connection => {
                // 获取源节点和目标节点的标题
                const getNodeTitle = (nodeRef: string | number | EnhancedNode) => {
                  let nodeId: string;
                  if (typeof nodeRef === 'object') {
                    nodeId = nodeRef.id;
                  } else {
                    nodeId = String(nodeRef);
                  }
                  const node = nodes.find(n => n.id === nodeId);
                  return node ? node.title : '未知节点';
                };

                const sourceTitle = getNodeTitle(connection.source);
                const targetTitle = getNodeTitle(connection.target);

                // 检查连接是否被选中
                const isSelected = selectedConnections.some(c => c.id === connection.id);

                return (
                  <li
                    key={connection.id}
                    className={`p-2 rounded-md flex items-center justify-between ${isSelected ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* 选择复选框 */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleConnectionSelection(connection)}
                        className="cursor-pointer"
                      />
                      <div className="text-sm">
                        {sourceTitle} → {targetTitle}
                        <span className="ml-2 text-xs text-gray-500">({connection.type})</span>
                      </div>
                    </div>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteConnection(connection.id)}
                      title="删除连接"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : (

        /* 批量编辑表单 */
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">批量编辑连接 ({selectedConnections.length} 个选中)</h3>
              <button
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={handleCancelBatchEdit}
              >
                <Trash2 size={14} />
                取消
              </button>
            </div>

            <div className="space-y-3">
              {/* 连接类型 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">连接类型 (可选)</label>
                <input
                  type="text"
                  name="type"
                  value={batchEditForm.type}
                  onChange={handleBatchEditChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入连接类型"
                />
              </div>

              {/* 连接权重 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">连接权重 (可选)</label>
                <input
                  type="number"
                  name="weight"
                  value={batchEditForm.weight}
                  onChange={handleBatchEditChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入连接权重"
                  min="0"
                  step="0.1"
                />
              </div>

              {/* 应用按钮 */}
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleApplyBatchEdit}
              >
                应用批量编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
