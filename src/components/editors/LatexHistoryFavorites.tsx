
import { Star, StarOff, X } from 'lucide-react';

interface LatexHistoryFavoritesProps {
  recentFormulas: string[];
  favoriteFormulas: string[];
  onFormulaClick: (formula: string) => void;
  onRemoveRecent: (index: number) => void;
  onToggleFavorite: (formula: string) => void;
}

/**
 * LaTeX历史和收藏组件
 * 显示最近使用的公式和收藏的公式
 * @param recentFormulas - 最近使用的公式列表
 * @param favoriteFormulas - 收藏的公式列表
 * @param onFormulaClick - 点击公式的回调
 * @param onRemoveRecent - 移除最近公式的回调
 * @param onToggleFavorite - 切换收藏状态的回调
 */
export function LatexHistoryFavorites({ 
  recentFormulas, 
  favoriteFormulas, 
  onFormulaClick, 
  onRemoveRecent, 
  onToggleFavorite 
}: LatexHistoryFavoritesProps) {
  return (
    <div className="history-favorites p-4 space-y-6">
      {/* 最近使用的公式 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
          最近使用
        </h3>
        {recentFormulas.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">暂无最近使用的公式</p>
        ) : (
          <div className="space-y-2">
            {recentFormulas.map((formula, index) => (
              <div key={index} className="recent-formula flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded">
                <button
                  className="flex-1 text-left text-xs font-mono text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                  onClick={() => onFormulaClick(formula)}
                  title={formula}
                >
                  {formula}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    className="text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors"
                    onClick={() => onToggleFavorite(formula)}
                    title={favoriteFormulas.includes(formula) ? '取消收藏' : '添加到收藏'}
                  >
                    {favoriteFormulas.includes(formula) ? (
                      <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => onRemoveRecent(index)}
                    title="移除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 收藏的公式 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
          我的收藏
        </h3>
        {favoriteFormulas.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">暂无收藏的公式</p>
        ) : (
          <div className="space-y-2">
            {favoriteFormulas.map((formula, index) => (
              <div key={index} className="favorite-formula flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded bg-yellow-50 dark:bg-yellow-900/20">
                <button
                  className="flex-1 text-left text-xs font-mono text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                  onClick={() => onFormulaClick(formula)}
                  title={formula}
                >
                  {formula}
                </button>
                <button
                  className="text-yellow-500 hover:text-red-500 transition-colors"
                  onClick={() => onToggleFavorite(formula)}
                  title="取消收藏"
                >
                  <Star className="w-4 h-4" fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}