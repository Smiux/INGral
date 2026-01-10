/**
 * LaTeX公式编辑器组件，集成MathLive编辑器
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Save, Copy } from 'lucide-react';

import 'mathlive';
import 'mathlive/static.css';

// 声明MathLive字段元素类型
interface MathLiveFieldElement extends HTMLElement {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  dispatchEvent: (event: Event) => boolean;
}

// 为math-field元素扩展HTMLAttributes，使其可以使用ref
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.HTMLAttributes<MathLiveFieldElement> & React.RefAttributes<MathLiveFieldElement> & {
        value?: string;
        onChange?: React.FormEventHandler<MathLiveFieldElement>;
        onInput?: React.FormEventHandler<MathLiveFieldElement>;
        onFocus?: React.FocusEventHandler<MathLiveFieldElement>;
        onBlur?: React.FocusEventHandler<MathLiveFieldElement>;
        smartMode?: boolean;
        virtualKeyboardMode?: 'auto' | 'manual' | 'onfocus' | 'off';
        keyboardLayout?: string;
        fontSize?: string;
        fontFamily?: string;
        mathStyle?: 'displaystyle' | 'textstyle';
        color?: string;
        backgroundColor?: string;
        readOnly?: boolean;
        placeholder?: string;
      };
    }
  }
}

// 导入自定义Hook
import { useLatexStorage } from '../../hooks/useLatexStorage';

// 类型声明
interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (_formula: string) => void;
  initialFormula?: string;
}



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
  const mathFieldRef = useRef<MathLiveFieldElement>(null);

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

  /**
   * 处理辅助工具按钮点击
   */
  const handleHelperClick = (latex: string) => {
    // 获取math-field元素
    const mathField = mathFieldRef.current;
    if (mathField) {
      // 使用MathLive的命令API插入内容
      mathField.dispatchEvent(new CustomEvent('insert', { 'detail': latex }));
    } else {
      // 兼容处理：如果MathLive未初始化，直接更新公式
      setFormula(prev => prev + latex);
    }
  };

  /**
   * 处理MathLive编辑器输入事件
   */
  const handleMathFieldInput = (event: React.FormEvent<MathLiveFieldElement>) => {
    const mathField = event.currentTarget;
    if (mathField && typeof mathField.getValue === 'function') {
      setFormula(mathField.getValue());
    }
  };

  // 点击外部关闭模态框
  useEffect(() => {
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
          {/* 单栏布局：充分利用宽度 */}
          <div className="grid grid-cols-1 gap-4">
            {/* MathLive编辑器 */}
            <div className="editor-panel">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">公式编辑</h3>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  清除
                </button>
              </div>

              {/* MathLive编辑器组件 - 向右扩展，充分利用空间 */}
              <math-field
                ref={mathFieldRef}
                value={formula}
                onInput={handleMathFieldInput}
                onChange={handleMathFieldInput}
                smartMode={true}
                virtualKeyboardMode="manual"
                mathStyle="displaystyle"
                fontSize="1.25rem"
                placeholder="输入LaTeX公式..."
                className="w-full min-h-64 max-h-[50vh] p-4 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y overflow-auto"
                style={{ 'width': '100%', 'maxWidth': '100%', 'minWidth': '100%', 'display': 'block' }}
              ></math-field>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 提示：直接输入LaTeX公式，或使用下方辅助工具
              </div>

              {/* 编辑辅助工具 */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleHelperClick('\\frac{}{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  分数
                </button>
                <button
                  onClick={() => handleHelperClick('\\sum_{}^{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  求和
                </button>
                <button
                  onClick={() => handleHelperClick('\\int_{}^{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  积分
                </button>
                <button
                  onClick={() => handleHelperClick('\\sqrt{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  根号
                </button>
                <button
                  onClick={() => handleHelperClick('\\vec{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  向量
                </button>
                <button
                  onClick={() => handleHelperClick('\\mathbf{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  粗体
                </button>
                <button
                  onClick={() => handleHelperClick('\\lim_{x \\to \\infty}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  极限
                </button>
                <button
                  onClick={() => handleHelperClick('\\prod_{}^{}')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  乘积
                </button>
                <button
                  onClick={() => handleHelperClick('\\sin')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  正弦
                </button>
                <button
                  onClick={() => handleHelperClick('\\cos')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  余弦
                </button>
                <button
                  onClick={() => handleHelperClick('\\tan')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  正切
                </button>
                <button
                  onClick={() => handleHelperClick('\\log')}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  对数
                </button>
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
