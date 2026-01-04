import React, { useRef, useEffect } from 'react';

// 类型声明
interface MathField {
  focus(): void;
  blur(): void;
  latex(_latex?: string): string;
  select(): void;
  clearSelection(): void;
  write(_latex: string): void;
  cmd(_cmd: string): void;
}

// 声明全局MathQuill对象
interface MathQuillStatic {
  MathField(_element: HTMLElement, _options?: Record<string, unknown>): MathField;
}

declare const MathQuill: MathQuillStatic;

interface LatexVisualEditorProps {
  formula: string;
  onFormulaChange: (_formula: string) => void;
  mathFieldRef: React.RefObject<HTMLDivElement>;
  onMathQuillReady?: (_mathField: MathField) => void;
}

/**
 * LaTeX可视化编辑器组件
 * 处理MathQuill可视化编辑模式
 * @param formula - 当前LaTeX公式
 * @param onFormulaChange - 公式变化的回调
 * @param mathFieldRef - MathQuill容器的引用
 * @param onMathQuillReady - MathQuill初始化完成的回调
 */
export function LatexVisualEditor ({
  formula,
  onFormulaChange,
  mathFieldRef,
  onMathQuillReady
}: LatexVisualEditorProps) {
  // MathQuill实例引用
  const mathQuillInstanceRef = useRef<MathField | null>(null);

  /**
   * 初始化MathQuill
   */
  useEffect(() => {
    if (!mathFieldRef.current) {
      return undefined;
    }

    const currentMathFieldRef = mathFieldRef.current;

    // 检查MathQuill是否已加载
    const initializeMathQuill = () => {
      if (typeof MathQuill === 'undefined') {
        console.error('MathQuill is not loaded');
        return;
      }

      try {
        // 创建MathField实例
        // eslint-disable-next-line new-cap
        const mathField = MathQuill.MathField(currentMathFieldRef, {
          'handlers': {
            'edit': () => {
              const currentFormula = mathQuillInstanceRef.current?.latex() || '';
              onFormulaChange(currentFormula);
            },
            'focus': () => {
              // 聚焦时的处理
            },
            'blur': () => {
              // 失焦时的处理
            }
          },
          'spaceBehavesLikeTab': true,
          'restrictMismatchedBrackets': true,
          'autoSubscriptNumerals': true,
          'sumStartsWithNEquals': true
        });

        // 保存MathQuill实例
        mathQuillInstanceRef.current = mathField;

        // 初始化公式
        mathField.latex(formula);

        // 调用初始化完成回调
        if (onMathQuillReady) {
          onMathQuillReady(mathField);
        }
      } catch (error) {
        console.error('Failed to initialize MathQuill:', error);
      }
    };

    // 立即初始化，如果MathQuill还没加载，会在CDN加载完成后自动初始化
    initializeMathQuill();

    // 清理函数
    return () => {
      // 销毁MathQuill实例
      if (mathQuillInstanceRef.current) {
        // 清空内容
        mathQuillInstanceRef.current.latex('');
        // 移除所有事件监听器
        mathQuillInstanceRef.current = null;
      }

      // 清理DOM元素
      currentMathFieldRef.innerHTML = '';
    };
  }, [mathFieldRef, onFormulaChange, onMathQuillReady, formula]);

  /**
   * 当公式变化时，更新MathQuill实例
   */
  useEffect(() => {
    if (mathQuillInstanceRef.current) {
      const currentLatex = mathQuillInstanceRef.current.latex();
      if (currentLatex !== formula) {
        mathQuillInstanceRef.current.latex(formula);
      }
    }
  }, [formula]);

  return (
    <div className="visual-editor-container">
      <div className="mathquill-container p-4 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
        {/* MathQuill将挂载到这个div上 */}
        <div ref={mathFieldRef} className="math-field"></div>
      </div>
      <div className="visual-editor-hints mt-2 text-xs text-gray-500 dark:text-gray-400">
        <p>💡 提示：使用Tab键在不同元素间导航，使用空格键插入空格</p>
      </div>
    </div>
  );
}
