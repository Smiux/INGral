/**
 * LaTeX公式编辑器组件，提供可视化和代码两种编辑模式
 */
import { useState, useEffect, useRef } from 'react';
import { X, Save, Copy, RotateCw, Search, HelpCircle, Star, StarOff } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 类型声明
declare global {
  interface MathField {
    focus(): void;
    blur(): void;
    latex(latex?: string): string;
    select(): void;
    clearSelection(): void;
    write(latex: string): void;
    cmd(cmd: string): void;
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

  interface MathQuillStatic {
    getInterface(version: string): {
      MathField: new (element: HTMLElement, options: MathQuillOptions) => MathField;
    };
  }

  interface Window {
    MathQuill: MathQuillStatic;
  }
}

interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formula: string) => void;
  initialFormula?: string;
}

/**
 * LaTeX编辑器组件
 * @param isOpen - 编辑器是否打开
 * @param onClose - 关闭编辑器的回调
 * @param onInsert - 插入公式的回调
 * @param initialFormula - 初始公式
 */
export function LatexEditor({ isOpen, onClose, onInsert, initialFormula = '' }: LatexEditorProps) {
  const [formula, setFormula] = useState(initialFormula);
  const [renderedFormula, setRenderedFormula] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'symbols' | 'templates'>('editor');
  const [recentFormulas, setRecentFormulas] = useState<string[]>([]);
  const [favoriteFormulas, setFavoriteFormulas] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [formulaNumber, setFormulaNumber] = useState(1);
  const [useNumbering, setUseNumbering] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<HTMLDivElement>(null);
  const mathQuillInstanceRef = useRef<MathField | null>(null);

  // 常用符号和模板
  const symbols = [
    { name: 'Greek Letters', items: ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega'] },
    { name: 'Operators', items: ['+', '-', '\\times', '\\div', '=', '\\neq', '\\approx', '\\leq', '\\geq', '\\pm', '\\mp', '\\cdot', '\\circ', '\\star', '\\ast', '\\odot', '\\oplus'] },
    { name: 'Functions', items: ['\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp', '\\sqrt', '\\frac{}{}', '\\sum_{}^{}', '\\prod_{}^{}', '\\int_{}^{}', '\\iint_{}^{}', '\\iiint_{}^{}', '\\oint_{}^{}', '\\lim_{}'] },
    { name: 'Logic', items: ['\\forall', '\\exists', '\\neg', '\\wedge', '\\vee', '\\implies', '\\iff', '\\oplus', '\\otimes', '\\equiv'] },
    { name: 'Formatting', items: ['\\mathbf{}', '\\textbf{}', '\\emph{}', '\\overline{}', '\\underline{}', '\\overrightarrow{}', '\\overleftrightarrow{}', '\\hat{}', '\\tilde{}'] },
    { name: 'Matrices', items: ['\\begin{bmatrix} \\end{bmatrix}', '\\begin{pmatrix} \\end{pmatrix}', '\\begin{vmatrix} \\end{vmatrix}', '\\begin{Vmatrix} \\end{Vmatrix}', '\\begin{bmatrix} a & b \\ c & d \\end{bmatrix}'] },
    { name: 'Arrows', items: ['\\rightarrow', '\\leftarrow', '\\Rightarrow', '\\Leftarrow', '\\leftrightarrow', '\\Leftrightarrow', '\\uparrow', '\\downarrow', '\\updownarrow'] },
    { name: 'Sets', items: ['\\cup', '\\cap', '\\subset', '\\supset', '\\subseteq', '\\supseteq', '\\in', '\\notin', '\\emptyset', '\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{C}'] },
  ];

  // 公式模板
  const templates = [
    {
      name: 'Basic Mathematics',
      items: [
        { name: 'Quadratic Formula', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
        { name: 'Pythagorean Theorem', formula: 'a^2 + b^2 = c^2' },
        { name: 'Sum of Series', formula: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' },
        { name: 'Binomial Theorem', formula: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
        { name: 'Geometric Series', formula: '\\sum_{n=0}^{\\infty} ar^n = \\frac{a}{1-r} \\quad |r| < 1' },
        { name: 'Logarithm Identity', formula: '\\log(ab) = \\log(a) + \\log(b)' },
        { name: 'Exponential Identity', formula: 'e^{\\ln(x)} = x' },
        { name: 'Trigonometric Identity', formula: '\\sin^2(x) + \\cos^2(x) = 1' },
      ],
    },
    {
      name: 'Calculus',
      items: [
        { name: 'Derivative', formula: '\\frac{d}{dx} f(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
        { name: 'Integral', formula: '\\int_{a}^{b} f(x) \\, dx' },
        { name: 'Chain Rule', formula: '\\frac{d}{dx} f(g(x)) = f\'(g(x)) \\cdot g\'(x)' },
        { name: 'Product Rule', formula: '\\frac{d}{dx} [f(x)g(x)] = f\'(x)g(x) + f(x)g\'(x)' },
        { name: 'Quotient Rule', formula: '\\frac{d}{dx} \\left(\\frac{f(x)}{g(x)}\\right) = \\frac{f\'(x)g(x) - f(x)g\'(x)}{[g(x)]^2}' },
        { name: 'Fundamental Theorem of Calculus', formula: '\\frac{d}{dx} \\int_{a}^{x} f(t) \\, dt = f(x)' },
        { name: 'Partial Derivative', formula: '\\frac{\\partial f(x,y)}{\\partial x}' },
        { name: 'Gradient', formula: '\\nabla f = \\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}, \\frac{\\partial f}{\\partial z}\\right)' },
        { name: 'Laplacian', formula: '\\nabla^2 f = \\frac{\\partial^2 f}{\\partial x^2} + \\frac{\\partial^2 f}{\\partial y^2} + \\frac{\\partial^2 f}{\\partial z^2}' },
        { name: 'Taylor Series', formula: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n' },
      ],
    },
    {
      name: 'Linear Algebra',
      items: [
        { name: 'Matrix Multiplication', formula: 'C_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}' },
        { name: 'Determinant', formula: '\\det(A) = \\begin{bmatrix} a & b \\ c & d \\end{bmatrix} = ad - bc' },
        { name: 'Eigenvalue Equation', formula: 'A v = \\lambda v' },
        { name: 'Trace', formula: '\\text{tr}(A) = \\sum_{i=1}^{n} A_{ii}' },
        { name: 'Inverse Matrix', formula: 'A^{-1} = \\frac{1}{\\det(A)} \\text{adj}(A)' },
        { name: 'Vector Dot Product', formula: '\\mathbf{a} \\cdot \\mathbf{b} = \\sum_{i=1}^{n} a_i b_i' },
        { name: 'Vector Cross Product', formula: '\\mathbf{a} \\times \\mathbf{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\ a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \\end{vmatrix}' },
        { name: 'Singular Value Decomposition', formula: 'A = U \\Sigma V^T' },
      ],
    },
    {
      name: 'Physics',
      items: [
        { name: 'Newton\'s Second Law', formula: 'F = ma' },
        { name: 'Einstein\'s Mass-Energy Equivalence', formula: 'E = mc^2' },
        { name: 'Maxwell\'s Equations', formula: '\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}' },
        { name: 'Schrödinger Equation', formula: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r},t) = \\hat{H} \\Psi(\\mathbf{r},t)' },
        { name: 'Heisenberg Uncertainty Principle', formula: '\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}' },
        { name: 'Planck\'s Law', formula: 'E = hf' },
        { name: 'Boltzmann Distribution', formula: 'P(E) = \\frac{1}{Z} e^{-\\beta E}' },
        { name: 'Lorentz Force', formula: '\\mathbf{F} = q(\\mathbf{E} + \\mathbf{v} \\times \\mathbf{B})' },
      ],
    },
    {
      name: 'Statistics & Probability',
      items: [
        { name: 'Mean', formula: '\\mu = \\frac{1}{n} \\sum_{i=1}^{n} x_i' },
        { name: 'Variance', formula: '\\sigma^2 = \\frac{1}{n-1} \\sum_{i=1}^{n} (x_i - \\mu)^2' },
        { name: 'Standard Deviation', formula: '\\sigma = \\sqrt{\\sigma^2}' },
        { name: 'Probability Density Function', formula: 'P(a \\leq X \\leq b) = \\int_{a}^{b} f(x) \\, dx' },
        { name: 'Gaussian Distribution', formula: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
        { name: 'Bayes Theorem', formula: 'P(A|B) = \\frac{P(B|A) P(A)}{P(B)}' },
        { name: 'Correlation Coefficient', formula: 'r = \\frac{\\sum (x_i - \\mu_x)(y_i - \\mu_y)}{\\sqrt{\\sum (x_i - \\mu_x)^2 \\sum (y_i - \\mu_y)^2}}' },
      ],
    },
    {
      name: 'Logic & Set Theory',
      items: [
        { name: 'Modus Ponens', formula: 'P \\rightarrow Q, P \\vdash Q' },
        { name: 'Modus Tollens', formula: 'P \\rightarrow Q, \\neg Q \\vdash \\neg P' },
        { name: 'De Morgan\'s Laws', formula: '\\neg (P \\wedge Q) \\equiv \\neg P \\vee \\neg Q' },
        { name: 'Set Union', formula: 'A \\cup B = \\{x | x \\in A \\text{ or } x \\in B\\}' },
        { name: 'Set Intersection', formula: 'A \\cap B = \\{x | x \\in A \\text{ and } x \\in B\\}' },
        { name: 'Set Difference', formula: 'A \\setminus B = \\{x | x \\in A \\text{ and } x \\notin B\\}' },
        { name: 'Cartesian Product', formula: 'A \\times B = \\{(a,b) | a \\in A, b \\in B\\}' },
      ],
    },
  ];

  // 当公式变化时渲染
  useEffect(() => {
    if (!formula.trim()) {
      setRenderedFormula('');
      setError(null);
      return;
    }
    try {
      const html = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
      });
      setRenderedFormula(html);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering error');
      console.error('Failed to render LaTeX:', err);
      // 尝试在错误情况下仍渲染（可能会显示部分公式）
      const html = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      });
      setRenderedFormula(html);
    }
  }, [formula]);

  // 从本地存储加载最近使用的公式和收藏公式
  useEffect(() => {
    const savedRecentFormulas = localStorage.getItem('recentLatexFormulas');
    if (savedRecentFormulas) {
      try {
        setRecentFormulas(JSON.parse(savedRecentFormulas));
      } catch (e) {
        console.error('Failed to load recent formulas:', e);
      }
    }

    const savedFavoriteFormulas = localStorage.getItem('favoriteLatexFormulas');
    if (savedFavoriteFormulas) {
      try {
        setFavoriteFormulas(JSON.parse(savedFavoriteFormulas));
      } catch (e) {
        console.error('Failed to load favorite formulas:', e);
      }
    }
  }, []);

  // 保存到最近使用的公式
  const saveToHistory = (newFormula: string) => {
    if (!newFormula.trim()) {return;}

    const updatedHistory = [
      newFormula,
      ...recentFormulas.filter(f => f !== newFormula),
    ].slice(0, 15); // 增加到15个

    setRecentFormulas(updatedHistory);
    localStorage.setItem('recentLatexFormulas', JSON.stringify(updatedHistory));
  };

  // 切换收藏状态
  const toggleFavorite = (newFormula: string) => {
    let updatedFavorites;
    if (favoriteFormulas.includes(newFormula)) {
      updatedFavorites = favoriteFormulas.filter(f => f !== newFormula);
    } else {
      updatedFavorites = [...favoriteFormulas, newFormula];
    }
    setFavoriteFormulas(updatedFavorites);
    localStorage.setItem('favoriteLatexFormulas', JSON.stringify(updatedFavorites));
  };

  // 插入符号到当前光标位置
  const insertSymbol = (symbol: string) => {
    if (isVisualMode && mathQuillInstanceRef.current) {
      mathQuillInstanceRef.current.cmd(symbol);
    } else {
      const textarea = document.getElementById('latex-formula-input') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = formula.substring(0, start) + symbol + formula.substring(end);
        setFormula(newValue);

        // 重新聚焦并设置光标位置
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + symbol.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        setFormula(formula + symbol);
      }
    }
  };

  // 初始化MathQuill
  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    if (isVisualMode && isOpen && mathFieldRef.current && !mathQuillInstanceRef.current) {
      // 动态加载MathQuill脚本
      script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js';
      script.onload = () => {
        if (window.MathQuill && mathFieldRef.current) {
          const MathQuill = window.MathQuill.getInterface('2.0.0');
          mathQuillInstanceRef.current = new MathQuill.MathField(mathFieldRef.current, {
            handlers: {
              edit: () => {
                if (mathQuillInstanceRef.current) {
                  const latex = mathQuillInstanceRef.current.latex();
                  setFormula(latex);
                }
              },
            },
          });

          // 设置初始公式
          if (formula && mathQuillInstanceRef.current) {
            mathQuillInstanceRef.current.latex(formula);
          }
        }
      };
      document.body.appendChild(script);
    }

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isVisualMode, isOpen, formula]);

  // 当公式变化且不在可视化模式时更新
  useEffect(() => {
    if (!isVisualMode || !mathQuillInstanceRef.current) {return;}

    // 避免循环更新
    const currentLatex = mathQuillInstanceRef.current.latex();
    if (formula !== currentLatex) {
      mathQuillInstanceRef.current.latex(formula);
    }
  }, [formula, isVisualMode]);

  // 切换编辑模式时的处理
  useEffect(() => {
    if (isVisualMode && mathQuillInstanceRef.current) {
      mathQuillInstanceRef.current.latex(formula);
    }
  }, [isVisualMode, formula]);

  // 插入公式到文章中
  const handleInsert = () => {
    if (!formula.trim()) {return;}
    saveToHistory(formula);

    let finalFormula = formula;
    if (useNumbering) {
      finalFormula = `\\begin{equation}\\label{eq:${formulaNumber}}\\n${formula}\\end{equation}`;
      setFormulaNumber(prev => prev + 1);
    }

    onInsert(finalFormula);
    onClose();
  };

  // 复制公式到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(formula).then(() => {
      // 可以添加复制成功的提示
    });
  };

  // 清除公式
  const handleClear = () => {
    setFormula('');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleInsert();
    }
  };

  // 点击外部关闭模态框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 过滤符号
  const filteredSymbols = symbols.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter(category => category.items.length > 0);

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div ref={modalRef} className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">LaTeX Formula Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ctrl+Enter to insert</span>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'editor' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('symbols')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'symbols' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Symbols
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'templates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Templates
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex-1 py-2 px-4 text-sm font-medium ${showHistory ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Recent
          </button>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`flex-1 py-2 px-4 text-sm font-medium ${showFavorites ? 'border-b-2 border-amber-600 text-amber-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Favorites
          </button>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 编辑器 */}
          {(activeTab === 'editor' || !showHistory) && (
            <div className="flex flex-col md:flex-row h-[calc(100%-2rem)]">
              {/* 左侧输入区 */}
              <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-200">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label htmlFor="latex-formula-input" className="text-sm font-medium text-gray-700">
                      {isVisualMode ? 'Visual Editor' : 'Formula Code'}
                    </label>
                    <button
                      onClick={() => setIsVisualMode(!isVisualMode)}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      {isVisualMode ? 'Switch to Code' : 'Switch to Visual'}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleClear}
                      className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
                      aria-label="Clear"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
                      aria-label="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(formula)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
                      aria-label={favoriteFormulas.includes(formula) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favoriteFormulas.includes(formula) ? (
                        <Star className="w-4 h-4 text-amber-500" />
                      ) : (
                        <StarOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {isVisualMode ? (
                  <div
                    ref={mathFieldRef}
                    className="w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ minHeight: '100px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  ></div>
                ) : (
                  <textarea
                    id="latex-formula-input"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter LaTeX formula here, e.g. \frac{a}{b} + \sqrt{c}"
                    spellCheck={false}
                  />
                )}

                {error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs rounded-md">
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                  </div>
                )}

                {/* 公式编号选项 */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-numbering"
                    checked={useNumbering}
                    onChange={(e) => setUseNumbering(e.target.checked)}
                  />
                  <label htmlFor="use-numbering" className="text-sm text-gray-600">
                    Add formula numbering
                  </label>
                  {useNumbering && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">Number:</span>
                      <input
                        type="number"
                        value={formulaNumber}
                        onChange={(e) => setFormulaNumber(parseInt(e.target.value) || 1)}
                        className="w-16 p-1 border border-gray-300 rounded-md text-sm"
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧预览区 */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center">
                <div className="mb-2 self-start text-sm font-medium text-gray-700">Preview</div>
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg w-full min-h-[120px] flex items-center justify-center">
                  {formula ? (
                    <div dangerouslySetInnerHTML={{ __html: renderedFormula }} />
                  ) : (
                    <div className="text-gray-400 italic">Formula preview will appear here</div>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500 max-w-md text-center">
                  <p>Formula will be inserted as inline ($...$) or display ($$...$$) based on context</p>
                </div>
              </div>
            </div>
          )}

          {/* 符号面板 */}
          {activeTab === 'symbols' && (
            <div className="p-4">
              {/* 搜索框 */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search symbols..."
                />
              </div>

              {/* 符号分类 */}
              {filteredSymbols.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {filteredSymbols.map((category, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{category.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {category.items.map((symbol, symIdx) => (
                          <button
                            key={symIdx}
                            onClick={() => insertSymbol(symbol)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-mono hover:bg-gray-50 transition-colors text-gray-700"
                            title={symbol}
                          >
                            {symbol.length > 15 ? `${symbol.substring(0, 15)}...` : symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No symbols found matching your search
                </div>
              )}
            </div>
          )}

          {/* 模板面板 */}
          {activeTab === 'templates' && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Formula Templates</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {templates.map((category, catIdx) => (
                  <div key={catIdx}>
                    <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase">{category.name}</h5>
                    <div className="space-y-2">
                      {category.items.map((template, tempIdx) => (
                        <div key={tempIdx} className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                          <div className="text-sm font-medium text-gray-800 mb-1">{template.name}</div>
                          <div className="text-xs font-mono text-gray-600 mb-2">{template.formula}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setFormula(template.formula)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Use Template
                            </button>
                            <button
                              onClick={() => insertSymbol(template.formula)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Insert
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {showHistory && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Formulas</h4>
              {recentFormulas.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentFormulas.map((savedFormula, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => toggleFavorite(savedFormula)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
                        title={favoriteFormulas.includes(savedFormula) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {favoriteFormulas.includes(savedFormula) ? (
                          <Star className="w-4 h-4 text-amber-500" />
                        ) : (
                          <StarOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div className="text-xs font-mono text-gray-800 max-w-xs truncate">{savedFormula}</div>
                      <button
                        onClick={() => setFormula(savedFormula)}
                        className="ml-auto px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No recent formulas yet
                </div>
              )}
            </div>
          )}

          {/* 收藏夹 */}
          {showFavorites && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Favorite Formulas</h4>
              {favoriteFormulas.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {favoriteFormulas.map((savedFormula, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => toggleFavorite(savedFormula)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
                        title="Remove from favorites"
                      >
                        <Star className="w-4 h-4 text-amber-500" />
                      </button>
                      <div className="text-xs font-mono text-gray-800 max-w-xs truncate">{savedFormula}</div>
                      <button
                        onClick={() => setFormula(savedFormula)}
                        className="ml-auto px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No favorite formulas yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-600"
              title="Keyboard shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-600"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!formula.trim()}
              className={`flex items-center gap-1 px-4 py-2 text-white rounded-md transition-colors ${formula.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <Save className="w-4 h-4" />
              Insert Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}