import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * 编辑历史项类型定义
 */
interface HistoryItem {
  title: string;
  content: string;
  timestamp: Date;
  id: string;
  // 操作类型
  operationType: 'content' | 'title' | 'format' | 'insert' | 'delete' | 'other';
  // 变化大小（字符数）
  changeSize: number;
  // 变化描述
  changeDescription: string;
  // 是否为重要操作（用于智能分组）
  isImportant: boolean;
  // 操作时长（毫秒）
  operationDuration: number;
}

/**
 * 历史记录管理器组件
 * 管理编辑历史记录，支持撤销/重做功能
 */
interface HistoryManagerProps {
  title: string;
  content: string;
  setTitle: (_title: string) => void;
  setContent: (_content: string) => void;
}

export function HistoryManager ({
  'title': _title,
  'content': _content,
  'setTitle': setTitle,
  'setContent': setContent
}: HistoryManagerProps) {
  // 历史记录状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // 当前历史记录索引
  const [historyIndex, setHistoryIndex] = useState(-1);
  // 最大历史记录长度
  // 增加历史记录容量
  const MAX_HISTORY_SIZE = 100;
  // 防抖定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 上一次保存的内容哈希，用于避免保存相同内容
  const lastContentHashRef = useRef<string>('');
  // 保存当前索引的ref，避免直接依赖historyIndex state
  const historyIndexRef = useRef<number>(-1);
  // 保存上一次历史记录的内容和标题，用于计算变化
  const lastHistoryContentRef = useRef<string>('');
  const lastHistoryTitleRef = useRef<string>('');
  // 保存操作开始时间，用于计算操作时长
  const operationStartTimeRef = useRef<number>(Date.now());
  // 保存上一次保存的时间，用于分组操作
  const lastSaveTimeRef = useRef<number>(Date.now());

  /**
   * 计算内容哈希值，用于检测内容是否变化
   * 使用更可靠的哈希算法，避免误判
   */
  const computeContentHash = useCallback((titleStr: string, contentStr: string): string => {
    // 使用更可靠的哈希计算方式
    let hash = 0;
    const combined = titleStr + contentStr;
    for (let i = 0; i < combined.length; i += 1) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      // Convert to 32bit integer
      hash &= hash;
    }
    return hash.toString();
  }, []);

  // 同步historyIndexRef和historyIndex状态
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  /**
   * 检测操作类型和生成变化描述
   */
  const analyzeChange = useCallback((oldTitle: string, newTitle: string, oldContent: string, newContent: string) => {
    const titleChanged = oldTitle !== newTitle;
    const contentChanged = oldContent !== newContent;

    // 计算变化大小
    const contentSizeChange = Math.abs(newContent.length - oldContent.length);
    const totalChangeSize = titleChanged ? newTitle.length - oldTitle.length : contentSizeChange;

    // 检测操作类型
    let operationType: HistoryItem['operationType'] = 'other';
    let changeDescription = '';
    let isImportant = false;

    if (titleChanged) {
      operationType = 'title';
      changeDescription = '修改了标题';
      isImportant = true;
    } else if (contentChanged) {
      if (contentSizeChange > 0) {
        operationType = 'insert';
        changeDescription = `插入了${contentSizeChange}个字符`;
      } else if (contentSizeChange < 0) {
        operationType = 'delete';
        changeDescription = `删除了${Math.abs(contentSizeChange)}个字符`;
      } else {
        operationType = 'content';
        changeDescription = '修改了内容';
      }

      // 检测是否为格式化操作（简单实现：检查内容长度变化和内容相似度）
      if (contentSizeChange === 0) {
        // 内容长度不变，可能是格式化操作
        operationType = 'format';
        changeDescription = '格式化了内容';
      }

      // 根据变化大小判断是否重要
      isImportant = Math.abs(contentSizeChange) > 100;
    }

    return {
      operationType,
      changeDescription,
      isImportant,
      totalChangeSize
    };
  }, []);

  /**
   * 添加历史记录
   */
  const addToHistory = useCallback(() => {
    // 计算当前内容哈希
    const currentHash = computeContentHash(_title, _content);

    // 计算操作时长
    const now = Date.now();
    const operationDuration = now - operationStartTimeRef.current;

    // 只有当内容或标题变化时才添加历史记录
    if (currentHash !== lastContentHashRef.current) {
      // 使用useRef保存当前索引，避免直接依赖historyIndex state
      const currentIndex = historyIndexRef.current;

      // 分析变化
      const changeAnalysis = analyzeChange(
        lastHistoryTitleRef.current,
        _title,
        lastHistoryContentRef.current,
        _content
      );

      setHistory(prev => {
        // 如果当前不是在历史记录的最后，截断历史记录
        const newHistory = prev.slice(0, currentIndex + 1);

        // 创建新的历史记录项
        const newHistoryItem: HistoryItem = {
          'title': _title,
          'content': _content,
          'timestamp': new Date(),
          'id': `history_${Date.now()}_${Math.random().toString(36)
            .substr(2, 9)}`,
          'operationType': changeAnalysis.operationType,
          'changeSize': changeAnalysis.totalChangeSize,
          'changeDescription': changeAnalysis.changeDescription,
          'isImportant': changeAnalysis.isImportant,
          operationDuration
        };

        // 添加到历史记录末尾
        newHistory.push(newHistoryItem);

        // 限制历史记录的最大长度
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        return newHistory;
      });

      // 更新索引，使用函数式更新获取最新值
      setHistoryIndex(prev => {
        const newIndex = prev + 1;
        // 如果历史记录被截断，调整索引
        return Math.min(newIndex, MAX_HISTORY_SIZE - 1);
      });

      // 更新最后保存的哈希和内容
      lastContentHashRef.current = currentHash;
      lastHistoryContentRef.current = _content;
      lastHistoryTitleRef.current = _title;

      // 重置操作开始时间
      operationStartTimeRef.current = now;
      lastSaveTimeRef.current = now;
    }
  // 完全移除historyIndex依赖
  }, [_title, _content, computeContentHash, analyzeChange]);

  /**
   * 防抖处理，避免过于频繁保存历史记录
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 1秒保存一次历史记录，提高响应速度
    debounceTimerRef.current = setTimeout(() => {
      addToHistory();
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [_title, _content, addToHistory]);

  /**
   * 撤销操作
   */
  const undo = useCallback(() => {
    // 使用ref获取当前索引，避免直接依赖historyIndex state
    if (historyIndexRef.current > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, []);

  /**
   * 重做操作
   */
  const redo = useCallback(() => {
    // 使用ref获取当前索引，避免直接依赖historyIndex state
    if (historyIndexRef.current < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [history.length]);



  // 当历史索引变化时，更新编辑器内容
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      const historyItem = history[historyIndex];
      if (historyItem) {
        setTitle(historyItem.title);
        setContent(historyItem.content);
      }
    }
  }, [historyIndex, history, setContent, setTitle]);

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
