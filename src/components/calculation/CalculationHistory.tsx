import React, { useState, useEffect } from 'react';
import styles from './CalculationHistory.module.css';
import calculationService, { CalculationHistoryItem } from '../../services/calculationService';

interface CalculationHistoryProps {
  onItemSelect?: (code: string) => void;
  maxItems?: number;
}

const CalculationHistory: React.FC<CalculationHistoryProps> = ({ 
  onItemSelect, 
  maxItems = 10 
}) => {
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // 加载计算历史记录
  useEffect(() => {
    const loadHistory = () => {
      const historyItems = calculationService.getHistory();
      setHistory(historyItems);
    };

    // 初始加载
    loadHistory();

    // 这里可以添加事件监听来更新历史记录
    // 暂时使用定时器模拟实时更新
    const interval = setInterval(loadHistory, 5000);

    return () => clearInterval(interval);
  }, []);

  // 处理历史记录项点击
  const handleItemClick = (item: CalculationHistoryItem) => {
    if (onItemSelect) {
      onItemSelect(item.code);
    }
  };

  // 处理删除历史记录项
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    calculationService.deleteHistoryItem(id);
    setHistory(history.filter(item => item.id !== id));
  };

  // 处理清除所有历史记录
  const handleClearHistory = () => {
    calculationService.clearHistory();
    setHistory([]);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 要显示的历史记录项
  const displayedHistory = isExpanded ? history : history.slice(0, maxItems);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>计算历史记录</h3>
        <div className={styles.actions}>
          {history.length > maxItems && (
            <button 
              className={styles.toggleButton} 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : `显示全部 (${history.length})`}
            </button>
          )}
          {history.length > 0 && (
            <button 
              className={styles.clearButton} 
              onClick={handleClearHistory}
            >
              清除历史
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          暂无计算历史记录
        </div>
      ) : (
        <div className={styles.historyList}>
          {displayedHistory.map((item) => (
            <div 
              key={item.id} 
              className={styles.historyItem} 
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.itemHeader}>
                <div className={styles.codePreview}>
                  {item.code.length > 50 
                    ? `${item.code.substring(0, 50)}...` 
                    : item.code
                  }
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.timestamp}>
                    {formatTime(item.timestamp)}
                  </span>
                  <span className={styles.calculationTime}>
                    {item.calculationTime}ms
                  </span>
                </div>
              </div>
              <div className={styles.resultPreview}>
                {item.result.length > 100 
                  ? `${item.result.substring(0, 100)}...` 
                  : item.result
                }
              </div>
              <button 
                className={styles.deleteButton} 
                onClick={(e) => handleDeleteItem(item.id, e)}
                title="删除此记录"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalculationHistory;