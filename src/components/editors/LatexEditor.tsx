/**
 * LaTeX公式编辑器组件，提供可视化和代码两种编辑模式
 */
import { useState, useEffect, useRef } from 'react';
import { X, Save, Copy, Search } from 'lucide-react';
import 'katex/dist/katex.min.css';

// 导入拆分后的组件
import { LatexSymbolLibrary } from './LatexSymbolLibrary';
import { LatexTemplateLibrary } from './LatexTemplateLibrary';
import { LatexHistoryFavorites } from './LatexHistoryFavorites';
import { LatexPreview } from './LatexPreview';
import { LatexVisualEditor } from './LatexVisualEditor';

// 导入自定义Hook
import { useLatexStorage } from '../../hooks/useLatexStorage';

// 类型声明
interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formula: string) => void;
  initialFormula?: string;
}

// 常用符号和模板数据
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
      { name: "Newton's Second Law", formula: 'F = ma' },
      { name: "Einstein's Mass-Energy Equivalence", formula: 'E = mc^2' },
      { name: "Maxwell's Equations", formula: '\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}' },
      { name: "Schrödinger Equation", formula: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r},t) = \\hat{H} \\Psi(\\mathbf{r},t)' },
      { name: "Heisenberg Uncertainty Principle", formula: '\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}' },
      { name: "Planck's Law", formula: 'E = hf' },
      { name: "Boltzmann Distribution", formula: 'P(E) = \\frac{1}{Z} e^{-\\beta E}' },
      { name: "Lorentz Force", formula: '\\mathbf{F} = q(\\mathbf{E} + \\mathbf{v} \\times \\mathbf{B})' },
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
];

/**
 * LaTeX公式编辑器主组件
 * @param isOpen - 是否打开编辑器
 * @param onClose - 关闭编辑器的回调
 * @param onInsert - 插入公式的回调
 * @param initialFormula - 初始公式
 */
export function LatexEditor({ isOpen, onClose, onInsert, initialFormula = '' }: LatexEditorProps) {
  const [formula, setFormula] = useState(initialFormula);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [formulaNumber, setFormulaNumber] = useState(1);
  const [useNumbering, setUseNumbering] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'symbols' | 'templates'>('editor');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<HTMLDivElement>(null);
  
  // 使用自定义Hook管理公式存储
  const {
    recentFormulas,
    favoriteFormulas,
    addToRecent,
    removeFromRecent,
    toggleFavorite
  } = useLatexStorage();

  /**
   * 关闭编辑器
   */
  const handleClose = () => {
    onClose();
    setFormula('');
    setIsVisualMode(false);
    setActiveTab('editor');
  };

  /**
   * 插入公式到编辑器
   */
  const handleInsertSymbol = (symbol: string) => {
    setFormula(prev => prev + symbol);
  };

  /**
   * 插入模板到编辑器
   */
  const handleInsertTemplate = (templateFormula: string) => {
    setFormula(prev => prev + templateFormula);
  };

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

  // 渲染编辑器内容
  const renderEditorContent = () => {
    if (isVisualMode) {
      return (
        <LatexVisualEditor
          formula={formula}
          onFormulaChange={setFormula}
          mathFieldRef={mathFieldRef}
        />
      );
    }

    // 双栏布局：左侧编辑，右侧实时预览，更接近LatexLive的设计
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左侧：代码编辑器 */}
        <div className="editor-panel">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">代码编辑</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsVisualMode(true)}
                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                可视化编辑
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                清除
              </button>
            </div>
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
              onClick={() => setFormula(prev => prev + '\\bold{}')}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              粗体
            </button>
          </div>
        </div>
        
        {/* 右侧：实时预览 */}
        <div className="preview-panel">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">实时预览</h3>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center"
            >
              <Copy className="w-3 h-3 mr-1" />
              复制公式
            </button>
          </div>
          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 min-h-[120px] flex items-center justify-center">
            <LatexPreview formula={formula} />
          </div>
          
          {/* 预览控制 */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <label htmlFor="fontSize" className="mr-1">字体大小:</label>
              <select
                id="fontSize"
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
              >
                <option value="12">12px</option>
                <option value="14" selected>14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
              </select>
            </div>
            <div>
              公式长度: {formula.length} 字符
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'symbols':
        return (
          <LatexSymbolLibrary
            symbols={symbols}
            onSymbolClick={handleInsertSymbol}
          />
        );
      case 'templates':
        return (
          <LatexTemplateLibrary
            templates={templates}
            onTemplateClick={handleInsertTemplate}
          />
        );
      default:
        return renderEditorContent();
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

  if (!isOpen) return null;

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
          {/* 编辑器和符号/模板切换 */}
          <div className="mb-4">
            <div className="flex border-b border-gray-300 dark:border-gray-600 mb-4">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'editor' 
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('editor')}
              >
                编辑器
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'symbols' 
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('symbols')}
              >
                符号库
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'templates' 
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('templates')}
              >
                模板库
              </button>
            </div>

            {/* 搜索框 */}
            {activeTab !== 'editor' && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索符号或模板..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 标签页内容 */}
            <div className="mt-4">
              {renderTabContent()}
            </div>
          </div>

          {/* 历史和收藏 */}
          <LatexHistoryFavorites
            recentFormulas={recentFormulas}
            favoriteFormulas={favoriteFormulas}
            onFormulaClick={handleSelectFormula}
            onRemoveRecent={removeFromRecent}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {/* 编辑器底部 */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useNumbering"
                checked={useNumbering}
                onChange={(e) => setUseNumbering(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useNumbering" className="text-sm text-gray-600 dark:text-gray-300">使用公式编号</label>
            </div>
            {useNumbering && (
              <div className="flex items-center">
                <label htmlFor="formulaNumber" className="text-sm text-gray-600 dark:text-gray-300 mr-2">编号:</label>
                <input
                  type="number"
                  id="formulaNumber"
                  min="1"
                  value={formulaNumber}
                  onChange={(e) => setFormulaNumber(parseInt(e.target.value) || 1)}
                  className="w-16 p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                />
              </div>
            )}
            <button
              onClick={() => setIsVisualMode(!isVisualMode)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              切换到{isVisualMode ? '代码' : '可视化'}模式
            </button>
          </div>
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
