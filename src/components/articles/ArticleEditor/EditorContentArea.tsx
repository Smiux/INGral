import { useEffect, useRef, useCallback } from 'react';
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
}

export function EditorContentArea({
  content,
  setContent,
  viewMode,
  livePreview,
  showLineNumbers,
  isLoading,
  error,
}: EditorContentAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 渲染预览内容
  const renderPreview = useCallback(() => {
    if (!previewRef.current) return;
    
    const rendered = renderMarkdown(content);
    previewRef.current.innerHTML = rendered.html;
    
    // 执行预览中的脚本
    const scripts = previewRef.current.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const currentScript = scripts[i];
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
    }
  }, [content]);

  // 实时预览效果
  useEffect(() => {
    if (livePreview && (viewMode === 'split' || viewMode === 'preview')) {
      const timer = setTimeout(() => {
        renderPreview();
      }, 300); // 300ms防抖，避免过于频繁的渲染
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [content, livePreview, viewMode, renderPreview]);

  // 初始渲染或视图切换时渲染预览
  useEffect(() => {
    if (viewMode === 'preview' || viewMode === 'split') {
      renderPreview();
    }
  }, [viewMode, renderPreview]);

  // 处理编辑器滚动，同步预览滚动
  const handleEditorScroll = () => {
    if (!textareaRef.current || !previewRef.current || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    
    // 计算滚动比例并同步到预览区域
    const scrollPercentage = textareaRef.current.scrollTop / (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
    const previewScrollPosition = scrollPercentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    previewRef.current.scrollTop = previewScrollPosition;
    
    isSyncingRef.current = false;
  };

  // 处理预览滚动，同步编辑器滚动
  const handlePreviewScroll = () => {
    if (!textareaRef.current || !previewRef.current || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    
    // 计算滚动比例并同步到编辑器
    const scrollPercentage = previewRef.current.scrollTop / (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    const editorScrollPosition = scrollPercentage * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
    textareaRef.current.scrollTop = editorScrollPosition;
    
    isSyncingRef.current = false;
  };

  // 渲染行号
  const renderLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current) return;
    
    const lineCount = content.split('\n').length;
    const lines = [];
    
    for (let i = 1; i <= lineCount; i++) {
      lines.push(
        <div key={i} className="text-right pr-2 text-gray-500 dark:text-gray-400 text-sm line-height-24">
          {i}
        </div>
      );
    }
    
    lineNumbersRef.current.innerHTML = '';
    lines.forEach(line => {
      lineNumbersRef.current?.appendChild(line as unknown as Node);
    });
  }, [content]);

  // 内容变化时更新行号
  useEffect(() => {
    if (showLineNumbers) {
      renderLineNumbers();
    }
  }, [content, showLineNumbers, renderLineNumbers]);

  // 加载状态处理
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <Loader size="large" text="加载文章中..." />
      </div>
    );
  }

  // 错误状态处理
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">加载失败</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
      {/* 编辑器内容区域 */}
      {viewMode === 'editor' || viewMode === 'split' ? (
        <div className={`flex h-full overflow-hidden ${viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : ''}`}>
          {/* 行号显示 */}
          {showLineNumbers && (
            <div
              ref={lineNumbersRef}
              className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm py-2 overflow-hidden select-none"
              style={{ minWidth: '50px' }}
            />
          )}
          
          {/* 编辑区域 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleEditorScroll}
            className="flex-1 w-full h-full py-2 px-4 border-none resize-none outline-none bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed"
            placeholder="开始编写你的文章..."
            spellCheck={false}
            style={{ lineHeight: '24px' }}
          />
        </div>
      ) : null}

      {/* 预览区域 */}
      {viewMode === 'preview' || viewMode === 'split' ? (
        <div
          ref={previewRef}
          className={`h-full overflow-auto p-6 ${viewMode === 'split' ? 'w-1/2' : ''}`}
          onScroll={handlePreviewScroll}
        >
          {/* 预览内容将通过renderPreview函数动态插入 */}
        </div>
      ) : null}
    </div>
  );
}
