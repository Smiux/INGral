
import styles from './SearchBox.module.css';

// 搜索历史项接口
export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  filters?: {
    searchType?: 'articles' | 'comments' | 'all';
    sortBy?: 'type' | 'date' | 'relevance' | 'views';
    author?: string;
    tags?: string[];
    dateRange?: { start?: string; end?: string };
  };
}

interface SearchHistoryProps {
  historyItems: SearchHistoryItem[];
  selectedIndex: number;
  onHistoryItemClick: (item: SearchHistoryItem) => void;
  onHistoryItemHover: (index: number) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
  searchQuery: string;
}

export function SearchHistory({
  historyItems,
  selectedIndex,
  onHistoryItemClick,
  onHistoryItemHover,
  onClearHistory,
  onRemoveHistoryItem,
  searchQuery
}: SearchHistoryProps) {
  if (historyItems.length === 0 || searchQuery.trim() !== '') {
    return null;
  }

  return (
    <div className={styles.historySection}>
      <div className={styles.historyHeader}>
        <span className={styles.historyTitle}>搜索历史</span>
        <button
          type="button"
          className={styles.clearHistoryButton}
          onClick={onClearHistory}
          aria-label="清空搜索历史"
        >
          清空
        </button>
      </div>
      {historyItems.map((item, index) => (
        <div
          key={item.id}
          className={`${styles.suggestionItem} ${styles.historyItem} ${index === selectedIndex ? styles.suggestionItemSelected : ''}`}
          onClick={() => onHistoryItemClick(item)}
          onMouseDown={(e) => e.preventDefault()} // 防止点击建议时输入框失去焦点
          onMouseEnter={() => onHistoryItemHover(index)}
          role="option"
          id={`suggestion-${index}`}
          aria-selected={index === selectedIndex}
          tabIndex={-1}
        >
          <svg
            className={styles.historyIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className={styles.suggestionTitle}>
            {item.query}
          </span>
          <button
            type="button"
            className={styles.historyRemoveButton}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveHistoryItem(item.id);
            }}
            aria-label={`删除历史记录: ${item.query}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
