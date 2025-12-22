/**
 * 连接编辑面板组件
 * 用于编辑选中连接的属性
 */
import React, { useState, useEffect } from 'react';
import { Trash2, Save, X } from 'lucide-react';
import type { EnhancedGraphConnection } from './types';

interface ConnectionEditPanelProps {
  selectedConnection: EnhancedGraphConnection | null;
  onUpdateConnection: (_connection: EnhancedGraphConnection) => void;
  onDeleteConnection: (_connectionId: string) => void;
  onClose: () => void;
}

/**
 * 连接编辑面板组件
 */
export const ConnectionEditPanel: React.FC<ConnectionEditPanelProps> = ({
  selectedConnection,
  onUpdateConnection,
  onDeleteConnection,
  onClose
}) => {
  // 表单状态
  const [formData, setFormData] = useState<EnhancedGraphConnection>({
    'id': '',
    'source': '',
    'target': '',
    'type': '',
    'label': '',
    'weight': 1,
    'style': {
      'stroke': '#94a3b8',
      'strokeWidth': 2
    },
    'metadata': {
      'createdAt': Date.now(),
      'updatedAt': Date.now(),
      'version': 1
    },
    'state': {
      'isSelected': false,
      'isHovered': false,
      'isEditing': false
    },
    'curveControl': {
      'controlPointsCount': 1,
      'controlPoints': [],
      'curveType': 'default'
    },
    'animation': {
      'dynamicEffect': 'none',
      'isAnimating': false
    }
  });

  // 当选中连接变化时，更新表单数据
  useEffect(() => {
    if (selectedConnection) {
      setFormData(selectedConnection);
    }
  }, [selectedConnection]);

  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'controlPointsCount') {
      setFormData(prev => ({
        ...prev,
        'curveControl': {
          ...prev.curveControl,
          'controlPointsCount': parseInt(value, 10) || 1
        }
      }));
    } else if (name === 'dynamicEffect') {
      setFormData(prev => ({
        ...prev,
        'animation': {
          ...prev.animation,
          'dynamicEffect': value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 1 : value
      }));
    }
  };

  // 处理保存连接
  const handleSave = () => {
    if (selectedConnection) {
      onUpdateConnection(formData);
    }
  };

  // 处理删除连接
  const handleDelete = () => {
    if (selectedConnection) {
      onDeleteConnection(selectedConnection.id);
      onClose();
    }
  };

  // 如果没有选中连接，不渲染面板
  if (!selectedConnection) {
    return null;
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-200 shadow-lg z-40 flex flex-col overflow-hidden">
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm z-10">
        <h2 className="text-lg font-semibold">编辑连接</h2>
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
        {/* 连接类型 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            连接类型
          </label>
          <input
            type="text"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接类型"
          />
        </div>

        {/* 连接标签 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            连接标签
          </label>
          <input
            type="text"
            name="label"
            value={formData.label}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接标签"
          />
        </div>

        {/* 连接权重 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
          连接权重
          </label>
          <input
            type="number"
            name="weight"
            min="0"
            step="0.1"
            value={formData.weight}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接权重"
          />
        </div>

        {/* 曲线控制 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
          曲线控制
          </h3>

          {/* 控制点数量 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
            控制点数量
            </label>
            <select
              name="controlPointsCount"
              value={formData.curveControl.controlPointsCount?.toString() || '1'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(count => (
                <option key={count} value={count.toString()}>{count} 个</option>
              ))}
            </select>
          </div>

          {/* 曲线动态效果 */}
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium text-gray-700">
            动态效果
            </h4>
            <select
              name="dynamicEffect"
              value={formData.animation.dynamicEffect || 'none'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">无效果</option>
              <option value="flow">流动动画</option>
              <option value="pulse">脉冲效果</option>
              <option value="gradient">渐变过渡</option>
            </select>
          </div>
        </div>
      </div>

      {/* 面板底部操作栏 */}
      <div className="p-4 border-t border-gray-200 bg-white flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition-colors"
          title="删除连接"
        >
          <Trash2 size={16} />
          删除
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors"
          title="保存连接"
        >
          <Save size={16} />
          保存
        </button>
      </div>
    </div>
  );
};
