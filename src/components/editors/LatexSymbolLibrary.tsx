interface LatexSymbol {
  name: string;
  items: string[];
}

interface LatexSymbolLibraryProps {
  symbols: LatexSymbol[];
  onSymbolClick: (_symbol: string) => void;
  searchQuery: string;
}

/**
 * LaTeX符号库组件
 * 提供常用数学符号的选择界面
 * @param symbols - 符号分类列表
 * @param onSymbolClick - 点击符号的回调
 * @param searchQuery - 搜索查询字符串，用于过滤符号
 */
export function LatexSymbolLibrary ({ symbols, onSymbolClick, searchQuery }: LatexSymbolLibraryProps) {
  // 过滤符号分类和符号
  const filteredSymbols = symbols.map(category => {
    // 过滤当前分类下匹配搜索条件的符号
    const filteredItems = category.items.filter(symbol =>
      symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...category,
      'items': filteredItems
    };
  });

  // 只保留包含匹配符号的分类
  const filteredCategories = filteredSymbols.filter(category => category.items.length > 0);

  return (
    <div className="symbol-library p-4 max-h-[400px] overflow-y-auto">
      {filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          没有找到匹配的符号
        </div>
      ) : (
        filteredCategories.map((category) => (
          <div key={category.name} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {category.name}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {category.items.map((symbol) => (
                <button
                  key={symbol}
                  className="symbol-button px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200 font-mono"
                  onClick={() => onSymbolClick(symbol)}
                  title={symbol}
                >
                  <span className="symbol-preview">{symbol}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
