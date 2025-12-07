/**
 * 链接管理组件
 * 负责链接的添加、删除、选择等操作
 */
import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import type { LinkManagementProps, EnhancedNode, EnhancedGraphLink } from './types';

/**
 * 链接管理组件
 * @param props - 组件属性
 */
export const LinkManagement: React.FC<LinkManagementProps & {
  selectedLinks?: EnhancedGraphLink[];
  setSelectedLinks?: React.Dispatch<React.SetStateAction<EnhancedGraphLink[]>>;
}> = ({
  links,
  setLinks,
  nodes,
  setNodes,
  isAddingLink,
  setIsAddingLink,
  linkSourceNode,
  setLinkSourceNode,
  setMousePosition,
  showNotification,
  selectedLinks = [],
  setSelectedLinks = () => {},
}) => {
  // 批量编辑状态
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  // 批量编辑表单数据
  const [batchEditForm, setBatchEditForm] = useState({
    type: '',
    weight: ''
  });

  /**
   * 切换链接选择状态
   * @param link - 要切换选择状态的链接
   */
  const handleToggleLinkSelection = (link: EnhancedGraphLink) => {
    if (selectedLinks.some(l => l.id === link.id)) {
      // 已选中，移除
      setSelectedLinks(prev => prev.filter(l => l.id !== link.id));
    } else {
      // 未选中，添加
      setSelectedLinks(prev => [...prev, link]);
    }
  };

  /**
   * 选择所有链接
   */
  const handleSelectAllLinks = () => {
    setSelectedLinks(links);
  };

  /**
   * 取消选择所有链接
   */
  const handleClearLinkSelection = () => {
    setSelectedLinks([]);
  };

  /**
   * 批量删除链接
   */
  const handleBatchDeleteLinks = () => {
    if (selectedLinks.length === 0) {
      showNotification('请先选择要删除的链接', 'error');
      return;
    }

    const selectedLinkIds = new Set(selectedLinks.map(link => link.id));
    const updatedLinks = links.filter(link => !selectedLinkIds.has(link.id));

    // 更新节点连接数
    const updatedNodes = nodes.map(node => {
      let connectionCount = 0;
      updatedLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
        const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
        if (sourceId === node.id || targetId === node.id) {
          connectionCount++;
        }
      });
      return { ...node, connections: connectionCount };
    });

    setLinks(updatedLinks);
    setNodes(updatedNodes);
    setSelectedLinks([]);
    showNotification(`已删除 ${selectedLinks.length} 个链接`, 'success');
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
    if (selectedLinks.length === 0) {
      showNotification('请先选择要编辑的链接', 'error');
      return;
    }

    let updatedCount = 0;
    const updatedLinks = links.map(link => {
      if (!selectedLinks.some(selected => selected.id === link.id)) {
        return link;
      }

      const updatedLink = { ...link };
      let hasChanges = false;

      if (batchEditForm.type.trim()) {
        updatedLink.type = batchEditForm.type.trim();
        hasChanges = true;
      }

      if (batchEditForm.weight.trim()) {
        const weight = parseFloat(batchEditForm.weight.trim());
        if (!isNaN(weight)) {
          updatedLink.weight = weight;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        updatedCount++;
      }

      return updatedLink;
    });

    if (updatedCount > 0) {
      setLinks(updatedLinks);
      setBatchEditForm({ type: '', weight: '' });
      setIsBatchEditing(false);
      showNotification(`已更新 ${updatedCount} 个链接`, 'success');
    } else {
      showNotification('没有可应用的更改', 'info');
    }
  };

  /**
   * 取消批量编辑
   */
  const handleCancelBatchEdit = () => {
    setBatchEditForm({ type: '', weight: '' });
    setIsBatchEditing(false);
  };
  /**
   * 取消添加链接
   */
  const handleCancelAddLink = () => {
    setIsAddingLink(false);
    setLinkSourceNode(null);
    setMousePosition(null);
    showNotification('已取消添加链接', 'info');
  };

  /**
   * 删除链接
   * @param linkId - 链接ID
   */
  const handleDeleteLink = (linkId: string) => {
    const linkToDelete = links.find(link => link.id === linkId);
    if (!linkToDelete) {return;}

    // 获取链接源和目标ID
    const sourceId = typeof linkToDelete.source === 'object' ? (linkToDelete.source as EnhancedNode).id : String(linkToDelete.source);
    const targetId = typeof linkToDelete.target === 'object' ? (linkToDelete.target as EnhancedNode).id : String(linkToDelete.target);

    // 更新节点连接数
    setNodes(prev => prev.map(node => {
      if (node.id === sourceId || node.id === targetId) {
        return { ...node, connections: Math.max(0, node.connections - 1) };
      }
      return node;
    }));

    // 删除链接
    setLinks(prev => prev.filter(link => link.id !== linkId));
    showNotification('链接已删除', 'success');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {!isBatchEditing ? (
        <>
          {/* 链接操作工具栏 */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* 链接统计 */}
            <div className="text-sm text-gray-600">
              链接数: {links.length} | 选中: {selectedLinks.length}
            </div>

            {/* 添加链接状态 */}
            {isAddingLink && linkSourceNode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">
                  正在从 "{linkSourceNode.title}" 创建链接...
                </span>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center gap-1"
                  onClick={handleCancelAddLink}
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
                onClick={handleSelectAllLinks}
              >
                全选
              </button>
              <button
                className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-gray-700"
                onClick={handleClearLinkSelection}
              >
                清除选择
              </button>
              <button
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-green-700"
                onClick={() => setIsBatchEditing(true)}
                disabled={selectedLinks.length === 0}
              >
                <Edit size={14} />
                批量编辑
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-red-700"
                onClick={handleBatchDeleteLinks}
                disabled={selectedLinks.length === 0}
              >
                <Trash2 size={14} />
                批量删除
              </button>
            </div>
          </div>

          {/* 链接列表 */}
          <div className="mt-4 max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {links.map(link => {
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

                const sourceTitle = getNodeTitle(link.source);
                const targetTitle = getNodeTitle(link.target);

                // 检查链接是否被选中
                const isSelected = selectedLinks.some(l => l.id === link.id);

                return (
                  <li
                    key={link.id}
                    className={`p-2 rounded-md flex items-center justify-between ${isSelected ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* 选择复选框 */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleLinkSelection(link)}
                        className="cursor-pointer"
                      />
                      <div className="text-sm">
                        {sourceTitle} → {targetTitle}
                        <span className="ml-2 text-xs text-gray-500">({link.type})</span>
                      </div>
                    </div>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteLink(link.id)}
                      title="删除链接"
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
              <h3 className="text-sm font-medium text-gray-700">批量编辑链接 ({selectedLinks.length} 个选中)</h3>
              <button
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={handleCancelBatchEdit}
              >
                <Trash2 size={14} />
                取消
              </button>
            </div>
            
            <div className="space-y-3">
              {/* 链接类型 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">链接类型 (可选)</label>
                <input
                  type="text"
                  name="type"
                  value={batchEditForm.type}
                  onChange={handleBatchEditChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入链接类型"
                />
              </div>
              
              {/* 链接权重 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">链接权重 (可选)</label>
                <input
                  type="number"
                  name="weight"
                  value={batchEditForm.weight}
                  onChange={handleBatchEditChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入链接权重"
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
