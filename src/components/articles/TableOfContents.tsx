import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';
import { TableOfContentsItem, ArticleTableOfContentsProps } from '../../types';
import { generateTableOfContents as generateToc } from './ArticleEditor/EditorUtils';

function ArticleTableOfContentsImpl ({ contentRef, activeHeadingId, onActiveHeadingChange }: ArticleTableOfContentsProps) {
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());
  const headingsRef = useRef<Map<string, HTMLElement>>(new Map());

  // 使用自定义Hook处理滚动导航
  const { saveHeadingRef } = useScrollNavigation(activeHeadingId, onActiveHeadingChange);

  /**
   * 从Markdown内容生成目录
   */
  const updateTableOfContents = useCallback(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return [];
    }

    // 获取编辑器内容
    const content = contentElement.textContent || '';

    // 使用增强的generateTableOfContents函数生成目录
    const tocItems = generateToc(content);

    // 保存标题引用
    tocItems.forEach(item => {
      const heading = document.getElementById(item.id);
      if (heading) {
        headingsRef.current.set(item.id, heading);
        saveHeadingRef(item.id, heading);
      }

      // 递归处理子项
      item.children.forEach(child => {
        const childHeading = document.getElementById(child.id);
        if (childHeading) {
          headingsRef.current.set(child.id, childHeading);
          saveHeadingRef(child.id, childHeading);
        }
      });
    });

    return tocItems;
  }, [contentRef, saveHeadingRef]);

  /**
   * 监听文章内容更新，生成目录
   */
  useEffect(() => {
    if (contentRef.current) {
      const toc = updateTableOfContents();
      setTableOfContents(toc);
    }

    // 监听内容变化（通过MutationObserver）
    const observer = new MutationObserver(() => {
      const toc = updateTableOfContents();
      setTableOfContents(toc);
    });

    if (contentRef.current) {
      observer.observe(contentRef.current, {
        'childList': true,
        'subtree': true,
        'characterData': true
      });
    }

    return () => observer.disconnect();
  }, [contentRef, updateTableOfContents]);

  /**
   * 滚动到指定标题
   */
  const scrollToHeading = (id: string) => {
    const heading = headingsRef.current.get(id);
    if (heading) {
      window.scrollTo({
        'top': heading.offsetTop - 80,
        'behavior': 'smooth'
      });
      onActiveHeadingChange(id);
    }
  };

  /**
   * 切换目录项展开/折叠状态
   */
  const toggleTocItemExpanded = (id: string) => {
    const newExpandedItems = new Set(expandedTocItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedTocItems(newExpandedItems);
  };

  /**
   * 渲染目录项
   */
  const renderTocItem = (item: TableOfContentsItem, level: number = 0) => {
    const indentation = level * 12;
    // 前两级默认展开
    const isExpanded = expandedTocItems.has(item.id) || level < 2;

    return (
      <li key={item.id} className="mb-1">
        <div className="flex items-center gap-1">
          {item.children.length > 0 && (
            <button
              onClick={() => toggleTocItemExpanded(item.id)}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
              style={{ 'width': '16px', 'height': '16px' }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {item.children.length === 0 && <div className="w-4"></div>}
          <button
            onClick={() => scrollToHeading(item.id)}
            className={`text-left text-sm transition-all duration-200 ease-in-out ${activeHeadingId === item.id ? 'text-primary-600 dark:text-primary-400 font-medium bg-primary-100 dark:bg-primary-900/20' : 'text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={{ 'paddingLeft': `${indentation}px` }}
            aria-current={activeHeadingId === item.id ? 'location' : undefined}
          >
            {item.text}
          </button>
        </div>
        {isExpanded && item.children.length > 0 && (
          <ul className="mt-1 pl-4">
            {item.children.map(child => renderTocItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (tableOfContents.length === 0) {
    return null;
  }

  return (
    <aside className="lg:w-64 lg:sticky lg:top-8 self-start">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700 p-4 transition-all hover:shadow-md">
        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
          Table of Contents
        </h2>
        <nav className="text-sm">
          <ul className="space-y-1">
            {tableOfContents.map((item) => (
              <li key={item.id} className="transition-all duration-200 ease-in-out hover:pl-1">
                {renderTocItem(item)}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

export const ArticleTableOfContents = React.memo(ArticleTableOfContentsImpl);
