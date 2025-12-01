/**
 * 保存模板对话框组件
 * 用于保存当前图表作为模板，让用户输入模板的名称、描述和分类等信息
 */
import React, { useState } from 'react';
import type { TemplateCategory } from './TemplateTypes';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  categories: TemplateCategory[];
  onClose: () => void;
  onSave: (template: {
    name: string;
    description: string;
    category_id: string;
    is_public: boolean;
  }) => void;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({ 
  isOpen, 
  categories, 
  onClose, 
  onSave 
}) => {
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category_id: 'default',
    is_public: true
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    
    let finalValue: string | boolean;
    
    // 只有当元素是input且类型是checkbox时，才使用checked属性
    if (e.target instanceof HTMLInputElement && type === 'checkbox') {
      finalValue = e.target.checked;
    } else {
      finalValue = e.target.value;
    }
    
    setTemplateData(prev => ({
      ...prev,
      [name]: finalValue as any
    }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    const newErrors: { [key: string]: string } = {};
    if (!templateData.name.trim()) {
      newErrors.name = '模板名称不能为空';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // 提交表单
    onSave(templateData);
    
    // 重置表单
    setTemplateData({
      name: '',
      description: '',
      category_id: 'default',
      is_public: true
    });
    setErrors({});
    onClose();
  };

  // 如果对话框未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">保存为模板</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 模板名称 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">模板名称 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={templateData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="输入模板名称"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          
          {/* 模板描述 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">模板描述</label>
            <textarea
              id="description"
              name="description"
              value={templateData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入模板描述"
              rows={3}
            />
          </div>
          
          {/* 模板分类 */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">模板分类</label>
            <select
              id="category_id"
              name="category_id"
              value={templateData.category_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 公开模板选项 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={templateData.is_public}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">公开模板</label>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
