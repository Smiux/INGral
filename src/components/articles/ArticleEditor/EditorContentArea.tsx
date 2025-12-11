/**
 * 编辑器内容区域组件
 * 包含编辑和预览视图，支持实时预览和行号显示
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { renderMarkdown } from '../../../utils/markdown';
import { Loader } from '../../ui/Loader';

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
 * 简化的编辑器组件
 * 确保textarea能够正常工作，提供良好的编辑体验
 */
const SimpleEditor = React.memo(({
  content,
  setContent,
  showLineNumbers,
  onCursorPositionChange,
  onScroll,
}: {
  content: string;
  setContent: (content: string) => void;
  showLineNumbers: boolean;
  onCursorPositionChange: (position: { line: number; column: number }) => void;
  onScroll: (event: React.UIEvent<HTMLTextAreaElement>) => void;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 更新光标位置
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorPositionChange) return;
    
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    const line = text.substring(0, cursorPos).split('\n').length;
    const column = cursorPos - (text.substring(0, cursorPos).lastIndexOf('\n') + 1);
    onCursorPositionChange({ line, column: column + 1 });
  }, [onCursorPositionChange]);
  
  return (
    <div className="flex h-full overflow-hidden">
      {/* 行号显示 */}
      {showLineNumbers && (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm py-2 overflow-hidden select-none" style={{ minWidth: '50px' }}>
          {content.split('\n').map((_, index) => (
            <div key={index} className="flex items-center justify-end pr-3 text-sm" style={{ height: '24px' }}>
              {index + 1}
            </div>
          ))}
        </div>
      )}
      
      {/* 编辑区域 - 直接使用flex布局，让textarea占满空间 */}
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
        onScroll={onScroll}
        className="flex-1 w-full border-none resize-none outline-none bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed"
        placeholder="开始编写你的文章..."
        spellCheck={false}
        style={{
          lineHeight: '24px',
          padding: '8px',
          minHeight: '400px',
          overflow: 'auto',
        }}
      />
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

  // 处理预览滚动，同步编辑器滚动 - 修复版
  const handlePreviewScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;
    
    // 节流处理，避免过于频繁的同步
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 50) return; // 50ms节流
    lastScrollTimeRef.current = now;
    
    try {
      // 计算滚动比例并同步到编辑器
      const previewElement = previewRef.current;
      const editorElement = editorRef.current;
      
      const previewScrollHeight = previewElement.scrollHeight;
      const previewClientHeight = previewElement.clientHeight;
      
      // 获取实际滚动的textarea元素
      const textareaElement = editorElement.querySelector('textarea');
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
    <div className={`flex-1 overflow-hidden bg-[var(--bg-primary)] ${viewMode === 'split' ? 'flex' : ''}`}>
      {/* 编辑器内容区域 */}
      {viewMode === 'editor' || viewMode === 'split' ? (
        <div
          ref={editorRef}
          className="h-full overflow-hidden flex-1"
        >
          <SimpleEditor
            content={content}
            setContent={setContent}
            showLineNumbers={showLineNumbers}
            onCursorPositionChange={onCursorPositionChange || (() => {})}
            onScroll={handleEditorScroll}
          />
        </div>
      ) : null}

      {/* 仅在split模式下显示分割线 */}
      {viewMode === 'split' && (
        <div className="w-px bg-[var(--border-color)] flex-shrink-0" />
      )}

      {/* 预览区域 */}
      {viewMode === 'preview' || viewMode === 'split' ? (
        <div
          ref={previewRef}
          className="h-full overflow-auto p-4 sm:p-6 md:p-8 flex-1"
          onScroll={handlePreviewScroll}
        >
          {/* 预览内容将通过renderPreview函数动态插入 */}
        </div>
      ) : null}
    </div>
  );
});