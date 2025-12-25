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

interface MathQuillOptions {
  handlers?: {
    edit?: () => void;
    focus?: () => void;
    blur?: () => void;
  };
  spaceBehavesLikeTab?: boolean;
  leftRightIntoCmdGoes?: string;
  restrictMismatchedBrackets?: boolean;
  sumStartsWithNEquals?: boolean;
  supSubsRequireOperand?: boolean;
  charsThatBreakOutOfSupSub?: string;
  autoSubscriptNumerals?: boolean;
  autoCommands?: string;
  autoOperatorNames?: string;
  substituteTextarea?: () => HTMLElement;
}

interface MathFieldConstructor {
  new (_element: HTMLElement, _options: MathQuillOptions): MathField;
}

interface MathQuillInterface {
  MathField: MathFieldConstructor;
}

interface MathQuillInstance {
  MathField: MathFieldConstructor;
  getInterface(_version: string): MathQuillInterface;
}

// 扩展Window接口，添加MathQuill属性
declare global {
  interface Window {
    MathQuill?: MathQuillInstance;
  }
}

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
  // 动态加载的脚本和样式引用
  const mathQuillAssetsRef = useRef<{ script: HTMLScriptElement | null; link: HTMLLinkElement | null }>({
    'script': null,
    'link': null
  });

  /**
   * 加载MathQuill库并初始化
   */
  useEffect(() => {
    if (!mathFieldRef.current) {
      return undefined;
    }

    const currentMathFieldRef = mathFieldRef.current;
    const loadMathQuill = async () => {
      try {
        // 动态加载MathQuill库
        if (!window.MathQuill) {
          // 创建script标签加载MathQuill
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.min.js';
          script.async = true;
          mathQuillAssetsRef.current.script = script;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // 加载MathQuill样式
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/mathquill@0.10.1/build/mathquill.css';
          document.head.appendChild(link);
          mathQuillAssetsRef.current.link = link;
        }

        // 初始化MathQuill
        if (window.MathQuill && currentMathFieldRef) {
          const MathQuill = window.MathQuill.getInterface('0.10.1');

          // 创建MathField实例
          const mathField = new MathQuill.MathField(currentMathFieldRef, {
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
        }
      } catch (error) {
        console.error('Failed to load MathQuill:', error);
      }
    };

    loadMathQuill();

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

      // 移除动态加载的脚本和样式
      const { script, link } = mathQuillAssetsRef.current;
      if (script) {
        document.head.removeChild(script);
      }
      if (link) {
        document.head.removeChild(link);
      }
      // 重置ref值
      mathQuillAssetsRef.current = { 'script': null, 'link': null };
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
