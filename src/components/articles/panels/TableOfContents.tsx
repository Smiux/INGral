import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

