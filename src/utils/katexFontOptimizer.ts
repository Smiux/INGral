// KaTeX字体优化工具

/**
 * 预加载KaTeX字体以提高渲染性能
 * 这个函数会创建预加载链接，帮助浏览器提前缓存字体文件
 */
export function preloadKaTeXFONTS() {
  try {
    // KaTeX字体URL列表
    const katexFontUrls = [
      // 主字体文件
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Main-Regular.woff2',
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Main-Bold.woff2',
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Main-Italic.woff2',
      // 数学符号字体
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Math-Italic.woff2',
      // 加粗字体 - 注意：KaTeX_Bold.woff2可能不存在于所有版本中
      // 脚本字体
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Script-Regular.woff2',
      // 无衬线字体
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_SansSerif-Regular.woff2',
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_SansSerif-Bold.woff2',
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_SansSerif-Italic.woff2',
      // 打字机字体
      'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Typewriter-Regular.woff2',
    ];

    // 检查浏览器支持
    if (typeof document !== 'undefined' && 'fonts' in document) {
      // 创建预加载链接 - 使用try-catch确保单个字体加载失败不影响整体
      katexFontUrls.forEach(url => {
        try {
          // 避免重复添加
          if (!document.querySelector(`link[href="${url}"][rel="preload"]`)) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.href = url;
            link.type = 'font/woff2';
            link.crossOrigin = 'anonymous';

            // 添加错误处理
            link.onerror = () => {
              console.warn(`字体预加载失败: ${url}`);
              // 移除失败的链接
              if (link.parentNode) {
                link.parentNode.removeChild(link);
              }
            };

            document.head.appendChild(link);
          }
        } catch (error) {
          console.warn(`添加字体预加载链接失败: ${url}`, error);
        }
      });

      // 使用Font Loading API预加载关键字体
      const criticalFonts = [
        'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Main-Regular.woff2',
        'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/fonts/KaTeX_Math-Italic.woff2',
      ];

      criticalFonts.forEach(fontUrl => {
        const fontFace = new FontFace(
          'KaTeX_Font',
          `url(${fontUrl}) format('woff2')`,
          { style: 'normal', weight: 'normal' },
        );
        fontFace.load().catch(error => {
          console.warn('KaTeX字体预加载失败:', error);
        });
      });
    }
  } catch (error) {
    console.warn('KaTeX字体预加载过程中出错，但不会阻止UI渲染:', error);
  }
}

/**
 * 延迟加载KaTeX模块，避免阻塞初始渲染
 * @returns Promise<{ katex: { render: (formula: string, element: HTMLElement, options?: KaTeXOptions) => void; renderToString: (formula: string, options?: KaTeXOptions) => string; version: string }, renderToString: (formula: string, options?: KaTeXOptions) => string }>
 */
export async function loadKaTeX() {
  // 使用动态导入延迟加载KaTeX
  const katexModule = await import('katex');

  return {
    katex: katexModule.default,
    renderToString: katexModule.default.renderToString,
  };
}

/**
 * 缓存渲染过的LaTeX内容，避免重复渲染
 */
export class LaTeXCache {
  private cache = new Map<string, string>();
  private maxSize = 100; // 最大缓存条目数

  /**
   * 获取缓存的渲染结果
   */
  get(expression: string, displayMode: boolean): string | undefined {
    const key = this.getKey(expression, displayMode);
    return this.cache.get(key);
  }

  /**
   * 将渲染结果添加到缓存
   * @param expression LaTeX表达式
   * @param displayMode 是否为显示模式
   * @param result 渲染结果
   */
  set(expression: string, displayMode: boolean, result: string): void {
    const key = this.getKey(expression, displayMode);

    // 缓存满了，移除最早的条目
    if (this.cache.size >= this.maxSize) {
      // 删除最早的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 生成缓存键
   */
  private getKey(expression: string, displayMode: boolean): string {
    return `${displayMode ? 'block' : 'inline'}:${expression}`;
  }
}

// 创建全局LaTeX缓存实例
export const latexCache = new LaTeXCache();
