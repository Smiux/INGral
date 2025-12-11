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
import { katexCache } from './katexCache';
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
export function extractCitations(content: string): Citation[] {
  const citations: Citation[] = [];
  const citationRegex = /\[\^(\w+):\s*([^\]]+)\]/g;
  let match;
  
  while ((match = citationRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      const type = match[1].toLowerCase() as Citation['type'];
      const content = match[2].trim();
      
      // 检查是否已存在相同内容的引用
      const existingCitation = citations.find(cit => cit.content === content);
      
      if (existingCitation) {
        // 更新引用计数
        existingCitation.count++;
      } else {
        // 添加新引用
        citations.push({
          id: `citation-${citations.length + 1}`,
          type,
          content,
          position: match.index,
          count: 1
        });
      }
    }
  }
  
  return citations;
}

/**
 * 格式化单条引用
 * @param citation 引用对象
 * @param style 引用格式
 * @param index 引用索引（用于IEEE格式）
 * @returns 格式化后的引用字符串
 */
export function formatCitation(citation: Citation, style: CitationStyle, index?: number): string {
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
 * 格式化APA风格引用
 * @param citation 引用对象
 * @returns APA格式引用
 */
function formatApaCitation(citation: Citation): string {
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
function formatMlaCitation(citation: Citation): string {
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
function formatChicagoCitation(citation: Citation): string {
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
function formatIeeeCitation(citation: Citation, index: number): string {
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
 * 生成参考文献列表HTML
 * @param citations 引用数组
 * @param style 引用格式
 * @returns 参考文献HTML
 */
export function generateBibliography(citations: Citation[], style: CitationStyle = 'apa'): string {
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
function processCitations(text: string): string {
  return text.replace(/\[\^(\w+):\s*([^\]]+)\]/g, (_match, type, content) => {
    // 生成唯一引用ID
    const id = `cite-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return `<sup><a href="#${id}" class="citation-ref">[${type}:${content.substring(0, 20)}${content.length > 20 ? '...' : ''}]</a></sup>`;
  });
}


import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

/**
 * Markdown渲染缓存配置
 */
const CACHE_CONFIG = {
  EXPIRY_TIME: 10 * 60 * 1000, // 10分钟缓存，延长缓存时间以提高命中率
  MAX_ENTRIES: 100, // 增加最大缓存条目数到100
  MAX_SIZE: 20 * 1024 * 1024, // 增加最大缓存大小到20MB
  CLEANUP_INTERVAL: 2 * 60 * 1000, // 定期清理间隔：2分钟
  MIN_ACCESS_COUNT: 2, // 最小访问次数，低于此值的条目优先被清理
  PRUNE_RATIO: 0.3 // 清理比例，每次清理30%的低优先级条目
};

/**
 * Markdown渲染缓存
 */
interface CacheEntry {
  data: RenderMarkdownResult;
  accessedAt: number;
  accessCount: number;
  contentSize: number;
  hash: string; // 添加内容哈希，用于快速比较
}

const markdownRenderCache = new Map<string, CacheEntry>();
const markdownHighlightCache = new Map<string, string>(); // 模块级别缓存，避免依赖全局window对象

// 缓存统计信息
// eslint-disable-next-line prefer-const
let cacheStats = {
  hits: 0,
  misses: 0,
  totalSize: 0,
  entries: 0,
  lastCleanup: Date.now()
};

/**
 * 生成内容的哈希值，用于快速比较
 * @param content 要哈希的内容
 * @returns 哈希字符串
 */
function generateHash(content: string): string {
  // 使用简单的哈希算法，适合快速计算
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * 清理过期缓存条目
 */
function cleanupCache(): void {
  const now = Date.now();
  const entries = Array.from(markdownRenderCache.entries());
  
  // 移除过期条目
  for (const [key, entry] of entries) {
    if (now - entry.accessedAt > CACHE_CONFIG.EXPIRY_TIME) {
      cacheStats.totalSize -= entry.contentSize;
      cacheStats.entries--;
      markdownRenderCache.delete(key);
    }
  }
  
  // 如果缓存条目数或大小超过限制，进行清理
  if (markdownRenderCache.size > CACHE_CONFIG.MAX_ENTRIES || cacheStats.totalSize > CACHE_CONFIG.MAX_SIZE) {
    const sortedEntries = Array.from(markdownRenderCache.entries())
      .sort(([, a], [, b]) => {
        // 优先按访问频率排序，然后按访问时间排序
        if (b.accessCount !== a.accessCount) {
          return b.accessCount - a.accessCount;
        }
        return b.accessedAt - a.accessedAt;
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
        cacheStats.entries--;
        markdownRenderCache.delete(key);
      }
    });
  }
  
  // 清理highlight缓存
  if (markdownHighlightCache.size > 200) {
    // 只保留最近使用的150个条目
    const sortedHighlightEntries = Array.from(markdownHighlightCache.entries());
    const entriesToKeep = sortedHighlightEntries.slice(0, 150);
    markdownHighlightCache.clear();
    entriesToKeep.forEach(([key, value]) => {
      markdownHighlightCache.set(key, value);
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
function startPeriodicCleanup(): void {
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
export function stopPeriodicCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): typeof cacheStats {
  return { ...cacheStats };
}

/**
 * MarkdownIt 实例配置
 */
const md = new MarkdownIt({
  html: true,           // 允许 HTML 标签
  linkify: true,        // 自动识别链接
  typographer: true,    // 启用排版优化
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        // 生成缓存键
        const cacheKey = `highlight:${lang}:${str}`;
        
        // 检查缓存
        if (markdownHighlightCache.has(cacheKey)) {
          return markdownHighlightCache.get(cacheKey) || '';
        }
        
        // 渲染并缓存结果
        const result = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        markdownHighlightCache.set(cacheKey, result);
        return result;
      } catch {
        // 忽略语法高亮错误
      }
    }
    return ''; // 使用默认的转义
  }
});

// 自定义图片渲染规则，添加懒加载支持
const defaultImageRender = md.renderer.rules.image;
md.renderer.rules.image = function(tokens, idx, options, env, self) {
  // 添加 loading="lazy" 属性，确保tokens[idx]存在
  if (tokens[idx]) {
    tokens[idx].attrPush(['loading', 'lazy']);
  }
  return defaultImageRender ? defaultImageRender(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
};

// 自定义代码块渲染规则，集成highlight.js，添加行号、复制按钮和语言标识
md.renderer.rules.fence = function(tokens, idx, options) {
  const token = tokens[idx];
  if (!token) return '';
  
  const code = token.content.trim();
  const lang = token.info.trim();
  const attrs = '';
  const highlighted = options.highlight?.(code, lang, attrs) || code;
  
  // 生成行号
  const lines = code.split('\n');
  const lineNumbersHtml = lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('\n');
  
  // 构建代码块HTML，添加行号、复制按钮和语言标识
  return `<div class="code-block-container relative rounded-lg overflow-hidden mb-4">
    <div class="code-header flex items-center justify-between bg-neutral-700 dark:bg-gray-800 px-4 py-2">
      <span class="code-language text-xs font-medium text-gray-300">${lang || 'plaintext'}</span>
      <button 
        class="copy-button text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
        onclick="navigator.clipboard.writeText('${code.replace(/'/g, "\\'")}').then(() => {
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
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')       // 移除特殊字符
    .replace(/[\s_]+/g, '-')        // 替换空格和下划线为连字符
    .replace(/^-+|-+$/g, '');        // 移除首尾连字符
}

/**
 * 处理 Markdown 文本中的 Wiki 链接
 * @param text Markdown 文本
 */
function processWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_match: string, p1: string) => {
    const parts = p1.split('|').map((s: string) => s.trim());
    const title = parts[0] || '';
    const displayText = parts[1] || title;
    const slug = titleToSlug(title || displayText);
    return `<a href="/article/${slug}" class="wiki-link">${displayText}</a>`;
  });
}

/**
 * 处理 Markdown 文本中的数学公式
 * @param text Markdown 文本
 */
function processMathFormulas(text: string): string {
  let result = text;
  
  // 只在有数学公式时才处理，减少不必要的正则匹配
  if (result.includes('$') || result.includes('\\[')) {
    // 处理块级数学公式：\\[...\\] 格式
    result = result.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_match: string, p1: string) => {
      try {
        return katexCache.render(p1, { displayMode: true });
      } catch (error) {
        console.error('Error rendering block math [\\...\\]:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：\\(...\\) 格式
    result = result.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_match: string, p1: string) => {
      try {
        return katexCache.render(p1, { displayMode: false });
      } catch (error) {
        console.error('Error rendering inline math \\(...\\):', error);
        return `<span class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
      }
    });

    // 处理块级数学公式：$$...$$ 格式
    result = result.replace(/(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g, (_match: string, p1: string) => {
      try {
        return katexCache.render(p1, { displayMode: true });
      } catch (error) {
        console.error('Error rendering block math $$...$$:', error);
        return `<div class="math-error">Math rendering error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
      }
    });

    // 处理内联数学公式：$...$ 格式
    result = result.replace(/(?<!\\)\$([\s\S]*?)(?<!\\)\$/g, (_match: string, p1: string) => {
      try {
        return katexCache.render(p1, { displayMode: false });
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
  
  // 处理 Wiki 链接
  result = processWikiLinks(result);
  
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
function processMermaidDiagrams(text: string): string {
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
function processChartJsDiagrams(text: string): string {
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
 * 处理 Markdown 文本中的 SymPy 计算单元格
 * @param text Markdown 文本
 */
function processSymPyCells(text: string): string {
  return text.replace(/\[sympy-cell\]([\s\S]*?)\[\/sympy-cell\]/g, (_match: string, code: string) => {
    // 清理代码内容，移除首尾空白
    const cleanedCode = code.trim();
    
    // 生成唯一ID
    const id = `sympy-cell-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 返回包含计算单元格的HTML，使用自定义属性标记，以便后续React组件处理
    return `
      <div class="sympy-cell-placeholder" data-sympy-code="${encodeURIComponent(cleanedCode)}" data-sympy-id="${id}"></div>
    `;
  });
}

/**
 * 处理 Markdown 文本中的知识图谱嵌入
 * @param text Markdown 文本
 */
function processGraphEmbeds(text: string): string {
  return text.replace(/\[graph(?:\s+([^\]]+))?\]([\s\S]*?)\[\/graph\]/g, (_match: string, attrs: string, content: string) => {
    // 清理内容和属性
    const cleanedContent = content.trim();
    const cleanedAttrs = attrs ? attrs.trim() : '';
    
    // 解析属性
    const attrsObj: Record<string, string> = {};
    if (cleanedAttrs) {
      // 简单的属性解析，支持 key=value 格式
      const attrPairs = cleanedAttrs.split(/\s+/);
      for (const pair of attrPairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          attrsObj[key] = value.replace(/^['"]|['"]$/g, ''); // 移除引号
        }
      }
    }
    
    // 生成唯一ID
    const id = `graph-embed-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 尝试解析图谱数据
    let graphData = { nodes: [], links: [] };
    try {
      graphData = JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error parsing graph data:', error);
    }
    
    // 返回包含图谱嵌入的HTML，使用自定义属性标记
    return `
      <div 
        class="graph-embed-placeholder"
        data-graph-id="${id}"
        data-graph-data="${encodeURIComponent(JSON.stringify(graphData))}"
        data-graph-attrs="${encodeURIComponent(JSON.stringify(attrsObj))}"
        style="${attrsObj.style || ''}"
      >
        <div class="graph-embed-loading">
          <div class="loader">加载知识图谱中...</div>
        </div>
      </div>
    `;
  });
}

/**
 * 从 Markdown 文本中提取所有数学公式
 * @param content Markdown 文本
 * @returns 提取的公式数组
 */
export function extractFormulas(content: string): Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> {
  const formulas: Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> = [];

  // 生成唯一ID的辅助函数
  const generateId = () => `formula-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // 处理块级公式：$$...$$ 格式
  const blockRegex = /\$\$([^$]+)\$\$/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    if (match[1]) {
      formulas.push({
        id: generateId(),
        content: match[1].trim(),
        type: 'block',
        position: match.index
      });
    }
  }

  // 处理内联公式：$...$ 格式
  const inlineRegex = /(?<!\\)\$([^$]+)(?<!\\)\$/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    if (match[1]) {
      formulas.push({
        id: generateId(),
        content: match[1].trim(),
        type: 'inline',
        position: match.index
      });
    }
  }

  // 处理带标签的公式：\\begin{equation}...\\end{equation} 格式
  const equationRegex = /\\begin{equation}(?:\\label{([^}]+)})?([\s\S]*?)\\end{equation}/g;
  while ((match = equationRegex.exec(content)) !== null) {
    if (match[2]) {
      const label = match[1]?.trim();
      formulas.push({
        id: generateId(),
        content: match[2].trim(),
        type: 'block',
        ...(label && { label }),
        position: match.index
      });
    }
  }

  return formulas;
}

/**
 * 渲染Markdown结果接口
 */
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
export function renderMarkdown(content: string, options?: {
  includeBibliography?: boolean;
  citationStyle?: CitationStyle;
}): RenderMarkdownResult {
  // 生成缓存键
  const cacheKey = `render:${content}:${options?.includeBibliography ? 'bib' : 'nobib'}:${options?.citationStyle || 'apa'}`;
  
  // 检查缓存
  if (markdownRenderCache.has(cacheKey)) {
    const cachedEntry = markdownRenderCache.get(cacheKey);
    if (cachedEntry) {
      // 更新访问统计
      cachedEntry.accessedAt = Date.now();
      cachedEntry.accessCount++;
      // 增加缓存命中统计
      cacheStats.hits++;
      return cachedEntry.data;
    }
  }
  
  // 增加缓存未命中统计
  cacheStats.misses++;
  
  // 按顺序处理各种扩展语法，只处理需要的部分
  let processedContent = content;
  
  // 处理SymPy计算单元格
  if (processedContent.includes('[sympy-cell]')) {
    processedContent = processSymPyCells(processedContent);
  }
  
  // 处理Mermaid图表
  if (processedContent.includes('```mermaid')) {
    processedContent = processMermaidDiagrams(processedContent);
  }
  
  // 处理Chart.js图表
  if (processedContent.includes('[chartjs]')) {
    processedContent = processChartJsDiagrams(processedContent);
  }
  
  // 处理知识图谱嵌入
  if (processedContent.includes('[graph')) {
    processedContent = processGraphEmbeds(processedContent);
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
    data: result,
    accessedAt: Date.now(),
    accessCount: 1,
    contentSize,
    hash: generateHash(content)
  };
  
  markdownRenderCache.set(cacheKey, cacheEntry);
  cacheStats.totalSize += contentSize;
  cacheStats.entries++;
  
  // 定期清理过期缓存
  cleanupCache();
  
  return result;
}

/**
 * 将 Markdown 文本渲染为 HTML（仅返回HTML字符串，兼容旧版API）
 * @param content Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdownSimple(content: string): string {
  return renderMarkdown(content).html;
}

/**
 * 从 Markdown 内容中提取所有 Wiki 链接
 * @param content Markdown 文本
 * @returns Wiki 链接标题数组
 */
export function extractWikiLinks(content: string): string[] {
  const matches: string[] = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map((match: string) => {
    const parts = match.slice(2, -2).split('|');
    const title = parts[0]?.trim() || '';
    return title;
  });
}

/**
 * 从 Markdown 内容中提取所有 Wiki 链接（详细信息）
 * @param content Markdown 文本
 * @returns 包含标题、显示文本和 Slug 的 Wiki 链接数组
 */
export function extractWikiLinksDetailed(content: string): { title: string; displayText: string; slug: string }[] {
  const links: { title: string; displayText: string; slug: string }[] = [];
  
  content.replace(/\[\[([^\]]+)\]\]/g, (_match, p1) => {
    const parts = p1.split('|').map((s: string) => s.trim());
    const title = parts[0] || '';
    const displayText = parts[1] || title;
    const slug = titleToSlug(title || displayText);
    links.push({ title, displayText, slug });
    return _match;
  });
  
  return links;
}

/**
 * 清理 Markdown 文本
 * @param content Markdown 文本
 * @returns 清理后的 Markdown 文本
 */
export function cleanMarkdown(content: string): string {
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
export function getMarkdownSummary(content: string, length = 150): string {
  // 移除所有 Markdown 标记
  const plainText = content
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\$\$([^$]+)\$\$/g, '')
    .replace(/\$([^$]+)\$/g, '')
    .replace(/[#*`~_\[\](){}]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  // 截取摘要
  if (plainText.length <= length) {
    return plainText;
  }
  
  return plainText.substring(0, length) + '...';
}

/**
 * 从 Markdown 文本中提取标题信息
 * @param content Markdown 文本
 * @returns 标题数组，包含级别、文本和 slug
 */
export function extractHeadings(content: string): Array<{ level: number; text: string; slug: string }> {
  const headings: Array<{ level: number; text: string; slug: string }> = [];
  
  // 匹配所有 Markdown 标题
  const headingRegex = /^(#{1,6})\s+([^\n]+)/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
      if (match && match[1] && match[2]) {
        const level = match[1].length; // 标题级别 (1-6)
        const text = match[2].trim(); // 标题文本
        const slug = titleToSlug(text); // 生成 slug
        
        headings.push({ level, text, slug });
      }
    }
  
  return headings;
}

/**
 * 生成 Markdown 文本的目录结构
 * @param content Markdown 文本
 * @returns 目录 HTML 字符串
 */
export function generateTableOfContents(content: string): string {
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
      for (let i = currentLevel; i < level; i++) {
        tocHtml += '<ul class="ml-4 space-y-1">';
      }
    } else if (level < currentLevel) {
      // 减少嵌套级别
      for (let i = currentLevel; i > level; i--) {
        tocHtml += '</ul>';
      }
    }
    
    // 添加标题链接
    tocHtml += `<li><a href="#${slug}" class="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors duration-200">${text}</a></li>`;
    
    currentLevel = level;
  }
  
  // 关闭所有未关闭的列表
  for (let i = 1; i < currentLevel; i++) {
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
export function isEmptyMarkdown(content: string): boolean {
  const cleaned = cleanMarkdown(content);
  return cleaned === '' || cleaned === '# ';
}
