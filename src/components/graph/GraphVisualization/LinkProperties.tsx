/**
 * 链接属性面板组件
 * 用于编辑链接的属性
 */
import React, { useState, useEffect } from 'react';
import type { EnhancedGraphLink, EnhancedNode } from './types';

interface LinkPropertiesProps {
  link: EnhancedGraphLink | null;
  nodes: EnhancedNode[];
  onUpdateLink: (link: EnhancedGraphLink) => void;
  onCopyStyle?: () => void;
}

export const LinkProperties: React.FC<LinkPropertiesProps> = ({ link, nodes, onUpdateLink, onCopyStyle }) => {
  const [type, setType] = useState('');

  // 当选中链接变化时，更新表单数据
  useEffect(() => {
    if (link) {
      setType(link.type || '');
    }
  }, [link]);

  // 如果没有选中链接，显示提示信息
  if (!link) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-500">请选择一个链接来编辑其属性</p>
      </div>
    );
  }

  // 获取源节点和目标节点的标题
  const getNodeTitle = (nodeId: string | number | EnhancedNode) => {
    if (typeof nodeId === 'object') {
      return nodeId.title;
    }
    
    const node = nodes.find(n => n.id === String(nodeId));
    return node ? node.title : String(nodeId);
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 更新链接属性
    const updatedLink: EnhancedGraphLink = {
      ...link,
      type,
    };
    
    onUpdateLink(updatedLink);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">链接属性</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 链接ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">链接ID</label>
          <input
            type="text"
            value={link.id}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
        </div>
        
        {/* 源节点 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">源节点</label>
          <input
            type="text"
            value={getNodeTitle(link.source)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
        </div>
        
        {/* 目标节点 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标节点</label>
          <input
            type="text"
            value={getNodeTitle(link.target)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
        </div>
        
        {/* 链接类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">链接类型</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入链接类型，例如：相关、包含、继承等"
          />
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          {onCopyStyle && (
            <button
              type="button"
              onClick={onCopyStyle}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              复制样式
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
};
