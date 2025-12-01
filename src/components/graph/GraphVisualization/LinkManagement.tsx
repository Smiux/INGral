/**
 * 链接管理组件
 * 负责链接的添加、删除、选择等操作
 */
import React from 'react';
import { Trash2 } from 'lucide-react';
import type { LinkManagementProps, EnhancedNode } from './types';

/**
 * 链接管理组件
 * @param props - 组件属性
 */
export const LinkManagement: React.FC<LinkManagementProps> = ({
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
}) => {
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
      <div className="flex flex-wrap gap-2 items-center">
        {/* 链接统计 */}
        <div className="text-sm text-gray-600">
          链接数: {links.length}
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

            return (
              <li
                key={link.id}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-between"
              >
                <div className="text-sm">
                  {sourceTitle} → {targetTitle}
                  <span className="ml-2 text-xs text-gray-500">({link.type})</span>
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
    </div>
  );
};
