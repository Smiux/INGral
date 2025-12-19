

interface LatexSymbol {
  name: string;
  items: string[];
}

interface LatexSymbolLibraryProps {
  symbols: LatexSymbol[];
  onSymbolClick: (_symbol: string) => void;
}

/**
 * LaTeX符号库组件
 * 提供常用数学符号的选择界面
 * @param symbols - 符号分类列表
 * @param onSymbolClick - 点击符号的回调
 */
export function LatexSymbolLibrary ({ symbols, onSymbolClick }: LatexSymbolLibraryProps) {
  return (
    <div className="symbol-library p-4 max-h-[400px] overflow-y-auto">
      {symbols.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
            {category.name}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {category.items.map((symbol, symbolIndex) => (
              <button
                key={symbolIndex}
                className="symbol-button px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200 font-mono"
                onClick={() => onSymbolClick(symbol)}
                title={symbol}
              >
                <span className="symbol-preview">{symbol}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
