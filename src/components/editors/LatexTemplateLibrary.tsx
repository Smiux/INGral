

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
}

/**
 * LaTeX模板库组件
 * 提供常用公式模板的选择界面
 * @param templates - 模板分类列表
 * @param onTemplateClick - 点击模板的回调
 */
export function LatexTemplateLibrary ({ templates, onTemplateClick }: LatexTemplateLibraryProps) {
  return (
    <div className="template-library p-4 max-h-[400px] overflow-y-auto">
      {templates.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
            {category.name}
          </h3>
          <div className="space-y-2">
            {category.items.map((template, templateIndex) => (
              <div
                key={templateIndex}
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
      ))}
    </div>
  );
}
