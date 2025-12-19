import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './VirtualList.module.css';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  renderItem: () => React.ReactNode;
  keyExtractor: () => string | number;
  className?: string;
  onScroll?: () => void;
}

export function VirtualList<T> ({
  items,
  itemHeight,
  containerHeight = 500,
  overscan = 5,
  renderItem,
  keyExtractor,
  className,
  onScroll
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可见项的范围
  const getVisibleRange = useCallback(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 获取可见的项
  const visibleRange = useMemo(() => getVisibleRange(), [getVisibleRange]);
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  // 计算总高度和偏移量
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    if (onScroll) {
      onScroll();
    }
  }, [onScroll]);

  // 当items变化时重置滚动位置
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [items]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ''}`}
      style={{ 'height': `${containerHeight}px` }}
      onScroll={handleScroll}
    >
      <div style={{ 'height': `${totalHeight}px`, 'position': 'relative' }}>
        <div
          style={{
            'transform': `translateY(${offsetY}px)`,
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'right': 0
          }}
        >
          {Array.from({ 'length': visibleItems.length }, () => (
            <div
              key={keyExtractor()}
              style={{ 'height': `${itemHeight}px` }}
              className={styles.item}
            >
              {renderItem()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
