import { useState, useEffect } from 'react';
import { VirtualList } from './VirtualList';
import styles from './VirtualListExample.module.css';

interface ItemData {
  id: string;
  title: string;
  description: string;
}

export function VirtualListExample() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // 模拟加载大量数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成10000个示例数据项
      const newItems: ItemData[] = Array.from({ length: 10000 }, (_, index) => ({
        id: `item-${index}`,
        title: `项目 ${index + 1}`,
        description: `这是项目 ${index + 1} 的详细描述内容，用于展示虚拟滚动的效果。`
      }));
      
      setItems(newItems);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // 处理滚动事件
  const handleScroll = (_scrollTop: number, range: { start: number; end: number }) => {
    setVisibleRange(range);
  };

  // 渲染列表项
  const renderItem = (item: ItemData, index: number) => {
    return (
      <div className={styles.item}>
        <div className={styles.itemNumber}>{index + 1}</div>
        <div className={styles.itemContent}>
          <h3 className={styles.itemTitle}>{item.title}</h3>
          <p className={styles.itemDescription}>{item.description}</p>
        </div>
      </div>
    );
  };

  // 提取key
  const keyExtractor = (item: ItemData) => item.id;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p>正在加载数据...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>虚拟滚动示例</h2>
        <p className={styles.stats}>
          总项目数: {items.length} | 可见范围: {visibleRange.start + 1} - {visibleRange.end + 1}
        </p>
      </div>
      
      <VirtualList
        items={items}
        itemHeight={80}
        containerHeight={600}
        overscan={5}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        className={styles.virtualList || ''}
        onScroll={handleScroll}
      />
      
      <div className={styles.footer}>
        <p>通过虚拟滚动，即使有10000个项目也能保持流畅滚动</p>
      </div>
    </div>
  );
}
