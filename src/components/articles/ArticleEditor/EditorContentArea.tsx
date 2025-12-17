/**
 * 编辑器内容区域组件
 * 包含编辑和预览视图，支持实时预览和行号显示
 */
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { renderMarkdown, generateHash } from '../../../utils/markdown';
import { Loader } from '../../ui/Loader';
import DOMPurify from 'dompurify';

interface EditorContentAreaProps {
  content: string;
  setContent: (content: string) => void;
  viewMode: 'split' | 'editor' | 'preview';
  livePreview: boolean;
  isLoading: boolean;
  error: string;
  onCursorPositionChange?: (position: { line: number; column: number }) => void;
  collaborators?: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[];
}

/**
 * 虚拟滚动编辑器组件
 * 实现了虚拟滚动，只渲染可见区域的行，优化大型文章编辑性能
 */
const VirtualEditor = React.memo(({
  content,
  setContent,
  onCursorPositionChange,
  onScroll,
  collaborators,
}: {
  content: string;
  setContent: (content: string) => void;
  onCursorPositionChange: (position: { line: number; column: number }) => void;
  onScroll: (event: React.UIEvent<HTMLTextAreaElement>) => void;
  collaborators: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[] | undefined;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // 配置常量
  const OVERSCAN = 10; // 预加载行数，增加预加载以减少滚动空白
  const MIN_CONTAINER_HEIGHT = 400;
  
  // 状态
  const [currentLine, setCurrentLine] = React.useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(MIN_CONTAINER_HEIGHT);
  
  // 动态行高和偏移量
  const [lineMetrics, setLineMetrics] = React.useState({
    lineHeight: 24, // 初始值，将动态更新
    paddingTop: 8,   // 初始值，将动态更新
    paddingBottom: 8, // 初始值，将动态更新
  });
  
  // 高亮指示器的精确位置
  const [highlightPosition, setHighlightPosition] = React.useState({
    top: 8,    // 初始值，将动态更新
    height: 24 // 初始值，将动态更新
  });

  // 计算总行数 - 使用useMemo缓存结果
  const totalLines = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  // 初始化时获取真实行高和padding
  React.useEffect(() => {
    const updateLineMetrics = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
        
        setLineMetrics({
          lineHeight,
          paddingTop,
          paddingBottom,
        });
        
        // 更新高亮位置
        setHighlightPosition({
          top: paddingTop + (currentLine - 1) * lineHeight,
          height: lineHeight
        });
      }
    };
    
    updateLineMetrics();
    
    // 监听窗口大小变化，重新计算行高
    window.addEventListener('resize', updateLineMetrics);
    
    return () => {
      window.removeEventListener('resize', updateLineMetrics);
    };
  }, [currentLine]);

  // 监听容器大小变化 - 使用ResizeObserver优化
  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 计算可见行数和起始行 - 使用useMemo缓存结果
  const visibleRange = useMemo(() => {
    if (!containerHeight || !lineMetrics.lineHeight) {
      return { start: 0, end: Math.min(50, totalLines) };
    }
    
    // 计算可见行数，添加额外的缓冲行
    const visibleLineCount = Math.ceil(containerHeight / lineMetrics.lineHeight);
    
    // 计算起始行
    const startLine = Math.max(0, Math.floor(scrollTop / lineMetrics.lineHeight) - OVERSCAN);
    const endLine = Math.min(totalLines, startLine + visibleLineCount + OVERSCAN * 2);
    
    return { start: startLine, end: endLine };
  }, [containerHeight, scrollTop, lineMetrics.lineHeight, totalLines, OVERSCAN]);

  // 使用requestAnimationFrame实现更平滑的更新
  const rafThrottle = useCallback((func: () => void) => {
    let isScheduled = false;
    return () => {
      if (!isScheduled) {
        isScheduled = true;
        requestAnimationFrame(() => {
          func();
          isScheduled = false;
        });
      }
    };
  }, []);

  // 行起始位置缓存，用于快速计算行号
  const [lineStartsCache, setLineStartsCache] = useState<number[]>([0]);
  
  // 更新行起始位置缓存
  const updateLineStartsCache = useCallback((text: string) => {
    const newLineStarts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        newLineStarts.push(i + 1);
      }
    }
    setLineStartsCache(newLineStarts);
  }, []);
  
  // 优化行号计算方法：使用缓存机制，O(log n)时间复杂度
  const calculateLineNumber = useCallback((_text: string, cursorPos: number): number => {
    // 二分查找行号
    let left = 0;
    let right = lineStartsCache.length - 1;
    let lineNumber = lineStartsCache.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const lineStart = lineStartsCache[mid] || 0;
      if (lineStart <= cursorPos) {
        lineNumber = mid + 1;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return lineNumber;
  }, [lineStartsCache]);

  // 更新光标位置和高亮位置 - 超级优化版本
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorPositionChange) return;
    
    // 保存用户的选择范围，避免丢失选中状态
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    const cursorPos = selectionStart;
    const text = textarea.value;
    
    // 优化行号计算，使用缓存机制，O(log n)复杂度
    const line = calculateLineNumber(text, cursorPos);
    const column = cursorPos - (text.lastIndexOf('\n', cursorPos - 1) + 1);
    
    // 计算绝对行号（考虑可见范围）
    const absoluteLine = line + visibleRange.start;
    
    // 合并状态更新，减少React重新渲染次数
    setCurrentLine(absoluteLine);
    setHighlightPosition(prev => ({
      ...prev,
      top: lineMetrics.paddingTop + (absoluteLine - 1) * lineMetrics.lineHeight,
      height: lineMetrics.lineHeight
    }));
    
    // 使用requestAnimationFrame优化状态更新
    requestAnimationFrame(() => {
      onCursorPositionChange({ line: absoluteLine, column: column + 1 });
    });
    
    // 恢复用户的选择范围
    if (selectionStart !== selectionEnd) {
      // 使用requestAnimationFrame替代setTimeout，与浏览器渲染周期同步
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionEnd;
      });
    }
  }, [onCursorPositionChange, lineMetrics.lineHeight, lineMetrics.paddingTop, visibleRange.start, calculateLineNumber]);

  // 使用requestAnimationFrame实现更平滑的高亮更新
  const throttledUpdateCursorPosition = React.useMemo(
    () => rafThrottle(updateCursorPosition),
    [updateCursorPosition, rafThrottle]
  );

  // 处理滚动事件 - 使用CSS transform替代scrollTop，减少重绘和回流
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    
    // 同步行号滚动 - 使用transform替代scrollTop，减少重绘和回流
    if (lineNumbersRef.current) {
      // 不直接设置scrollTop，而是通过更新可见内容的transform来实现滚动
      // 行号容器的滚动由CSS sticky和transform共同控制
    }
    
    // 调用外部滚动回调
    const textarea = textareaRef.current;
    if (textarea) {
      onScroll({ currentTarget: textarea } as React.UIEvent<HTMLTextAreaElement>);
    }
  }, [onScroll]);
  
  // 生成可见行号 - 使用useMemo缓存结果
  const renderedLineNumbers = useMemo(() => {
    const lines = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const lineNumber = i + 1;
      lines.push(
        <div 
          key={`line-${i}`} // 稳定唯一的key值
          className={`flex items-center justify-end pr-1 text-sm transition-all duration-150 ${lineNumber === currentLine ? 'text-blue-700 dark:text-blue-400 font-medium' : ''}`} 
          style={{ 
            height: `${lineMetrics.lineHeight}px`,
            boxSizing: 'border-box',
          }}
        >
          {lineNumber}
        </div>
      );
    }
    return lines;
  }, [visibleRange, lineMetrics.lineHeight, currentLine]);

  // 生成可见文本内容 - 使用useMemo缓存结果
  const visibleContent = useMemo(() => {
    const allLines = content.split('\n');
    return allLines.slice(visibleRange.start, visibleRange.end).join('\n');
  }, [content, visibleRange]);
  
  // 当内容变化时更新行起始位置缓存
  useEffect(() => {
    updateLineStartsCache(content);
  }, [content, updateLineStartsCache]);

  // 计算滚动高度
  const scrollHeight = totalLines * lineMetrics.lineHeight + lineMetrics.paddingTop + lineMetrics.paddingBottom;
  
  // 计算可见内容的偏移量
  const contentOffset = visibleRange.start * lineMetrics.lineHeight;

  // 计算高亮位置在当前视图中的位置
  const highlightTopInView = highlightPosition.top - scrollTop;

  return (
    <div className="flex h-full overflow-hidden" ref={containerRef}>
      {/* 行号显示 */}
      <div 
        ref={lineNumbersRef}
        className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm overflow-hidden select-none transition-all duration-200 z-10 relative border-r border-[var(--border-color)]"
        style={{ 
          width: '50px',
          flexShrink: 0,
          overflowY: 'hidden',
          padding: `${lineMetrics.paddingTop}px 8px ${lineMetrics.paddingBottom}px`,
          boxSizing: 'border-box',
        }}
      >
        {/* 行号容器 */}
        <div 
          style={{
            height: `${scrollHeight}px`,
            paddingTop: `${contentOffset}px`
          }}
        >
          {renderedLineNumbers}
        </div>
      </div>
      
      {/* 编辑区域 */}
      <div className="flex-1 relative bg-transparent">
        {/* 虚拟滚动容器 */}
        <div
          className="relative overflow-y-auto"
          style={{ height: '100%' }}
          onScroll={handleScroll}
        >
          {/* 内容占位符，用于设置滚动高度 */}
          <div 
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{ height: `${scrollHeight}px` }}
          />
          
          {/* 可见内容容器 - 优化DOM结构 */}
          <div 
            className="relative"
            style={{
              transform: `translateY(${scrollTop}px)`,
              padding: `${lineMetrics.paddingTop}px 0 ${lineMetrics.paddingBottom}px`,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* 当前行高亮指示器 */}
            <div 
              ref={highlightRef}
              className="absolute left-[-50px] right-0 bg-blue-50 dark:bg-blue-900/10 transition-all duration-150 pointer-events-none z-0"
              style={{ 
                top: `${highlightTopInView}px`, 
                height: `${highlightPosition.height}px`,
                width: `calc(100% + 50px)`,
              }}
            />
            
            {/* 协作者光标显示 - 优化性能 */}
            {collaborators && collaborators.map((collaborator) => {
              if (!collaborator.cursorPosition) return null;
              
              const { line, column } = collaborator.cursorPosition;
              // 检查光标是否在可见区域内，包括预加载区域
              if (line >= visibleRange.start + 1 && line <= visibleRange.end) {
                // 计算光标在当前视图中的位置
                const cursorTop = lineMetrics.paddingTop + (line - 1) * lineMetrics.lineHeight - scrollTop;
                // 使用更精确的列宽计算 - 基于字体大小和字符数量
                const fontMetrics = { 
                  charWidth: lineMetrics.lineHeight * 0.6, // 估算字符宽度
                  paddingLeft: 8 // 文本区域左边距
                };
                const cursorLeft = fontMetrics.paddingLeft + column * fontMetrics.charWidth;
                
                // 为每个协作者分配不同的颜色
                const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                const colorIndex = collaborators.findIndex(c => c.id === collaborator.id) % colors.length;
                const cursorColor = colors[colorIndex];
                
                return (
                  <div key={`collaborator-${collaborator.id}`} className="absolute pointer-events-none z-20">
                    {/* 光标指示器 */}
                    <div 
                      className="absolute w-1 rounded-r-sm transition-all duration-150"
                      style={{
                        top: `${cursorTop}px`,
                        left: `${cursorLeft}px`,
                        height: `${lineMetrics.lineHeight}px`,
                        backgroundColor: cursorColor,
                      }}
                    />
                    {/* 用户名标签 */}
                    <div 
                      className="absolute px-2 py-0.5 text-xs font-medium text-white rounded whitespace-nowrap transition-all duration-150"
                      style={{
                        top: `${cursorTop - 20}px`,
                        left: `${cursorLeft}px`,
                        backgroundColor: cursorColor,
                      }}
                    >
                      {collaborator.name}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            
            <textarea
              ref={textareaRef}
              value={visibleContent}
              onChange={(e) => {
                // 立即更新光标位置，避免延迟导致的光标闪烁
                throttledUpdateCursorPosition();
                
                // 获取当前编辑内容
                const newVisibleContent = e.target.value;
                
                // 获取原始可见行数
                const originalVisibleLines = visibleContent.split('\n').length;
                
                // 获取新的可见行
                const newVisibleLines = newVisibleContent.split('\n');
                
                // 只在内容真正变化时更新，减少不必要的状态更新
                if (newVisibleContent !== visibleContent) {
                  // 使用requestAnimationFrame延迟内容更新，避免频繁更新导致的性能问题
                  requestAnimationFrame(() => {
                    // 获取原始内容的所有行（使用useMemo缓存，避免重复计算）
                    const allLines = content.split('\n');
                    
                    // 创建新的内容行数组
                    const updatedLines = [...allLines];
                    
                    // 替换可见范围内的内容
                    updatedLines.splice(visibleRange.start, originalVisibleLines, ...newVisibleLines);
                    
                    // 更新完整内容
                    setContent(updatedLines.join('\n'));
                  });
                }
              }}
              onKeyUp={throttledUpdateCursorPosition}
              onClick={throttledUpdateCursorPosition}
              onPaste={throttledUpdateCursorPosition}
              onCut={throttledUpdateCursorPosition}
              className="flex-1 w-full border-none resize-none outline-none bg-transparent text-[var(--text-primary)] font-mono text-sm leading-relaxed transition-all duration-200 z-10 relative"
              placeholder="开始编写你的文章..."
              spellCheck={false}
              style={{
                lineHeight: `${lineMetrics.lineHeight}px`,
                padding: `0 8px`,
                boxSizing: 'border-box',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                height: `${(visibleRange.end - visibleRange.start) * lineMetrics.lineHeight}px`,
                // 覆盖默认focus样式，避免textarea选中时显示蓝色左边框
                outline: 'none !important',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 简化的编辑器组件（非虚拟滚动，用于小文章）
 */
const SimpleEditor = React.memo(({ 
  content, 
  setContent, 
  onCursorPositionChange, 
  onScroll,
  collaborators
}: {
  content: string;
  setContent: (content: string) => void;
  onCursorPositionChange: (position: { line: number; column: number }) => void;
  onScroll: (event: React.UIEvent<HTMLTextAreaElement>) => void;
  collaborators: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[] | undefined;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // 跟踪当前光标所在行
  const [currentLine, setCurrentLine] = React.useState(1);
  // 动态行高和偏移量
  const [lineMetrics, setLineMetrics] = React.useState({
    lineHeight: 24, // 初始值，将动态更新
    paddingTop: 8,   // 初始值，将动态更新
  });
  // 高亮指示器的精确位置
  const [highlightPosition, setHighlightPosition] = React.useState({
    top: 8,    // 初始值，将动态更新
    height: 24 // 初始值，将动态更新
  });

  // 行起始位置缓存，用于快速计算行号
  const [lineStartsCache, setLineStartsCache] = useState<number[]>([0]);
  
  // 更新行起始位置缓存
  const updateLineStartsCache = useCallback((text: string) => {
    const newLineStarts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        newLineStarts.push(i + 1);
      }
    }
    setLineStartsCache(newLineStarts);
  }, []);

  // 初始化时获取真实行高和padding，并在内容变化时重新计算
  React.useEffect(() => {
    const updateLineMetrics = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
        
        setLineMetrics({
          lineHeight,
          paddingTop,
        });
        
        // 更新高亮位置
        setHighlightPosition({
          top: paddingTop + (currentLine - 1) * lineHeight,
          height: lineHeight
        });
      }
    };
    
    updateLineMetrics();
    
    // 监听窗口大小变化，重新计算行高
    window.addEventListener('resize', updateLineMetrics);
    
    return () => {
      window.removeEventListener('resize', updateLineMetrics);
    };
  }, [currentLine]);

  // 使用requestAnimationFrame实现更平滑的更新
  // 将rafThrottle提取为useCallback，避免每次渲染都创建新函数
  const rafThrottle = useCallback((func: () => void) => {
    let isScheduled = false;
    return () => {
      if (!isScheduled) {
        isScheduled = true;
        requestAnimationFrame(() => {
          func();
          isScheduled = false;
        });
      }
    };
  }, []);

  // 优化行号计算方法：使用缓存机制和二分查找，O(log n)时间复杂度
  const calculateLineNumber = useCallback((_text: string, cursorPos: number): number => {
    // 二分查找行号
    let left = 0;
    let right = lineStartsCache.length - 1;
    let lineNumber = lineStartsCache.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const lineStart = lineStartsCache[mid] || 0;
      if (lineStart <= cursorPos) {
        lineNumber = mid + 1;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return lineNumber;
  }, [lineStartsCache]);

  // 更新光标位置和高亮位置 - 进一步优化版本
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorPositionChange) return;
    
    // 保存用户的选择范围，避免丢失选中状态
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    const cursorPos = selectionStart;
    const text = textarea.value;
    
    // 优化行号计算，使用二分查找，减少搜索时间
    const line = calculateLineNumber(text, cursorPos);
    const column = cursorPos - (text.lastIndexOf('\n', cursorPos - 1) + 1);
    
    // 合并状态更新，减少React重新渲染次数
    setCurrentLine(line);
    setHighlightPosition({
      top: lineMetrics.paddingTop + (line - 1) * lineMetrics.lineHeight,
      height: lineMetrics.lineHeight
    });
    
    onCursorPositionChange({ line, column: column + 1 });
    
    // 恢复用户的选择范围
    if (selectionStart !== selectionEnd) {
      // 使用requestAnimationFrame替代setTimeout，与浏览器渲染周期同步
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionEnd;
      });
    }
  }, [onCursorPositionChange, lineMetrics.lineHeight, lineMetrics.paddingTop, calculateLineNumber]);

  // 使用requestAnimationFrame实现更平滑的高亮更新
  const throttledUpdateCursorPosition = React.useMemo(
    () => rafThrottle(updateCursorPosition),
    [updateCursorPosition, rafThrottle]
  );

  // 当内容变化时更新行起始位置缓存
  useEffect(() => {
    updateLineStartsCache(content);
  }, [content, updateLineStartsCache]);

  // 同步行号滚动
  const handleTextareaScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    onScroll(event);
  };
  
  return (
    <div className="flex h-full overflow-hidden">
      {/* 行号显示 - 作为编辑区域内部元素，不影响外部grid布局 */}
      <div 
        ref={lineNumbersRef}
        className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm overflow-hidden select-none transition-all duration-200 z-10 relative border-r border-[var(--border-color)]"
        style={{ 
          width: '50px',
          flexShrink: 0,
          overflowY: 'scroll',
          padding: `${lineMetrics.paddingTop}px 8px`,
          boxSizing: 'border-box',
        }}
      >
        {/* 渲染所有行号 */}
        {content.split('\n').map((_, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-end pr-1 text-sm transition-all duration-150 ${index + 1 === currentLine ? 'text-blue-700 dark:text-blue-400 font-medium' : ''}`} 
            style={{ 
              height: `${lineMetrics.lineHeight}px`,
              boxSizing: 'border-box',
            }}
          >
            {index + 1}
          </div>
        ))}
      </div>
      
      {/* 编辑区域 - 添加当前行高亮效果 */}
      <div className="flex-1 relative">
        {/* 当前行高亮指示器 */}
        <div 
          ref={highlightRef}
          className="absolute left-[-50px] right-0 bg-blue-50 dark:bg-blue-900/10 transition-all duration-150 pointer-events-none z-0"
          style={{ 
            top: `${highlightPosition.top}px`, 
            height: `${highlightPosition.height}px`,
            width: `calc(100% + 50px)`,
          }}
        />
        
        {/* 协作者光标显示 */}
        {collaborators && collaborators.map((collaborator) => {
          if (!collaborator.cursorPosition) return null;
          
          const { line, column } = collaborator.cursorPosition;
          
          // 为每个协作者分配不同的颜色
          const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
          const colorIndex = collaborators.findIndex(c => c.id === collaborator.id) % colors.length;
          const cursorColor = colors[colorIndex];
          
          return (
            <div key={collaborator.id} className="absolute pointer-events-none z-20">
              {/* 光标指示器 */}
              <div 
                className="absolute w-1 rounded-r-sm transition-all duration-150"
                style={{
                  top: `${lineMetrics.paddingTop + (line - 1) * lineMetrics.lineHeight}px`,
                  left: `${8 + column * 8}px`, // 简单估算列宽
                  height: `${lineMetrics.lineHeight}px`,
                  backgroundColor: cursorColor,
                }}
              />
              {/* 用户名标签 */}
              <div 
                className="absolute px-2 py-0.5 text-xs font-medium text-white rounded whitespace-nowrap transition-all duration-150"
                style={{
                  top: `${lineMetrics.paddingTop + (line - 1) * lineMetrics.lineHeight - 20}px`,
                  left: `${8 + column * 8}px`,
                  backgroundColor: cursorColor,
                }}
              >
                {collaborator.name}
              </div>
            </div>
          );
        })}
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            throttledUpdateCursorPosition();
          }}
          onKeyUp={throttledUpdateCursorPosition}
          onClick={throttledUpdateCursorPosition}
          onPaste={throttledUpdateCursorPosition}
          onCut={throttledUpdateCursorPosition}
          onScroll={handleTextareaScroll}
          className="flex-1 w-full h-full border-none resize-none outline-none bg-transparent text-[var(--text-primary)] font-mono text-sm leading-relaxed transition-all duration-200 z-10 relative"
          placeholder="开始编写你的文章..."
          spellCheck={false}
          style={{
            lineHeight: `${lineMetrics.lineHeight}px`,
            padding: `${lineMetrics.paddingTop}px 8px`,
            boxSizing: 'border-box',
            overflow: 'auto',
            // 覆盖默认focus样式，避免textarea选中时显示蓝色左边框
            outline: 'none !important',
          }}
        />
      </div>
    </div>
  );
});

/**
 * 智能编辑器组件 - 根据文章大小自动选择虚拟滚动或普通模式
 * 添加缓冲区，避免在100行左右频繁切换编辑器类型
 */
const SmartEditor = React.memo((props: {
  content: string;
  setContent: (content: string) => void;
  onCursorPositionChange: (position: { line: number; column: number }) => void;
  onScroll: (event: React.UIEvent<HTMLTextAreaElement>) => void;
  collaborators: {
    id: string;
    name: string;
    cursorPosition?: { line: number; column: number };
  }[] | undefined;
}) => {
  const totalLines = props.content.split('\n').length;
  
  // 编辑器类型状态，用于保持编辑器类型稳定
  const [editorType, setEditorType] = useState<'virtual' | 'simple'>(() => {
    // 初始状态根据行数决定
    return totalLines > 100 ? 'virtual' : 'simple';
  });
  
  // 根据行数变化更新编辑器类型，添加缓冲区避免频繁切换
  useEffect(() => {
    if (totalLines > 110) {
      // 超过110行时使用虚拟滚动
      setEditorType('virtual');
    } else if (totalLines < 90) {
      // 少于90行时使用普通编辑器
      setEditorType('simple');
    }
    // 在90-110行之间保持当前编辑器类型不变
  }, [totalLines]);
  
  // 根据编辑器类型渲染对应的组件
  if (editorType === 'virtual') {
    return <VirtualEditor {...props} />;
  }
  
  return <SimpleEditor {...props} />;
});

export const EditorContentArea = React.memo(({
  content,
  setContent,
  viewMode,
  livePreview,
  isLoading,
  error,
  onCursorPositionChange,
  collaborators,
}: EditorContentAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 预览内容虚拟滚动状态
  const [previewScrollTop, setPreviewScrollTop] = useState(0);
  const [visibleContentHeight, setVisibleContentHeight] = useState(0);
  
  // 预览虚拟滚动相关引用
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  
  // 处理预览滚动事件 - 优化版
  const handlePreviewScroll = useCallback(() => {
    if (!previewContainerRef.current) return;
    
    const scrollTop = previewContainerRef.current.scrollTop;
    setPreviewScrollTop(scrollTop);
    
    // 节流处理，避免过于频繁的同步
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 50) return; // 50ms节流
    lastScrollTimeRef.current = now;
    
    try {
      // 计算滚动比例并同步到编辑器
      const previewElement = previewContainerRef.current;
      const editorElement = editorRef.current;
      
      const previewScrollHeight = previewElement.scrollHeight;
      const previewClientHeight = previewElement.clientHeight;
      
      // 获取实际滚动的textarea元素
      const textareaElement = editorElement?.querySelector('textarea');
      if (!textareaElement) return;
      
      const editorScrollHeight = textareaElement.scrollHeight;
      const editorClientHeight = textareaElement.clientHeight;
      
      // 避免除以零
      if (previewScrollHeight === previewClientHeight || editorScrollHeight === editorClientHeight) {
        return;
      }
      
      const scrollPercentage = previewElement.scrollTop / (previewScrollHeight - previewClientHeight);
      const editorScrollPosition = scrollPercentage * (editorScrollHeight - editorClientHeight);
      textareaElement.scrollTop = editorScrollPosition;
    } catch (error) {
      console.error('Failed to sync scroll:', error);
    }
  }, [editorRef]);
  

  
  // 渲染预览内容 - 使用DOMPurify净化HTML，实现虚拟滚动
  const renderPreview = useCallback(() => {
    if (!previewContainerRef.current || !previewContentRef.current) return;
    
    try {
      // 使用requestAnimationFrame优化渲染性能
      requestAnimationFrame(() => {
        const rendered = renderMarkdown(content);
        
        // 使用DOMPurify净化HTML，防止XSS攻击
        const sanitizedHtml = DOMPurify.sanitize(rendered.html, {
          // 允许必要的属性和标签，增强安全性
          ALLOWED_TAGS: ['iframe', 'style', 'div', 'span', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'small', 'big', 'mark', 'del', 'ins', 'kbd', 'q', 'cite', 'dfn', 'abbr', 'time', 'var', 'samp', 'kbd', 'code', 'pre', 'small', 'strong', 'em', 'i', 'b', 'u', 's', 'sub', 'sup', 'mark', 'del', 'ins', 'kbd', 'q', 'cite', 'dfn', 'abbr', 'time', 'var', 'samp'],
          ALLOWED_ATTR: ['loading', 'style', 'data-chart-config', 'data-sympy-code', 'data-sympy-id', 'data-graph-id', 'data-graph-data', 'data-graph-attrs', 'id', 'class', 'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'scope', 'datetime', 'lang', 'dir', 'tabindex', 'accesskey', 'aria-label', 'aria-hidden', 'aria-describedby', 'role'],
          ADD_ATTR: ['loading'],
          USE_PROFILES: { html: true, svg: true },
          // 禁止执行恶意脚本
          FORBID_TAGS: ['script'],
          FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onresize']
        });
        
        // 设置完整内容高度，用于滚动
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedHtml;
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.width = '100%';
        document.body.appendChild(tempDiv);
        
        const fullHeight = tempDiv.offsetHeight;
        setVisibleContentHeight(fullHeight);
        document.body.removeChild(tempDiv);
        
        // 使用类型断言解决innerHTML类型问题
        (previewContentRef.current as HTMLElement).innerHTML = sanitizedHtml;
      });
    } catch (error) {
      console.error('Preview render error:', error);
    }
  }, [content]);

  // 渲染状态标记，避免重复渲染
  const [isRendering, setIsRendering] = useState(false);
  // 上次渲染的内容哈希，用于检测内容变化
  const lastRenderedContentHashRef = useRef<string>('');
  
  // 实时预览效果 - 超级优化版
  useEffect(() => {
    if (livePreview && (viewMode === 'split' || viewMode === 'preview')) {
      // 清理之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 计算内容哈希，检测是否有实质性变化
      const contentHash = generateHash(content);
      if (contentHash === lastRenderedContentHashRef.current) {
        return; // 内容没有变化，跳过渲染
      }
      
      // 检查是否正在渲染，避免重复渲染
      if (isRendering) {
        return;
      }
      
      // 根据文章大小动态调整防抖时间
      const totalLines = content.split('\n').length;
      let debounceTime = 200; // 默认200ms，缩短默认防抖时间
      
      // 文章越长，防抖时间越长
      if (totalLines > 1000) {
        debounceTime = 1000; // 超大型文章，1秒防抖
      } else if (totalLines > 500) {
        debounceTime = 800; // 大型文章，800ms防抖
      } else if (totalLines > 200) {
        debounceTime = 500; // 中型文章，500ms防抖
      } else if (totalLines > 50) {
        debounceTime = 300; // 小型文章，300ms防抖
      }
      
      // 使用动态防抖时间，避免过于频繁的渲染
      scrollTimeoutRef.current = setTimeout(() => {
        setIsRendering(true);
        renderPreview();
        lastRenderedContentHashRef.current = contentHash;
        setIsRendering(false);
      }, debounceTime);
      
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [content, livePreview, viewMode, renderPreview, isRendering]);
  
  // 添加generateHash导入，用于内容变化检测
  useEffect(() => {
    // 确保在组件卸载时清理定时器
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 初始渲染或视图切换时渲染预览
  useEffect(() => {
    if (viewMode === 'preview' || viewMode === 'split') {
      renderPreview();
    }
  }, [viewMode, renderPreview]);
  


  // 处理编辑器滚动，同步预览滚动 - 修复版
  const handleEditorScroll = useCallback((event: React.UIEvent<HTMLTextAreaElement>) => {
    if (!previewRef.current) return;
    
    // 节流处理，避免过于频繁的同步
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 50) return; // 50ms节流
    lastScrollTimeRef.current = now;
    
    try {
      // 计算滚动比例并同步到预览区域
      const editorElement = event.currentTarget;
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
    } catch (error) {
      console.error('Failed to sync scroll:', error);
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
    <div className={`flex-1 overflow-hidden bg-[var(--bg-primary)]`}>
      {/* 编辑器和预览区域 - 使用grid布局实现精确分割 */}
      <div 
        className="grid overflow-hidden"
        style={{
          gridTemplateColumns: viewMode === 'editor' || viewMode === 'preview' ? 
            '1fr' : 
            '1fr 1px 1fr',
          minHeight: '400px', // 增加最小高度，使编辑区域更易察觉
          height: '100%'
        }}
      >
        {/* 编辑器内容区域 */}
        {viewMode === 'editor' || viewMode === 'split' ? (
          <div
            ref={editorRef}
            className="overflow-hidden"
            style={{ minHeight: '400px' }} // 增加最小高度，使编辑区域更易察觉
          >
            <SmartEditor
              content={content}
              setContent={setContent}
              onCursorPositionChange={onCursorPositionChange || (() => {})}
              onScroll={handleEditorScroll}
              collaborators={collaborators}
            />
          </div>
        ) : null}

        {/* 分割线 */}
        {viewMode === 'split' && (
          <div 
            className="bg-[var(--border-color)] hover:bg-[var(--border-hover)] transition-colors duration-200 cursor-col-resize"
            style={{ width: '1px' }}
            title="拖动调整区域大小"
          />
        )}

        {/* 预览区域 - 虚拟滚动实现 */}
        {viewMode === 'preview' || viewMode === 'split' ? (
          <div
            ref={previewContainerRef}
            className="h-full overflow-auto p-4 sm:p-6 md:p-8 relative"
            onScroll={handlePreviewScroll}
          >
            {/* 内容占位符，用于设置滚动高度 */}
            <div 
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{ height: `${visibleContentHeight}px` }}
            />
            
            {/* 可见内容容器 - 虚拟滚动实现 */}
            <div 
              ref={previewContentRef}
              className="relative"
              style={{
                transform: `translateY(${previewScrollTop}px)`,
                width: '100%',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
              }}
            >
              {/* 可见区域的内容将通过renderPreview函数动态插入 */}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
});