import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { GraphNode, GraphConnection } from './GraphTypes';

export const LinkManagement: React.FC<{
  connections: GraphConnection[];
  setConnections: (_connections: GraphConnection[]) => void;
  nodes: GraphNode[];
  setNodes: (_nodes: GraphNode[]) => void;
  isAddingConnection: boolean;
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  connectionSourceNode: GraphNode | null;
  setConnectionSourceNode: (_node: GraphNode | null) => void;
  showNotification: (_message: string, _type: 'success' | 'error' | 'info') => void;
  selectedConnections?: GraphConnection[];
  setSelectedConnections?: (_connections: GraphConnection[]) => void;
}> = ({
  connections,
  setConnections,
  nodes,
  setNodes,
  isAddingConnection,
  setIsAddingConnection,
  connectionSourceNode,
  setConnectionSourceNode,
  showNotification,
  selectedConnections = [],
  setSelectedConnections = () => {}
}) => {
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({
    'type': '',
    'weight': ''
  });

  const handleStartAddingConnection = () => {
    setIsAddingConnection(true);
    setConnectionSourceNode(null);
  };

  const handleSelectConnectionSource = (node: GraphNode) => {
    if (isAddingConnection) {
      setConnectionSourceNode(node);
    }
  };

  const handleToggleConnectionSelection = (connection: GraphConnection) => {
    if (selectedConnections.some((c: GraphConnection) => c.id === connection.id)) {
      setSelectedConnections(selectedConnections.filter((c: GraphConnection) => c.id !== connection.id));
    } else {
      setSelectedConnections([...selectedConnections, connection]);
    }
  };

  const handleBatchSelectAll = () => {
    if (selectedConnections.length < connections.length) {
      setSelectedConnections([...connections]);
    } else {
      setSelectedConnections([]);
    }
  };

  const handleBatchDelete = () => {
    if (selectedConnections.length === 0) {
      showNotification('请先选择要删除的连接', 'error');
      return;
    }

    const relatedConnections = selectedConnections.flatMap(connection => {
      const sourceNode = nodes.find((n: GraphNode) => n.id === connection.source);
      const targetNode = nodes.find((n: GraphNode) => n.id === connection.target);
      return [sourceNode, targetNode].filter((n): n is GraphNode => n !== undefined);
    });

    const uniqueNodes = new Set(relatedConnections.map((n: GraphNode) => n.id));

    setNodes(nodes.filter((n: GraphNode) => !uniqueNodes.has(n.id)));
    setConnections(connections.filter((c: GraphConnection) => !selectedConnections.some((sc: GraphConnection) => sc.id === c.id)));

    showNotification(`已删除 ${selectedConnections.length} 个连接`, 'success');
    setSelectedConnections([]);
  };

  const handleBatchEditStart = () => {
    setIsBatchEditing(true);
    if (selectedConnections.length > 0) {
      const firstConnection = selectedConnections[0];
      if (firstConnection) {
        setBatchEditForm({
          'type': firstConnection.type,
          'weight': String(firstConnection.weight)
        });
      }
    }
  };

  const handleBatchEditCancel = () => {
    setIsBatchEditing(false);
    setBatchEditForm({ 'type': '', 'weight': '' });
  };

  const handleBatchEditSave = () => {
    const updatedConnections = connections.map((connection: GraphConnection) => {
      if (selectedConnections.some((c: GraphConnection) => c.id === connection.id)) {
        return {
          ...connection,
          'type': batchEditForm.type || connection.type,
          'weight': parseFloat(batchEditForm.weight) || connection.weight
        };
      }
      return connection;
    });

    setConnections(updatedConnections);
    setIsBatchEditing(false);
    setBatchEditForm({ 'type': '', 'weight': '' });
    showNotification('批量编辑成功', 'success');
  };

  const handleDeleteConnection = (connectionId: string) => {
    const connectionToDelete = connections.find((c: GraphConnection) => c.id === connectionId);
    if (!connectionToDelete) {
      return;
    }

    setConnections(connections.filter((c: GraphConnection) => c.id !== connectionId));
    showNotification('连接已删除', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">连接管理</h3>
        <div className="flex gap-2">
          <button
            onClick={handleStartAddingConnection}
            disabled={isAddingConnection}
            className={`px-4 py-2 rounded-md transition-colors ${isAddingConnection ? 'bg-blue-600' : 'bg-green-500 text-white'} ${!isAddingConnection ? 'hover:bg-green-600' : 'hover:bg-blue-600'}`}
          >
            {isAddingConnection ? '取消添加' : '添加连接'}
          </button>
        </div>
      </div>

      {isAddingConnection && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-sm text-blue-700 mb-2">选择源节点开始创建连接</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {nodes.map((node: GraphNode) => (
              <button
                key={node.id}
                onClick={() => handleSelectConnectionSource(node)}
                className={`p-3 border rounded-md transition-colors ${
                  connectionSourceNode?.id === node.id
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {node.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">连接列表 ({connections.length})</h4>
          <div className="flex gap-2">
            <button
              onClick={handleBatchSelectAll}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedConnections.length === connections.length ? '取消全选' : '全选'}
            </button>
            {selectedConnections.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              >
                批量删除
              </button>
            )}
          </div>
        </div>

        {selectedConnections.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleBatchEditStart}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              批量编辑
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {connections.map((connection: GraphConnection) => (
          <div
            key={connection.id}
            className={`flex items-center justify-between p-3 border-b ${selectedConnections.some((c: GraphConnection) => c.id === connection.id) ? 'bg-blue-50' : ''} rounded-md`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedConnections.some((c: GraphConnection) => c.id === connection.id)}
                onChange={() => handleToggleConnectionSelection(connection)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{connection.source}</div>
                <div className="text-sm text-gray-600">→</div>
                <div className="font-medium text-gray-800">{connection.target}</div>
              </div>
              <div className="text-sm text-gray-600">{connection.type}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteConnection(connection.id)}
                className="p-1 hover:bg-red-50 text-red-600"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isBatchEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-medium mb-4">批量编辑连接</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  连接类型
                </label>
                <input
                  type="text"
                  value={batchEditForm.type}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, 'type': e.target.value })}
                  className="block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  连接权重
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={batchEditForm.weight}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, 'weight': e.target.value })}
                  className="block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleBatchEditCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleBatchEditSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkManagement;
