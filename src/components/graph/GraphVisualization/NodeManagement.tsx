/**
 * 节点管理组件
 * 负责节点的添加、删除、选择等操作
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
