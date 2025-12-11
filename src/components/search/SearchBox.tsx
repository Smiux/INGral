/**
 * 搜索框组件，提供文章搜索功能，包括搜索建议、历史记录和高级搜索选项
 */
import React, { useState, useRef, useEffect } from 'react';
import { searchService, SearchFilters } from '../../services/searchService';
import { CompositeFilter, createDefaultFilter } from '../../types/filter';
import FilterBuilder from './FilterBuilder';
import styles from './SearchBox.module.css';

/**
 * 搜索框组件属性接口
 */
interface SearchBoxProps {
  placeholder?: string;
  onSearch: (query: string, filters?: SearchFilters) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  defaultValue?: string;
  showAdvancedOptions?: boolean;
}

// 高级搜索语法提示项接口
interface SyntaxTip {
  id: string;
  syntax: string;
  description: string;
  example: string;
  category: 'boolean' | 'quote' | 'range' | 'field';
}

// 搜索历史项接口
interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  filters?: SearchFilters;
}

// 扩展SearchFilters接口，添加UI相关字段
interface ExtendedSearchFilters extends SearchFilters {
  compositeFilter?: CompositeFilter; // 组合筛选条件
  useCompositeFilter?: boolean; // 是否使用组合筛选
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = '搜索文章...',
  onSearch,
  onFocus,
  onBlur,
  defaultValue = '',
  showAdvancedOptions = false,
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<{ title: string; id: string; excerpt?: string; tags?: string[] }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<ExtendedSearchFilters>({
    searchType: 'articles',
    sortBy: 'relevance',
    author: '',
    tags: [],
    dateRange: {},
    useCompositeFilter: false,
    compositeFilter: createDefaultFilter()
  });
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  // 无障碍支持：当前选中的建议项索引
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);
  
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
      const updatedHistory = [
        item,
        ...searchHistory.filter(h => h.query !== item.query)
      ]
        .slice(0, 20); // 只保留最近20条
      
      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };
  
  // 高级搜索语法提示数据
  const syntaxTips: SyntaxTip[] = [
    {
      id: '1',
      syntax: 'AND',
      description: '查找包含所有关键词的结果',
      example: 'AI AND 机器学习',
      category: 'boolean'
    },
    {
      id: '2',
      syntax: 'OR',
      description: '查找包含任一关键词的结果',
      example: 'AI OR 机器学习',
      category: 'boolean'
    },
    {
      id: '3',
      syntax: 'NOT',
      description: '排除包含特定关键词的结果',
      example: 'AI NOT 深度学习',
      category: 'boolean'
    },
    {
      id: '4',
      syntax: '" "',
      description: '精确搜索短语',
      example: '"人工智能"',
      category: 'quote'
    },
    {
      id: '5',
      syntax: 'field:value',
      description: '按特定字段搜索',
      example: 'title:AI',
      category: 'field'
    },
    {
      id: '6',
      syntax: '[min TO max]',
      description: '范围搜索',
      example: 'connections:[5 TO 10]',
      category: 'range'
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
  const debounce = <T extends (...args: Parameters<T>) => Promise<void> | void>(func: T, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), filters);
      setShowSuggestions(false);
      
      // 保存搜索历史，确保只包含定义的属性
      const historyItem: SearchHistoryItem = {
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query: query.trim(),
        timestamp: Date.now(),
        filters: {
          searchType: filters.searchType || 'articles',
          sortBy: filters.sortBy || 'relevance',
          author: filters.author || '',
          tags: filters.tags || [],
          dateRange: filters.dateRange || {}
        }
      };
      saveSearchHistory(historyItem);
    }
  };

  // 处理高级搜索选项切换
  const toggleAdvanced = () => {
    setIsAdvancedOpen(!isAdvancedOpen);
  };

  // 处理筛选条件变化
  const handleFilterChange = <K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      // Handle optional properties with exactOptionalPropertyTypes
      if (key === 'dateRange') {
        const dateRangeValue = value as SearchFilters['dateRange'];
        // Create a new object without undefined values
        const cleanedDateRange: { start?: string; end?: string } = {};
        if (dateRangeValue?.start) {
          cleanedDateRange.start = dateRangeValue.start;
        }
        if (dateRangeValue?.end) {
          cleanedDateRange.end = dateRangeValue.end;
        }
        newFilters[key] = cleanedDateRange as SearchFilters[K];
      } else {
        newFilters[key] = value;
      }
      
      return newFilters;
    });
  };

  // 处理标签输入变化
  const handleTagsChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      if (!filters.tags?.includes(value.trim())) {
        setFilters(prev => ({
          ...prev,
          tags: [...(prev.tags || []), value.trim()]
        }));
      }
      target.value = '';
    }
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  // 处理建议项点击
  const handleSuggestionClick = (suggestion: { title: string; id: string }) => {
    setQuery(suggestion.title);
    onSearch(suggestion.title);
    setShowSuggestions(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 如果有选中的建议，使用该建议
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        const selectedSuggestion = suggestions[selectedSuggestionIndex];
        if (selectedSuggestion) {
          handleSuggestionClick(selectedSuggestion);
        }
      } else {
        handleSubmit(e as unknown as React.FormEvent);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // 向下导航建议列表
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (query.trim().length >= 2 && suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // 向上导航建议列表
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : -1
        );
      }
    }
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
      <div className={styles.syntaxTipsContainer}>
        <div className={styles.syntaxTipsTitle}>高级搜索语法：</div>
        <div className={styles.syntaxTipsList}>
          {syntaxTips.map(tip => (
            <button
              key={tip.id}
              type="button"
              className={styles.syntaxTipItem}
              onClick={() => handleSyntaxTipClick(tip)}
              aria-label={`添加搜索语法: ${tip.syntax}`}
              title={tip.description}
            >
              <span className={styles.syntaxTipSyntax}>{tip.syntax}</span>
              <span className={styles.syntaxTipDescription}>{tip.description}</span>
            </button>
          ))}
        </div>
      </div>

      {showAdvancedOptions && isAdvancedOpen && (
        <div className={styles.advancedContainer}>
          <div
            ref={advancedRef}
            className={styles.advancedOptions}
          >
            <div className={styles.advancedSection}>
              <label className={styles.advancedLabel}>搜索类型</label>
              <select
                className={styles.advancedSelect}
                value={filters.searchType}
                onChange={(e) => handleFilterChange('searchType', e.target.value as SearchFilters['searchType'])}
              >
                <option value="articles">文章</option>
                <option value="comments">评论</option>
                <option value="all">全部</option>
              </select>
            </div>

            <div className={styles.advancedSection}>
              <label className={styles.advancedLabel}>排序方式</label>
              <select
                className={styles.advancedSelect}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as SearchFilters['sortBy'])}
              >
                <option value="relevance">相关性</option>
                <option value="date">日期</option>
                <option value="views">浏览量</option>
              </select>
            </div>

            <div className={styles.advancedSection}>
              <label className={styles.advancedLabel}>作者</label>
              <input
                type="text"
                className={styles.advancedInput}
                placeholder="输入作者名"
                value={filters.author || ''}
                onChange={(e) => handleFilterChange('author', e.target.value)}
              />
            </div>

            <div className={styles.advancedSection}>
              <label className={styles.advancedLabel}>标签</label>
              <div className={styles.tagsContainer}>
                {filters.tags && filters.tags.map(tag => (
                  <span key={tag} className={styles.tagItem}>
                    {tag}
                    <button
                      type="button"
                      className={styles.tagRemove}
                      onClick={() => removeTag(tag)}
                      aria-label={`移除标签 ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className={styles.tagsInput}
                  placeholder="输入标签，按回车添加"
                  onKeyDown={handleTagsChange}
                />
              </div>
            </div>

            <div className={styles.advancedSection}>
              <label className={styles.advancedLabel}>日期范围</label>
              <div className={styles.dateRangeContainer}>
                <input
                  type="date"
                  className={styles.advancedInput}
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const newDateRange = { ...filters.dateRange };
                    if (newValue) {
                      newDateRange.start = newValue;
                    } else {
                      delete newDateRange.start;
                    }
                    handleFilterChange('dateRange', newDateRange);
                  }}
                />
                <span className={styles.dateSeparator}>至</span>
                <input
                  type="date"
                  className={styles.advancedInput}
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const newDateRange = { ...filters.dateRange };
                    if (newValue) {
                      newDateRange.end = newValue;
                    } else {
                      delete newDateRange.end;
                    }
                    handleFilterChange('dateRange', newDateRange);
                  }}
                />
              </div>
            </div>

            <div className={styles.advancedActions}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => setFilters({
                  searchType: 'articles',
                  sortBy: 'relevance',
                  author: '',
                  tags: [],
                  dateRange: {},
                  useCompositeFilter: false,
                  compositeFilter: createDefaultFilter()
                })}
              >
                重置筛选
              </button>
            </div>
          </div>

          {/* 组合筛选构建器 */}
          <div className={styles.filterBuilderSection}>
            <FilterBuilder
              filter={filters.compositeFilter || createDefaultFilter()}
              onFilterChange={(newFilter) => {
                setFilters(prev => ({
                  ...prev,
                  compositeFilter: newFilter
                }));
              }}
              onUseCompositeFilterChange={(use) => {
                setFilters(prev => ({
                  ...prev,
                  useCompositeFilter: use
                }));
              }}
              useCompositeFilter={filters.useCompositeFilter || false}
            />
          </div>
        </div>
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
          {searchHistory.length > 0 && query.trim() === '' && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <span className={styles.historyTitle}>搜索历史</span>
                <button
                  type="button"
                  className={styles.clearHistoryButton}
                  onClick={() => {
                    setSearchHistory([]);
                    localStorage.removeItem('searchHistory');
                  }}
                  aria-label="清空搜索历史"
                >
                  清空
                </button>
              </div>
              {searchHistory.map((item, index) => (
                <div
                  key={item.id}
                  className={`${styles.suggestionItem} ${styles.historyItem} ${index === selectedSuggestionIndex ? styles.suggestionItemSelected : ''}`}
                  onClick={() => {
                    setQuery(item.query);
                    onSearch(item.query, item.filters);
                    setShowSuggestions(false);
                  }}
                  onMouseDown={(e) => e.preventDefault()} // 防止点击建议时输入框失去焦点
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  role="option"
                  id={`suggestion-${index}`}
                  aria-selected={index === selectedSuggestionIndex}
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
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span className={styles.suggestionTitle}>
                    {item.query}
                  </span>
                  <button
                    type="button"
                    className={styles.historyRemoveButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedHistory = searchHistory.filter(h => h.id !== item.id);
                      setSearchHistory(updatedHistory);
                      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
                    }}
                    aria-label={`删除历史记录: ${item.query}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 搜索建议部分 */}
          {query.trim() !== '' && (
            <div className={styles.suggestionsSection}>
              {loading ? (
                <div className={styles.loadingContainer} role="status" aria-live="polite">
                  <div className={styles.loadingIndicator} aria-hidden="true"></div>
                  <span>搜索中...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <div className={styles.suggestionsList}>
                  {suggestions.map((suggestion, index) => {
                    // 计算建议项的实际索引（考虑搜索历史）
                    const actualIndex = query.trim() === '' ? index : index + searchHistory.length;
                    return (
                      <div
                        key={suggestion.id}
                        className={`${styles.suggestionItem} ${actualIndex === selectedSuggestionIndex ? styles.suggestionItemSelected : ''}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseDown={(e) => e.preventDefault()} // 防止点击建议时输入框失去焦点
                        onMouseEnter={() => setSelectedSuggestionIndex(actualIndex)}
                        role="option"
                        id={`suggestion-${actualIndex}`}
                        aria-selected={actualIndex === selectedSuggestionIndex}
                        tabIndex={-1}
                      >
                        <span className={styles.suggestionTitle}>
                          {suggestion.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noSuggestions} role="status">
                  没有找到相关建议
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
