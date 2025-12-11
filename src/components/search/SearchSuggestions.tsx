
import styles from './SearchBox.module.css';

interface SearchSuggestion {
  title: string;
  id: string;
  excerpt?: string;
  tags?: string[];
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  loading: boolean;
  selectedIndex: number;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  onSuggestionHover: (index: number) => void;
  searchQuery: string;
}

export function SearchSuggestions({
  suggestions,
  loading,
  selectedIndex,
  onSuggestionClick,
  onSuggestionHover,
  searchQuery
}: SearchSuggestionsProps) {
  if (searchQuery.trim() === '') {
    return null;
  }

  return (
    <div className={styles.suggestionsSection}>
      {loading ? (
        <div className={styles.loadingContainer} role="status" aria-live="polite">
          <div className={styles.loadingIndicator} aria-hidden="true"></div>
          <span>搜索中...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className={styles.suggestionsList}>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`${styles.suggestionItem} ${index === selectedIndex ? styles.suggestionItemSelected : ''}`}
              onClick={() => onSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()} // 防止点击建议时输入框失去焦点
              onMouseEnter={() => onSuggestionHover(index)}
              role="option"
              id={`suggestion-${index}`}
              aria-selected={index === selectedIndex}
              tabIndex={-1}
            >
              <span className={styles.suggestionTitle}>
                {suggestion.title}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noSuggestions} role="status">
          没有找到相关建议
        </div>
      )}
    </div>
  );
}
