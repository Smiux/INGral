import { useCallback } from 'react';
import type { TocItem } from '../panels/TableOfContents';

export const useTocUtils = () => {
  const toggleCollapsed = useCallback((collapsedItems: Set<string>, itemId: string): Set<string> => {
    const next = new Set(collapsedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    return next;
  }, []);

  const getChildIds = useCallback((parentId: string, items: TocItem[]): string[] => {
    const parentIndex = items.findIndex((item) => item.id === parentId);
    if (parentIndex === -1) {
      return [];
    }
    const parentLevel = items[parentIndex]!.level;
    const childIds: string[] = [];
    for (let i = parentIndex + 1; i < items.length; i += 1) {
      const item = items[i]!;
      if (item.level <= parentLevel) {
        break;
      }
      childIds.push(item.id);
    }
    return childIds;
  }, []);

  const isItemCollapsed = useCallback((collapsedItems: Set<string>, itemId: string): boolean => {
    return collapsedItems.has(itemId);
  }, []);

  const shouldShowItem = useCallback((collapsedItems: Set<string>, itemId: string, items: TocItem[]): boolean => {
    for (const collapsedId of collapsedItems) {
      const childIds = getChildIds(collapsedId, items);
      if (childIds.includes(itemId)) {
        return false;
      }
    }
    return true;
  }, [getChildIds]);

  return { toggleCollapsed, getChildIds, isItemCollapsed, shouldShowItem };
};
