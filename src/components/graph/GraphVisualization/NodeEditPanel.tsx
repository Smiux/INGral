/**
 * 节点编辑面板组件
 * 用于编辑选中节点的属性
 */
import React, { useState, useEffect } from 'react';
import { Trash2, Save, X } from 'lucide-react';
import type { EnhancedNode } from './types';

interface NodeEditPanelProps {
  selectedNode: EnhancedNode | null;
  onUpdateNode: (_node: EnhancedNode) => void;
  onDeleteNode: (_nodeId: string) => void;
  onClose: () => void;
}

/**
 * 节点编辑面板组件
 */
export const NodeEditPanel: React.FC<NodeEditPanelProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose
}) => {
  // 表单状态
  const [formData, setFormData] = useState<EnhancedNode>({
    'id': '',
    'title': '',
    'connections': 0,
    'x': 0,
    'y': 0,
    'type': 'concept',
    'content': '',
    'shape': 'rect',
    'isExpanded': false,
    '_isAggregated': false,
    '_aggregatedNodes': []
  });

  // 面板位置状态
  const [panelPosition, setPanelPosition] = useState({
    'left': 0,
    'top': 0,
    'right': 0,
    'isVisible': false,
    'position': 'left' as 'left' | 'right'
  });

  // 计算面板位置
  const calculatePanelPosition = (node: EnhancedNode) => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // 工具栏高度（保守估计，确保不重叠）
    const toolbarHeight = 80;
    // Panel height (approximate)
    const panelHeight = 400;

    // 获取节点位置 - 用于判断在屏幕左侧还是右侧
    const nodeX = node.x || 0;

    // 核心逻辑：根据节点位置决定面板出现在左侧还是右侧
    // 如果节点在屏幕右半部分，面板出现在左侧；否则出现在右侧
    const displayOnRight = nodeX < viewportWidth / 2;

    // 计算垂直位置 - 居中显示在视口中，确保不与工具栏重叠
    // 垂直居中，减去工具栏高度的一半来调整
    let top = (viewportHeight - panelHeight) / 2;

    // 确保面板完全在工具栏下方，不重叠
    top = Math.max(top, toolbarHeight + 20);

    // 确保面板不超出视口底部
    top = Math.min(top, viewportHeight - panelHeight - 20);

    // 设置最终位置
    if (displayOnRight) {
      // 右侧出现：固定在右侧边缘，距离右侧10px
      setPanelPosition({
        'left': 0,
        'right': 10,
        top,
        'isVisible': false,
        'position': 'right'
      });
    } else {
      // 左侧出现：固定在左侧边缘，距离左侧10px
      setPanelPosition({
        'left': 10,
        'right': 0,
        top,
        'isVisible': false,
        'position': 'left'
      });
    }
  };

  // 当选中节点变化时，更新表单数据和面板位置
  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode);

      // Calculate panel position
      calculatePanelPosition(selectedNode);

      // Show panel with animation
      setTimeout(() => {
        setPanelPosition(prev => ({ ...prev, 'isVisible': true }));
      }, 10);
    } else {
      // Hide panel with animation
      setPanelPosition(prev => ({ ...prev, 'isVisible': false }));
    }
  }, [selectedNode]);

  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理保存节点
  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(formData);
    }
  };

  // 处理删除节点
  const handleDelete = () => {
    if (selectedNode) {
      onDeleteNode(selectedNode.id);
      onClose();
    }
  };

  // 如果没有选中节点且 panel 不可见，不渲染
  if (!selectedNode && !panelPosition.isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed w-80 bg-white border border-gray-200 shadow-lg z-40 flex flex-col overflow-hidden transition-all duration-300 ease-in-out transform ${panelPosition.isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${panelPosition.position === 'right' ? 'translate-x-4' : '-translate-x-4'}`}`}
      style={{
        ...(panelPosition.position === 'right' ? { 'right': panelPosition.right, 'left': 'auto' } : { 'left': panelPosition.left, 'right': 'auto' }),
        'top': panelPosition.top,
        'maxHeight': 'calc(100vh - 80px)',
        'boxShadow': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm z-10">
        <h2 className="text-lg font-semibold">编辑节点</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="关闭面板"
        >
          <X size={20} />
        </button>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* 节点标题 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点标题
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点标题"
          />
        </div>

        {/* 节点类型 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点类型
          </label>
          <input
            type="text"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点类型"
          />
        </div>

        {/* 节点内容 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点内容
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点内容"
          />
        </div>

        {/* 节点形状 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点形状
          </label>
          <select
            name="shape"
            value={formData.shape}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="rect">矩形</option>
            <option value="circle">圆形</option>
            <option value="ellipse">椭圆形</option>
            <option value="triangle">三角形</option>
          </select>
        </div>
      </div>

      {/* 面板底部 */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white/90 backdrop-blur-sm">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          删除节点
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
