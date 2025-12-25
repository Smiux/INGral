interface LatexTemplate {
  name: string;
  items: {
    name: string;
    formula: string;
  }[];
}

interface LatexTemplateLibraryProps {
  templates: LatexTemplate[];
  onTemplateClick: (_template: string) => void;
  searchQuery: string;
}

/**
 * LaTeX模板库组件
 * 提供常用公式模板的选择界面
 * @param templates - 模板分类列表
 * @param onTemplateClick - 点击模板的回调
 * @param searchQuery - 搜索查询字符串，用于过滤模板
 */
export function LatexTemplateLibrary ({ templates, onTemplateClick, searchQuery }: LatexTemplateLibraryProps) {
  // 过滤模板分类和模板
  const filteredTemplates = templates.map(category => {
    // 过滤当前分类下匹配搜索条件的模板
    const filteredItems = category.items.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.formula.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...category,
      'items': filteredItems
    };
  });

  // 只保留包含匹配模板的分类
  const filteredCategories = filteredTemplates.filter(category => category.items.length > 0);

  return (
    <div className="template-library p-4 max-h-[400px] overflow-y-auto">
      {filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          没有找到匹配的模板
        </div>
      ) : (
        filteredCategories.map((category) => (
          <div key={category.name} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.items.map((template) => (
                <div
                  key={`${template.name}-${template.formula}`}
                  className="template-item p-3 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => onTemplateClick(template.formula)}
                >
                  <div className="template-name text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    {template.name}
                  </div>
                  <div className="template-preview text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-nowrap">
                    {template.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
