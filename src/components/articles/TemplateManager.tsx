/**
 * 模板管理组件
 * 用于选择、创建和管理文章模板
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, FileText, Folder, Eye, Save, Clock, Tag, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ContentTemplate, TemplateCategory, CreateTemplateRequest } from '../../types/template';
import { templateService } from '../../services/templateService';

interface TemplateManagerProps {
  onSelectTemplate: (_template: ContentTemplate) => void;
  onClose: () => void;
}

interface CreateTemplateDialogProps {
  categories: TemplateCategory[];
  onSave: (_template: CreateTemplateRequest) => void;
  onCancel: () => void;
}

interface TemplatePreviewProps {
  template: ContentTemplate;
  onClose: () => void;
}

// 创建模板对话框组件
const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({ categories, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !description.trim() || !content.trim()) {
      return;
    }

    onSave({
      'name': name.trim(),
      'description': description.trim(),
      'content': content.trim(),
      'category_id': categoryId,
      'is_public': isPublic,
      tags
    });
  }, [name, description, content, categoryId, isPublic, tags, onSave]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">创建新模板</h3>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模板名称 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入模板名称"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                分类 *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模板描述 *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入模板描述"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模板内容 *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入模板内容（Markdown格式）"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  标签
                </label>
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="mr-2"
                  />
                  公开模板
                </label>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="添加标签"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Save className="w-4 h-4 inline mr-1" />
            保存模板
          </button>
        </div>
      </div>
    </div>
  );
};

// 模板预览组件
const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">模板预览</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{template.name}</h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Folder className="w-3 h-3" />
                <span>{template.category_id}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(template.created_at).toLocaleDateString()}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{template.is_public ? '公开' : '私有'}</span>
              </span>
              {template.tags && template.tags.length > 0 && (
                <div className="flex gap-1">
                  <Tag className="w-3 h-3" />
                  <div className="flex gap-1">
                    {template.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {template.content}
              </pre>
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// 主模板管理组件
export const TemplateManager: React.FC<TemplateManagerProps> = ({ onSelectTemplate, onClose }) => {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ContentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));

  // 加载模板分类和模板
  useEffect(() => {
    const loadData = async () => {
      const [loadedCategories, loadedTemplates] = await Promise.all([
        templateService.getTemplateCategories(),
        templateService.getTemplates()
      ]);
      setCategories(loadedCategories);
      setTemplates(loadedTemplates);
      setFilteredTemplates(loadedTemplates);
    };
    loadData();
  }, []);

  // 过滤模板
  useEffect(() => {
    let filtered = templates;

    // 按分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category_id === selectedCategory);
    }

    // 按搜索查询过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  }, [selectedCategory, searchQuery, templates]);

  // 按分类分组模板
  const getGroupedTemplates = useCallback(() => {
    if (selectedCategory !== 'all') {
      return { [selectedCategory]: filteredTemplates };
    }

    const grouped = filteredTemplates.reduce((acc, template) => {
      const categoryName = categories.find(cat => cat.id === template.category_id)?.name || '未分类';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(template);
      return acc;
    }, {} as Record<string, ContentTemplate[]>);

    return grouped;
  }, [selectedCategory, filteredTemplates, categories]);

  // 处理分类展开/折叠
  const toggleCategoryExpanded = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // 处理模板创建
  const handleCreateTemplate = useCallback(async (templateData: CreateTemplateRequest) => {
    const newTemplate = await templateService.createTemplate(templateData);
    if (newTemplate) {
      setTemplates(prev => [...prev, newTemplate]);
      setShowCreateDialog(false);
    }
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: ContentTemplate) => {
    onSelectTemplate(template);
    onClose();
  }, [onSelectTemplate, onClose]);

  const groupedTemplates = getGroupedTemplates();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col mt-8 mb-8">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">选择模板</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有分类</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新建模板
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedTemplates).length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>未找到匹配的模板</p>
              <p className="text-sm">尝试调整搜索条件或创建新模板</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([categoryName, categoryTemplates]) => (
                <div key={categoryName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 cursor-pointer"
                    onClick={() => toggleCategoryExpanded(categoryName)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">
                        {categoryName}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">({categoryTemplates.length})</span>
                    </div>
                    {expandedCategories.has(categoryName) ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>

                  {expandedCategories.has(categoryName) && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryTemplates.map(template => (
                        <div key={template.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                {template.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 ml-3">
                              <button
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowPreviewDialog(true);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSelectTemplate(template)}
                                className="p-2 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            共找到 {filteredTemplates.length} 个模板
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
        </div>
      </div>

      {/* 创建模板对话框 */}
      {showCreateDialog && (
        <CreateTemplateDialog
          categories={categories}
          onSave={handleCreateTemplate}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}

      {/* 模板预览对话框 */}
      {showPreviewDialog && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => setShowPreviewDialog(false)}
        />
      )}
    </div>
  );
};
