import { useEffect, useRef, useCallback } from 'react';

/**
 * 滚动导航Hook，负责监听滚动事件并更新当前激活的标题
 * @param activeHeadingId 当前激活的标题ID
 * @param onActiveHeadingChange 激活标题变化时的回调
 */
export function useScrollNavigation (_activeHeadingId: string, onActiveHeadingChange: (_id: string) => void) {
  const headingsRef = useRef<Map<string, HTMLElement>>(new Map());

  /**
   * 处理滚动事件，更新当前激活的标题
   */
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + 100;
    let currentActiveId = '';

    headingsRef.current.forEach((heading, id) => {
      const headingTop = heading.offsetTop;
      if (scrollPosition >= headingTop) {
        currentActiveId = id;
      }
    });

    if (currentActiveId !== _activeHeadingId) {
      onActiveHeadingChange(currentActiveId);
    }
  }, [_activeHeadingId, onActiveHeadingChange]);

  /**
   * 添加滚动监听
   */
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [_activeHeadingId, onActiveHeadingChange, handleScroll]);

  /**
   * 保存标题引用
   * @param id 标题ID
   * @param element 标题元素
   */
  const saveHeadingRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      headingsRef.current.set(id, element);
    } else {
      headingsRef.current.delete(id);
    }
  }, []);

  return {
    saveHeadingRef
  };
}
