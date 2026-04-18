import React, { memo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, ListTree, ChevronLeft } from 'lucide-react';

export interface TocItem {
  id: string;
  textContent: string;
  level: number;
  isScrolledOver: boolean;
}

export interface TocItemProps {
  item: TocItem;
  onClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasChildren: boolean;
  isHidden: boolean;
}

const TOC_LEVEL_STYLES: Record<number, { fontSize: string; fontWeight: string }> = {
  '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold' },
  '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium' },
  '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium' }
};

export const TocItemComponent: React.FC<TocItemProps> = memo(({
  item,
  onClick,
  isCollapsed,
  onToggleCollapse,
  hasChildren,
  isHidden
}) => {
  const style = TOC_LEVEL_STYLES[item.level] ?? TOC_LEVEL_STYLES[3]!;

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-in-out ${isHidden ? 'max-h-0 opacity-0 py-0' : 'max-h-20 opacity-100'}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
    >
      <div
        className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${item.isScrolledOver ? 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 min-h-[26px]">
          {item.level < 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="flex-shrink-0 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              {hasChildren && isCollapsed && <ChevronRight className="w-3 h-3 transition-transform duration-200" />}
              {hasChildren && !isCollapsed && <ChevronDown className="w-3 h-3 transition-transform duration-200" />}
              {!hasChildren && <span className="w-3 h-3" />}
            </button>
          )}
          <span className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${style.fontSize} ${style.fontWeight} text-left flex-1`}>
            {item.textContent}
          </span>
        </div>
      </div>
    </div>
  );
});

TocItemComponent.displayName = 'TocItemComponent';

interface TableOfContentsPanelProps {
  items: TocItem[];
  collapsedItems: Set<string>;
  onTocItemClick: (itemId: string) => void;
  onToggleCollapsed: (itemId: string) => void;
  getChildIds: (itemId: string, allItems: TocItem[]) => string[];
  isItemCollapsed: (collapsed: Set<string>, itemId: string) => boolean;
  shouldShowItem: (collapsed: Set<string>, itemId: string, allItems: TocItem[]) => boolean;
  containerClassName: string;
  collapsedButtonClassName: string;
  position?: 'left' | 'right';
}

export const TableOfContentsPanel: React.FC<TableOfContentsPanelProps> = memo(({
  items,
  collapsedItems,
  onTocItemClick,
  onToggleCollapsed,
  getChildIds,
  isItemCollapsed,
  shouldShowItem,
  containerClassName,
  collapsedButtonClassName,
  position = 'left'
}) => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const handleTogglePanelCollapsed = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev);
  }, []);

  if (items.length === 0) {
    return null;
  }

  if (isPanelCollapsed) {
    return (
      <div className={collapsedButtonClassName}>
        <button
          onClick={handleTogglePanelCollapsed}
          className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm px-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          {position === 'left'
            ? <ChevronRight className="w-4 h-4 text-sky-400" />
            : <ChevronLeft className="w-4 h-4 text-sky-400" />
          }
          目录
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <ListTree className="w-4 h-4 text-sky-400" />
            目录
          </h3>
          <button
            onClick={handleTogglePanelCollapsed}
            className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="收起"
          >
            {position === 'left'
              ? <ChevronLeft className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            }
          </button>
        </div>
        <nav className="p-2 pt-0 max-h-[50vh] overflow-y-auto">
          {items.map((item) => (
            <TocItemComponent
              key={item.id}
              item={item}
              onClick={() => onTocItemClick(item.id)}
              isCollapsed={isItemCollapsed(collapsedItems, item.id)}
              onToggleCollapse={() => onToggleCollapsed(item.id)}
              hasChildren={getChildIds(item.id, items).length > 0}
              isHidden={!shouldShowItem(collapsedItems, item.id, items)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
});

TableOfContentsPanel.displayName = 'TableOfContentsPanel';

