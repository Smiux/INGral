import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * 编辑历史项类型定义
 */
interface HistoryItem {
  title: string;
  content: string;
  timestamp: Date;
}

/**
 * 历史记录管理器组件
 * 管理编辑历史记录，支持撤销/重做功能
 */
interface HistoryManagerProps {
  title: string;
  content: string;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
}

export function HistoryManager({
  title,
  content,
  setTitle,
  setContent,
}: HistoryManagerProps) {
  // 历史记录状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // 当前历史记录索引
  const [historyIndex, setHistoryIndex] = useState(-1);
  // 最大历史记录长度
  const MAX_HISTORY_SIZE = 50;
  // 防抖定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 添加历史记录
   */
  const addToHistory = useCallback(() => {
    // 只有当内容或标题变化时才添加历史记录
    if (history.length === 0 || 
        history[historyIndex]?.content !== content || 
        history[historyIndex]?.title !== title) {
      setHistory(prev => {
        // 如果当前不是在历史记录的最后，截断历史记录
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          title,
          content,
          timestamp: new Date()
        });
        
        // 限制历史记录的最大长度
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        
        return newHistory;
      });
      setHistoryIndex(prev => {
        const newIndex = prev + 1;
        // 如果历史记录被截断，调整索引
        return Math.min(newIndex, MAX_HISTORY_SIZE - 1);
      });
    }
  }, [title, content, historyIndex, history]);

  /**
   * 防抖处理，避免过于频繁保存历史记录
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 2秒保存一次历史记录
    debounceTimerRef.current = setTimeout(() => {
      addToHistory();
    }, 2000);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title, content, addToHistory]);

  /**
   * 撤销操作
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  /**
   * 重做操作
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // 当历史索引变化时，更新编辑器内容
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      const historyItem = history[historyIndex];
      if (historyItem) {
        setTitle(historyItem.title);
        setContent(historyItem.content);
      }
    }
  }, [historyIndex, history, setTitle, setContent]);

  // 监听键盘快捷键，支持Ctrl+Z撤销和Ctrl+Y重做
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下了Ctrl键
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return null;
}