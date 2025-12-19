/**
 * 搜索框组件，提供文章搜索功能，包括搜索建议、历史记录和高级搜索选项
 */
import React, { useState, useRef, useEffect } from 'react';
import { searchService, SearchFilters } from '../../services/searchService';
import { createDefaultFilter } from '../../types/filter';

import styles from './SearchBox.module.css';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchHistory, SearchHistoryItem } from './SearchHistory';
import { SearchSyntaxTips, SyntaxTip } from './SearchSyntaxTips';
import { AdvancedSearchOptions } from './AdvancedSearchOptions';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

/**
 * 搜索框组件属性接口
 */
export interface SearchBoxProps {
  placeholder?: string;
  onSearch: (_query: string, _filters?: SearchFilters) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  defaultValue?: string;
  showAdvancedOptions?: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = '搜索文章...',
  onSearch,
  onFocus,
  onBlur,
  defaultValue = '',
  showAdvancedOptions = false
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<{ title: string; id: string; excerpt?: string; tags?: string[] }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);

  // 使用自定义Hook管理筛选条件
  const {
    filters,
    onFilterChange,
    onTagChange,
    onDateRangeChange,
    onResetFilters
  } = useSearchFilters();

  // 从本地存储加载搜索历史
  useEffect(() => {
    const loadSearchHistory = () => {
      try {
        const savedHistory = localStorage.getItem('searchHistory');
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory) as SearchHistoryItem[];
          // 按时间倒序排序，只保留最近20条
          const sortedHistory = parsedHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);
          setSearchHistory(sortedHistory);
        }
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // 保存搜索历史到本地存储
  const saveSearchHistory = (item: SearchHistoryItem) => {
    try {
      // 移除重复项
      // 只保留最近20条
      const updatedHistory = [
        item,
        ...searchHistory.filter(h => h.query !== item.query)
      ]
        .slice(0, 20);

      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // 高级搜索语法提示数据
  const syntaxTips: SyntaxTip[] = [
    {
      'id': '1',
      'syntax': 'AND',
      'description': '查找包含所有关键词的结果',
      'example': 'AI AND 机器学习',
      'category': 'boolean'
    },
    {
      'id': '2',
      'syntax': 'OR',
      'description': '查找包含任一关键词的结果',
      'example': 'AI OR 机器学习',
      'category': 'boolean'
    },
    {
      'id': '3',
      'syntax': 'NOT',
      'description': '排除包含特定关键词的结果',
      'example': 'AI NOT 深度学习',
      'category': 'boolean'
    },
    {
      'id': '4',
      'syntax': '" "',
      'description': '精确搜索短语',
      'example': '"人工智能"',
      'category': 'quote'
    },
    {
      'id': '5',
      'syntax': 'field:value',
      'description': '按特定字段搜索',
      'example': 'title:AI',
      'category': 'field'
    },
    {
      'id': '6',
      'syntax': '[min TO max]',
      'description': '范围搜索',
      'example': 'connections:[5 TO 10]',
      'category': 'range'
    }
  ];

  // 处理语法提示点击
  const handleSyntaxTipClick = (tip: SyntaxTip) => {
    let newQuery = '';

    if (tip.category === 'quote') {
      // 引号搜索：如果有选中文本，包裹在引号中；否则插入引号模板
      const input = inputRef.current;
      if (input && typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number') {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selectedText = query.substring(start, end);
        newQuery = query.substring(0, start) + `"${selectedText || '搜索短语'}"` + query.substring(end);
      } else {
        newQuery = `${query} "搜索短语"`;
      }
    } else {
      // 其他语法提示：直接添加到当前查询末尾
      newQuery = `${query} ${tip.example}`;
    }

    setQuery(newQuery.trim());
    inputRef.current?.focus();
  };

  // 获取搜索建议
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchService.getSearchSuggestions(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // 防抖处理函数
  function debounce<T extends (..._params: string[]) => Promise<void>>(func: T, delay: number): (..._args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return function (..._args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(..._args), delay);
    };
  }

  // 防抖后的获取搜索建议函数
  const debouncedFetchSuggestions = useRef(
    debounce(fetchSuggestions, 300)
  ).current;

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 如果输入内容超过2个字符，获取搜索建议（使用防抖）
    if (value.trim().length >= 2) {
      debouncedFetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 处理搜索提交
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), {
        ...filters,
        'searchType': filters.searchType as 'articles' | 'comments' | 'all',
        'sortBy': filters.sortBy as 'type' | 'date' | 'relevance' | 'views'
      });
      setShowSuggestions(false);

      // 保存搜索历史，确保只包含定义的属性
      const historyItem: SearchHistoryItem = {
        'id': `history-${Date.now()}-${Math.random().toString(36)
          .substr(2, 9)}`,
        'query': query.trim(),
        'timestamp': Date.now(),
        'filters': {
          'searchType': (filters.searchType || 'articles') as 'articles' | 'comments' | 'all',
          'sortBy': (filters.sortBy || 'relevance') as 'type' | 'date' | 'relevance' | 'views',
          'author': filters.author || '',
          'tags': filters.tags || [],
          'dateRange': filters.dateRange || {}
        }
      };
      saveSearchHistory(historyItem);
    }
  };

  // 处理高级搜索选项切换
  const toggleAdvanced = () => {
    setIsAdvancedOpen(!isAdvancedOpen);
  };

  // 处理建议项点击
  const handleSuggestionClick = (suggestion: { title: string; id: string }) => {
    setQuery(suggestion.title);
    onSearch(suggestion.title);
    setShowSuggestions(false);
  };

  // 处理历史项点击
  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    setQuery(item.query);
    onSearch(item.query, item.filters);
    setShowSuggestions(false);
  };

  // 处理焦点事件
  const handleFocus = () => {
    setHasFocus(true);
    onFocus?.();
    // 如果有输入内容，显示建议
    if (query.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setHasFocus(false);
    onBlur?.();
    // 延迟隐藏建议，以便点击建议项能够被捕获
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // 关闭建议
  const onCloseSuggestions = () => {
    setShowSuggestions(false);
  };

  // 使用自定义Hook处理键盘导航
  const {
    selectedSuggestionIndex,
    onSuggestionHover,
    onHistoryItemHover,
    handleKeyDown
  } = useKeyboardNavigation({
    suggestions,
    'historyItems': searchHistory,
    'searchQuery': query,
    'onSuggestionClick': handleSuggestionClick,
    'onHistoryItemClick': handleHistoryItemClick,
    'onSubmit': handleSubmit,
    onCloseSuggestions,
    'onInputBlur': handleBlur
  });

  // 点击外部关闭建议框和高级搜索面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 关闭建议框
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      // 关闭高级搜索面板
      if (
        advancedRef.current &&
        !advancedRef.current.contains(event.target as Node)
      ) {
        setIsAdvancedOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.searchBoxContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={`${styles.inputWrapper} ${hasFocus ? styles.inputWrapperFocused : ''}`}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`${styles.searchInput} touch-manipulation`}
            autoComplete="off"
            inputMode="search"
            role="searchbox"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className={styles.clearButton}
              aria-label="清除搜索内容"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        <div className={styles.buttonGroup}>
          {showAdvancedOptions && (
            <button
              type="button"
              className={`${styles.advancedButton} ${isAdvancedOpen ? styles.advancedButtonActive : ''}`}
              onClick={toggleAdvanced}
              aria-label="高级搜索"
            >
              高级
            </button>
          )}
          <button
            type="submit"
            className={styles.searchButton}
            aria-label="搜索"
          >
            搜索
          </button>
        </div>
      </form>

      {/* 高级搜索语法提示 */}
      <SearchSyntaxTips
        syntaxTips={syntaxTips}
        onSyntaxTipClick={handleSyntaxTipClick}
      />

      {showAdvancedOptions && isAdvancedOpen && (
        <AdvancedSearchOptions
          filters={filters}
          onFilterChange={onFilterChange}
          onTagChange={onTagChange}
          onDateRangeChange={onDateRangeChange}
          onResetFilters={onResetFilters}
          useCompositeFilter={filters.useCompositeFilter || false}
          compositeFilter={filters.compositeFilter || createDefaultFilter()}
          onUseCompositeFilterChange={(use) => onFilterChange('useCompositeFilter', use)}
          onCompositeFilterChange={(filter) => onFilterChange('compositeFilter', filter)}
        />
      )}

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className={styles.suggestionsContainer}
          role="listbox"
          aria-labelledby="search-suggestions"
          aria-live="polite"
          aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
        >
          {/* 建议列表标题，供屏幕阅读器使用 */}
          <h3 id="search-suggestions" className="sr-only">搜索建议和历史</h3>

          {/* 搜索历史部分 */}
          <SearchHistory
            historyItems={searchHistory}
            selectedIndex={selectedSuggestionIndex}
            onHistoryItemClick={handleHistoryItemClick}
            onHistoryItemHover={onHistoryItemHover}
            onClearHistory={() => {
              setSearchHistory([]);
              localStorage.removeItem('searchHistory');
            }}
            onRemoveHistoryItem={(id) => {
              const updatedHistory = searchHistory.filter(h => h.id !== id);
              setSearchHistory(updatedHistory);
              localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
            }}
            searchQuery={query}
          />

          {/* 搜索建议部分 */}
          <SearchSuggestions
            suggestions={suggestions}
            loading={loading}
            selectedIndex={selectedSuggestionIndex - searchHistory.length}
            onSuggestionClick={handleSuggestionClick}
            onSuggestionHover={onSuggestionHover}
            searchQuery={query}
          />
        </div>
      )}
    </div>
  );
};

export default SearchBox;
