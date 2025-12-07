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
  links,
  setNodes,
  setSelectedNode,
  selectedNodes,
  setSelectedNodes,
  showNotification,
  onAddNode,
  onDeleteNodes,
}) => {
  // 批量编辑状态
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  // 批量编辑表单数据
  const [batchEditForm, setBatchEditForm] = useState({
    title: '',
    type: '',
    connections: ''
  });
  
  /**
   * 添加新节点
   */
  const handleAddNode = () => {
    const newNode: EnhancedNode = {
      id: `node-${Date.now()}`,
      title: '新节点',
      connections: 0,
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    };

    setNodes(prev => [...prev, newNode]);
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
        const connections = parseInt(batchEditForm.connections.trim());
        if (!isNaN(connections)) {
          updatedNode.connections = connections;
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        updatedCount++;
      }
      
      return updatedNode;
    });
    
    if (updatedCount > 0) {
      setNodes(updatedNodes);
      setBatchEditForm({ title: '', type: '', connections: '' });
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
    setBatchEditForm({ title: '', type: '', connections: '' });
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
    const associatedLinks = links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return selectedNodeIds.has(String(sourceId)) || selectedNodeIds.has(String(targetId));
    });

    // 调用onDeleteNodes回调函数，传递要删除的节点和关联的链接
    if (onDeleteNodes) {
      onDeleteNodes(selectedNodes, associatedLinks);
    }

    // 删除选中节点
    setNodes(prev => prev.filter(node => !selectedNodeIds.has(node.id)));
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

    setSelectedNodes(prev => {
      if (prev.some(n => n.id === node.id)) {
        return prev.filter(n => n.id !== node.id);
      } else {
        return [...prev, node];
      }
    });

    setSelectedNode(selectedNodes.length === 1 && selectedNodes[0]?.id === node.id ? null : node);
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
              className={`p-2 rounded-md cursor-pointer flex items-center gap-2 ${selectedNodes.some(n => n.id === node.id) ? 'bg-blue-100 border border-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleSelectNode(node)}
            >
              <input
                type="checkbox"
                checked={selectedNodes.some(n => n.id === node.id)}
                onChange={(e) => handleToggleNodeSelection(node, e)}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">{node.title}</span>
              <span className="text-xs text-gray-500">({node.connections} 连接)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
