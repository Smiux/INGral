import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { renderMarkdown } from '../../../utils/markdown';
import { Loader } from '../../ui/Loader';

/**
 * 编辑器内容区域组件
 * 包含编辑和预览视图，支持实时预览和行号显示
 */
interface EditorContentAreaProps {
  content: string;
  setContent: (content: string) => void;
  viewMode: 'split' | 'editor' | 'preview';
  livePreview: boolean;
  showLineNumbers: boolean;
  isLoading: boolean;
  error: string;
  onCursorPositionChange?: (position: { line: number; column: number }) => void;
}

/**
 * 虚拟滚动编辑器组件
 * 只渲染可见区域的行，提高长文档编辑性能
 */
const VirtualScrollEditor = React.memo(({
  content,
  setContent,
  showLineNumbers,
  onCursorPositionChange,
  onScroll,
}: {
  content: string;
  setContent: (content: string) => void;
  showLineNumbers: boolean;
  onCursorPositionChange?: (position: { line: number; column: number }) => void;
  onScroll: () => void;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const lastRenderLineNumbersRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  
  const lineHeight = 24; // 行高固定为24px
  const bufferLines = 20; // 缓冲区行数，在可见区域前后各渲染20行
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
  
  // 计算总行数 - 使用更高效的方法，避免创建大量数组
  const lineCount = useMemo(() => {
    if (!content) return 1;
    let count = 1;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        count++;
      }
    }
    return count;
  }, [content]);
  
  // 更新可见区域范围
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerElement = containerRef.current;
    const containerHeight = containerElement.clientHeight;
    const scrollTop = containerElement.scrollTop;
    
    // 计算可见区域的起始行和结束行
    const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - bufferLines);
    const endLine = Math.min(
      lineCount,
      Math.floor((scrollTop + containerHeight) / lineHeight) + bufferLines
    );
    
    // 只有当可见范围真正变化时才更新状态
    setVisibleRange(prevRange => {
      if (prevRange.start === startLine && prevRange.end === endLine) {
        return prevRange; // 避免不必要的状态更新
      }
      return { start: startLine, end: endLine };
    });
  }, [lineCount, lineHeight, bufferLines]);
  
  // 处理滚动事件 - 优化版本
  const handleScroll = useCallback(() => {
    // 使用requestAnimationFrame优化，避免频繁更新
    requestAnimationFrame(() => {
      updateVisibleRange();
      onScroll();
    });
  }, [updateVisibleRange, onScroll]);
  
  // 内容变化时更新可见范围
  useEffect(() => {
    updateVisibleRange();
  }, [content, updateVisibleRange]);
  
  // 容器尺寸变化时更新可见范围
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;
    
    const observer = new ResizeObserver(() => {
      updateVisibleRange();
    });
    
    observer.observe(currentContainer);
    return () => {
      observer.unobserve(currentContainer);
    };
  }, [updateVisibleRange]);
  
  // 更新光标位置
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      const line = text.substring(0, cursorPos).split('\n').length;
      const column = cursorPos - (text.substring(0, cursorPos).lastIndexOf('\n') + 1);
      const position = { line, column: column + 1 };
      // 调用回调函数，将光标位置传递给父组件
      onCursorPositionChange?.(position);
    }
  }, [onCursorPositionChange]);
  
  // 渲染行号 - 优化版
  const renderLineNumbers = useCallback(() => {
    if (!showLineNumbers || !lineNumbersRef.current) return;
    
    const { start, end } = visibleRange;
    
    // 如果可见范围没有变化，跳过渲染
    if (lastRenderLineNumbersRef.current.start === start && lastRenderLineNumbersRef.current.end === end) {
      return;
    }
    
    // 更新最后渲染的范围
    lastRenderLineNumbersRef.current = { start, end };
    
    // 生成可见行号数组 - 使用更高效的字符串拼接方式
    const fragment = document.createDocumentFragment();
    
    for (let i = start + 1; i <= end; i++) {
      const lineNumberDiv = document.createElement('div');
      lineNumberDiv.style.height = `${lineHeight}px`;
      lineNumberDiv.style.lineHeight = `${lineHeight}px`;
      lineNumberDiv.className = 'text-right pr-2 text-gray-500 dark:text-gray-400 text-sm';
      lineNumberDiv.textContent = i.toString();
      fragment.appendChild(lineNumberDiv);
    }
    
    // 更新DOM
    const lineNumbersElement = lineNumbersRef.current;
    lineNumbersElement.innerHTML = '';
    lineNumbersElement.appendChild(fragment);
    
    // 设置行号容器的滚动位置，与编辑器同步
    lineNumbersElement.scrollTop = start * lineHeight;
  }, [visibleRange, showLineNumbers, lineHeight]);
  
  // 内容变化时更新行号
  useEffect(() => {
    renderLineNumbers();
  }, [content, renderLineNumbers]);
  
  // 可见范围变化时更新行号
  useEffect(() => {
    renderLineNumbers();
  }, [visibleRange, renderLineNumbers]);
  
  return (
    <div className="flex h-full overflow-hidden">
      {/* 行号显示 */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm py-2 overflow-hidden select-none"
          style={{ minWidth: '50px' }}
        />
      )}
      
      {/* 编辑区域容器 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onScroll={handleScroll}
      >
        {/* 虚拟滚动的占位元素，用于撑开容器高度 */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ height: `${lineCount * lineHeight}px` }}
        />
        
        {/* 可见内容区域 */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ 
            transform: `translateY(${visibleRange.start * lineHeight}px)`,
            // 添加硬件加速
            willChange: 'transform',
            // 优化渲染性能
            contain: 'layout size style'
          }}
        >
          {/* 使用textarea进行实际编辑，但只渲染可见区域的高度 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              updateCursorPosition();
            }}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            onPaste={updateCursorPosition}
            onCut={updateCursorPosition}
            className="w-full border-none resize-none outline-none bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed"
            placeholder="开始编写你的文章..."
            spellCheck={false}
            style={{
              lineHeight: `${lineHeight}px`,
              padding: '2px 4px',
              minHeight: `${Math.min(lineCount, visibleRange.end - visibleRange.start + 1) * lineHeight}px`,
              // 使textarea占据可见区域的高度，同时保持所有内容可编辑
              height: `${Math.min(lineCount, visibleRange.end - visibleRange.start + 1) * lineHeight}px`,
              // 隐藏滚动条，由容器处理滚动
              overflow: 'hidden',
              // 优化渲染性能
              contain: 'size style',
              // 确保textarea内容不可见，只用于编辑
              // 实际可见内容由定位和裁剪控制
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>
      </div>
    </div>
  );
});

export const EditorContentArea = React.memo(({
  content,
  setContent,
  viewMode,
  livePreview,
  showLineNumbers,
  isLoading,
  error,
  onCursorPositionChange,
}: EditorContentAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 渲染预览内容
  const renderPreview = useCallback(() => {
    if (!previewRef.current) return;
    
    const rendered = renderMarkdown(content);
    previewRef.current.innerHTML = rendered.html;
    
    // 执行预览中的脚本
    const scripts = previewRef.current.getElementsByTagName('script');
    // 将HTMLCollection转换为数组，避免在循环中修改DOM导致的问题
    Array.from(scripts).forEach(currentScript => {
      if (currentScript) {
        const script = document.createElement('script');
        script.textContent = currentScript.textContent || '';
        if (currentScript.src) {
          script.src = currentScript.src;
        }
        const parentNode = currentScript.parentNode;
        if (parentNode) {
          parentNode.replaceChild(script, currentScript);
        }
      }
    });
  }, [content]);

  // 实时预览效果 - 优化版
  useEffect(() => {
    if (livePreview && (viewMode === 'split' || viewMode === 'preview')) {
      // 清理之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 300ms防抖，避免过于频繁的渲染
      scrollTimeoutRef.current = setTimeout(() => {
        renderPreview();
      }, 300);
      
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [content, livePreview, viewMode, renderPreview]);

  // 初始渲染或视图切换时渲染预览
  useEffect(() => {
    if (viewMode === 'preview' || viewMode === 'split') {
      renderPreview();
    }
  }, [viewMode, renderPreview]);

  // 处理编辑器滚动，同步预览滚动 - 优化版
  const handleEditorScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current || isSyncingRef.current) return;
    
    // 节流处理，避免过于频繁的同步
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 50) return; // 50ms节流
    lastScrollTimeRef.current = now;
    
    isSyncingRef.current = true;
    
    try {
      // 计算滚动比例并同步到预览区域
      const editorElement = editorRef.current;
      const previewElement = previewRef.current;
      
      const editorScrollHeight = editorElement.scrollHeight;
      const editorClientHeight = editorElement.clientHeight;
      const previewScrollHeight = previewElement.scrollHeight;
      const previewClientHeight = previewElement.clientHeight;
      
      // 避免除以零
      if (editorScrollHeight === editorClientHeight || previewScrollHeight === previewClientHeight) {
        return;
      }
      
      const scrollPercentage = editorElement.scrollTop / (editorScrollHeight - editorClientHeight);
      const previewScrollPosition = scrollPercentage * (previewScrollHeight - previewClientHeight);
      previewElement.scrollTop = previewScrollPosition;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // 处理预览滚动，同步编辑器滚动 - 优化版
  const handlePreviewScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current || isSyncingRef.current) return;
    
    // 节流处理，避免过于频繁的同步
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 50) return; // 50ms节流
    lastScrollTimeRef.current = now;
    
    isSyncingRef.current = true;
    
    try {
      // 计算滚动比例并同步到编辑器
      const editorElement = editorRef.current;
      const previewElement = previewRef.current;
      
      const previewScrollHeight = previewElement.scrollHeight;
      const previewClientHeight = previewElement.clientHeight;
      const editorScrollHeight = editorElement.scrollHeight;
      const editorClientHeight = editorElement.clientHeight;
      
      // 避免除以零
      if (previewScrollHeight === previewClientHeight || editorScrollHeight === editorClientHeight) {
        return;
      }
      
      const scrollPercentage = previewElement.scrollTop / (previewScrollHeight - previewClientHeight);
      const editorScrollPosition = scrollPercentage * (editorScrollHeight - editorClientHeight);
      editorElement.scrollTop = editorScrollPosition;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // 加载状态处理
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader size="large" text="加载文章中..." />
      </div>
    );
  }

  // 错误状态处理
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--error-500)] mb-2">加载失败</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
      {/* 编辑器内容区域 */}
      {viewMode === 'editor' || viewMode === 'split' ? (
        <div
          ref={editorRef}
          className={`flex h-full overflow-hidden ${viewMode === 'split' ? 'w-full md:w-1/2 border-r border-[var(--border-color)]' : ''}`}
        >
          <VirtualScrollEditor
            content={content}
            setContent={setContent}
            showLineNumbers={showLineNumbers}
            onCursorPositionChange={onCursorPositionChange || (() => {})}
            onScroll={handleEditorScroll}
          />
        </div>
      ) : null}

      {/* 预览区域 */}
      {viewMode === 'preview' || viewMode === 'split' ? (
        <div
          ref={previewRef}
          className={`h-full overflow-auto p-4 sm:p-6 md:p-8 ${viewMode === 'split' ? 'w-full md:w-1/2' : ''}`}
          onScroll={handlePreviewScroll}
        >
          {/* 预览内容将通过renderPreview函数动态插入 */}
        </div>
      ) : null}
    </div>
  );
});
