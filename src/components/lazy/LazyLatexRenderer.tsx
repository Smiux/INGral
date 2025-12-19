import { Suspense, useState, useEffect, memo } from 'react';
import { Loader } from '../ui/Loader';
import { latexCache, loadKaTeX } from '../../utils/katexFontOptimizer';

interface LatexRendererProps {
  content: string;
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
}

// 创建一个自定义的渲染组件，集成缓存机制
const CachedLatexRenderer = ({
  content,
  displayMode = false,
  throwOnError = false,
  errorColor = '#cc0000'
}: LatexRendererProps) => {
  const [renderedHTML, setRenderedHTML] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 首先检查缓存
    const cachedResult = latexCache.get(content, displayMode);
    if (cachedResult) {
      setRenderedHTML(cachedResult);
      setIsLoading(false);
      return;
    }

    // 缓存未命中，加载KaTeX并渲染
    const renderLatex = async () => {
      try {
        const { katex } = await loadKaTeX();
        const result = katex.renderToString(content, {
          displayMode,
          throwOnError,
          errorColor,
          'strict': 'warn',
          'trust': false
        });

        // 缓存结果
        latexCache.set(content, displayMode, result);
        setRenderedHTML(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '渲染错误');
      } finally {
        setIsLoading(false);
      }
    };

    renderLatex();
  }, [content, displayMode, throwOnError, errorColor]);

  if (isLoading) {
    return (
      <span className="inline-block w-4 h-4 animate-pulse text-gray-400">
        <Loader size="small" />
      </span>
    );
  }

  if (error) {
    return (
      <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-sm">
        LaTeX错误: {error}
      </span>
    );
  }

  return (
    <span
      className={displayMode ? 'block' : 'inline'}
      dangerouslySetInnerHTML={{ '__html': renderedHTML || '' }}
    />
  );
};

// 使用memo优化，避免不必要的重新渲染
const MemoizedLatexRenderer = memo(CachedLatexRenderer);

// 动态导入KaTeX CSS样式
const loadKaTeXCss = () => {
  import('katex/dist/katex.min.css');
};

// 创建懒加载的LaTeX渲染组件
export const LazyLatexRenderer = ({
  content,
  displayMode = false,
  throwOnError = false,
  errorColor = '#cc0000'
}: LatexRendererProps) => {
  // 组件挂载时预加载KaTeX CSS
  useEffect(() => {
    loadKaTeXCss();
  }, []);

  return (
    <Suspense
      fallback={
        <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader size="small" />
          <span>渲染LaTeX公式...</span>
        </div>
      }
    >
      <MemoizedLatexRenderer
        content={content}
        displayMode={displayMode}
        throwOnError={throwOnError}
        errorColor={errorColor}
      />
    </Suspense>
  );
};
