/**
 * LaTeX公式编辑器组件，提供简洁的代码编辑和预览功能
 */
import { useState, useRef, useCallback } from 'react';
import { X, Save, Copy } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 导入自定义Hook
import { useLatexStorage } from '../../hooks/useLatexStorage';

// 类型声明
interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (_formula: string) => void;
  initialFormula?: string;
}

// LaTeX公式预览组件
const LatexPreview: React.FC<{ formula: string }> = ({ formula }) => {
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
        'displayMode': true,
        'output': 'html',
        'throwOnError': false,
        'errorColor': '#cc0000',
        'strict': 'warn'
      });

      return (
        <div className="preview-container py-4 overflow-x-auto">
          <div dangerouslySetInnerHTML={{ '__html': rendered }} />
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
};

// 条件渲染历史和收藏列表组件
const FormulaList: React.FC<{
  formulas: string[];
  title: string;
  isFavorite?: boolean;
  onFormulaClick: (_formula: string) => void;
}> = ({
  formulas,
  title,
  isFavorite = false,
  onFormulaClick
}) => {
  if (formulas.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">暂无{title}</p>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-2">
        {formulas.map((formula) => (
          <div
            key={formula}
            className={`flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded ${isFavorite ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
          >
            <button
              className="flex-1 text-left text-xs font-mono text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
              onClick={() => onFormulaClick(formula)}
              title={formula}
            >
              {formula}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * LaTeX公式编辑器主组件
 * @param isOpen - 是否打开编辑器
 * @param onClose - 关闭编辑器的回调
 * @param onInsert - 插入公式的回调
 * @param initialFormula - 初始公式
 */
export function LatexEditor ({ isOpen, onClose, onInsert, initialFormula = '' }: LatexEditorProps) {
  const [formula, setFormula] = useState(initialFormula);

  const modalRef = useRef<HTMLDivElement>(null);

  // 使用自定义Hook管理公式存储
  const {
    recentFormulas,
    favoriteFormulas,
    addToRecent
  } = useLatexStorage();

  /**
   * 关闭编辑器
   */
  const handleClose = useCallback(() => {
    onClose();
    setFormula('');
  }, [onClose]);

  /**
   * 插入公式到文档
   */
  const handleInsert = () => {
    if (formula.trim()) {
      // 添加到最近使用
      addToRecent(formula);
      // 调用插入回调
      onInsert(formula);
      // 关闭编辑器
      handleClose();
    }
  };

  /**
   * 复制公式到剪贴板
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
  };

  /**
   * 清除公式
   */
  const handleClear = () => {
    setFormula('');
  };

  /**
   * 从历史记录或收藏夹中选择公式
   */
  const handleSelectFormula = (selectedFormula: string) => {
    setFormula(selectedFormula);
    addToRecent(selectedFormula);
  };

  // 点击外部关闭模态框
  useCallback(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* 编辑器头部 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">LaTeX公式编辑器</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 编辑器主体 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 双栏布局：左侧编辑，右侧实时预览 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左侧：代码编辑器 */}
            <div className="editor-panel">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">代码编辑</h3>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  清除
                </button>
              </div>
              <textarea
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="输入LaTeX公式，例如: E = mc^2"
                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                spellCheck={false}
                autoFocus
              />

              {/* 编辑辅助工具 */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setFormula(prev => prev + '\\frac{}{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  分数
                </button>
                <button
                  onClick={() => setFormula(prev => prev + '\\sum_{}^{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  求和
                </button>
                <button
                  onClick={() => setFormula(prev => prev + '\\int_{}^{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  积分
                </button>
                <button
                  onClick={() => setFormula(prev => prev + '\\sqrt{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  根号
                </button>
                <button
                  onClick={() => setFormula(prev => prev + '\\vec{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  向量
                </button>
                <button
                  onClick={() => setFormula(prev => prev + '\\mathbf{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  粗体
                </button>
              </div>
            </div>

            {/* 右侧：实时预览 */}
            <div className="preview-panel">
              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">实时预览</h3>
              </div>
              <div className="p-4 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 min-h-[120px] flex items-center justify-center">
                <LatexPreview formula={formula} />
              </div>

              {/* 公式统计 */}
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-right">
                公式长度: {formula.length} 字符
              </div>
            </div>
          </div>

          {/* 历史和收藏 */}
          <div className="mt-6 space-y-6">
            {/* 最近使用的公式 */}
            <FormulaList
              formulas={recentFormulas}
              title="最近使用"
              onFormulaClick={handleSelectFormula}
            />

            {/* 收藏的公式 */}
            <FormulaList
              formulas={favoriteFormulas}
              title="我的收藏"
              isFavorite={true}
              onFormulaClick={handleSelectFormula}
            />
          </div>
        </div>

        {/* 编辑器底部 */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-end items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              清除
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 border border-blue-500 rounded bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors flex items-center"
            >
              <Copy className="w-4 h-4 mr-1" />
              复制公式
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-1" />
              插入公式
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
