/**
 * 目录组件
 * 显示文章的目录结构，支持展开/折叠和点击跳转
 */
import { TableOfContentsItem, EditorTableOfContentsProps } from '../../../types';

export function EditorTableOfContents ({
  items,
  expandedItems,
  activeItem,
  onItemClick,
  onToggleExpand
}: EditorTableOfContentsProps) {
  /**
   * 递归渲染目录项
   */
  const renderTocItem = (item: TableOfContentsItem, depth: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children.length > 0;

    // 根据深度计算缩进
    const indent = depth * 16;

    return (
      <div key={item.id} className="mb-1">
        <div
          className={`flex items-center space-x-1 py-1 px-2 rounded-md cursor-pointer transition-colors ${activeItem === item.id
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          style={{ 'paddingLeft': `${16 + indent}px` }}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newExpanded = new Set(expandedItems);
                if (isExpanded) {
                  newExpanded.delete(item.id);
                } else {
                  newExpanded.add(item.id);
                }
                onToggleExpand(newExpanded);
              }}
              className="p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}

          {/* 目录项文本 */}
          <span
            onClick={() => onItemClick(item.id)}
            className="flex-1 text-sm"
          >
            {item.text}
          </span>
        </div>

        {/* 子目录项 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children.map((child) => renderTocItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {items.map((item) => renderTocItem(item))}
    </div>
  );
}
