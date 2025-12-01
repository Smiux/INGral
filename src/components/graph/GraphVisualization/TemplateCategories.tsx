/**
 * 模板分类管理组件
 * 用于管理模板分类，包括查看、添加、编辑和删除分类
 */
import React, { useState } from 'react';
import type { TemplateCategory } from './TemplateTypes';

interface TemplateCategoriesProps {
  categories: TemplateCategory[];
  onAddCategory: (category: Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCategory: (category: TemplateCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const TemplateCategories: React.FC<TemplateCategoriesProps> = ({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [editingCategoryData, setEditingCategoryData] = useState({
    name: '',
    description: ''
  });

  // 处理添加分类
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    
    onAddCategory(newCategory);
    setNewCategory({ name: '', description: '' });
    setIsAdding(false);
  };

  // 处理编辑分类
  const handleEditCategory = (category: TemplateCategory) => {
    setEditingCategory(category);
    setEditingCategoryData({
      name: category.name,
      description: category.description || ''
    });
  };

  // 处理保存编辑
  const handleSaveEdit = () => {
    if (!editingCategory) return;
    if (!editingCategoryData.name.trim()) return;
    
    onUpdateCategory({
      ...editingCategory,
      ...editingCategoryData
    });
    setEditingCategory(null);
    setEditingCategoryData({ name: '', description: '' });
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingCategoryData({ name: '', description: '' });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">模板分类管理</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          {isAdding ? '取消' : '添加分类'}
        </button>
      </div>

      {/* 添加分类表单 */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入分类名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类描述</label>
              <textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入分类描述"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleAddCategory}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                保存
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分类列表 */}
      <div className="space-y-2">
        {categories.map(category => (
          <div key={category.id} className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
            {editingCategory?.id === category.id ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={editingCategoryData.name}
                  onChange={(e) => setEditingCategoryData({ ...editingCategoryData, name: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editingCategoryData.description}
                  onChange={(e) => setEditingCategoryData({ ...editingCategoryData, description: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            ) : (
              <div className="flex-1">
                <h4 className="font-medium">{category.name}</h4>
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {editingCategory?.id === category.id ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
