/**
 * 模板管理组件
 * 用于管理图表模板，包括查看、添加、编辑和删除模板
 */
import React, { useState } from 'react';
import type { GraphTemplate, TemplateCategory } from './TemplateTypes';
import { TemplatePreview } from './TemplatePreview';

interface TemplateManagerProps {
  templates: GraphTemplate[];
  categories: TemplateCategory[];
  onAddTemplate: (template: Omit<GraphTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTemplate: (template: GraphTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onUseTemplate: (template: GraphTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  templates, 
  categories, 
  onAddTemplate, 
  onUpdateTemplate, 
  onDeleteTemplate,
  onUseTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GraphTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category_id: 'default',
    nodes: [],
    links: [],
    is_public: true
  });
  const [editingTemplateData, setEditingTemplateData] = useState({
    name: '',
    description: '',
    category_id: 'default',
    is_public: true
  });

  // 过滤模板
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category_id === selectedCategory);

  // 处理添加模板
  const handleAddTemplate = () => {
    if (!newTemplate.name.trim()) return;
    
    onAddTemplate(newTemplate);
    setNewTemplate({
      name: '',
      description: '',
      category_id: 'default',
      nodes: [],
      links: [],
      is_public: true
    });
    setIsAdding(false);
  };

  // 处理编辑模板
  const handleEditTemplate = (template: GraphTemplate) => {
    setEditingTemplate(template);
    setEditingTemplateData({
      name: template.name,
      description: template.description || '',
      category_id: template.category_id,
      is_public: template.is_public
    });
  };

  // 处理保存编辑
  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    if (!editingTemplateData.name.trim()) return;
    
    onUpdateTemplate({
      ...editingTemplate,
      ...editingTemplateData
    });
    setEditingTemplate(null);
    setEditingTemplateData({
      name: '',
      description: '',
      category_id: 'default',
      is_public: true
    });
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setEditingTemplateData({
      name: '',
      description: '',
      category_id: 'default',
      is_public: true
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">模板管理</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          {isAdding ? '取消' : '添加模板'}
        </button>
      </div>

      {/* 分类筛选 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">筛选分类</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有分类</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* 添加模板表单 */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入模板名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模板描述</label>
              <textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入模板描述"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={newTemplate.category_id}
                onChange={(e) => setNewTemplate({ ...newTemplate, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={newTemplate.is_public}
                onChange={(e) => setNewTemplate({ ...newTemplate, is_public: e.target.checked })}
              />
              <label htmlFor="is_public" className="text-sm text-gray-700">公开模板</label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleAddTemplate}
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

      {/* 模板列表 */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTemplates.map(template => (
          <div key={template.id} className="p-3 bg-gray-50 rounded-md">
            {editingTemplate?.id === template.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingTemplateData.name}
                  onChange={(e) => setEditingTemplateData({ ...editingTemplateData, name: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editingTemplateData.description}
                  onChange={(e) => setEditingTemplateData({ ...editingTemplateData, description: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <select
                  value={editingTemplateData.category_id}
                  onChange={(e) => setEditingTemplateData({ ...editingTemplateData, category_id: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`is_public_${template.id}`}
                    checked={editingTemplateData.is_public}
                    onChange={(e) => setEditingTemplateData({ ...editingTemplateData, is_public: e.target.checked })}
                  />
                  <label htmlFor={`is_public_${template.id}`} className="text-sm text-gray-700">公开模板</label>
                </div>
                <div className="flex justify-end gap-2">
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
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {/* 模板预览 */}
                <div className="flex-shrink-0">
                  <TemplatePreview template={template} width={150} height={100} />
                </div>
                
                {/* 模板信息 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUseTemplate(template)}
                        className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                      >
                        使用模板
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => onDeleteTemplate(template.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>分类: {categories.find(c => c.id === template.category_id)?.name || '未知'}</span>
                    <span>节点数: {template.nodes.length}</span>
                    <span>链接数: {template.links.length}</span>
                    <span>{template.is_public ? '公开' : '私有'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
