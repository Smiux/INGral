/**
 * Markdown 处理工具
 *
 * 功能特性：
 * - Markdown 转 HTML 渲染
 * - Wiki 链接支持（[[Title|Display Text]]）
 * - 数学公式（KaTeX）支持（$inline$ 和 $$block$$）
 * - Mermaid 图表支持
 * - Chart.js 图表支持
 * - 标题转 Slug 功能
 * - Wiki 链接提取功能
 * - Markdown 清理和摘要生成
 * - 引用管理系统
 * - 增强的缓存机制
 * - 知识图谱嵌入支持
 */
import MarkdownIt from 'markdown-it';
import 'katex/dist/katex.min.css';

/**
 * 引用数据接口
 */
export interface Citation {
  id: string;
  type: 'url' | 'doi' | 'isbn' | 'book' | 'article' | 'website';
  content: string;
  metadata?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    year?: number;
    url?: string;
    doi?: string;
    isbn?: string;
    journal?: string;
    volume?: number;
    issue?: number;
    pages?: string;
  };
  position: number;
  count: number;
}

/**
 * 引用格式类型
 */
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee';

/**
 * 从Markdown内容中提取所有引用
 * @param content Markdown内容
 * @returns 提取的引用数组
 */
export function extractCitations (content: string): Citation[] {
  const citations: Citation[] = [];
  const citationRegex = /\[\^(\w+):\s*([^\]]+)\]/g;
  let match;
  // 使用Map优化查找性能
  const contentMap = new Map<string, Citation>();

  while ((match = citationRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      const type = match[1].toLowerCase() as Citation['type'];
      const citationContent = match[2].trim();

      // 检查是否已存在相同内容的引用，使用Map优化查找
      const existingCitation = contentMap.get(citationContent);

      if (existingCitation) {
        // 更新引用计数
        existingCitation.count += 1;
      } else {
        // 添加新引用
        const newCitation = {
          'id': `citation-${citations.length + 1}`,
          type,
          'content': citationContent,
          'position': match.index,
          'count': 1
        };
        citations.push(newCitation);
        contentMap.set(citationContent, newCitation);
      }
    }
  }

  return citations;
}

/**
 * 格式化APA风格引用
 * @param citation 引用对象
 * @returns APA格式引用
 */
function formatApaCitation (citation: Citation): string {
  const { metadata, type, content } = citation;

  if (metadata) {
    const { authors, year, title, publisher, journal, volume, issue, pages, doi, url } = metadata;

    if (type === 'article' && authors && title && journal && year) {
      // 期刊文章
      const authorStr = authors.join(', ');
      const pagesStr = pages ? `, ${pages}` : '';
      const volumeIssueStr = issue ? `${volume}(${issue})` : `${volume}`;
      return `${authorStr} (${year}). ${title}. ${journal}, ${volumeIssueStr}${pagesStr}. ${doi || url}`;
    }

    if (type === 'book' && authors && title && publisher && year) {
      // 书籍
      const authorStr = authors.join(', ');
      return `${authorStr} (${year}). ${title}. ${publisher}. ${doi || url}`;
    }

    if (type === 'website' && title && url && year) {
      // 网站
      const authorStr = authors ? `${authors.join(', ')} ` : '';
      return `${authorStr}(${year}). ${title}. Retrieved from ${url}`;
    }
  }

  // 简单格式
  return `${content} (${new Date().getFullYear()})`;
}

/**
 * 格式化MLA风格引用
 * @param citation 引用对象
 * @returns MLA格式引用
 */
function formatMlaCitation (citation: Citation): string {
  const { metadata, type, content } = citation;

  if (metadata) {
    const { authors, title, journal, volume, issue, pages, year, publisher, url } = metadata;

    if (type === 'article' && authors && title && journal && year) {
      // 期刊文章
      const authorStr = authors.join(', ');
      const pagesStr = pages ? ` ${pages}` : '';
      return `${authorStr}. "${title}." ${journal}, vol. ${volume}, no. ${issue}, ${year}, p${pagesStr}. ${url || content}`;
    }

    if (type === 'book' && authors && title && publisher && year) {
      // 书籍
      const authorStr = authors.join(', ');
      return `${authorStr}. ${title}. ${publisher}, ${year}.`;
    }

    if (type === 'website' && title && url) {
      // 网站
      const authorStr = authors ? `${authors.join(', ')}. ` : '';
      const yearStr = year ? `${year}. ` : '';
      return `${authorStr}${title}. ${yearStr}Web. ${new Date().toLocaleDateString()}.`;
    }
  }

  // 简单格式
  return `${content}`;
}

/**
 * 格式化Chicago风格引用
 * @param citation 引用对象
 * @returns Chicago格式引用
 */
function formatChicagoCitation (citation: Citation): string {
  const { metadata, type, content } = citation;

  if (metadata) {
    const { authors, title, publisher, year, journal, volume, issue, pages, doi, url } = metadata;

    if (type === 'article' && authors && title && journal && year) {
      // 期刊文章
      const authorStr = authors.join(', ');
      const pagesStr = pages ? `: ${pages}` : '';
      const volumeIssueStr = issue ? `${volume}, no. ${issue} (${year})` : `${volume} (${year})`;
      return `${authorStr}. "${title}." ${journal} ${volumeIssueStr}${pagesStr}. ${doi || url}`;
    }

    if (type === 'book' && authors && title && publisher && year) {
      // 书籍
      const authorStr = authors.join(', ');
      return `${authorStr}. ${title}. ${publisher}, ${year}.`;
    }
  }

  // 简单格式
  return `${content}, ${new Date().getFullYear()}`;
}


/**
 * 格式化IEEE风格引用
 * @param citation 引用对象
 * @param index 引用索引
 * @returns IEEE格式引用
 */
function formatIeeeCitation (citation: Citation, index: number): string {
  const { metadata, type, content } = citation;

  if (metadata) {
    const { authors, title, publisher, year, journal, volume, issue, pages, doi, url } = metadata;

    if (type === 'article' && authors && title && journal && year) {
      // 期刊文章
      const authorStr = authors.map((author, i) => i < 3 ? author : 'et al.').join(', ');
      const pagesStr = pages ? `, pp. ${pages}` : '';
      return `[${index}] ${authorStr}, "${title}," ${journal}, vol. ${volume}, no. ${issue},${pagesStr}, ${year}. ${doi || url}`;
    }

    if (type === 'book' && authors && title && publisher && year) {
      // 书籍
      const authorStr = authors.map((author, i) => i < 3 ? author : 'et al.').join(', ');
      return `[${index}] ${authorStr}, ${title}. ${publisher}, ${year}. ${doi || url}`;
    }
  }

  // 简单格式
  return `[${index}] ${content}, ${new Date().getFullYear()}`;
}

/**
 * 格式化单条引用
 * @param citation 引用对象
 * @param style 引用格式
 * @param index 引用索引（用于IEEE格式）
 * @returns 格式化后的引用字符串
 */
export function formatCitation (citation: Citation, style: CitationStyle, index?: number): string {
  const { content } = citation;

  switch (style) {
    case 'apa':
      return formatApaCitation(citation);
    case 'mla':
      return formatMlaCitation(citation);
    case 'chicago':
      return formatChicagoCitation(citation);
    case 'ieee':
      return formatIeeeCitation(citation, index || 1);
    default:
      return content;
  }
}

/**
 * 生成参考文献列表HTML
 * @param citations 引用数组
 * @param style 引用格式
 * @returns 参考文献HTML
 */
export function generateBibliography (citations: Citation[], style: CitationStyle = 'apa'): string {
  if (citations.length === 0) {
    return '<p class="text-gray-500 dark:text-gray-400">No citations found</p>';
  }

  let html = '<div class="bibliography">\n<h2>参考文献</h2>\n<ol class="citation-list space-y-2">\n';

  citations.forEach((citation, index) => {
    const formattedCitation = formatCitation(citation, style, index + 1);
    html += `<li id="cite-${citation.id}" class="citation-item">${formattedCitation}</li>\n`;
  });

  html += '</ol>\n</div>\n';

  return html;
}

/**
 * 处理Markdown内容中的引用
 * @param text Markdown内容
 * @returns 处理后的内容
 */
function processCitations (text: string): string {
  return text.replace(/\[\^(\w+):\s*([^\]]+)\]/g, (_match, type, content) => {
    // 生成唯一引用ID
    const id = `cite-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return `<sup><a href="#${id}" class="citation-ref">[${type}:${content.substring(0, 20)}${content.length > 20 ? '...' : ''}]</a></sup>`;
  });
}


import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';

/**
 * Markdown渲染缓存配置 - 优化版
 */
// 缓存配置
const CACHE_CONFIG = {
  // 延长缓存时间到30分钟，进一步提高命中率
  'EXPIRY_TIME': 30 * 60 * 1000,
  // 增加最大缓存条目数到300
  'MAX_ENTRIES': 300,
  // 增加最大缓存大小到50MB
  'MAX_SIZE': 50 * 1024 * 1024,
  // 减少清理频率到10分钟，降低CPU开销
  'CLEANUP_INTERVAL': 10 * 60 * 1000,
  // 移除最小访问次数限制，允许所有条目被缓存
  'MIN_ACCESS_COUNT': 0,
  // 降低清理比例到10%，减少缓存震荡
  'PRUNE_RATIO': 0.1
};

/**
 * Markdown渲染缓存
 */
interface CacheEntry {
  data: RenderMarkdownResult;
  accessedAt: number;
  accessCount: number;
  contentSize: number;
  // 内容哈希，用于快速比较
  hash: string;
  // 最后使用时间，用于LRU清理
  lastUsed: number;
}

const markdownRenderCache = new Map<string, CacheEntry>();
// 增强高亮缓存，添加访问时间
const markdownHighlightCache = new Map<string, { value: string; accessedAt: number }>();

// 缓存统计信息
const cacheStats = {
  'hits': 0,
  'misses': 0,
  'totalSize': 0,
  'entries': 0,
  'lastCleanup': Date.now()
};

/**
 * 生成内容的哈希值，用于快速比较
 * @param content 要哈希的内容
 * @returns 哈希字符串
 */
export function generateHash (content: string): string {
  // 使用更高效的哈希算法，基于DJB2算法，优化性能
  let hash = 5381;
  const len = content.length;
  // 每4个字符计算一次哈希，减少计算次数，提高性能
  for (let i = 0; i < len; i += 4) {
    const char1 = content.charCodeAt(i) || 0;
    const char2 = content.charCodeAt(i + 1) || 0;
    const char3 = content.charCodeAt(i + 2) || 0;
    const char4 = content.charCodeAt(i + 3) || 0;
    hash = (hash << 5) + hash + char1;
    hash = (hash << 5) + hash + char2;
    hash = (hash << 5) + hash + char3;
    hash = (hash << 5) + hash + char4;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 优化的缓存键生成函数
 * @param content Markdown内容
 * @param options 渲染选项
 * @returns 缓存键
 */
function generateCacheKey (content: string, options?: {
  includeBibliography?: boolean;
  citationStyle?: CitationStyle;
}): string {
  const citationStyle = options?.citationStyle || 'apa';
  const includeBibliography = options?.includeBibliography ? 'bib' : 'nobib';
  // 只使用内容的哈希作为缓存键的主要部分，提高缓存命中率
  const contentHash = generateHash(content);
  return `render:${contentHash}:${includeBibliography}:${citationStyle}`;
}

/**
 * 清理过期缓存条目
 */
function cleanupCache (): void {
  const now = Date.now();
  const entries = Array.from(markdownRenderCache.entries());

  // 移除过期条目
  for (const [key, entry] of entries) {
    if (now - entry.accessedAt > CACHE_CONFIG.EXPIRY_TIME) {
      cacheStats.totalSize -= entry.contentSize;
      cacheStats.entries -= 1;
      markdownRenderCache.delete(key);
    }
  }

  // 如果缓存条目数或大小超过限制，进行清理
  if (markdownRenderCache.size > CACHE_CONFIG.MAX_ENTRIES || cacheStats.totalSize > CACHE_CONFIG.MAX_SIZE) {
    const sortedEntries = Array.from(markdownRenderCache.entries())
      .sort(([, a], [, b]) => {
        // 优先按访问频率排序，然后按最后使用时间排序
        if (b.accessCount !== a.accessCount) {
          return b.accessCount - a.accessCount;
        }
        return b.lastUsed - a.lastUsed;
      });

    // 计算需要清理的条目数
    const excessEntries = markdownRenderCache.size - CACHE_CONFIG.MAX_ENTRIES;
    const entriesToRemove = Math.max(
      excessEntries,
      Math.floor(markdownRenderCache.size * CACHE_CONFIG.PRUNE_RATIO)
    );

    // 只保留前N个条目
    const entriesToKeep = sortedEntries.slice(0, sortedEntries.length - entriesToRemove);
    const keysToRemove = new Set(markdownRenderCache.keys());
    entriesToKeep.forEach(([key]) => keysToRemove.delete(key));

    // 删除多余的条目
    keysToRemove.forEach(key => {
      const entry = markdownRenderCache.get(key);
      if (entry) {
        cacheStats.totalSize -= entry.contentSize;
        cacheStats.entries -= 1;
        markdownRenderCache.delete(key);
      }
    });
  }

  // 清理highlight缓存：优化清理策略，按访问时间排序，只保留最近使用的条目
  if (markdownHighlightCache.size > 200) {
    // 按访问时间排序，保留最近使用的150个条目
    const sortedHighlightEntries = Array.from(markdownHighlightCache.entries())
      .sort(([, a], [, b]) => b.accessedAt - a.accessedAt);

    const entriesToKeep = sortedHighlightEntries.slice(0, 150);
    markdownHighlightCache.clear();
    entriesToKeep.forEach(([key, { value }]) => {
      markdownHighlightCache.set(key, { value, 'accessedAt': now });
    });
  }

  cacheStats.lastCleanup = now;
}

/**
 * 定期清理缓存的定时器
 */
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * 启动定期缓存清理
 */
function startPeriodicCleanup (): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  cleanupTimer = setInterval(() => {
    cleanupCache();
  }, CACHE_CONFIG.CLEANUP_INTERVAL);
}

// 启动定期清理
startPeriodicCleanup();

/**
 * 停止定期缓存清理（用于测试）
 */
export function stopPeriodicCleanup (): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats (): typeof cacheStats {
  return { ...cacheStats };
}

/**
 * MarkdownIt 实例配置
 */
// 配置MarkdownIt
const md = new MarkdownIt({
  // 允许 HTML 标签
  'html': true,
  // 自动识别链接
  'linkify': true,
  // 启用排版优化
  'typographer': true,
  'highlight' (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        // 生成缓存键
        const cacheKey = `highlight:${lang}:${str}`;

        // 检查缓存
        if (markdownHighlightCache.has(cacheKey)) {
          const cachedEntry = markdownHighlightCache.get(cacheKey);
          if (cachedEntry) {
            // 更新访问时间
            cachedEntry.accessedAt = Date.now();
            return cachedEntry.value;
          }
        }

        // 渲染并缓存结果
        const result = hljs.highlight(str, { 'language': lang, 'ignoreIllegals': true }).value;
        // 缓存结果，存储对象
        markdownHighlightCache.set(cacheKey, {
          'value': result,
          'accessedAt': Date.now()
        });
        return result;
      } catch {
        // 忽略语法高亮错误
      }
    }
    // 使用默认的转义
    return '';
  }
});

// 自定义图片渲染规则，添加懒加载支持
const defaultImageRender = md.renderer.rules.image;
// eslint-disable-next-line max-params -- 保持与markdown-it接口兼容
md.renderer.rules.image = function (tokens, idx, options, env, self) {
  // 添加 loading="lazy" 属性，确保tokens[idx]存在
  if (tokens[idx]) {
    tokens[idx].attrPush(['loading', 'lazy']);
  }
  return defaultImageRender ? defaultImageRender(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
};

// 自定义代码块渲染规则，集成highlight.js，添加行号、复制按钮和语言标识
md.renderer.rules.fence = function (tokens, idx, options) {
  const token = tokens[idx];
  if (!token) {
    return '';
  }

  const code = token.content.trim();
  const lang = token.info.trim();
  const attrs = '';

  // 生成缓存键
  const cacheKey = `highlight:${lang}:${code}`;
  let highlighted = '';

  // 检查缓存
  if (markdownHighlightCache.has(cacheKey)) {
    const cachedEntry = markdownHighlightCache.get(cacheKey);
    if (cachedEntry) {
      highlighted = cachedEntry.value;
      // 更新访问时间
      cachedEntry.accessedAt = Date.now();
    }
  } else {
    // 渲染并缓存结果
    highlighted = options.highlight?.(code, lang, attrs) || code;
    // 缓存结果
    markdownHighlightCache.set(cacheKey, {
      'value': highlighted,
      'accessedAt': Date.now()
    });
  }

  // 生成行号
  const lines = code.split('\n');
  const lineNumbersHtml = lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('\n');

  // 构建代码块HTML，添加行号、复制按钮和语言标识
  return `<div class="code-block-container relative rounded-lg overflow-hidden mb-4">
    <div class="code-header flex items-center justify-between bg-neutral-700 dark:bg-gray-800 px-4 py-2">
      <span class="code-language text-xs font-medium text-gray-300">${lang || 'plaintext'}</span>
      <button 
        class="copy-button text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
        onclick="navigator.clipboard.writeText('${code.replace(/'/g, '\\\'')}').then(() => {
          this.textContent = '已复制!'; this.classList.add('bg-green-600');
          setTimeout(() => { this.textContent = '复制代码'; this.classList.remove('bg-green-600'); }, 1500);
        })"
      >
        复制代码
      </button>
    </div>
    <pre class="bg-neutral-800 dark:bg-gray-900 p-0 overflow-x-auto"><code class="language-${lang}">
      <span class="line-numbers-container pr-4 select-none">${lineNumbersHtml}</span>
      <span class="code-content p-4">${highlighted}</span>
    </code></pre>
  </div>`;
};

/**
 * 将标题转换为 Slug（用于 URL 和锚点）
 * @param title 标题文本
 * @returns Slug 字符串
 */
export function titleToSlug (title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 移除特殊字符
    .replace(/[^\w\s-]/g, '')
    // 替换空格和下划线为连字符
    .replace(/[\s_]+/g, '-')
    // 移除首尾连字符
    .replace(/^-+|-+$/g, '');
}

/**
 * 处理 Markdown 文本中的数学公式
 * @param text Markdown 文本
 */
function processMathFormulas (text: string): string {
  let result = text;

  // 只在有数学公式时才处理，减少不必要的正则匹配
  if (result.includes('$') || result.includes('\\[')) {
    // 处理块级数学公式：\\[...\\] 格式
    result = result.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_match: string, p1: string) => {
      try {
        return katex.renderToString(p1.trim(), { 'displayMode': true });
      } catch (error) {
        console.error('Error rendering block math [\\...\\]:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：\\(...\\) 格式
    result = result.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_match: string, p1: string) => {
      try {
        // 直接返回原始公式，不再调用 katexCache.render
        return `<span class="math-tex">\\(${p1.trim()}\\)</span>`;
      } catch (error) {
        console.error('Error rendering inline math \\(...\\):', error);
        return `<span class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      }
    });

    // 处理块级数学公式：$$...$$ 格式
    result = result.replace(/(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g, (_match: string, p1: string) => {
      try {
        // 直接返回原始公式，不再调用 katexCache.render
        return `<span class="math-tex">$$${p1.trim()}$$</span>`;
      } catch (error) {
        console.error('Error rendering block math $$...$$:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：$...$ 格式
    result = result.replace(/(?<!\\)\$([^$\\]*(?:\\.[^$\\]*)*)(?<!\\)\$/g, (_match: string, p1: string) => {
      try {
        // 直接返回原始公式，不再调用 katexCache.render
        return `<span class="math-tex">$${p1.trim()}$</span>`;
      } catch (error) {
        console.error('Error rendering inline math $...$:', error);
        return `<span class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      }
    });
  }

  return result;
}

/**
 * 在Markdown渲染完成后处理数学公式
 * 更健壮的公式处理，解决公式位置和相邻文本问题
 * @param html 渲染后的HTML文本
 */
function processMathFormulasPostRender (html: string): string {
  let result = html;

  // 只在有数学公式时才处理，减少不必要的正则匹配
  if (result.includes('$') || result.includes('\\[')) {
    // 处理块级数学公式：\\[...\\] 格式
    result = result.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_match: string, p1: string) => {
      try {
        return katex.renderToString(p1.trim(), { 'displayMode': true });
      } catch (error) {
        console.error('Error rendering block math [\\...\\]:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：\\(...\\) 格式
    result = result.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_match: string, p1: string) => {
      try {
        return katex.renderToString(p1.trim(), { 'displayMode': false });
      } catch (error) {
        console.error('Error rendering inline math \\(...\\):', error);
        return `<span class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      }
    });

    // 处理块级数学公式：$$...$$ 格式
    result = result.replace(/(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g, (_match: string, p1: string) => {
      try {
        return katex.renderToString(p1.trim(), { 'displayMode': true });
      } catch (error) {
        console.error('Error rendering block math $$...$$:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：$...$ 格式 - 更健壮的正则表达式
    // 解决公式与文本相邻的问题，使用更精确的边界匹配
    result = result.replace(/(?<!\\)\$([^$\\]*(?:\\.[^$\\]*)*)(?<!\\)\$/g, (_match: string, p1: string) => {
      // 清理公式内容，移除首尾空白
      const cleanedFormula = p1.trim();
      if (!cleanedFormula) {
        return '$ $';
      }
      try {
        return katex.renderToString(cleanedFormula, { 'displayMode': false });
      } catch (error) {
        console.error('Error rendering inline math $...$:', error);
        return `<span class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      }
    });
  }

  return result;
}
/**
 * 自定义文本渲染规则
 * 处理 Wiki 链接和数学公式
 */
md.renderer.rules.text = function (tokens: { content?: string }[], idx: number) {
  const token = tokens[idx];
  // 类型安全检查，确保token和content存在
  const text = token?.content || '';

  let result = text;

  // 处理数学公式
  result = processMathFormulas(result);

  // 处理引用
  result = processCitations(result);

  return result;
};

/**
 * 处理 Markdown 文本中的 Mermaid 图表
 * @param text Markdown 文本
 */
function processMermaidDiagrams (text: string): string {
  return text.replace(/```mermaid([\s\S]*?)```/g, (_match: string, code: string) => {
    // 清理代码内容，移除首尾空白
    const cleanedCode = code.trim();

    // 生成唯一ID
    const id = `mermaid-diagram-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 返回包含Mermaid图表的HTML
    return `
      <div class="mermaid" id="${id}">
        ${cleanedCode}
      </div>
    `;
  });
}

/**
 * 处理 Markdown 文本中的 Chart.js 图表
 * @param text Markdown 文本
 */
function processChartJsCharts (text: string): string {
  // 支持 chart-bar, chart-line, chart-pie 三种类型
  return text.replace(/```(chart-bar|chart-line|chart-pie)([\s\S]*?)```/g, (_match: string, chartType: string, code: string) => {
    // 清理代码内容，移除首尾空白
    const cleanedCode = code.trim();

    // 生成唯一ID
    const id = `chartjs-chart-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 返回包含Chart.js图表的HTML，使用自定义属性标记
    return `
      <canvas class="chartjs-placeholder" id="${id}" data-chart-type="${chartType}" data-chart-config="${encodeURIComponent(cleanedCode)}"></canvas>
    `;
  });
}

/**
 * 处理 Markdown 文本中的 Chart.js 图表
 * @param text Markdown 文本
 */
function processChartJsDiagrams (text: string): string {
  return text.replace(/\[chartjs\]([\s\S]*?)\[\/chartjs\]/g, (_match: string, config: string) => {
    // 清理配置内容，移除首尾空白
    const cleanedConfig = config.trim();

    // 生成唯一ID
    const id = `chartjs-chart-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 返回包含Chart.js图表的HTML，使用自定义属性标记
    return `
      <canvas class="chartjs-placeholder" id="${id}" data-chart-config="${encodeURIComponent(cleanedConfig)}"></canvas>
    `;
  });
}

/**
 * 处理 Markdown 文本中的 Nerdamer 计算单元格
 * @param text Markdown 文本
 */
function processNerdamerCells (text: string): string {
  return text.replace(/\[nerdamer-cell\]([\s\S]*?)\[\/nerdamer-cell\]/g, (_match: string, code: string) => {
    // 清理代码内容，移除首尾空白
    const cleanedCode = code.trim();

    // 生成唯一ID
    const id = `nerdamer-cell-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 返回包含计算单元格的HTML，使用自定义属性标记，以便后续React组件处理
    return `
      <div class="nerdamer-cell-placeholder" data-nerdamer-code="${encodeURIComponent(cleanedCode)}" data-nerdamer-id="${id}"></div>
    `;
  });
}



/**
 * 从 Markdown 文本中提取所有数学公式
 * @param content Markdown 文本
 * @returns 提取的公式数组
 */
export function extractFormulas (content: string): Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> {
  const formulas: Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> = [];

  // 生成唯一ID的辅助函数
  const generateId = () => `formula-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // 处理块级公式：$$...$$ 格式
  const blockRegex = /\$\$([^$]+)\$\$/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    if (match[1]) {
      formulas.push({
        'id': generateId(),
        'content': match[1].trim(),
        'type': 'block',
        'position': match.index
      });
    }
  }

  // 处理内联公式：$...$ 格式
  const inlineRegex = /(?<!\\)\$([^$]+)(?<!\\)\$/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    if (match[1]) {
      formulas.push({
        'id': generateId(),
        'content': match[1].trim(),
        'type': 'inline',
        'position': match.index
      });
    }
  }

  // 处理带标签的公式：\\begin{equation}...\\end{equation} 格式
  const equationRegex = /\\begin{equation}(?:\\label{([^}]+)})?([\s\S]*?)\\end{equation}/g;
  while ((match = equationRegex.exec(content)) !== null) {
    if (match[2]) {
      const label = match[1]?.trim();
      formulas.push({
        'id': generateId(),
        'content': match[2].trim(),
        'type': 'block',
        ...(label && { label }),
        'position': match.index
      });
    }
  }

  return formulas;
}

/**
 * 渲染Markdown结果接口
 */
// 先定义需要在renderMarkdown中使用的函数

/**
 * 从 Markdown 文本中提取标题信息
 * @param content Markdown 文本
 * @returns 标题数组，包含级别、文本和 slug
 */
export function extractHeadings (content: string): Array<{ level: number; text: string; slug: string }> {
  const headings: Array<{ level: number; text: string; slug: string }> = [];

  // 匹配所有 Markdown 标题
  const headingRegex = /^(#{1,6})\s+([^\n]+)/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    if (match && match[1] && match[2]) {
      // 标题级别 (1-6)
      const level = match[1].length;
      // 标题文本
      const text = match[2].trim();
      // 生成 slug
      const slug = titleToSlug(text);

      headings.push({ level, text, slug });
    }
  }

  return headings;
}

/**
 * 从 Markdown 内容中提取所有 Wiki 链接（详细信息）
 * @param content Markdown 文本
 * @returns 包含标题、显示文本和 Slug 的 Wiki 链接数组
 */
export function extractWikiLinksDetailed (content: string): { title: string; displayText: string; slug: string }[] {
  const links: { title: string; displayText: string; slug: string }[] = [];

  content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, title, displayText) => {
    const trimmedTitle = title?.trim() || '';
    const trimmedDisplayText = displayText?.trim() || trimmedTitle;
    const slug = titleToSlug(trimmedTitle || trimmedDisplayText);
    links.push({ 'title': trimmedTitle, 'displayText': trimmedDisplayText, slug });
    return _match;
  });

  return links;
}

export interface RenderMarkdownResult {
  html: string;
  citations: Citation[];
  headings: ReturnType<typeof extractHeadings>;
  wikiLinks: ReturnType<typeof extractWikiLinksDetailed>;
  formulas: ReturnType<typeof extractFormulas>;
}

/**
 * 将 Markdown 文本渲染为 HTML
 * @param content Markdown 文本
 * @param options 渲染选项
 * @returns 渲染后的 HTML 字符串和相关信息
 */
export function renderMarkdown (content: string, options?: {
  includeBibliography?: boolean;
  citationStyle?: CitationStyle;
}): RenderMarkdownResult {
  // 生成优化的缓存键
  const cacheKey = generateCacheKey(content, options);
  const contentHash = generateHash(content);

  // 检查缓存
  if (markdownRenderCache.has(cacheKey)) {
    const cachedEntry = markdownRenderCache.get(cacheKey);
    if (cachedEntry) {
      // 更新访问统计
      const now = Date.now();
      cachedEntry.accessedAt = now;
      cachedEntry.accessCount += 1;
      cachedEntry.lastUsed = now;
      // 增加缓存命中统计
      cacheStats.hits += 1;
      return cachedEntry.data;
    }
  }

  // 增加缓存未命中统计
  cacheStats.misses += 1;

  // 按顺序处理各种扩展语法，只处理需要的部分
  let processedContent = content;

  // 处理Nerdamer计算单元格
  if (processedContent.includes('[nerdamer-cell]')) {
    processedContent = processNerdamerCells(processedContent);
  }

  // 处理Mermaid图表
  if (processedContent.includes('```mermaid')) {
    processedContent = processMermaidDiagrams(processedContent);
  }

  // 处理Chart.js图表（支持chart-bar, chart-line, chart-pie三种类型）
  if (processedContent.includes('```chart-')) {
    processedContent = processChartJsCharts(processedContent);
  }

  // 处理Chart.js图表
  if (processedContent.includes('[chartjs]')) {
    processedContent = processChartJsDiagrams(processedContent);
  }

  // 渲染Markdown
  let html = md.render(processedContent);

  // 提取引用
  const citations = extractCitations(content);

  // 提取标题
  const headings = extractHeadings(content);

  // 提取Wiki链接
  const wikiLinks = extractWikiLinksDetailed(content);

  // 提取公式
  const formulas = extractFormulas(content);

  // 后期处理：统一处理数学公式，确保在所有其他Markdown处理完成后进行
  html = processMathFormulasPostRender(html);

  // 添加参考文献
  if (options?.includeBibliography && citations.length > 0) {
    const bibliography = generateBibliography(citations, options.citationStyle);
    html += `\n\n${bibliography}`;
  }

  const result: RenderMarkdownResult = {
    html,
    citations,
    headings,
    wikiLinks,
    formulas
  };

  // 计算内容大小（大致估计）
  const contentSize = new Blob([JSON.stringify(result)]).size;

  // 缓存结果
  const cacheEntry: CacheEntry = {
    'data': result,
    'accessedAt': Date.now(),
    'accessCount': 1,
    contentSize,
    'hash': contentHash,
    'lastUsed': Date.now()
  };

  markdownRenderCache.set(cacheKey, cacheEntry);
  cacheStats.totalSize += contentSize;
  cacheStats.entries += 1;

  // 定期清理过期缓存
  cleanupCache();

  return result;
}

/**
 * 将 Markdown 文本渲染为 HTML（仅返回HTML字符串，兼容旧版API）
 * @param content Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdownSimple (content: string): string {
  return renderMarkdown(content).html;
}

/**
 * 从 Markdown 内容中提取所有 Wiki 链接
 * @param content Markdown 文本
 * @returns Wiki 链接标题数组
 */
export function extractWikiLinks (content: string): string[] {
  const matches: string[] = content.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g) || [];
  return matches.map((match: string) => {
    const titleMatch = (/\[\[([^\]|]+)/).exec(match);
    const title = titleMatch ? titleMatch[1]?.trim() || '' : '';
    return title;
  });
}

/**
 * 清理 Markdown 文本
 * @param content Markdown 文本
 * @returns 清理后的 Markdown 文本
 */
export function cleanMarkdown (content: string): string {
  return content
    .trim()
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * 获取 Markdown 文本的纯文本摘要
 * @param content Markdown 文本
 * @param length 摘要长度（默认 150 个字符）
 * @returns 纯文本摘要
 */
export function getMarkdownSummary (content: string, length = 150): string {
  // 移除所有 Markdown 标记
  const plainText = content
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\$\$([^$]+)\$\$/g, '')
    .replace(/(?<!\\)\$([^$]+)(?<!\\)\$/g, '')
    .replace(/[#*`~_[\](){}]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  // 截取摘要
  if (plainText.length <= length) {
    return plainText;
  }

  return plainText.substring(0, length) + '...';
}

/**
 * 生成 Markdown 文本的目录结构
 * @param content Markdown 文本
 * @returns 目录 HTML 字符串
 */
export function generateTableOfContents (content: string): string {
  const headings = extractHeadings(content);

  if (headings.length === 0) {
    return '<p class="text-gray-500 dark:text-gray-400">No headings found</p>';
  }

  // 生成嵌套的目录结构
  let tocHtml = '<ul class="space-y-2">';
  let currentLevel = 1;

  for (const heading of headings) {
    const { level, text, slug } = heading;

    // 处理嵌套级别
    if (level > currentLevel) {
      // 增加嵌套级别
      for (let i = currentLevel; i < level; i += 1) {
        tocHtml += '<ul class="ml-4 space-y-1">';
      }
    } else if (level < currentLevel) {
      // 减少嵌套级别
      for (let i = currentLevel; i > level; i -= 1) {
        tocHtml += '</ul>';
      }
    }

    // 添加标题链接
    tocHtml += `<li><a href="#${slug}" class="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors duration-200">${text}</a></li>`;

    currentLevel = level;
  }

  // 关闭所有未关闭的列表
  for (let i = 1; i < currentLevel; i += 1) {
    tocHtml += '</ul>';
  }

  tocHtml += '</ul>';

  return tocHtml;
}

/**
 * 检查 Markdown 文本是否为空
 * @param content Markdown 文本
 * @returns 是否为空
 */
export function isEmptyMarkdown (content: string): boolean {
  const cleaned = cleanMarkdown(content);
  return cleaned === '' || cleaned === '#';
}
