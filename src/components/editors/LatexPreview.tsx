
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexPreviewProps {
  formula: string;
  useNumbering?: boolean;
  formulaNumber?: number;
  className?: string;
}

/**
 * LaTeX公式预览组件
 * 将LaTeX代码渲染为可视化的公式
 * @param formula - LaTeX公式代码
 * @param useNumbering - 是否显示公式编号
 * @param formulaNumber - 公式编号
 * @param className - 额外的CSS类名
 */
export function LatexPreview({ formula, useNumbering = false, formulaNumber = 1, className = '' }: LatexPreviewProps) {
  const renderFormula = () => {
    try {
      if (!formula.trim()) {
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            输入LaTeX公式预览效果
          </div>
        );
      }

      const rendered = katex.renderToString(formula, {
        displayMode: true,
        output: 'html',
        leqno: false,
        fleqn: false,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: 'warn',
      });

      return (
        <div className="relative">
          <div
            className={`preview-container py-4 overflow-x-auto ${className}`}
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
          {useNumbering && (
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400">
              ({formulaNumber})
            </div>
          )}
        </div>
      );
    } catch {
      return (
        <div className="error-message py-8 text-center text-red-500">
          渲染公式时出错
        </div>
      );
    }
  };

  return renderFormula();
}