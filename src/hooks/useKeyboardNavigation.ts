import { useState, useCallback } from 'react';
import { SearchHistoryItem } from '../components/search/SearchHistory';

interface SearchSuggestion {
  id: string;
  title: string;
  type?: string;
}

interface UseKeyboardNavigationProps {
  suggestions: SearchSuggestion[];
  historyItems: SearchHistoryItem[];
  searchQuery: string;
  onSuggestionClick: (_suggestion: SearchSuggestion) => void;
  onHistoryItemClick: (_item: SearchHistoryItem) => void;
  onSubmit: () => void;
  onCloseSuggestions: () => void;
  onInputBlur: () => void;
}

interface UseKeyboardNavigationReturn {
  selectedSuggestionIndex: number;
  onSuggestionHover: (_index: number) => void;
  onHistoryItemHover: (_index: number) => void;
  handleKeyDown: (_e: React.KeyboardEvent) => void;
}

/**
 * 键盘导航Hook，负责处理搜索框的键盘导航逻辑
 * 包括上下箭头导航、Enter选择、Escape关闭等功能
 */
export function useKeyboardNavigation ({
  suggestions,
  historyItems,
  searchQuery,
  onSuggestionClick,
  onHistoryItemClick,
  onSubmit,
  onCloseSuggestions,
  onInputBlur
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // 处理建议项悬停
  const onSuggestionHover = useCallback((_index: number) => {
    // 计算建议项的实际索引（考虑搜索历史）
    const actualIndex = searchQuery.trim() === '' ? _index : _index + historyItems.length;
    setSelectedSuggestionIndex(actualIndex);
  }, [searchQuery, historyItems.length]);

  // 处理历史项悬停
  const onHistoryItemHover = useCallback((_index: number) => {
    setSelectedSuggestionIndex(_index);
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 如果有选中的建议，使用该建议
      if (selectedSuggestionIndex >= 0) {
        e.preventDefault();
        if (searchQuery.trim() === '') {
          // 搜索历史项
          const selectedHistoryItem = historyItems[selectedSuggestionIndex];
          if (selectedHistoryItem) {
            onHistoryItemClick(selectedHistoryItem);
          }
        } else {
          // 搜索建议项
          const selectedSuggestion = suggestions[selectedSuggestionIndex - historyItems.length];
          if (selectedSuggestion) {
            onSuggestionClick(selectedSuggestion);
          }
        }
      } else {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      onCloseSuggestions();
      setSelectedSuggestionIndex(-1);
      onInputBlur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // 向下导航建议列表
      const totalItems = searchQuery.trim() === '' ? historyItems.length : historyItems.length + suggestions.length;
      if (selectedSuggestionIndex < totalItems - 1) {
        setSelectedSuggestionIndex(prev => prev + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // 向上导航建议列表
      if (selectedSuggestionIndex > 0) {
        setSelectedSuggestionIndex(prev => prev - 1);
      } else if (selectedSuggestionIndex === 0) {
        setSelectedSuggestionIndex(-1);
      }
    }
  }, [
    selectedSuggestionIndex,
    searchQuery,
    historyItems,
    suggestions,
    onHistoryItemClick,
    onSuggestionClick,
    onSubmit,
    onCloseSuggestions,
    onInputBlur
  ]);

  return {
    selectedSuggestionIndex,
    onSuggestionHover,
    onHistoryItemHover,
    handleKeyDown
  };
}
