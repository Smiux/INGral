import { BookOpen, Settings, HelpCircle } from 'lucide-react';
import { EditorSidebarProps } from '../../../types';
import { EditorTableOfContents } from './TableOfContents';


export function EditorSidebar({
  showToc,
  onToggleToc,
  tableOfContents,
  expandedTocItems,
  setExpandedTocItems,
  activeTocItem,
  setActiveTocItem,
}: EditorSidebarProps) {
  return (
    <div className="w-0 overflow-hidden bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col"
         style={{ width: showToc ? '280px' : '0px' }}>
      {/* 侧边栏头部 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
          <BookOpen size={16} />
          <span>目录</span>
        </h3>
        <button
          onClick={onToggleToc}
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
        >
          <span className="sr-only">关闭侧边栏</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 6-6 6 6 6" />
            <path d="m6 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 侧边栏内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 目录内容 */}
        {tableOfContents.length > 0 ? (
          <div className="space-y-2">
            <EditorTableOfContents
              items={tableOfContents}
              expandedItems={expandedTocItems}
              activeItem={activeTocItem}
              onItemClick={setActiveTocItem}
              onToggleExpand={setExpandedTocItems}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
            <p>没有检测到标题</p>
            <p className="text-xs mt-1">在文章中使用 # 标题来生成目录</p>
          </div>
        )}
      </div>

      {/* 侧边栏底部 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center space-x-4">
        <button
          className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Settings size={14} />
          <span>设置</span>
        </button>
        <button
          className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <HelpCircle size={14} />
          <span>帮助</span>
        </button>
      </div>
    </div>
  );
}
