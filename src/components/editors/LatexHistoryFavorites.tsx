
import { Star, StarOff, X } from 'lucide-react';

interface LatexHistoryFavoritesProps {
  recentFormulas: string[];
  favoriteFormulas: string[];
  onFormulaClick: (_formula: string) => void;
  onRemoveRecent: (_index: number) => void;
  onToggleFavorite: (_formula: string) => void;
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
// 条件渲染历史和收藏列表组件
const FormulaList: React.FC<{
  formulas: string[];
  title: string;
  isFavorite?: boolean;
  onFormulaClick: (_formula: string) => void;
  onToggleFavorite?: (_formula: string) => void;
  onRemoveRecent?: (_index: number) => void;
}> = ({
  formulas,
  title,
  isFavorite = false,
  onFormulaClick,
  onToggleFavorite,
  onRemoveRecent
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
        {formulas.map((formula, index) => (
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
            <div className="flex items-center gap-2">
              {onToggleFavorite && (
                <button
                  className={`${isFavorite ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400 hover:text-yellow-500'} transition-colors`}
                  onClick={() => onToggleFavorite(formula)}
                  title={isFavorite ? '取消收藏' : '添加到收藏'}
                >
                  {isFavorite ? (
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </button>
              )}
              {onRemoveRecent && (
                <button
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => onRemoveRecent(index)}
                  title="移除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function LatexHistoryFavorites ({
  recentFormulas,
  favoriteFormulas,
  onFormulaClick,
  onRemoveRecent,
  onToggleFavorite
}: LatexHistoryFavoritesProps) {
  return (
    <div className="history-favorites p-4 space-y-6">
      {/* 最近使用的公式 */}
      <FormulaList
        formulas={recentFormulas}
        title="最近使用"
        onFormulaClick={onFormulaClick}
        onToggleFavorite={onToggleFavorite}
        onRemoveRecent={onRemoveRecent}
      />

      {/* 收藏的公式 */}
      <FormulaList
        formulas={favoriteFormulas}
        title="我的收藏"
        isFavorite={true}
        onFormulaClick={onFormulaClick}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
