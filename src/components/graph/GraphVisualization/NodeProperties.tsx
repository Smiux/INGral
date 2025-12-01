/**
 * 节点属性面板组件
 * 用于编辑节点的属性
 */
import React, { useState, useEffect } from 'react';
import type { EnhancedNode } from './types';

interface NodePropertiesProps {
  node: EnhancedNode | null;
  onUpdateNode: (node: EnhancedNode) => void;
  onCopyStyle?: () => void;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onUpdateNode, onCopyStyle }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'concept' | 'article' | 'resource' | string>('concept');

  // 当选中节点变化时，更新表单数据
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content || '');
      setType(node.type || 'concept');
    }
  }, [node]);

  // 如果没有选中节点，显示提示信息
  if (!node) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-500">请选择一个节点来编辑其属性</p>
      </div>
    );
  }

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 更新节点属性
    const updatedNode: EnhancedNode = {
      ...node,
      title,
      content,
      type,
    };
    
    onUpdateNode(updatedNode);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">节点属性</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 节点ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">节点ID</label>
          <input
            type="text"
            value={node.id}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
        </div>
        
        {/* 节点标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入节点标题"
          />
        </div>
        
        {/* 节点类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'concept' | 'article' | 'resource' | string)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="concept">概念</option>
            <option value="article">文章</option>
            <option value="resource">资源</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        
        {/* 节点内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入节点内容"
            rows={4}
          />
        </div>
        
        {/* 节点连接数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">连接数</label>
          <input
            type="number"
            value={node.connections}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
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
