import React, { useState, useRef, useEffect } from 'react';
import { searchService } from '../../services/searchService';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  defaultValue?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = '搜索文章...',
  onSearch,
  onFocus,
  onBlur,
  defaultValue = '',
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<{ title: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 如果输入内容超过2个字符，获取搜索建议
    if (value.trim().length >= 2) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
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

  // 处理搜索提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
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
      handleSubmit(e as unknown as React.FormEvent);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
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

  // 点击外部关闭建议框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
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
            className={styles.searchInput}
            autoComplete="off"
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
        <button
          type="submit"
          className={styles.searchButton}
          aria-label="搜索"
        >
          搜索
        </button>
      </form>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className={styles.suggestionsContainer}
        >
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingIndicator}></div>
              <span>搜索中...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={styles.suggestionItem}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseDown={(e) => e.preventDefault()} // 防止点击建议时输入框失去焦点
              >
                <span className={styles.suggestionTitle}>
                  {suggestion.title}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.noSuggestions}>
              没有找到相关建议
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
