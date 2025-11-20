import { useState, useEffect, useRef } from 'react';
import { X, Save, Copy, RotateCw, Search, HelpCircle } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type LatexEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formula: string) => void;
  initialFormula?: string;
};

export function LatexEditor({ isOpen, onClose, onInsert, initialFormula = '' }: LatexEditorProps) {
  const [formula, setFormula] = useState(initialFormula);
  const [renderedFormula, setRenderedFormula] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'symbols'>('editor');
  const [recentFormulas, setRecentFormulas] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 常用符号和模板
  const symbols = [
    { name: 'Greek Letters', items: ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega'] },
    { name: 'Operators', items: ['+', '-', '\\times', '\\div', '=', '\\neq', '\\approx', '\\leq', '\\geq', '\\pm', '\\mp'] },
    { name: 'Functions', items: ['\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp', '\\sqrt', '\\frac{}{}', '\\sum_{}^{}', '\\prod_{}^{}', '\\int_{}^{}', '\\lim_{}'] },
    { name: 'Logic', items: ['\\forall', '\\exists', '\\neg', '\\wedge', '\\vee', '\\implies', '\\iff'] },
    { name: 'Formatting', items: ['\\mathbf{}', '\\textbf{}', '\\emph{}', '\\overline{}', '\\underline{}'] },
    { name: 'Matrices', items: ['\\begin{bmatrix} \\end{bmatrix}', '\\begin{pmatrix} \\end{pmatrix}', '\\begin{vmatrix} \\end{vmatrix}'] },
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
        throwOnError: false 
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
        strict: 'ignore' 
      });
      setRenderedFormula(html);
    }
  }, [formula]);
  
  // 从本地存储加载最近使用的公式
  useEffect(() => {
    const savedFormulas = localStorage.getItem('recentLatexFormulas');
    if (savedFormulas) {
      try {
        setRecentFormulas(JSON.parse(savedFormulas));
      } catch (e) {
        console.error('Failed to load recent formulas:', e);
      }
    }
  }, []);
  
  // 保存到最近使用的公式
  const saveToHistory = (newFormula: string) => {
    if (!newFormula.trim()) return;
    
    const updatedHistory = [
      newFormula,
      ...recentFormulas.filter(f => f !== newFormula)
    ].slice(0, 10); // 只保留最近10个
    
    setRecentFormulas(updatedHistory);
    localStorage.setItem('recentLatexFormulas', JSON.stringify(updatedHistory));
  };
  
  // 插入符号到当前光标位置
  const insertSymbol = (symbol: string) => {
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
  };
  
  // 插入公式到文章中
  const handleInsert = () => {
    if (!formula.trim()) return;
    saveToHistory(formula);
    onInsert(formula);
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
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);
  
  if (!isOpen) return null;
  
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
            onClick={() => setShowHistory(!showHistory)}
            className={`flex-1 py-2 px-4 text-sm font-medium ${showHistory ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Recent
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
                  <label htmlFor="latex-formula-input" className="text-sm font-medium text-gray-700">Formula Code</label>
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
                  </div>
                </div>
                <textarea
                  id="latex-formula-input"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter LaTeX formula here, e.g. \\frac{a}{b} + \\sqrt{c}"
                  spellCheck={false}
                />
                {error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs rounded-md">
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                  </div>
                )}
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
          
          {/* 历史记录 */}
          {showHistory && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Formulas</h4>
              {recentFormulas.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentFormulas.map((savedFormula, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="text-xs font-mono text-gray-800 max-w-xs truncate">{savedFormula}</div>
                      <button
                        onClick={() => insertSymbol(savedFormula)}
                        className="ml-auto px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Insert
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
