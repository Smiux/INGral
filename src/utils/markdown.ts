/**
 * Markdown 处理工具
 *
 * 功能特性：
 * - Markdown 转 HTML 渲染
 * - Wiki 链接支持（[[Title|Display Text]]）
 * - 数学公式（KaTeX）支持（$inline$ 和 $$block$$）
 * - 标题转 Slug 功能
 * - Wiki 链接提取功能
 * - Markdown 清理和摘要生成
 */
import MarkdownIt from 'markdown-it';
import { katexCache } from './katexCache';
import 'katex/dist/katex.min.css';

/**
 * MarkdownIt 实例配置
 */
const md = new MarkdownIt({
  html: true,           // 允许 HTML 标签
  linkify: true,        // 自动识别链接
  typographer: true,    // 启用排版优化
});

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
  
  // 处理块级数学公式：$$...$$ 格式
  result = result.replace(/\$\$([^$]+)\$\$/g, (_match: string, p1: string) => {
    try {
      return katexCache.render(p1, { displayMode: true });
    } catch {
      return _match; // 渲染失败时返回原始内容
    }
  });

  // 处理内联数学公式：$...$ 格式
  result = result.replace(/\$([^$]+)\$/g, (_match: string, p1: string) => {
    try {
      return katexCache.render(p1, { displayMode: false });
    } catch {
      return _match; // 渲染失败时返回原始内容
    }
  });
  
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

  return result;
};

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

  // 处理带标签的公式：\begin{equation}...\end{equation} 格式
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
 * 将 Markdown 文本渲染为 HTML
 * @param content Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(content: string): string {
  // 先处理SymPy计算单元格
  const contentWithSymPyCells = processSymPyCells(content);
  // 再渲染Markdown
  return md.render(contentWithSymPyCells);
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
